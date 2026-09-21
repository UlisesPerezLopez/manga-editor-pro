# routers/chapters.py
# CRUD de capítulos y páginas para el editor de cómics.
# Gestiona la estructura narrativa y el guardado del canvas.

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database.database import get_db
from database.models import Capitulo, Pagina, Proyecto, Usuario
from models.schemas import (
    CapituloCrearRequest,
    CapituloActualizarRequest,
    CapituloRespuesta,
    CapituloConPaginasRespuesta,
    CapituloPublishStatusRequest,
    PaginaCrearRequest,
    PaginaRespuesta,
    PaginaGuardarRequest,
    MensajeRespuesta
)
from utils.dependencies import get_current_user

router = APIRouter(prefix="/chapters", tags=["Capítulos y Páginas"])


# ─── CAPÍTULOS ───────────────────────────────────────────────────────────────

@router.post("/{proyecto_id}",
             response_model=CapituloRespuesta,
             status_code=status.HTTP_201_CREATED)
async def crear_capitulo(
    proyecto_id: int,
    datos: CapituloCrearRequest,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crea un nuevo capítulo en el proyecto."""
    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    # Verificar que el número de capítulo no existe ya
    existente = db.query(Capitulo).filter(
        Capitulo.id_proyecto == proyecto_id,
        Capitulo.numero == datos.numero
    ).first()
    if existente:
        raise HTTPException(
            status_code=400,
            detail=f"Ya existe el capítulo {datos.numero} en este proyecto"
        )

    nuevo = Capitulo(
        id_proyecto=proyecto_id,
        numero=datos.numero,
        titulo=datos.titulo or f"Capítulo {datos.numero}",
        sinopsis=datos.sinopsis,
        guion_json=datos.guion_json
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


@router.get("/{proyecto_id}",
            response_model=List[CapituloConPaginasRespuesta])
async def listar_capitulos(
    proyecto_id: int,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Devuelve todos los capítulos del proyecto con sus páginas incluidas.
    Ordenados por número de capítulo ascendente.
    """
    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    capitulos = db.query(Capitulo).filter(
        Capitulo.id_proyecto == proyecto_id
    ).order_by(Capitulo.numero).all()

    return capitulos


@router.patch("/{proyecto_id}/capitulo/{capitulo_id}",
              response_model=CapituloRespuesta)
async def actualizar_capitulo(
    proyecto_id: int,
    capitulo_id: int,
    datos: CapituloActualizarRequest,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualiza los datos de un capítulo (título, sinopsis/guion, desglose JSON)."""
    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    capitulo = db.query(Capitulo).filter(
        Capitulo.id == capitulo_id,
        Capitulo.id_proyecto == proyecto_id
    ).first()
    if not capitulo:
        raise HTTPException(status_code=404, detail="Capítulo no encontrado")

    if datos.titulo is not None:
        capitulo.titulo = datos.titulo
    if datos.sinopsis is not None:
        capitulo.sinopsis = datos.sinopsis
    if datos.guion_json is not None:
        capitulo.guion_json = datos.guion_json

    db.commit()
    db.refresh(capitulo)
    return capitulo


@router.delete("/{proyecto_id}/capitulo/{capitulo_id}",
               response_model=MensajeRespuesta)
async def eliminar_capitulo(
    proyecto_id: int,
    capitulo_id: int,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Elimina un capítulo y todas sus páginas (cascade)."""
    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    capitulo = db.query(Capitulo).filter(
        Capitulo.id == capitulo_id,
        Capitulo.id_proyecto == proyecto_id
    ).first()
    if not capitulo:
        raise HTTPException(status_code=404, detail="Capítulo no encontrado")

    titulo = capitulo.titulo
    db.delete(capitulo)
    db.commit()

    return MensajeRespuesta(
        mensaje=f"Capítulo '{titulo}' eliminado",
        exito=True
    )


# ─── PÁGINAS ─────────────────────────────────────────────────────────────────

@router.post("/{proyecto_id}/capitulo/{capitulo_id}/pagina",
             response_model=PaginaRespuesta,
             status_code=status.HTTP_201_CREATED)
async def crear_pagina(
    proyecto_id: int,
    capitulo_id: int,
    datos: PaginaCrearRequest,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crea una nueva página en un capítulo."""
    # Verificar acceso al proyecto
    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    capitulo = db.query(Capitulo).filter(
        Capitulo.id == capitulo_id,
        Capitulo.id_proyecto == proyecto_id
    ).first()
    if not capitulo:
        raise HTTPException(status_code=404, detail="Capítulo no encontrado")

    # Verificar que el número de página no existe ya en este capítulo
    existente = db.query(Pagina).filter(
        Pagina.id_capitulo == capitulo_id,
        Pagina.numero == datos.numero
    ).first()
    if existente:
        raise HTTPException(
            status_code=400,
            detail=f"Ya existe la página {datos.numero} en este capítulo"
        )

    nueva = Pagina(
        id_capitulo=capitulo_id,
        numero=datos.numero,
        layout_template=datos.layout_template or "blank",
        canvas_json=None
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva


@router.get("/{proyecto_id}/pagina/{pagina_id}",
            response_model=PaginaRespuesta)
async def obtener_pagina(
    proyecto_id: int,
    pagina_id: int,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Devuelve los datos completos de una página, incluido el canvas_json."""
    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    pagina = db.query(Pagina).filter(
        Pagina.id == pagina_id
    ).first()
    if not pagina:
        raise HTTPException(status_code=404, detail="Página no encontrada")

    return pagina


@router.put("/{proyecto_id}/pagina/{pagina_id}/guardar",
            response_model=MensajeRespuesta)
async def guardar_canvas(
    proyecto_id: int,
    pagina_id: int,
    datos: PaginaGuardarRequest,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Guarda el estado del canvas de Fabric.js en la base de datos.
    Este endpoint se llama automáticamente cada 30 segundos
    y también al cerrar la página.
    """
    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    pagina = db.query(Pagina).filter(
        Pagina.id == pagina_id
    ).first()
    if not pagina:
        raise HTTPException(status_code=404, detail="Página no encontrada")

    pagina.canvas_json = datos.canvas_json
    if datos.thumbnail_url:
        pagina.thumbnail_url = datos.thumbnail_url

    db.commit()

    return MensajeRespuesta(
        mensaje="Canvas guardado correctamente",
        exito=True
    )


@router.delete("/{proyecto_id}/pagina/{pagina_id}",
               response_model=MensajeRespuesta)
async def eliminar_pagina(
    proyecto_id: int,
    pagina_id: int,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Elimina una página y todas sus viñetas (cascade)."""
    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    pagina = db.query(Pagina).filter(
        Pagina.id == pagina_id
    ).first()
    if not pagina:
        raise HTTPException(status_code=404, detail="Página no encontrada")

    db.delete(pagina)
    db.commit()

    return MensajeRespuesta(
        mensaje=f"Página {pagina.numero} eliminada",
        exito=True
    )


# ─── PUBLICACIÓN, MONETIZACIÓN Y ENGAGEMENT ────────────────────────────────

@router.patch("/{proyecto_id}/capitulo/{capitulo_id}/publish-status",
              response_model=CapituloRespuesta)
async def actualizar_estado_publicacion(
    proyecto_id: int,
    capitulo_id: int,
    datos: CapituloPublishStatusRequest,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualiza si el capítulo es público, premium o acceso anticipado."""
    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    capitulo = db.query(Capitulo).filter(
        Capitulo.id == capitulo_id,
        Capitulo.id_proyecto == proyecto_id
    ).first()
    if not capitulo:
        raise HTTPException(status_code=404, detail="Capítulo no encontrado")

    if datos.is_published is not None:
        capitulo.is_published = datos.is_published
    if datos.is_premium is not None:
        capitulo.is_premium = datos.is_premium
    if datos.early_access is not None:
        capitulo.early_access = datos.early_access

    db.commit()
    db.refresh(capitulo)
    return capitulo


@router.post("/{proyecto_id}/capitulo/{capitulo_id}/like",
             response_model=MensajeRespuesta)
async def registrar_like(
    proyecto_id: int,
    capitulo_id: int,
    db: Session = Depends(get_db)
):
    """Incrementa el contador de likes del capítulo."""
    capitulo = db.query(Capitulo).filter(
        Capitulo.id == capitulo_id,
        Capitulo.id_proyecto == proyecto_id
    ).first()
    if not capitulo:
        raise HTTPException(status_code=404, detail="Capítulo no encontrado")

    capitulo.likes_count = (capitulo.likes_count or 0) + 1
    db.commit()

    return MensajeRespuesta(
        mensaje="Like registrado",
        exito=True,
        datos={"likes_count": capitulo.likes_count}
    )


@router.post("/{proyecto_id}/capitulo/{capitulo_id}/view",
             response_model=MensajeRespuesta)
async def registrar_lectura(
    proyecto_id: int,
    capitulo_id: int,
    db: Session = Depends(get_db)
):
    """Incrementa el contador de visualizaciones/lecturas del capítulo."""
    capitulo = db.query(Capitulo).filter(
        Capitulo.id == capitulo_id,
        Capitulo.id_proyecto == proyecto_id
    ).first()
    if not capitulo:
        raise HTTPException(status_code=404, detail="Capítulo no encontrado")

    capitulo.views_count = (capitulo.views_count or 0) + 1
    db.commit()

    return MensajeRespuesta(
        mensaje="Lectura registrada",
        exito=True,
        datos={"views_count": capitulo.views_count}
    )