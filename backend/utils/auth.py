# utils/auth.py
# Funciones de autenticación: hashing de contraseñas y generación de tokens JWT

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)
load_dotenv()

# Configuración desde variables de entorno
SECRET_KEY = os.getenv("SECRET_KEY", "clave-secreta-por-defecto-cambiar")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "43200")
)  # 30 días por defecto

# Contexto para hashear contraseñas con bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verificar_password(password_plano: str, password_hasheado: str) -> bool:
    """
    Compara una contraseña en texto plano con su versión hasheada.
    Devuelve True si coinciden.
    """
    return pwd_context.verify(password_plano, password_hasheado)


def hashear_password(password: str) -> str:
    """
    Convierte una contraseña en texto plano a su versión hasheada con bcrypt.
    NUNCA almacenar contraseñas sin hashear.
    """
    return pwd_context.hash(password)


def crear_token_acceso(datos: dict,
                       expires_delta: Optional[timedelta] = None) -> str:
    """
    Genera un token JWT con los datos del usuario.
    Si no se especifica expiración, usa el valor de las variables de entorno.
    """
    datos_codificar = datos.copy()

    if expires_delta:
        expiracion = datetime.utcnow() + expires_delta
    else:
        expiracion = datetime.utcnow() + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )

    datos_codificar.update({"exp": expiracion})
    token = jwt.encode(datos_codificar, SECRET_KEY, algorithm=ALGORITHM)
    return token


def verificar_token(token: str) -> Optional[str]:
    """
    Verifica y decodifica un token JWT.
    Devuelve el email del usuario si el token es válido.
    Devuelve None si el token es inválido o ha expirado.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        return email
    except JWTError:
        return None