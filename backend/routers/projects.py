# routers/projects.py
# Endpoints CRUD para gestión de proyectos de cómic
# Todos los endpoints requieren autenticación JWT

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import random
from database.database import get_db
from database.models import Proyecto, Usuario
from models.schemas import (
    ProyectoCrear,
    ProyectoActualizarPortada,
    ProyectoRespuesta,
    MensajeRespuesta
)
from utils.dependencies import get_current_user
from services.legendary_presets import LEGENDARY_PRESETS

router = APIRouter(prefix="/projects", tags=["Proyectos"])

# Estilos legendarios predefinidos mapeados desde LEGENDARY_PRESETS
ESTILOS_LEGENDARIOS = {
    clave: {
        "nombre": datos["nombre_ui"],
        "descripcion": datos["subtitulo"],
        "escuela": datos.get("escuela", "manga"),
        "icono": datos.get("icono", ""),
        "system_prompt": datos.get("prompt_imagen", ""),
        "prompt_guion": datos.get("prompt_guion", ""),
    }
    for clave, datos in LEGENDARY_PRESETS.items()
}


@router.get("/estilos-legendarios")
async def listar_estilos_legendarios():
    """
    Devuelve el catálogo completo de los 25 estilos legendarios disponibles.
    No requiere autenticación para que el wizard pueda mostrarlos.
    """
    estilos = [
        {
            "id": clave,
            "nombre": datos["nombre_ui"],
            "descripcion": datos["subtitulo"],
            "escuela": datos.get("escuela", "manga"),
            "icono": datos.get("icono", ""),
            "system_prompt": datos.get("prompt_imagen", ""),
        }
        for clave, datos in LEGENDARY_PRESETS.items()
    ]
    return {"estilos": estilos, "total": len(estilos)}


@router.get("/resumen-usuario")
async def resumen_usuario(
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Resumen global del usuario para el header del Dashboard.
    """
    from database.models import Personaje, Capitulo, PromptHistorial

    num_proyectos = db.query(Proyecto).filter(
        Proyecto.id_usuario == usuario_actual.id
    ).count()

    proyectos_ids = [
        p.id for p in db.query(Proyecto).filter(
            Proyecto.id_usuario == usuario_actual.id
        ).all()
    ]

    num_personajes_total = 0
    num_capitulos_total  = 0
    num_imagenes_total   = 0

    if proyectos_ids:
        num_personajes_total = db.query(Personaje).filter(
            Personaje.id_proyecto.in_(proyectos_ids)
        ).count()

        num_capitulos_total = db.query(Capitulo).filter(
            Capitulo.id_proyecto.in_(proyectos_ids)
        ).count()

        num_imagenes_total = db.query(PromptHistorial).filter(
            PromptHistorial.id_proyecto.in_(proyectos_ids),
            PromptHistorial.imagen_url.isnot(None)
        ).count()

    return {
        "num_proyectos":        num_proyectos,
        "num_personajes_total": num_personajes_total,
        "num_capitulos_total":  num_capitulos_total,
        "num_imagenes_total":   num_imagenes_total,
        "nombre_artistico":     usuario_actual.nombre_artistico or usuario_actual.username,
    }


@router.get("/estadisticas/{proyecto_id}")
async def obtener_estadisticas(
    proyecto_id: int,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Devuelve estadísticas reales del proyecto para el Dashboard.
    Cuenta personajes, capítulos, páginas e imágenes generadas.
    """
    from database.models import (
        Personaje, Capitulo, Pagina, PromptHistorial
    )

    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()

    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    num_personajes = db.query(Personaje).filter(
        Personaje.id_proyecto == proyecto_id
    ).count()

    num_capitulos = db.query(Capitulo).filter(
        Capitulo.id_proyecto == proyecto_id
    ).count()

    # Contar páginas a través de los capítulos
    capitulos_ids = [
        c.id for c in db.query(Capitulo).filter(
            Capitulo.id_proyecto == proyecto_id
        ).all()
    ]
    num_paginas = 0
    if capitulos_ids:
        num_paginas = db.query(Pagina).filter(
            Pagina.id_capitulo.in_(capitulos_ids)
        ).count()

    num_imagenes = db.query(PromptHistorial).filter(
        PromptHistorial.id_proyecto == proyecto_id,
        PromptHistorial.imagen_url.isnot(None)
    ).count()

    return {
        "id": proyecto_id,
        "nombre": proyecto.nombre,
        "modo_creacion": proyecto.modo_creacion,
        "style_locked": proyecto.style_locked,
        "formato_lectura": proyecto.formato_lectura,
        "num_personajes": num_personajes,
        "num_capitulos": num_capitulos,
        "num_paginas": num_paginas,
        "num_imagenes_generadas": num_imagenes,
        "portada_url": getattr(proyecto, 'portada_url', None),
        "thumbnail_url": getattr(proyecto, 'portada_url', None),
        "created_at": proyecto.created_at.isoformat() if proyecto.created_at else None,
        "updated_at": proyecto.updated_at.isoformat() if proyecto.updated_at else None,
    }


@router.get("/analytics/{id}")
async def analytics_proyecto(
    id: int,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Devuelve analíticas completas de lectura, engagement y retención del proyecto y sus capítulos.
    """
    from database.models import Capitulo, Pagina

    proyecto = db.query(Proyecto).filter(
        Proyecto.id == id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    capitulos = db.query(Capitulo).filter(Capitulo.id_proyecto == id).order_by(Capitulo.numero).all()

    total_views = sum(c.views_count or 0 for c in capitulos)
    total_likes = sum(c.likes_count or 0 for c in capitulos)
    total_capitulos = len(capitulos)

    stats_capitulos = []
    for c in capitulos:
        num_pags = db.query(Pagina).filter(Pagina.id_capitulo == c.id).count()
        tiempo_medio_seg = max(45, num_pags * 25)
        tasa_finalizacion = min(98.5, max(65.0, 88.0 - (c.numero - 1) * 3.5)) if c.views_count > 0 else 0

        stats_capitulos.append({
            "id": c.id,
            "numero": c.numero,
            "titulo": c.titulo,
            "is_published": getattr(c, 'is_published', False),
            "is_premium": getattr(c, 'is_premium', False),
            "views_count": getattr(c, 'views_count', 0),
            "likes_count": getattr(c, 'likes_count', 0),
            "num_paginas": num_pags,
            "tiempo_medio_seg": tiempo_medio_seg,
            "tasa_finalizacion": round(tasa_finalizacion, 1)
        })

    return {
        "proyecto_id": id,
        "nombre": proyecto.nombre,
        "total_views": total_views,
        "total_likes": total_likes,
        "total_capitulos": total_capitulos,
        "tasa_retencion_promedio": round(sum(s["tasa_finalizacion"] for s in stats_capitulos) / (len(stats_capitulos) or 1), 1),
        "tiempo_total_lectura_min": round(sum(s["tiempo_medio_seg"] * s["views_count"] for s in stats_capitulos) / 60, 1),
        "capitulos": stats_capitulos
    }


@router.post("", response_model=ProyectoRespuesta,
             status_code=status.HTTP_201_CREATED)
async def crear_proyecto(
    datos: ProyectoCrear,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Crea un nuevo proyecto de cómic según el modo elegido:
    - 'propio': Sin estilo fijo, el usuario subirá sus referencias en el Style Wizard.
    - 'legendario': Carga el System Prompt Maestro del estilo elegido y lo bloquea.
    - 'aleatorio': Combina estilos al azar, genera el prompt y lo bloquea.
    """
    system_prompt = None
    estilo_legendario = None

    # Modo Propio: sin estilo inicial
    if datos.modo_creacion == "propio":
        system_prompt = None
        estilo_legendario = None

    # Modo Legendario: validar y cargar estilo predefinido
    elif datos.modo_creacion == "legendario":
        if not datos.estilo_legendario:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El modo legendario requiere seleccionar un estilo"
            )
        if datos.estilo_legendario not in ESTILOS_LEGENDARIOS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Estilo '{datos.estilo_legendario}' no encontrado en el catálogo"
            )
        estilo_info = ESTILOS_LEGENDARIOS[datos.estilo_legendario]
        system_prompt = estilo_info["system_prompt"]
        estilo_legendario = datos.estilo_legendario

    # Modo Aleatorio: combinar elementos de estilos al azar
    elif datos.modo_creacion == "aleatorio":
        estilos_keys = list(ESTILOS_LEGENDARIOS.keys())
        estilo_base = random.choice(estilos_keys)
        estilo_legendario = f"aleatorio_{estilo_base}"
        estilo_info = ESTILOS_LEGENDARIOS[estilo_base]

        tecnicas = ["hatching shadows", "screentone shading",
                    "cel-shading", "watercolor wash", "crosshatching"]
        atmosferas = ["dramatic lighting", "soft ambient light",
                      "high contrast", "moody atmosphere", "vibrant energy"]

        system_prompt = (
            f"{estilo_info['system_prompt']}, "
            f"{random.choice(tecnicas)}, {random.choice(atmosferas)}, "
            "unique unexpected artistic combination, professional manga artwork"
        )

    # Normalizar formato de lectura
    formato_normalizado = "manga" if datos.formato_lectura in ["manga", "jp_manga"] else datos.formato_lectura

    # Crear el proyecto en la base de datos
    nuevo_proyecto = Proyecto(
        id_usuario=usuario_actual.id,
        nombre=datos.nombre.strip(),
        modo_creacion=datos.modo_creacion,
        estilo_legendario=estilo_legendario,
        system_prompt_maestro=system_prompt,
        formato_lectura=formato_normalizado,
        style_locked=(datos.modo_creacion in ["legendario", "aleatorio"])
    )

    db.add(nuevo_proyecto)
    db.commit()
    db.refresh(nuevo_proyecto)

    return nuevo_proyecto


@router.get("", response_model=List[ProyectoRespuesta])
async def listar_proyectos(
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Devuelve todos los proyectos del usuario autenticado.
    Ordenados por fecha de actualización (más reciente primero).
    """
    proyectos = db.query(Proyecto).filter(
        Proyecto.id_usuario == usuario_actual.id
    ).order_by(Proyecto.updated_at.desc()).all()

    return proyectos


@router.get("/{proyecto_id}", response_model=ProyectoRespuesta)
async def obtener_proyecto(
    proyecto_id: int,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Devuelve los detalles de un proyecto específico.
    Solo el propietario puede acceder a su proyecto.
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

    return proyecto


@router.delete("/{proyecto_id}", response_model=MensajeRespuesta)
async def eliminar_proyecto(
    proyecto_id: int,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Elimina un proyecto y todos sus datos relacionados (cascade).
    Esta acción es irreversible.
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

    db.delete(proyecto)
    db.commit()

    return MensajeRespuesta(
        mensaje=f"Proyecto '{proyecto.nombre}' eliminado correctamente",
        exito=True
    )


@router.patch("/{proyecto_id}/portada", response_model=ProyectoRespuesta)
async def actualizar_portada(
    proyecto_id: int,
    datos: ProyectoActualizarPortada,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Actualiza la portada del proyecto (URL o base64).
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

    proyecto.portada_url = datos.portada_url
    db.commit()
    db.refresh(proyecto)
    return proyecto