import os
import shutil
import uuid
import logging
from pathlib import Path
import random
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

logger = logging.getLogger("mep.projects")

from database.database import get_db
from database.models import Proyecto, Usuario, ReferenciaEstilo, Personaje
from database import models
from models.schemas import (
    ProyectoCrear,
    ProyectoActualizarPortada,
    ProyectoActualizar,
    GenerarPortadaRequest,
    GenerarImagenVinetaRequest,
    GuardarVinetaRequest,
    VinetaRespuesta,
    ProyectoRespuesta,
    MensajeRespuesta,
    FirmaVisualDiagnostico,
    FirmaVisualActualizarRequest,
    FirmaVisualRespuesta
)
from utils.dependencies import get_current_user
from services.legendary_presets import LEGENDARY_PRESETS
from services.style_analyzer import (
    analizar_conjunto_imagenes,
    generar_system_prompt_maestro
)
import services.ai_router as ai_router
from services.ai_router import (
    optimizar_descripcion_escena_con_llm,
    generar_imagen_panel,
    asegurar_longitud_prompt,
    traducir_escena_asistida,
    contiene_espanol
)
from data.style_bibles import get_style_tokens

router = APIRouter(prefix="/projects", tags=["Proyectos"])

# Directorio base para subida de referencias de firma visual y portadas
REFERENCIAS_UPLOAD_DIR = Path("uploads/referencias")
REFERENCIAS_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
PORTADAS_UPLOAD_DIR = Path("uploads/portadas")
PORTADAS_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
EXTENSIONES_PERMITIDAS = {".jpg", ".jpeg", ".png", ".webp"}

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


def asegurar_estilo_proyecto(proyecto: Proyecto, db: Session) -> Proyecto:
    """Garantiza que un proyecto nunca tenga estilo_visual nulo, asignando mortadela_y_salchichon por defecto."""
    if not getattr(proyecto, "estilo_visual", None):
        estilo = getattr(proyecto, "estilo_legendario", None) or "mortadela_y_salchichon"
        for pref in ["aleatorio_", "legendario_"]:
            estilo = estilo.replace(pref, "")
        if not estilo:
            estilo = "mortadela_y_salchichon"
        proyecto.estilo_visual = estilo
        if not proyecto.style_prompt:
            proyecto.style_prompt = get_style_tokens(estilo)
        if not proyecto.system_prompt_maestro:
            proyecto.system_prompt_maestro = proyecto.style_prompt
        try:
            db.commit()
            db.refresh(proyecto)
        except Exception:
            db.rollback()
    return proyecto


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


@router.get("/styles/{style_id}")
def obtener_detalle_estilo(style_id: str):
    """
    Retorna los metadatos de la Biblia de Estilos y la lista de imágenes locales de muestra.
    """
    from data.style_bibles import get_style_bible, get_style_reference_images
    bible = get_style_bible(style_id)
    referencias = get_style_reference_images(style_id)
    return {
        "status": "ok",
        "style_id": style_id,
        "detalles": bible,
        "referencias": referencias
    }


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
    Crea un nuevo proyecto de cómic asegurando que siempre tenga una de las 25 Biblias de Estilo asignadas:
    - Inicializa estilo_visual = datos.estilo_visual or "mortadela_y_salchichon".
    - Pobla style_prompt automáticamente vía get_style_tokens(estilo_visual).
    """
    # Determinar estilo visual canónico (limpiando prefijos)
    estilo_candidato = getattr(datos, "estilo_visual", None) or getattr(datos, "estilo_legendario", None) or "mortadela_y_salchichon"
    for pref in ["legendario_", "aleatorio_"]:
        estilo_candidato = estilo_candidato.replace(pref, "")
    if not estilo_candidato:
        estilo_candidato = "mortadela_y_salchichon"

    estilo_visual = estilo_candidato
    style_tokens = get_style_tokens(estilo_visual)
    estilo_legendario = estilo_visual
    system_prompt = style_tokens

    # Modo Legendario
    if datos.modo_creacion == "legendario" and datos.estilo_legendario:
        clean_leg = datos.estilo_legendario.replace("legendario_", "")
        if clean_leg in ESTILOS_LEGENDARIOS:
            estilo_visual = clean_leg
            estilo_legendario = clean_leg
            style_tokens = get_style_tokens(estilo_visual)
            system_prompt = style_tokens

    # Modo Aleatorio: enriquecer con directivas artísticas
    elif datos.modo_creacion == "aleatorio":
        if not getattr(datos, "estilo_visual", None) or datos.estilo_visual == "mortadela_y_salchichon":
            estilos_keys = list(ESTILOS_LEGENDARIOS.keys())
            estilo_visual = random.choice(estilos_keys)
            style_tokens = get_style_tokens(estilo_visual)
        estilo_legendario = f"aleatorio_{estilo_visual}"
        
        tecnicas = ["hatching shadows", "screentone shading",
                    "cel-shading", "watercolor wash", "crosshatching"]
        atmosferas = ["dramatic lighting", "soft ambient light",
                      "high contrast", "moody atmosphere", "vibrant energy"]

        system_prompt = (
            f"{style_tokens}, "
            f"{random.choice(tecnicas)}, {random.choice(atmosferas)}, "
            "unique unexpected artistic combination, professional comic artwork"
        )

    # Normalizar formato de lectura
    formato_normalizado = "manga" if datos.formato_lectura in ["manga", "jp_manga"] else datos.formato_lectura

    # Crear el proyecto en la base de datos con estilo canónico asegurado
    nuevo_proyecto = Proyecto(
        id_usuario=usuario_actual.id,
        nombre=datos.nombre.strip(),
        modo_creacion=datos.modo_creacion,
        estilo_visual=estilo_visual,
        estilo_legendario=estilo_legendario,
        system_prompt_maestro=system_prompt,
        style_prompt=style_tokens,
        formato_lectura=formato_normalizado,
        style_locked=(datos.modo_creacion == "legendario")
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
    Garantiza que ningún proyecto tenga estilo_visual nulo.
    """
    proyectos = db.query(Proyecto).filter(
        Proyecto.id_usuario == usuario_actual.id
    ).order_by(Proyecto.updated_at.desc()).all()

    for p in proyectos:
        asegurar_estilo_proyecto(p, db)

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
    Garantiza que el estilo_visual esté siempre poblado.
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

    asegurar_estilo_proyecto(proyecto, db)
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


@router.patch("/{proyecto_id}", response_model=ProyectoRespuesta)
async def actualizar_proyecto(
    proyecto_id: int,
    datos: ProyectoActualizar,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Actualiza datos generales y narrativos del proyecto (nombre, sinopsis, premisa, género, tono, etc.).
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

    if datos.nombre is not None:
        proyecto.nombre = datos.nombre.strip()
    if datos.sinopsis is not None:
        proyecto.sinopsis = datos.sinopsis
    if datos.premisa is not None:
        proyecto.premisa = datos.premisa
    if datos.genero is not None:
        proyecto.genero = datos.genero
    if datos.tono is not None:
        proyecto.tono = datos.tono
    if datos.num_capitulos is not None:
        proyecto.num_capitulos = datos.num_capitulos
    if datos.formato_lectura is not None:
        proyecto.formato_lectura = "manga" if datos.formato_lectura in ["manga", "jp_manga"] else datos.formato_lectura
    if datos.portada_url is not None:
        proyecto.portada_url = datos.portada_url
    if getattr(datos, "estilo_visual", None) is not None:
        clean_est = datos.estilo_visual.replace("legendario_", "").replace("aleatorio_", "")
        proyecto.estilo_visual = clean_est
        tokens = get_style_tokens(clean_est)
        proyecto.style_prompt = tokens
        proyecto.system_prompt_maestro = tokens

    db.commit()
    db.refresh(proyecto)
    asegurar_estilo_proyecto(proyecto, db)
    return proyecto


# ─── ENDPOINTS DE FIRMA VISUAL ───────────────────────────────────────────────

@router.post("/{proyecto_id}/firma-visual/upload")
async def subir_referencias_firma(
    proyecto_id: int,
    imagenes: List[UploadFile] = File(...),
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sube entre 1 y 10 imágenes de referencia artística para el proyecto.
    Las guarda en 'uploads/referencias/{proyecto_id}/' y registra sus URLs en el proyecto.
    """
    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()

    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    if proyecto.style_locked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El estilo de este proyecto ya está bloqueado. No se pueden añadir más referencias."
        )

    if not imagenes:
        raise HTTPException(status_code=400, detail="Debes enviar al menos 1 imagen")

    imagenes_existentes = proyecto.imagenes_referencia or []
    if len(imagenes_existentes) + len(imagenes) > 10:
        raise HTTPException(
            status_code=400,
            detail=f"Máximo 10 imágenes de referencia permitidas. Actualmente tienes {len(imagenes_existentes)}."
        )

    carpeta_proyecto = REFERENCIAS_UPLOAD_DIR / str(proyecto_id)
    carpeta_proyecto.mkdir(parents=True, exist_ok=True)

    rutas_web = list(imagenes_existentes)
    nuevas_subidas = 0

    for img in imagenes:
        ext = Path(img.filename).suffix.lower()
        if ext not in EXTENSIONES_PERMITIDAS:
            raise HTTPException(
                status_code=400,
                detail=f"Formato no permitido: {ext}. Formatos aceptados: {', '.join(EXTENSIONES_PERMITIDAS)}"
            )

        nombre_archivo = f"{uuid.uuid4().hex}{ext}"
        ruta_disco = carpeta_proyecto / nombre_archivo

        with open(ruta_disco, "wb") as f:
            shutil.copyfileobj(img.file, f)

        ruta_web = f"/uploads/referencias/{proyecto_id}/{nombre_archivo}"
        rutas_web.append(ruta_web)
        nuevas_subidas += 1

        # Registrar en la tabla ReferenciaEstilo
        ref_db = ReferenciaEstilo(
            id_proyecto=proyecto_id,
            imagen_url=str(ruta_disco),
            analisis_json=None
        )
        db.add(ref_db)

    proyecto.imagenes_referencia = rutas_web
    db.commit()
    db.refresh(proyecto)

    return {
        "exito": True,
        "imagenes_subidas": nuevas_subidas,
        "total_imagenes": len(rutas_web),
        "imagenes_referencia": rutas_web,
        "mensaje": f"{nuevas_subidas} imagen(es) de referencia subida(s) correctamente."
    }


@router.post("/{proyecto_id}/firma-visual/analizar")
async def analizar_firma_visual(
    proyecto_id: int,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Ejecuta el análisis de estilo mediante Gemini Vision / motor de análisis sobre
    las referencias subidas y retorna un diagnóstico estructurado con los 4 parámetros clave.
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
            detail="El estilo de este proyecto ya está bloqueado y no puede reanalizarse."
        )

    # Localizar archivos en disco
    rutas_disco = []
    referencias_db = db.query(ReferenciaEstilo).filter(ReferenciaEstilo.id_proyecto == proyecto_id).all()
    for ref in referencias_db:
        if ref.imagen_url and Path(ref.imagen_url).exists():
            rutas_disco.append(ref.imagen_url)

    # Si no están en ReferenciaEstilo, buscar desde imagenes_referencia
    if not rutas_disco and proyecto.imagenes_referencia:
        for ruta_web in proyecto.imagenes_referencia:
            # Convertir /uploads/... a ruta local
            ruta_local = ruta_web.lstrip("/")
            if Path(ruta_local).exists():
                rutas_disco.append(ruta_local)

    if not rutas_disco:
        raise HTTPException(
            status_code=400,
            detail="No se encontraron imágenes de referencia para analizar. Sube al menos una imagen."
        )

    try:
        # Analizar imágenes con el motor de visión
        perfil_consolidado = await analizar_conjunto_imagenes(rutas_disco)

        # Generar prompt maestro compilado
        system_prompt = await generar_system_prompt_maestro(perfil_consolidado, proyecto.nombre)

        # Diagnóstico estructurado de 4 parámetros
        tipo_trazo = perfil_consolidado.get("tecnica_linea") or "Trazo entintado con plumilla G-Pen de grosor dinámico"
        tratamiento_sombras = perfil_consolidado.get("estilo_sombreado") or "Sombreado con trama screentone y cross-hatching"
        paleta_cromatica = perfil_consolidado.get("paleta_colores") or ["#111827", "#374151", "#9CA3AF", "#E5E7EB", "#FFFFFF"]

        diagnostico = {
            "tipo_trazo": tipo_trazo,
            "tratamiento_sombras": tratamiento_sombras,
            "paleta_cromatica": paleta_cromatica,
            "style_prompt": system_prompt,
            "proporciones_personaje": perfil_consolidado.get("proporciones_personaje", "Proporciones anatómicas clásicas"),
            "atmosfera": perfil_consolidado.get("atmosfera", "Atmósfera expresiva y contrastada"),
            "elementos_caracteristicos": perfil_consolidado.get("elementos_caracteristicos", []),
            "nivel_detalle": perfil_consolidado.get("nivel_detalle", "medio"),
            "predominancia": perfil_consolidado.get("predominancia", "blanco_negro"),
            "num_imagenes_analizadas": len(rutas_disco)
        }

        # Guardar en base de datos
        proyecto.firma_visual_extraida = diagnostico
        proyecto.style_prompt = system_prompt
        proyecto.system_prompt_maestro = system_prompt
        proyecto.paleta_colores = paleta_cromatica
        proyecto.tecnica_linea = tipo_trazo
        proyecto.estilo_sombreado = tratamiento_sombras

        db.commit()
        db.refresh(proyecto)

        return {
            "exito": True,
            "diagnostico": diagnostico,
            "perfil_estilo": perfil_consolidado,
            "style_prompt": system_prompt,
            "mensaje": "Firma visual analizada y extraída con éxito."
        }

    except Exception as e:
        print(f"❌ Error en análisis de firma visual: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Error durante el análisis de estilo: {str(e)}"
        )


@router.patch("/{proyecto_id}/firma-visual")
async def actualizar_firma_visual(
    proyecto_id: int,
    datos: FirmaVisualActualizarRequest,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Actualiza la configuración de la firma visual y permite fijarla/bloquearla (style_locked = True).
    """
    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()

    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    # Si ya estaba bloqueado y se intenta editar contenido
    if proyecto.style_locked and datos.style_locked is not False:
        if datos.style_prompt or datos.tipo_trazo or datos.tratamiento_sombras or datos.paleta_cromatica:
            raise HTTPException(
                status_code=400,
                detail="El estilo de este proyecto está bloqueado y no puede modificarse."
            )

    # Actualizar campos individuales
    if datos.style_prompt is not None:
        proyecto.style_prompt = datos.style_prompt
        proyecto.system_prompt_maestro = datos.style_prompt

    if datos.tipo_trazo is not None:
        proyecto.tecnica_linea = datos.tipo_trazo

    if datos.tratamiento_sombras is not None:
        proyecto.estilo_sombreado = datos.tratamiento_sombras

    if datos.paleta_cromatica is not None:
        proyecto.paleta_colores = datos.paleta_cromatica

    # Actualizar estructura de diagnóstico
    diagnostico_actual = dict(proyecto.firma_visual_extraida or {})
    if datos.firma_visual_extraida is not None:
        diagnostico_actual.update(datos.firma_visual_extraida)
    if datos.tipo_trazo is not None:
        diagnostico_actual["tipo_trazo"] = datos.tipo_trazo
    if datos.tratamiento_sombras is not None:
        diagnostico_actual["tratamiento_sombras"] = datos.tratamiento_sombras
    if datos.paleta_cromatica is not None:
        diagnostico_actual["paleta_cromatica"] = datos.paleta_cromatica
    if datos.style_prompt is not None:
        diagnostico_actual["style_prompt"] = datos.style_prompt

    if diagnostico_actual:
        proyecto.firma_visual_extraida = diagnostico_actual

    if datos.style_locked is not None:
        proyecto.style_locked = datos.style_locked

    db.commit()
    db.refresh(proyecto)

    return {
        "exito": True,
        "proyecto_id": proyecto.id,
        "style_locked": proyecto.style_locked,
        "style_prompt": proyecto.style_prompt,
        "firma_visual_extraida": proyecto.firma_visual_extraida,
        "mensaje": "Firma visual actualizada correctamente." if not proyecto.style_locked else "¡Firma visual bloqueada y fijada con éxito!"
    }


@router.get("/{proyecto_id}/firma-visual", response_model=FirmaVisualRespuesta)
async def obtener_firma_visual(
    proyecto_id: int,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Devuelve los detalles y diagnóstico completo de la Firma Visual del proyecto.
    """
    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()

    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    asegurar_estilo_proyecto(proyecto, db)

    preset_info = None
    estilo_id = getattr(proyecto, "estilo_visual", None) or getattr(proyecto, "estilo_legendario", None) or "mortadela_y_salchichon"
    clave_estilo = estilo_id.replace("aleatorio_", "").replace("legendario_", "")
    if clave_estilo in LEGENDARY_PRESETS:
        raw_preset = LEGENDARY_PRESETS[clave_estilo]
        preset_info = {
            "id": clave_estilo,
            "nombre": raw_preset["nombre_ui"],
            "subtitulo": raw_preset["subtitulo"],
            "escuela": raw_preset.get("escuela", "manga"),
            "icono": raw_preset.get("icono", ""),
            "prompt_imagen": raw_preset.get("prompt_imagen", ""),
            "prompt_guion": raw_preset.get("prompt_guion", "")
        }

    num_refs = len(proyecto.imagenes_referencia or [])

    return FirmaVisualRespuesta(
        proyecto_id=proyecto.id,
        nombre_proyecto=proyecto.nombre,
        modo_creacion=proyecto.modo_creacion,
        estilo_legendario=proyecto.estilo_legendario,
        estilo_visual=proyecto.estilo_visual,
        style_locked=proyecto.style_locked,
        style_prompt=proyecto.style_prompt or proyecto.system_prompt_maestro,
        system_prompt_maestro=proyecto.system_prompt_maestro,
        firma_visual_extraida=proyecto.firma_visual_extraida,
        imagenes_referencia=proyecto.imagenes_referencia or [],
        num_referencias=num_refs,
        paleta_colores=proyecto.paleta_colores or [],
        tecnica_linea=proyecto.tecnica_linea,
        estilo_sombreado=proyecto.estilo_sombreado,
        preset_info=preset_info
    )


@router.post("/{proyecto_id}/firma-visual/sortear-aleatorio")
async def sortear_estilo_aleatorio(
    proyecto_id: int,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Para proyectos en modo aleatorio: sortea un nuevo estilo de los 25 disponibles,
    actualiza el prompt maestro y sincroniza la firma visual.
    Regla: Si el estilo ya está bloqueado (style_locked=True), no permite re-sortear.
    """
    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()

    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    if proyecto.style_locked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El estilo ya está bloqueado y no puede re-sortearse para proteger la coherencia artística del proyecto."
        )

    # Sortear un estilo legendario de la lista oficial
    claves_estilos = list(LEGENDARY_PRESETS.keys())
    estilo_sorteado = random.choice(claves_estilos)
    datos_estilo = LEGENDARY_PRESETS[estilo_sorteado]

    tecnicas = ["hatching shadows", "screentone shading", "cel-shading", "watercolor wash", "crosshatching"]
    atmosferas = ["dramatic lighting", "soft ambient light", "high contrast", "moody atmosphere", "vibrant energy"]

    nuevo_system_prompt = (
        f"{datos_estilo['prompt_imagen']}, "
        f"{random.choice(tecnicas)}, {random.choice(atmosferas)}, "
        "unique unexpected artistic combination, professional manga artwork"
    )

    diagnostico = {
        "tipo_trazo": f"Trazo dinámico ({datos_estilo['nombre_ui']})",
        "tratamiento_sombras": f"Tramado característico ({datos_estilo['escuela'].capitalize()})",
        "paleta_cromatica": ["#000000", "#1F2937", "#6B7280", "#E5E7EB", "#FFFFFF"],
        "style_prompt": nuevo_system_prompt,
        "escuela": datos_estilo.get("escuela", "manga"),
        "estilo_base": estilo_sorteado
    }

    proyecto.estilo_visual = estilo_sorteado
    proyecto.estilo_legendario = f"aleatorio_{estilo_sorteado}"
    proyecto.system_prompt_maestro = nuevo_system_prompt
    proyecto.style_prompt = nuevo_system_prompt
    proyecto.firma_visual_extraida = diagnostico
    proyecto.tecnica_linea = diagnostico["tipo_trazo"]
    proyecto.estilo_sombreado = diagnostico["tratamiento_sombras"]
    proyecto.paleta_colores = diagnostico["paleta_cromatica"]

    db.commit()
    db.refresh(proyecto)

    preset_info = {
        "id": estilo_sorteado,
        "nombre": datos_estilo["nombre_ui"],
        "subtitulo": datos_estilo["subtitulo"],
        "escuela": datos_estilo.get("escuela", "manga"),
        "icono": datos_estilo.get("icono", ""),
        "prompt_imagen": datos_estilo.get("prompt_imagen", ""),
        "prompt_guion": datos_estilo.get("prompt_guion", "")
    }

    return {
        "exito": True,
        "estilo_legendario": proyecto.estilo_legendario,
        "preset_info": preset_info,
        "style_prompt": nuevo_system_prompt,
        "diagnostico": diagnostico,
        "mensaje": f"Nuevo estilo sorteado: {datos_estilo['nombre_ui']}"
    }


@router.delete("/{proyecto_id}/firma-visual/referencias")
async def eliminar_referencias_firma(
    proyecto_id: int,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Elimina todas las imágenes de referencia del proyecto y limpia el análisis.
    Regla: Solo permitido si el estilo NO está bloqueado.
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
            detail="No se pueden eliminar referencias con el estilo bloqueado."
        )

    # Eliminar archivos físicos
    carpeta_proyecto = REFERENCIAS_UPLOAD_DIR / str(proyecto_id)
    if carpeta_proyecto.exists():
        try:
            shutil.rmtree(carpeta_proyecto)
        except Exception as e:
            print(f"⚠️ Error limpiando carpeta de referencias: {e}")

    # Limpiar tabla ReferenciaEstilo
    db.query(ReferenciaEstilo).filter(ReferenciaEstilo.id_proyecto == proyecto_id).delete()

    proyecto.imagenes_referencia = []
    proyecto.firma_visual_extraida = None
    proyecto.style_prompt = None
    proyecto.system_prompt_maestro = None
    proyecto.paleta_colores = None
    proyecto.tecnica_linea = None
    proyecto.estilo_sombreado = None

    db.commit()
    db.refresh(proyecto)

    return {
        "exito": True,
        "mensaje": "Referencias y diagnóstico eliminados correctamente. Puedes subir nuevas imágenes."
    }


@router.post("/{proyecto_id}/generar-portada")
async def generar_portada_proyecto(
    proyecto_id: int,
    datos: GenerarPortadaRequest,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Genera una portada de alto impacto visual para el proyecto aplicando
    las directrices de la Firma Visual sobre el motor de difusión gráfica FreeLLMAPI (FLUX).
    Guarda el archivo resultante en 'uploads/portadas/{proyecto_id}_...png'.
    """
    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()

    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    if not datos.prompt or len(datos.prompt.strip()) < 3:
        raise HTTPException(status_code=400, detail="El prompt de portada es obligatorio.")

    # Mapeo de aspect ratio a dimensiones
    ar_dims = {
        "3:4": "768x1024",
        "2:3": "768x1152",
        "9:16": "576x1024",
        "1:1": "1024x1024",
    }
    size_str = ar_dims.get(datos.aspect_ratio, "768x1024")

    # Enrutamiento estricto a FreeLLMAPI (sin fallback silencioso a Pollinations)
    from services.ai_router import generar_imagen_panel
    res_raw = generar_imagen_panel(prompt=datos.prompt, size=size_str)

    # Guardar en disco en uploads/portadas/
    PORTADAS_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    nombre_archivo = f"{proyecto_id}_{uuid.uuid4().hex[:8]}_cover.png"
    ruta_disco = PORTADAS_UPLOAD_DIR / nombre_archivo
    ruta_web = f"/uploads/portadas/{nombre_archivo}"

    try:
        if isinstance(res_raw, str) and res_raw.startswith("data:image"):
            import base64
            b64_data = res_raw.split(",")[-1]
            img_bytes = base64.b64decode(b64_data)
            with open(ruta_disco, "wb") as f:
                f.write(img_bytes)
        elif isinstance(res_raw, str) and (res_raw.startswith("http://") or res_raw.startswith("https://")):
            import httpx
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as http_client:
                r = await http_client.get(res_raw)
                if r.status_code == 200:
                    with open(ruta_disco, "wb") as f:
                        f.write(r.content)
                else:
                    ruta_web = res_raw
        elif isinstance(res_raw, str) and res_raw.startswith("/uploads/"):
            ruta_web = res_raw
        elif isinstance(res_raw, str):
            ruta_web = res_raw
    except Exception as err_save:
        print(f"⚠️ Error guardando archivo local de portada: {err_save}")
        if isinstance(res_raw, str) and (res_raw.startswith("http") or res_raw.startswith("data:")):
            ruta_web = res_raw

    return {
        "exito": True,
        "portada_url": ruta_web,
        "imagen_url": ruta_web,
        "prompt_usado": datos.prompt,
        "aspect_ratio": datos.aspect_ratio,
        "mensaje": "Portada oficial generada correctamente con tu Firma Visual."
    }


# ─── GENERADOR DE VIÑETAS (PANEL ART STUDIO) ────────────────────────────────

def _get_or_create_capitulo_pagina_vineta(
    db: Session,
    proyecto_id: int,
    capitulo_num: int,
    pagina_num: int,
    vineta_num: int
):
    """
    Garantiza la integridad referencial en SQLite creando al vuelo el Capitulo,
    Pagina y Vineta si no existen previamente, evitando fallos de FOREIGN KEY.
    """
    from database.models import Capitulo, Pagina, Vineta

    # 1. Capitulo
    capitulo = db.query(Capitulo).filter(
        Capitulo.id_proyecto == proyecto_id,
        Capitulo.numero == capitulo_num
    ).first()
    if not capitulo:
        capitulo = Capitulo(
            id_proyecto=proyecto_id,
            numero=capitulo_num,
            titulo=f"Capítulo {capitulo_num}",
            sinopsis=f"Capítulo {capitulo_num} de la obra."
        )
        db.add(capitulo)
        db.commit()
        db.refresh(capitulo)

    # 2. Pagina
    pagina = db.query(Pagina).filter(
        Pagina.id_capitulo == capitulo.id,
        Pagina.numero == pagina_num
    ).first()
    if not pagina:
        pagina = Pagina(
            id_capitulo=capitulo.id,
            numero=pagina_num,
            layout_template="standard"
        )
        db.add(pagina)
        db.commit()
        db.refresh(pagina)

    # 3. Vineta
    vineta = db.query(Vineta).filter(
        Vineta.id_pagina == pagina.id,
        Vineta.numero_vineta == vineta_num
    ).first()
    if not vineta:
        vineta = Vineta(
            id_pagina=pagina.id,
            numero_vineta=vineta_num,
            width=200.0,
            height=200.0
        )
        db.add(vineta)
        db.commit()
        db.refresh(vineta)

    return capitulo, pagina, vineta


def _sincronizar_guion_json_vineta(
    capitulo,
    pagina_num: int,
    vineta_num: int,
    imagen_url: str,
    prompt: str = None,
    plano: str = None,
    dialogo: str = None,
    personajes_nombres: list = None
):
    """
    Actualiza la estructura JSON de escenas/vinetas en Capitulo.guion_json
    para mantener sincronía total entre las tablas relacionales y el desglose narrativo.
    """
    import json
    guion_data = {}
    if capitulo.guion_json:
        if isinstance(capitulo.guion_json, str):
            try:
                guion_data = json.loads(capitulo.guion_json)
            except Exception:
                guion_data = {}
        elif isinstance(capitulo.guion_json, dict):
            guion_data = dict(capitulo.guion_json)

    if not isinstance(guion_data, dict):
        guion_data = {}

    escenas = guion_data.get("escenas", [])
    if not isinstance(escenas, list):
        escenas = []

    # Asegurar que existan páginas suficientes
    while len(escenas) < pagina_num:
        escenas.append({
            "numero_pagina": len(escenas) + 1,
            "tipo_layout": "standard",
            "vinetas": []
        })

    pag_idx = pagina_num - 1
    vinetas_list = escenas[pag_idx].get("vinetas", [])
    if not isinstance(vinetas_list, list):
        vinetas_list = []

    # Asegurar que existan viñetas suficientes
    while len(vinetas_list) < vineta_num:
        vinetas_list.append({
            "numero": len(vinetas_list) + 1,
            "angulo_camara": "Plano medio",
            "descripcion_visual": "",
            "dialogo": ""
        })

    vin_idx = vineta_num - 1
    vin_obj = vinetas_list[vin_idx]
    vin_obj["imagen_url"] = imagen_url
    if prompt:
        vin_obj["descripcion_visual"] = prompt
    if plano:
        vin_obj["angulo_camara"] = plano
    if dialogo is not None:
        vin_obj["dialogo"] = dialogo
    if personajes_nombres:
        vin_obj["personajes"] = personajes_nombres

    vinetas_list[vin_idx] = vin_obj
    escenas[pag_idx]["vinetas"] = vinetas_list
    guion_data["escenas"] = escenas
    capitulo.guion_json = guion_data


@router.post("/{proyecto_id}/vinetas/generar-imagen")
async def generar_imagen_vineta_panel(
    proyecto_id: int,
    datos: GenerarImagenVinetaRequest,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Genera la ilustración oficial de una viñeta mediante FLUX.1 Dev (FreeLLMAPI en puerto 31415),
    compilando quirúrgicamente: Firma Visual + Plano de Cámara + Anclajes Anti-Alucinación de Personajes + Descripción.
    Garantiza get_or_create relacional y sincronización simultánea en la tabla 'vinetas' y 'Capitulo.guion_json'.
    """
    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    if not datos.prompt or len(datos.prompt.strip()) < 1:
        raise HTTPException(status_code=400, detail="La descripción visual de la viñeta es obligatoria.")

    # 1. Integridad relacional get_or_create
    capitulo, pagina, vineta = _get_or_create_capitulo_pagina_vineta(
        db=db,
        proyecto_id=proyecto_id,
        capitulo_num=datos.capitulo_num,
        pagina_num=datos.pagina_num,
        vineta_num=datos.vineta_num
    )

    # 2. Mapeo de Aspect Ratio a resoluciones
    AR_DIMS = {
        "1:1":  "1024x1024",
        "16:9": "1024x576",
        "4:3":  "1024x768",
        "3:4":  "768x1024",
        "9:16": "576x1024",
    }
    size_str = AR_DIMS.get(datos.aspect_ratio, "1024x1024")

    # A. Mapeo de plano de cámara a inglés
    planos_map = {
        "Plano General (Wide Shot)": "wide establishing shot",
        "Plano general": "wide establishing shot",
        "Plano Entero (Full Shot)": "full body shot",
        "Plano entero": "full body shot",
        "Plano Medio (Medium Shot)": "medium shot",
        "Plano medio": "medium shot",
        "Primer Plano (Close-up)": "close-up shot",
        "Primer plano": "close-up shot",
        "Plano Detalle (Detail Shot)": "macro detail shot",
        "Plano detalle": "macro detail shot",
        "Vista Cenital (Bird's Eye)": "overhead top-down shot",
        "Vista cenital": "overhead top-down shot",
        "Contrapicado (Low Angle)": "dramatic low angle shot",
        "Contrapicado": "dramatic low angle shot",
        "Plano Holandés (Dutch Angle)": "dynamic tilted dutch angle shot",
        "Plano holandés": "dynamic tilted dutch angle shot"
    }
    plano_camara = datos.plano or "Plano medio"
    plano_en = planos_map.get(datos.plano) or planos_map.get(plano_camara) or "medium shot"
    descripcion_escena = datos.prompt.strip()

    # B. Extracción y Anclajes de Personajes Activos (ADN Visual Inmutable)
    anclajes_personajes = []
    nombres_personajes = []
    if datos.personajes_ids:
        personajes_db = db.query(models.Personaje).filter(
            models.Personaje.id.in_(datos.personajes_ids),
            models.Personaje.id_proyecto == proyecto_id
        ).all()
        for p in personajes_db:
            nombres_personajes.append(p.nombre)
            # Usar adn_visual si existe; si no, limpiar descripción física
            raw_dna = (p.adn_visual or p.descripcion_fisica or "character").strip()
            # Eliminar duplicados del nombre si ya viene como prefijo en el ADN
            if raw_dna.lower().startswith(p.nombre.lower()):
                raw_dna = raw_dna[len(p.nombre):].lstrip(": -")
            ropa = (p.ropa_tipica or getattr(p, "vestimenta", None) or "casual clothes").strip()
            if "wearing " in raw_dna.lower():
                anclajes_personajes.append(f"{p.nombre} ({raw_dna})")
            else:
                anclajes_personajes.append(f"{p.nombre} ({raw_dna}, wearing {ropa})")

    # C. Traducción y Condensación Semántica al Inglés (< 400 chars)
    scene_action_en = ai_router.optimizar_descripcion_escena_con_llm(
        texto_escena_es=datos.prompt,
        personajes_info=nombres_personajes
    )

    # Fallback de seguridad: si scene_action_en sigue en español, forzar traducción asistida
    if ai_router.contiene_espanol(scene_action_en):
        scene_action_en = ai_router.traducir_escena_asistida(scene_action_en)

    # D. Inyección de Tokens de la Biblia de Estilos (style_bibles.json)
    estilo_id = getattr(proyecto, "estilo_visual", None) or getattr(proyecto, "estilo_legendario", None) or "mortadela_y_salchichon"
    style_tokens = get_style_tokens(estilo_id)
    if getattr(proyecto, "style_prompt", None):
        style_tokens = f"{style_tokens}, {proyecto.style_prompt}"
    elif getattr(proyecto, "system_prompt_maestro", None):
        style_tokens = f"{style_tokens}, {proyecto.system_prompt_maestro}"

    # E. Semilla Coordinada (Seed Clustering)
    seed_final = datos.seed if datos.seed is not None else ((proyecto_id * 1000) + (datos.pagina_num * 100) + datos.vineta_num)

    # F. Ensamblado Maestro Jerárquico (Acción + Personajes Espaciales + Cámara + Inhibidor + Estilo + Variación)
    partes_prompt = [scene_action_en.rstrip('.')]

    # Aislamiento espacial multi-personaje con desduplicación inteligente
    if anclajes_personajes:
        scene_action_lower = scene_action_en.lower()
        tiene_posicion_espacial = any(sp in scene_action_lower for sp in [
            "on the left", "in the center", "on the right", "to the left", "to the right", "in the middle"
        ])

        if tiene_posicion_espacial or len(anclajes_personajes) == 1:
            # Si el texto de la acción ya delimita las posiciones de los personajes, evitar duplicar prefijos espaciales
            partes_prompt.append(f"Characters in panel: {'; '.join(anclajes_personajes)}")
        elif len(anclajes_personajes) == 2:
            partes_prompt.append(f"Characters in panel: On the left: {anclajes_personajes[0]}. On the right: {anclajes_personajes[1]}")
        else:
            posiciones = ["On the left", "In the center", "On the right"]
            bloque_pos = []
            for idx, anch in enumerate(anclajes_personajes):
                pos = posiciones[idx] if idx < len(posiciones) else f"Character {idx+1}"
                bloque_pos.append(f"{pos}: {anch}")
            partes_prompt.append(f"Characters in panel: {'. '.join(bloque_pos)}")

    partes_prompt.append(plano_en)

    # Supresión estricta de sombreado realista y texturas 3D en planos medios y primeros planos
    plano_camara_lower = plano_camara.lower()
    if any(k in plano_camara_lower for k in ["medio", "primer", "medium", "close-up", "closeup"]):
        partes_prompt.append("clean 2D comic art, flat colors, no cross-hatching, no realistic skin textures, traditional comic album illustration")

    if style_tokens:
        partes_prompt.append(style_tokens)
    partes_prompt.append(f"variation seed {seed_final}")

    prompt_ensamblado = ". ".join([p.strip() for p in partes_prompt if p.strip()]) + "."
    
    # G. Guardrail Estricto de Longitud (<= 1800 caracteres)
    prompt_final = asegurar_longitud_prompt(prompt_ensamblado, limite_max=1800)

    # H. Auditoría en Terminal y Persistencia
    print("\n" + "="*70)
    print(f">>> [FLUX.1 INFERENCE] PROMPT FINAL COMPILADO (Longitud: {len(prompt_final)} chars):")
    print(prompt_final)
    print(f">>> ESTILO ACTIVO: {estilo_id} | SEED: {seed_final} | PERSONAJES: {nombres_personajes}")
    print("="*70 + "\n")
    logger.info(f">>> [FLUX.1 INFERENCE] PROMPT FINAL COMPILADO (Longitud: {len(prompt_final)} chars):\n{prompt_final}")

    # 5. Persistir prompt compilado y metadatos de auditoría antes de invocar la inferencia
    vineta.prompt_usado = prompt_final
    vineta.plano = plano_camara
    vineta.descripcion_escena = descripcion_escena
    if datos.dialogo is not None:
        vineta.dialogo = datos.dialogo
    db.commit()

    # 6. Generación con FLUX.1 Dev
    try:
        res_raw = ai_router.generar_imagen_panel(
            prompt=prompt_final,
            size=size_str,
            proyecto_id=proyecto_id,
            seed=seed_final,
            subdirectorio="vinetas",
            proyecto=proyecto
        )
    except HTTPException as http_exc:
        msg = http_exc.detail if isinstance(http_exc.detail, str) else str(http_exc.detail)
        raise HTTPException(
            status_code=http_exc.status_code,
            detail={
                "mensaje": msg,
                "detail": msg,
                "prompt_usado": prompt_final
            }
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "mensaje": str(exc),
                "detail": str(exc),
                "prompt_usado": prompt_final
            }
        )

    # 7. Almacenar localmente en uploads/vinetas/
    VINETAS_UPLOAD_DIR = Path("uploads/vinetas")
    VINETAS_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    nombre_archivo = f"{proyecto_id}_c{datos.capitulo_num}_p{datos.pagina_num}_v{datos.vineta_num}_{uuid.uuid4().hex[:8]}.png"
    ruta_disco = VINETAS_UPLOAD_DIR / nombre_archivo
    ruta_web = f"/uploads/vinetas/{nombre_archivo}"

    try:
        if isinstance(res_raw, str) and res_raw.startswith("data:image"):
            import base64
            b64_data = res_raw.split(",")[-1]
            img_bytes = base64.b64decode(b64_data)
            with open(ruta_disco, "wb") as f:
                f.write(img_bytes)
        elif isinstance(res_raw, str) and (res_raw.startswith("http://") or res_raw.startswith("https://")):
            import httpx
            with httpx.Client(timeout=30.0, follow_redirects=True) as http_client:
                r = http_client.get(res_raw)
                if r.status_code == 200:
                    with open(ruta_disco, "wb") as f:
                        f.write(r.content)
                else:
                    ruta_web = res_raw
        elif isinstance(res_raw, str) and res_raw.startswith("/uploads/vinetas/"):
            ruta_web = res_raw
        elif isinstance(res_raw, str) and res_raw.startswith("/uploads/"):
            origen = Path(res_raw.lstrip("/"))
            if origen.exists():
                shutil.copyfile(origen, ruta_disco)
            else:
                ruta_web = res_raw
        elif isinstance(res_raw, str):
            ruta_web = res_raw
    except Exception as err_save:
        print(f"⚠️ Error guardando archivo local de viñeta: {err_save}")
        if isinstance(res_raw, str):
            ruta_web = res_raw

    # 7. Persistir simultáneamente en la tabla 'vinetas' y en 'Capitulo.guion_json'
    vineta.imagen_url = ruta_web
    vineta.prompt_usado = prompt_final
    vineta.plano = plano_camara
    vineta.descripcion_escena = descripcion_escena
    if datos.dialogo is not None:
        vineta.dialogo = datos.dialogo

    _sincronizar_guion_json_vineta(
        capitulo=capitulo,
        pagina_num=datos.pagina_num,
        vineta_num=datos.vineta_num,
        imagen_url=ruta_web,
        prompt=descripcion_escena,
        plano=plano_camara,
        dialogo=datos.dialogo,
        personajes_nombres=nombres_personajes
    )

    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(capitulo, "guion_json")

    db.commit()
    db.refresh(vineta)
    db.refresh(capitulo)

    return {
        "status": "ok",
        "exito": True,
        "imagen_url": ruta_web,
        "prompt_usado": prompt_final,
        "aspect_ratio": datos.aspect_ratio,
        "capitulo_num": datos.capitulo_num,
        "pagina_num": datos.pagina_num,
        "vineta_num": datos.vineta_num,
        "plano": plano_camara,
        "seed": seed_final,
        "vineta_id": vineta.id
    }


@router.patch("/{proyecto_id}/vinetas/guardar")
async def guardar_vineta_datos(
    proyecto_id: int,
    datos: GuardarVinetaRequest,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Guarda o actualiza manualmente la imagen o metadatos de una viñeta."""
    capitulo, pagina, vineta = _get_or_create_capitulo_pagina_vineta(
        db=db,
        proyecto_id=proyecto_id,
        capitulo_num=datos.capitulo_num,
        pagina_num=datos.pagina_num,
        vineta_num=datos.vineta_num
    )

    if datos.imagen_url is not None:
        vineta.imagen_url = datos.imagen_url
    if datos.prompt is not None:
        vineta.descripcion_escena = datos.prompt
    if datos.plano is not None:
        vineta.plano = datos.plano
    if datos.dialogo is not None:
        vineta.dialogo = datos.dialogo

    _sincronizar_guion_json_vineta(
        capitulo=capitulo,
        pagina_num=datos.pagina_num,
        vineta_num=datos.vineta_num,
        imagen_url=datos.imagen_url or vineta.imagen_url,
        prompt=datos.prompt or vineta.descripcion_escena,
        plano=datos.plano or vineta.plano,
        dialogo=datos.dialogo or vineta.dialogo
    )

    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(capitulo, "guion_json")

    db.commit()
    db.refresh(vineta)
    db.refresh(capitulo)

    return {
        "exito": True,
        "mensaje": "Viñeta guardada y sincronizada correctamente",
        "vineta_id": vineta.id,
        "imagen_url": vineta.imagen_url
    }


@router.get("/{proyecto_id}/vinetas")
async def listar_vinetas_proyecto(
    proyecto_id: int,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lista todas las viñetas generadas del proyecto con referencias relacionales."""
    from database.models import Capitulo, Pagina, Vineta

    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    vinetas = (
        db.query(Vineta, Pagina.numero.label("pagina_num"), Capitulo.numero.label("capitulo_num"))
        .join(Pagina, Vineta.id_pagina == Pagina.id)
        .join(Capitulo, Pagina.id_capitulo == Capitulo.id)
        .filter(Capitulo.id_proyecto == proyecto_id)
        .order_by(Capitulo.numero, Pagina.numero, Vineta.numero_vineta)
        .all()
    )

    resultado = []
    for vin, pag_num, cap_num in vinetas:
        resultado.append({
            "id": vin.id,
            "capitulo_num": cap_num,
            "pagina_num": pag_num,
            "vineta_num": vin.numero_vineta or 1,
            "plano": vin.plano,
            "descripcion_escena": vin.descripcion_escena,
            "dialogo": vin.dialogo,
            "imagen_url": vin.imagen_url,
            "prompt_usado": vin.prompt_usado
        })

    return resultado


@router.delete("/{proyecto_id}/vinetas/{cap_num}/{pag_num}/{vin_num}/imagen")
def borrar_imagen_vineta(
    proyecto_id: int,
    cap_num: int,
    pag_num: int,
    vin_num: int,
    db: Session = Depends(get_db)
):
    """
    Desacopla la imagen generada de una viñeta específica en la base de datos (tabla vinetas y guion_json)
    y elimina físicamente el archivo PNG del disco si existe en uploads/.
    """
    capitulo = db.query(models.Capitulo).filter(
        models.Capitulo.id_proyecto == proyecto_id,
        models.Capitulo.numero == cap_num
    ).first()
    if not capitulo:
        raise HTTPException(status_code=404, detail="Capítulo no encontrado")

    archivos_a_eliminar = []

    # 1. Actualizar árbol guion_json (soporta paginas y escenas)
    if capitulo.guion_json:
        guion_data = capitulo.guion_json
        if isinstance(guion_data, str):
            try:
                import json
                guion_data = json.loads(guion_data)
            except Exception:
                guion_data = {}

        if isinstance(guion_data, dict):
            for coleccion in ["paginas", "escenas"]:
                for pag in guion_data.get(coleccion, []):
                    num_p = pag.get("numero") if pag.get("numero") is not None else pag.get("numero_pagina")
                    if num_p == pag_num:
                        for vin in pag.get("vinetas", []):
                            if vin.get("numero") == vin_num:
                                if vin.get("imagen_url"):
                                    archivos_a_eliminar.append(vin["imagen_url"])
                                vin["imagen_url"] = None
                                vin["prompt_usado"] = ""

            capitulo.guion_json = guion_data
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(capitulo, "guion_json")

    # 2. Actualizar tabla relacional vinetas si existe el registro
    pagina_db = db.query(models.Pagina).filter(
        models.Pagina.id_capitulo == capitulo.id,
        models.Pagina.numero == pag_num
    ).first()

    if pagina_db:
        vineta_db = db.query(models.Vineta).filter(
            models.Vineta.id_pagina == pagina_db.id,
            models.Vineta.numero_vineta == vin_num
        ).first()
        if vineta_db:
            if vineta_db.imagen_url:
                archivos_a_eliminar.append(vineta_db.imagen_url)
            vineta_db.imagen_url = None
            vineta_db.prompt_usado = None

    # 3. Eliminar archivos PNG físicos en disco si están en uploads/
    for img_path in archivos_a_eliminar:
        try:
            if isinstance(img_path, str) and img_path.startswith("/uploads/"):
                rel_path = img_path.lstrip("/")
                for base in [Path("."), Path("backend")]:
                    target = base / rel_path
                    if target.exists() and target.is_file():
                        target.unlink()
        except Exception as e_del:
            logger.warning(f"No se pudo eliminar archivo físico {img_path}: {e_del}")

    db.commit()
    return {"status": "ok", "message": f"Ilustración de Viñeta {vin_num} eliminada"}


@router.post("/{proyecto_id}/vinetas/{cap_num}/purgar-imagenes")
def purgar_imagenes_capitulo(
    proyecto_id: int,
    cap_num: int,
    db: Session = Depends(get_db)
):
    """
    Resetea todas las imágenes generadas del capítulo actual de una sola vez
    (en la tabla vinetas, en guion_json y en el sistema de archivos local).
    """
    capitulo = db.query(models.Capitulo).filter(
        models.Capitulo.id_proyecto == proyecto_id,
        models.Capitulo.numero == cap_num
    ).first()
    if not capitulo:
        raise HTTPException(status_code=404, detail="Capítulo no encontrado")

    archivos_a_eliminar = []

    # 1. Limpiar árbol guion_json
    if capitulo.guion_json:
        guion_data = capitulo.guion_json
        if isinstance(guion_data, str):
            try:
                import json
                guion_data = json.loads(guion_data)
            except Exception:
                guion_data = {}

        if isinstance(guion_data, dict):
            for coleccion in ["paginas", "escenas"]:
                for pag in guion_data.get(coleccion, []):
                    for vin in pag.get("vinetas", []):
                        if vin.get("imagen_url"):
                            archivos_a_eliminar.append(vin["imagen_url"])
                        vin["imagen_url"] = None
                        vin["prompt_usado"] = ""

            capitulo.guion_json = guion_data
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(capitulo, "guion_json")

    # 2. Limpiar registros relacionales de vinetas
    paginas = db.query(models.Pagina).filter(models.Pagina.id_capitulo == capitulo.id).all()
    pag_ids = [p.id for p in paginas]
    if pag_ids:
        vinetas_db = db.query(models.Vineta).filter(models.Vineta.id_pagina.in_(pag_ids)).all()
        for v in vinetas_db:
            if v.imagen_url:
                archivos_a_eliminar.append(v.imagen_url)
            v.imagen_url = None
            v.prompt_usado = None

    # 3. Eliminar archivos PNG físicos de uploads/
    for img_path in archivos_a_eliminar:
        try:
            if isinstance(img_path, str) and img_path.startswith("/uploads/"):
                rel_path = img_path.lstrip("/")
                for base in [Path("."), Path("backend")]:
                    target = base / rel_path
                    if target.exists() and target.is_file():
                        target.unlink()
        except Exception as e_del:
            logger.warning(f"No se pudo eliminar archivo físico {img_path}: {e_del}")

    db.commit()
    return {"status": "ok", "message": f"Todas las ilustraciones del Capítulo {cap_num} han sido purgadas"}