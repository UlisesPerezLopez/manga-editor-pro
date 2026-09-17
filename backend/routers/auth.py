# routers/auth.py
# Endpoints de autenticación: registro, login y perfil del usuario

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database.database import get_db
from database.models import Usuario
from models.schemas import (
    UsuarioRegistro,
    UsuarioLogin,
    UsuarioRespuesta,
    UsuarioActualizarModoAI,
    UsuarioActualizarAvatar,
    TokenRespuesta,
    MensajeRespuesta
)
from utils.auth import (
    hashear_password,
    verificar_password,
    crear_token_acceso,
    verificar_token
)
from datetime import timedelta

router = APIRouter(prefix="/auth", tags=["Autenticación"])
security = HTTPBearer()


@router.post("/register", response_model=MensajeRespuesta,
             status_code=status.HTTP_201_CREATED)
async def registrar_usuario(datos: UsuarioRegistro, db: Session = Depends(get_db)):
    """
    Registra un nuevo usuario en el sistema.
    Verifica que el email y username no estén ya en uso.
    """
    # Verificar si el email ya existe
    usuario_existente = db.query(Usuario).filter(
        Usuario.email == datos.email
    ).first()
    if usuario_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este email ya está registrado"
        )

    # Verificar si el username ya existe
    username_existente = db.query(Usuario).filter(
        Usuario.username == datos.username
    ).first()
    if username_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este nombre de usuario ya está en uso"
        )

    # Crear el nuevo usuario con la contraseña hasheada
    nuevo_usuario = Usuario(
        username=datos.username,
        email=datos.email,
        hashed_password=hashear_password(datos.password),
        nombre_artistico=datos.nombre_artistico
    )

    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    return MensajeRespuesta(
        mensaje=f"Usuario '{datos.username}' registrado correctamente",
        exito=True
    )


@router.post("/login", response_model=TokenRespuesta)
async def iniciar_sesion(datos: UsuarioLogin, db: Session = Depends(get_db)):
    """
    Inicia sesión con email y contraseña.
    Devuelve un token JWT.
    Si 'recordarme' es True, el token dura 30 días. Si es False, dura 24 horas.
    """
    # Buscar el usuario por email
    usuario = db.query(Usuario).filter(
        Usuario.email == datos.email
    ).first()

    # Verificar que el usuario existe y la contraseña es correcta
    if not usuario or not verificar_password(datos.password,
                                              usuario.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta desactivada. Contacta con el administrador."
        )

    # Duración del token según 'recordarme'
    if datos.recordarme:
        duracion = timedelta(days=30)   # 30 días
    else:
        duracion = timedelta(hours=24)  # 24 horas

    # Generar el token JWT
    token = crear_token_acceso(
        datos={"sub": usuario.email},
        expires_delta=duracion
    )

    return TokenRespuesta(
        access_token=token,
        token_type="bearer",
        usuario=UsuarioRespuesta.model_validate(usuario)
    )


@router.get("/me", response_model=UsuarioRespuesta)
async def obtener_perfil(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Devuelve los datos del usuario autenticado actualmente.
    Requiere token JWT válido en el header Authorization.
    """
    # Verificar el token y obtener el email
    email = verificar_token(credentials.credentials)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Buscar el usuario en la base de datos
    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )

    return usuario


@router.post("/logout", response_model=MensajeRespuesta)
async def cerrar_sesion(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Cierra la sesión del usuario.
    En JWT el logout se gestiona en el frontend eliminando el token.
    Este endpoint confirma que el token era válido al momento del logout.
    """
    email = verificar_token(credentials.credentials)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado"
        )

    return MensajeRespuesta(
        mensaje="Sesión cerrada correctamente",
        exito=True
    )


@router.get("/ai-mode")
async def obtener_modo_ai(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Devuelve el modo de IA configurado para el usuario ('cloud_free' o 'local')."""
    email = verificar_token(credentials.credentials)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado"
        )
    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"ai_mode": usuario.ai_mode or "cloud_free"}


@router.patch("/ai-mode", response_model=UsuarioRespuesta)
async def actualizar_modo_ai(
    datos: UsuarioActualizarModoAI,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Actualiza el modo de IA del usuario entre 'cloud_free' y 'local'."""
    email = verificar_token(credentials.credentials)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado"
        )
    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    usuario.ai_mode = datos.ai_mode
    db.commit()
    db.refresh(usuario)
    return usuario


@router.patch("/avatar", response_model=UsuarioRespuesta)
async def actualizar_avatar(
    datos: UsuarioActualizarAvatar,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Actualiza la imagen de avatar del usuario."""
    email = verificar_token(credentials.credentials)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado"
        )
    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    usuario.avatar_url = datos.avatar_url
    db.commit()
    db.refresh(usuario)
    return usuario