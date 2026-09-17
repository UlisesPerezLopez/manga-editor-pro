# routers/style.py
# Endpoints para el sistema de Firma Visual.
# Permite subir imágenes de referencia, analizarlas con Gemini Vision,
# validar el estilo generado y bloquearlo en el proyecto.

import os
import shutil
import uuid
from pathlib import Path
from typing import List

from fastapi import (APIRouter, Depends, HTTPException,
                     UploadFile, File, Form, status)
from sqlalchemy.orm import Session

from database.database import get_db
from database.models import Proyecto, ReferenciaEstilo, Usuario
from services.style_analyzer import (
    analizar_conjunto_imagenes,
    generar_system_prompt_maestro
)
from utils.dependencies import get_current_user

router = APIRouter(prefix="/style", tags=["Firma Visual"])

# Carpeta donde se guardan las imágenes de referencia
UPLOADS_DIR = Path("uploads/referencias")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# Extensiones de imagen permitidas
EXTENSIONES_PERMITIDAS = {".jpg", ".jpeg", ".png", ".webp"}
TAMANO_MAXIMO_MB = 10


def _validar_imagen(archivo: UploadFile) -> None:
    """Valida que el archivo sea una imagen permitida y no supere el límite."""
    extension = Path(archivo.filename).suffix.lower()
    if extension not in EXTENSIONES_PERMITIDAS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato no permitido: {extension}. "
                   f"Usa: {', '.join(EXTENSIONES_PERMITIDAS)}"
        )


def _guardar_imagen(archivo: UploadFile, id_proyecto: int) -> str:
    """
    Guarda una imagen en disco con un nombre único.
    Devuelve la ruta relativa del archivo guardado.
    """
    carpeta_proyecto = UPLOADS_DIR / str(id_proyecto)
    carpeta_proyecto.mkdir(parents=True, exist_ok=True)

    extension = Path(archivo.filename).suffix.lower()
    nombre_unico = f"{uuid.uuid4().hex}{extension}"
    ruta_completa = carpeta_proyecto / nombre_unico

    with open(ruta_completa, "wb") as f:
        shutil.copyfileobj(archivo.file, f)

    return str(ruta_completa)


@router.post("/upload-referencias/{proyecto_id}")
async def subir_referencias(
    proyecto_id: int,
    imagenes: List[UploadFile] = File(...),
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sube entre 5 y 10 imágenes de referencia para el proyecto.
    Las guarda en disco y registra las rutas en la base de datos.
    No inicia el análisis todavía (el usuario decide cuándo analizar).
    """
    # Verificar que el proyecto existe y pertenece al usuario
    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    # Verificar que el estilo no está ya bloqueado
    if proyecto.style_locked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El estilo de este proyecto ya está bloqueado. "
                   "No se pueden añadir más referencias."
        )

    # --- NUEVO BLOQUE: Limpiar referencias anteriores (BD y Disco) ---
    referencias_viejas = db.query(ReferenciaEstilo).filter(
        ReferenciaEstilo.id_proyecto == proyecto_id
    ).all()
    
    for ref in referencias_viejas:
        if ref.imagen_url and Path(ref.imagen_url).exists():
            try:
                os.remove(ref.imagen_url)
            except Exception:
                pass
        db.delete(ref)
    # -----------------------------------------------------------------

    # Validar número de imágenes
    if len(imagenes) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sube al menos 3 imágenes de referencia "
                   "(recomendado: 5-10 para mejor resultado)"
        )
    if len(imagenes) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Máximo 10 imágenes por análisis"
        )

    rutas_guardadas = []
    errores = []

    for imagen in imagenes:
        try:
            _validar_imagen(imagen)
            ruta = _guardar_imagen(imagen, proyecto_id)

            # Registrar en la base de datos
            referencia = ReferenciaEstilo(
                id_proyecto=proyecto_id,
                imagen_url=ruta,
                analisis_json=None  # Se rellena en el análisis
            )
            db.add(referencia)
            rutas_guardadas.append(ruta)

        except HTTPException as e:
            errores.append(f"{imagen.filename}: {e.detail}")
        except Exception as e:
            errores.append(f"{imagen.filename}: error al guardar")
            print(f"Error guardando {imagen.filename}: {e}")

    db.commit()

    return {
        "exito": True,
        "imagenes_subidas": len(rutas_guardadas),
        "errores": errores,
        "mensaje": f"{len(rutas_guardadas)} imágenes subidas. "
                   f"Listas para analizar."
    }


@router.post("/analizar/{proyecto_id}")
async def analizar_estilo(
    proyecto_id: int,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analiza todas las imágenes de referencia del proyecto con Gemini Vision.
    Genera el perfil de estilo consolidado y el System Prompt Maestro.
    Este proceso puede tardar 30-90 segundos según el número de imágenes.
    NO bloquea el estilo todavía — el usuario debe validar primero.
    """
    # Verificar proyecto
    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    if proyecto.style_locked:
        raise HTTPException(
            status_code=400,
            detail="El estilo ya está bloqueado en este proyecto"
        )

    # Obtener referencias subidas
    referencias = db.query(ReferenciaEstilo).filter(
        ReferenciaEstilo.id_proyecto == proyecto_id
    ).all()

    if len(referencias) < 3:
        raise HTTPException(
            status_code=400,
            detail="Necesitas al menos 3 imágenes de referencia. "
                   "Sube más imágenes antes de analizar."
        )

    # Verificar que los archivos existen en disco
    rutas_validas = []
    for ref in referencias:
        if ref.imagen_url and Path(ref.imagen_url).exists():
            rutas_validas.append(ref.imagen_url)

    if len(rutas_validas) < 3:
        raise HTTPException(
            status_code=400,
            detail="No se encuentran las imágenes en el servidor. "
                   "Vuelve a subir las referencias."
        )

    print(f"🎨 Iniciando análisis de Firma Visual para proyecto {proyecto_id}...")
    print(f"   Procesando {len(rutas_validas)} imágenes...")

    try:
        # Fase 1: Analizar cada imagen individualmente
        perfil_consolidado = await analizar_conjunto_imagenes(rutas_validas)

        # Fase 2: Generar el System Prompt Maestro
        system_prompt = await generar_system_prompt_maestro(
            perfil_consolidado,
            proyecto.nombre
        )

        # Guardar el perfil en el proyecto (sin bloquear todavía)
        proyecto.system_prompt_maestro = system_prompt
        proyecto.paleta_colores = perfil_consolidado.get("paleta_colores", [])
        proyecto.tecnica_linea = perfil_consolidado.get("tecnica_linea", "")
        proyecto.estilo_sombreado = perfil_consolidado.get("estilo_sombreado", "")

        # Actualizar el análisis en cada referencia
        for ref in referencias:
            if ref.imagen_url in rutas_validas:
                ref.analisis_json = {"procesada": True}

        db.commit()

        print(f"✅ Firma Visual generada para proyecto {proyecto_id}")

        return {
            "exito": True,
            "perfil_estilo": perfil_consolidado,
            "system_prompt_maestro": system_prompt,
            "num_imagenes_procesadas": len(rutas_validas),
            "mensaje": "Firma Visual generada. Valida el resultado y bloquea el estilo."
        }

    except Exception as e:
        print(f"❌ Error en análisis de Firma Visual: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Error durante el análisis: {str(e)}"
        )


@router.post("/bloquear/{proyecto_id}")
async def bloquear_estilo(
    proyecto_id: int,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Bloquea el estilo del proyecto como DEFINITIVO.
    Una vez bloqueado, no se puede modificar sin crear un nuevo proyecto.
    Esta es la acción final de la Fase 1 — Regla de Oro.
    """
    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    if not proyecto.system_prompt_maestro:
        raise HTTPException(
            status_code=400,
            detail="Primero debes analizar las imágenes de referencia "
                   "para generar la Firma Visual"
        )

    if proyecto.style_locked:
        raise HTTPException(
            status_code=400,
            detail="El estilo ya está bloqueado"
        )

    proyecto.style_locked = True
    db.commit()

    print(f"🔒 Estilo bloqueado para proyecto {proyecto_id}: {proyecto.nombre}")

    return {
        "exito": True,
        "style_locked": True,
        "mensaje": f"¡Firma Visual bloqueada! "
                   f"Todas las generaciones de '{proyecto.nombre}' "
                   f"usarán este estilo de forma permanente."
    }


@router.get("/estado/{proyecto_id}")
async def obtener_estado_estilo(
    proyecto_id: int,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Devuelve el estado actual de la Firma Visual del proyecto:
    cuántas referencias hay subidas, si hay análisis y si está bloqueado.
    """
    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    num_referencias = db.query(ReferenciaEstilo).filter(
        ReferenciaEstilo.id_proyecto == proyecto_id
    ).count()

    return {
        "modo_creacion": proyecto.modo_creacion,
        "num_referencias": num_referencias,
        "tiene_analisis": bool(proyecto.system_prompt_maestro),
        "style_locked": proyecto.style_locked,
        "paleta_colores": proyecto.paleta_colores or [],
        "tecnica_linea": proyecto.tecnica_linea or "",
        "system_prompt_preview": (
            proyecto.system_prompt_maestro[:150] + "..."
            if proyecto.system_prompt_maestro else None
        )
    }


@router.delete("/referencias/{proyecto_id}")
async def eliminar_referencias(
    proyecto_id: int,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Elimina todas las imágenes de referencia del proyecto del disco y la BD.
    Solo disponible si el estilo NO está bloqueado.
    """
    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    if proyecto.style_locked:
        raise HTTPException(
            status_code=400,
            detail="No se pueden eliminar referencias con el estilo bloqueado"
        )

    referencias = db.query(ReferenciaEstilo).filter(
        ReferenciaEstilo.id_proyecto == proyecto_id
    ).all()

    eliminadas = 0
    for ref in referencias:
        if ref.imagen_url and Path(ref.imagen_url).exists():
            try:
                os.remove(ref.imagen_url)
                eliminadas += 1
            except Exception:
                pass
        db.delete(ref)

    # Limpiar el análisis del proyecto
    proyecto.system_prompt_maestro = None
    proyecto.paleta_colores = None
    proyecto.tecnica_linea = None
    proyecto.estilo_sombreado = None

    db.commit()

    return {
        "exito": True,
        "imagenes_eliminadas": eliminadas,
        "mensaje": "Referencias eliminadas. Puedes subir nuevas imágenes."
    }