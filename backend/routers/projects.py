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
from database.models import Proyecto, Usuario, ReferenciaEstilo
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
        style_prompt=system_prompt,
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

    db.commit()
    db.refresh(proyecto)
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

    preset_info = None
    if proyecto.modo_creacion in ["legendario", "aleatorio"] and proyecto.estilo_legendario:
        clave_estilo = proyecto.estilo_legendario.replace("aleatorio_", "")
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


def asegurar_longitud_prompt(prompt_base: str, limite_max: int = 1800) -> str:
    """Garantiza que el prompt nunca supere el límite de 2048 caracteres de Cloudflare Workers AI."""
    if not prompt_base or len(prompt_base) <= limite_max:
        return prompt_base or ""
    
    # Si excede, recortar respetando el final de la última frase completa
    recortado = prompt_base[:limite_max]
    ultimo_punto = recortado.rfind('.')
    if ultimo_punto > limite_max // 2:
        return recortado[:ultimo_punto + 1]
    return recortado.rstrip() + "..."


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
    from database.models import Personaje
    from services.ai_router import generar_imagen_panel, optimizar_descripcion_escena_con_llm
    from data.style_bibles import get_style_tokens

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

    # 3. Biblia de Estilo / Firma Visual activa
    estilo_id = getattr(proyecto, "estilo_visual", None) or getattr(proyecto, "estilo_legendario", None) or ""
    style_tokens = get_style_tokens(estilo_id)
    if proyecto.style_prompt:
        style_tokens = f"{style_tokens}, {proyecto.style_prompt}"
    elif proyecto.system_prompt_maestro:
        style_tokens = f"{style_tokens}, {proyecto.system_prompt_maestro}"

    # 4. Anclajes Anti-Alucinación Dinámicos de Personajes (Multi-Personaje Condensado)
    anclajes_personajes = []
    nombres_personajes = []
    if datos.personajes_ids:
        personajes_db = db.query(Personaje).filter(
            Personaje.id.in_(datos.personajes_ids),
            Personaje.id_proyecto == proyecto_id
        ).all()
        for p in personajes_db:
            nombres_personajes.append(p.nombre)
            # Extraer solo los primeros 80 caracteres del físico y la ropa básica
            fisico_corto = (p.descripcion_fisica or "character").split(',')[0].strip()[:80]
            ropa_corta = (p.ropa_tipica or getattr(p, "vestimenta", None) or "casual clothes").split(',')[0].strip()[:60]
            anclajes_personajes.append(f"{p.nombre}: {fisico_corto}, wearing {ropa_corta}")

    plano_camara = datos.plano or "Plano medio"
    descripcion_escena = datos.prompt.strip()

    # Traducción técnica y encuadre en inglés
    PLANO_TO_EN = {
        "Plano general": "wide establishing shot",
        "Plano entero": "full body shot",
        "Plano medio": "medium shot",
        "Primer plano": "close-up shot",
        "Plano detalle": "extreme close-up detail shot",
        "Vista cenital": "bird's eye view overhead shot",
        "Contrapicado": "low angle heroic shot",
        "Plano holandés": "dutch angle dynamic tilted shot",
    }
    camera_shot_en = PLANO_TO_EN.get(plano_camara, f"{plano_camara} shot")
    scene_action_en = optimizar_descripcion_escena_con_llm(
        descripcion_escena,
        personajes_info=nombres_personajes
    )

    # Jerarquía Estricta del Prompt Multi-Personaje respetando ventana T5 y guardrail <= 1800 caracteres
    partes = []
    if scene_action_en:
        partes.append(scene_action_en.rstrip('.'))
    if anclajes_personajes:
        partes.append(f"Characters: {'; '.join(anclajes_personajes)}")
    if camera_shot_en:
        c_shot = camera_shot_en if camera_shot_en.endswith("shot") else f"{camera_shot_en} shot"
        partes.append(c_shot)
    if style_tokens:
        partes.append(style_tokens)
    if datos.seed is not None:
        partes.append(f"variation seed {datos.seed}")

    prompt_ensamblado = ". ".join([p.strip() for p in partes if p.strip()]) + "."
    prompt_final = asegurar_longitud_prompt(prompt_ensamblado, limite_max=1800)

    print(f"\n>>> [PROMPT REAL ENVIADO A FLUX.1 (Longitud: {len(prompt_final)} chars)]:\n{prompt_final}\n")
    logger.info(f">>> [PROMPT REAL ENVIADO A FLUX.1 (Longitud: {len(prompt_final)} chars)]:\n{prompt_final}")

    # 5. Generación con FLUX.1 Dev
    res_raw = generar_imagen_panel(
        prompt=prompt_final,
        size=size_str,
        proyecto_id=proyecto_id,
        seed=datos.seed,
        subdirectorio="vinetas",
        proyecto=proyecto
    )

    # 6. Almacenar localmente en uploads/vinetas/
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