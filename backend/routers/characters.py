# routers/characters.py
# CRUD completo de personajes para MEP — Manga Editor Pro.
# Incluye generación automática de Ficha Técnica IA modular (Qwen Local / Cloud Free).

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database.database import get_db
from database.models import Personaje, Proyecto, Usuario
from models.schemas import (
    PersonajeCrearCompleto,
    PersonajeActualizar,
    PersonajeRespuestaCompleta,
    MensajeRespuesta
)
from services.text_engine import text_engine
from utils.dependencies import get_current_user

router = APIRouter(prefix="/characters", tags=["Personajes"])


async def _generar_ficha_tecnica(
    personaje_data: dict,
    nombre_proyecto: str,
    system_prompt_estilo: str = None,
    modo: str = "cloud_free"
) -> str:
    """
    Genera la Ficha Técnica IA del personaje usando el motor textual configurado.
    """
    return await text_engine.generar_ficha_tecnica(
        personaje_data=personaje_data,
        nombre_proyecto=nombre_proyecto,
        system_prompt_estilo=system_prompt_estilo,
        modo=modo
    )


@router.post("/{proyecto_id}",
             response_model=PersonajeRespuestaCompleta,
             status_code=status.HTTP_201_CREATED)
async def crear_personaje(
    proyecto_id: int,
    datos: PersonajeCrearCompleto,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Crea un nuevo personaje en el proyecto.
    Si generar_ficha_ia=True, genera automáticamente la ficha técnica IA
    según el modo de IA activo del usuario ('local' u 'cloud_free').
    """
    modo_ai = getattr(usuario_actual, "ai_mode", "cloud_free") or "cloud_free"

    # Verificar que el proyecto existe y pertenece al usuario
    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()

    if not proyecto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proyecto no encontrado"
        )

    # Generar Ficha Técnica IA si se solicita
    prompt_ia = None
    if datos.generar_ficha_ia and (
        datos.descripcion_fisica or datos.personalidad
    ):
        try:
            print(f"🤖 Generando Ficha Técnica IA para '{datos.nombre}' [Modo: {modo_ai}]...")
            prompt_ia = await _generar_ficha_tecnica(
                personaje_data=datos.model_dump(),
                nombre_proyecto=proyecto.nombre,
                system_prompt_estilo=proyecto.system_prompt_maestro,
                modo=modo_ai
            )
            print(f"✅ Ficha Técnica generada para '{datos.nombre}'")
        except Exception as e:
            print(f"⚠️ No se pudo generar Ficha Técnica: {e}")
            prompt_ia = None

    # Crear el personaje en la BD
    nuevo_personaje = Personaje(
        id_proyecto=proyecto_id,
        nombre=datos.nombre,
        rol=datos.rol,
        descripcion_fisica=datos.descripcion_fisica,
        ropa_tipica=datos.ropa_tipica,
        personalidad=datos.personalidad,
        arco_narrativo=datos.arco_narrativo,
        motivacion=datos.motivacion,
        prompt_ia=prompt_ia
    )

    db.add(nuevo_personaje)
    db.commit()
    db.refresh(nuevo_personaje)

    return nuevo_personaje


@router.get("/{proyecto_id}",
            response_model=List[PersonajeRespuestaCompleta])
async def listar_personajes(
    proyecto_id: int,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Devuelve todos los personajes de un proyecto.
    Verifica que el proyecto pertenece al usuario autenticado.
    """
    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()

    if not proyecto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proyecto no encontrado"
        )

    personajes = db.query(Personaje).filter(
        Personaje.id_proyecto == proyecto_id
    ).all()

    return personajes


@router.get("/{proyecto_id}/{personaje_id}",
            response_model=PersonajeRespuestaCompleta)
async def obtener_personaje(
    proyecto_id: int,
    personaje_id: int,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Devuelve los datos completos de un personaje específico."""
    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()

    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    personaje = db.query(Personaje).filter(
        Personaje.id == personaje_id,
        Personaje.id_proyecto == proyecto_id
    ).first()

    if not personaje:
        raise HTTPException(status_code=404, detail="Personaje no encontrado")

    return personaje


@router.put("/{proyecto_id}/{personaje_id}",
            response_model=PersonajeRespuestaCompleta)
async def actualizar_personaje(
    proyecto_id: int,
    personaje_id: int,
    datos: PersonajeActualizar,
    regenerar_ficha: bool = False,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Actualiza los datos de un personaje.
    Si regenerar_ficha=True, regenera la Ficha Técnica IA con el motor del usuario.
    """
    modo_ai = getattr(usuario_actual, "ai_mode", "cloud_free") or "cloud_free"

    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()

    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    personaje = db.query(Personaje).filter(
        Personaje.id == personaje_id,
        Personaje.id_proyecto == proyecto_id
    ).first()

    if not personaje:
        raise HTTPException(status_code=404, detail="Personaje no encontrado")

    # Aplicar solo los campos que vienen en la petición
    datos_actualizacion = datos.model_dump(exclude_unset=True)
    for campo, valor in datos_actualizacion.items():
        setattr(personaje, campo, valor)

    # Regenerar Ficha Técnica IA si se solicita
    if regenerar_ficha:
        try:
            print(f"🤖 Regenerando Ficha Técnica IA para '{personaje.nombre}' [Modo: {modo_ai}]...")
            personaje_dict = {
                "nombre": personaje.nombre,
                "rol": personaje.rol,
                "descripcion_fisica": personaje.descripcion_fisica,
                "ropa_tipica": personaje.ropa_tipica,
                "personalidad": personaje.personalidad,
                "motivacion": personaje.motivacion,
            }
            personaje.prompt_ia = await _generar_ficha_tecnica(
                personaje_data=personaje_dict,
                nombre_proyecto=proyecto.nombre,
                system_prompt_estilo=proyecto.system_prompt_maestro,
                modo=modo_ai
            )
            print(f"✅ Ficha Técnica regenerada para '{personaje.nombre}'")
        except Exception as e:
            print(f"⚠️ Error regenerando Ficha Técnica: {e}")

    db.commit()
    db.refresh(personaje)

    return personaje


@router.delete("/{proyecto_id}/{personaje_id}",
               response_model=MensajeRespuesta)
async def eliminar_personaje(
    proyecto_id: int,
    personaje_id: int,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Elimina un personaje del proyecto."""
    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()

    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    personaje = db.query(Personaje).filter(
        Personaje.id == personaje_id,
        Personaje.id_proyecto == proyecto_id
    ).first()

    if not personaje:
        raise HTTPException(status_code=404, detail="Personaje no encontrado")

    nombre = personaje.nombre
    db.delete(personaje)
    db.commit()

    return MensajeRespuesta(
        mensaje=f"Personaje '{nombre}' eliminado correctamente",
        exito=True
    )


@router.post("/{proyecto_id}/{personaje_id}/regenerar-ficha",
             response_model=PersonajeRespuestaCompleta)
async def regenerar_ficha_tecnica(
    proyecto_id: int,
    personaje_id: int,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Endpoint dedicado para regenerar solo la Ficha Técnica IA
    sin modificar otros datos del personaje.
    """
    modo_ai = getattr(usuario_actual, "ai_mode", "cloud_free") or "cloud_free"

    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()

    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    personaje = db.query(Personaje).filter(
        Personaje.id == personaje_id,
        Personaje.id_proyecto == proyecto_id
    ).first()

    if not personaje:
        raise HTTPException(status_code=404, detail="Personaje no encontrado")

    if not personaje.descripcion_fisica and not personaje.personalidad:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El personaje necesita descripción física o personalidad "
                   "para generar la Ficha Técnica IA"
        )

    try:
        personaje_dict = {
            "nombre": personaje.nombre,
            "rol": personaje.rol,
            "descripcion_fisica": personaje.descripcion_fisica,
            "ropa_tipica": personaje.ropa_tipica,
            "personalidad": personaje.personalidad,
            "motivacion": personaje.motivacion,
        }
        personaje.prompt_ia = await _generar_ficha_tecnica(
            personaje_data=personaje_dict,
            nombre_proyecto=proyecto.nombre,
            system_prompt_estilo=proyecto.system_prompt_maestro,
            modo=modo_ai
        )
        db.commit()
        db.refresh(personaje)
        return personaje

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Error al regenerar Ficha Técnica ({modo_ai}): {str(e)}"
        )