# routers/generate.py
# Endpoints para generación de contenido con IA en MEP — Manga Editor Pro.
# Soporta modo dual polimórfico: 'local' (Ollama/Qwen + ComfyUI) vs 'cloud_free' (Free Cloud Pipeline).

import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database.database import get_db
from database.models import Proyecto, Personaje, Capitulo, PromptHistorial, Usuario
from models.schemas import (
    GenerarSinopsisRequest,
    GenerarCapituloRequest,
    GenerarDescripcionVinetaRequest,
    MejorarDialogoRequest,
    MensajeRespuesta
)
from services.text_engine import text_engine
from services.image_engine import image_engine
from utils.dependencies import get_current_user

router = APIRouter(prefix="/generate", tags=["Generación IA"])


@router.post("/sinopsis")
async def generar_sinopsis(
    datos: GenerarSinopsisRequest,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Genera la sinopsis general y estructura de arcos narrativos del proyecto
    utilizando el motor textual configurado por el usuario ('local' u 'cloud_free').
    """
    modo_ai = getattr(usuario_actual, "ai_mode", "cloud_free") or "cloud_free"
    try:
        resultado = await text_engine.generar_sinopsis_proyecto(
            titulo=datos.titulo,
            genero=datos.genero,
            tono=datos.tono,
            premisa=datos.premisa,
            num_capitulos=datos.num_capitulos,
            modo=modo_ai
        )
        return {
            "exito": True,
            "datos": resultado,
            "modo_ai": modo_ai,
            "mensaje": f"Sinopsis generada correctamente ({modo_ai})"
        }
    except Exception as e:
        from services.text_engine import _generar_sinopsis_fallback
        resultado_fallback = _generar_sinopsis_fallback(
            titulo=datos.titulo,
            genero=datos.genero,
            tono=datos.tono,
            premisa=datos.premisa,
            num_capitulos=datos.num_capitulos
        )
        return {
            "exito": True,
            "datos": resultado_fallback,
            "modo_ai": f"{modo_ai}_synthetic_fallback",
            "mensaje": f"Sinopsis generada con motor resiliente ({str(e)})"
        }


@router.post("/capitulo")
async def generar_capitulo(
    datos: GenerarCapituloRequest,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Genera el guion completo de un capítulo de cómic según el modo de IA del usuario.
    Usa el estilo del proyecto y los personajes ya creados para mantener coherencia.
    """
    modo_ai = getattr(usuario_actual, "ai_mode", "cloud_free") or "cloud_free"

    # Verificar que el proyecto pertenece al usuario
    proyecto = db.query(Proyecto).filter(
        Proyecto.id == datos.id_proyecto,
        Proyecto.id_usuario == usuario_actual.id
    ).first()

    if not proyecto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proyecto no encontrado"
        )

    # Obtener personajes del proyecto para contexto
    personajes = db.query(Personaje).filter(
        Personaje.id_proyecto == datos.id_proyecto
    ).all()

    personajes_lista = [
        {
            "nombre": p.nombre,
            "descripcion_fisica": p.descripcion_fisica,
            "personalidad": p.personalidad
        }
        for p in personajes
    ]

    # Obtener capítulos anteriores para continuidad narrativa
    capitulos_anteriores = db.query(Capitulo).filter(
        Capitulo.id_proyecto == datos.id_proyecto,
        Capitulo.numero < datos.numero_capitulo
    ).order_by(Capitulo.numero).all()

    caps_anteriores_lista = [
        {"numero": c.numero, "sinopsis": c.sinopsis}
        for c in capitulos_anteriores
    ]

    try:
        resultado = await text_engine.generar_guion_capitulo(
            titulo_proyecto=proyecto.nombre,
            numero_capitulo=datos.numero_capitulo,
            premisa=datos.premisa,
            genero=datos.genero,
            tono=datos.tono,
            personajes=personajes_lista,
            capitulos_anteriores=caps_anteriores_lista,
            system_prompt_estilo=proyecto.system_prompt_maestro,
            modo=modo_ai
        )

        # Guardar el capítulo en la base de datos si se solicita
        capitulo_id = None
        if datos.guardar_en_bd:
            capitulo_existente = db.query(Capitulo).filter(
                Capitulo.id_proyecto == datos.id_proyecto,
                Capitulo.numero == datos.numero_capitulo
            ).first()

            if capitulo_existente:
                capitulo_existente.titulo = resultado.get("titulo_capitulo", "")
                capitulo_existente.sinopsis = resultado.get("sinopsis", "")
                capitulo_existente.guion_json = resultado
                db.commit()
                capitulo_id = capitulo_existente.id
            else:
                nuevo_capitulo = Capitulo(
                    id_proyecto=datos.id_proyecto,
                    numero=datos.numero_capitulo,
                    titulo=resultado.get("titulo_capitulo", ""),
                    sinopsis=resultado.get("sinopsis", ""),
                    guion_json=resultado
                )
                db.add(nuevo_capitulo)
                db.commit()
                db.refresh(nuevo_capitulo)
                capitulo_id = nuevo_capitulo.id

            historial = PromptHistorial(
                id_proyecto=datos.id_proyecto,
                prompt_completo=f"Generar capítulo {datos.numero_capitulo}: {datos.premisa}",
                parametros_json={
                    "tipo": "guion_capitulo",
                    "modo_ai": modo_ai,
                    "numero_capitulo": datos.numero_capitulo,
                    "genero": datos.genero,
                    "tono": datos.tono
                },
                validada=False
            )
            db.add(historial)
            db.commit()

        return {
            "exito": True,
            "capitulo_id": capitulo_id,
            "datos": resultado,
            "modo_ai": modo_ai,
            "mensaje": f"Capítulo {datos.numero_capitulo} generado correctamente ({modo_ai})"
        }

    except Exception as e:
        from services.text_engine import _generar_guion_fallback
        resultado_fallback = _generar_guion_fallback(
            titulo_proyecto=proyecto.nombre,
            numero_capitulo=datos.numero_capitulo,
            premisa=datos.premisa,
            genero=datos.genero,
            tono=datos.tono,
            personajes=personajes_lista,
            capitulos_anteriores=caps_anteriores_lista
        )
        return {
            "exito": True,
            "capitulo_id": None,
            "datos": resultado_fallback,
            "modo_ai": f"{modo_ai}_synthetic_fallback",
            "mensaje": f"Guion generado con motor resiliente ({str(e)})"
        }


@router.post("/descripcion-vineta")
async def generar_descripcion_vineta(
    datos: GenerarDescripcionVinetaRequest,
    usuario_actual: Usuario = Depends(get_current_user)
):
    """
    Genera un prompt de imagen optimizado para una viñeta específica.
    """
    modo_ai = getattr(usuario_actual, "ai_mode", "cloud_free") or "cloud_free"
    try:
        prompt_imagen = await text_engine.generar_descripcion_vineta(
            descripcion_escena=datos.descripcion_escena,
            personajes=datos.personajes,
            estilo_prompt=datos.estilo_prompt,
            emocion=datos.emocion,
            angulo=datos.angulo,
            modo=modo_ai
        )
        return {
            "exito": True,
            "prompt_imagen": prompt_imagen,
            "modo_ai": modo_ai,
            "mensaje": f"Prompt de viñeta generado ({modo_ai})"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Error al generar descripción ({modo_ai}): {str(e)}"
        )


@router.post("/mejorar-dialogo")
async def mejorar_dialogo(
    datos: MejorarDialogoRequest,
    usuario_actual: Usuario = Depends(get_current_user)
):
    """
    Mejora un diálogo de cómic haciéndolo más natural y expresivo.
    """
    modo_ai = getattr(usuario_actual, "ai_mode", "cloud_free") or "cloud_free"
    try:
        dialogo_mejorado = await text_engine.mejorar_dialogo(
            dialogo_original=datos.dialogo_original,
            personaje=datos.personaje,
            emocion=datos.emocion,
            contexto=datos.contexto,
            modo=modo_ai
        )
        return {
            "exito": True,
            "dialogo_mejorado": dialogo_mejorado,
            "modo_ai": modo_ai,
            "mensaje": f"Diálogo mejorado ({modo_ai})"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Error al mejorar diálogo ({modo_ai}): {str(e)}"
        )


@router.post("/imagen-vineta")
async def generar_imagen_vineta(
    datos: dict,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Genera una imagen para una viñeta del canvas usando el motor gráfico correspondiente:
    - Modo 'local': ComfyUI (127.0.0.1:8188) con nodos IPAdapter.
    - Modo 'cloud_free': Pipeline gratuito Pollinations Flux / SDXL sin coste de API.
    """
    modo_ai = getattr(usuario_actual, "ai_mode", "cloud_free") or "cloud_free"

    id_proyecto      = datos.get("id_proyecto")
    descripcion      = datos.get("descripcion", "")
    personajes_ids   = datos.get("personajes_ids", [])
    ancho            = datos.get("ancho", 1024)
    alto             = datos.get("alto", 1024)

    if not descripcion:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La descripción de la escena es obligatoria"
        )

    # Obtener el proyecto y su Firma Visual
    proyecto = db.query(Proyecto).filter(
        Proyecto.id == id_proyecto,
        Proyecto.id_usuario == usuario_actual.id
    ).first()

    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    # ── CONSTRUCCIÓN DEL PROMPT COMPLETO ──────────────────────────────────
    estilo_base = proyecto.system_prompt_maestro or "manga style, professional artwork, high quality ink lines"

    contexto_personajes = ""
    imagen_ref_b64 = None
    if personajes_ids:
        personajes = db.query(Personaje).filter(
            Personaje.id.in_(personajes_ids),
            Personaje.id_proyecto == id_proyecto
        ).all()

        if personajes:
            fichas = []
            for p in personajes:
                if p.prompt_ia:
                    fichas.append(f"Character '{p.nombre}': {p.prompt_ia}")
                else:
                    fichas.append(f"Character '{p.nombre}': {p.descripcion_fisica or 'manga character'}")
            contexto_personajes = " | ".join(fichas)

    try:
        prompt_escena = await text_engine.generar_descripcion_vineta(
            descripcion_escena=descripcion,
            personajes=[],
            estilo_prompt=estilo_base[:100],
            emocion=datos.get("emocion", "neutral"),
            angulo=datos.get("angulo", "medium shot"),
            modo=modo_ai
        )
    except Exception:
        prompt_escena = descripcion

    partes_prompt = [estilo_base]
    if contexto_personajes:
        partes_prompt.append(contexto_personajes)
    partes_prompt.append(prompt_escena)

    prompt_final = ", ".join(filter(None, partes_prompt))

    print(f"🎨 Generando imagen para viñeta [Modo: {modo_ai}]...")
    print(f"   Prompt: {prompt_final[:160]}...")

    # ── GENERACIÓN CON MOTOR GRÁFICO POLIMÓRFICO ─────────────────────────
    try:
        resultado_img = await image_engine.generar_imagen(
            prompt=prompt_final,
            ancho=ancho,
            alto=alto,
            modo=modo_ai,
            imagen_referencia_b64=imagen_ref_b64
        )

        # Guardar en historial
        historial = PromptHistorial(
            id_proyecto=id_proyecto,
            prompt_completo=prompt_final,
            parametros_json={
                "tipo": "imagen_vineta",
                "modo_ai": modo_ai,
                "proveedor": resultado_img.get("proveedor"),
                "descripcion_original": descripcion,
                "personajes_ids": personajes_ids
            },
            imagen_url=resultado_img.get("imagen") if resultado_img.get("tipo") == "url" else "[base64]",
            validada=False
        )
        db.add(historial)
        db.commit()

        return {
            "exito": True,
            "imagen": resultado_img.get("imagen"),
            "tipo": resultado_img.get("tipo"),
            "proveedor": resultado_img.get("proveedor"),
            "modo_ai": modo_ai,
            "prompt_usado": prompt_final,
            "mensaje": f"Imagen generada correctamente ({resultado_img.get('proveedor')})"
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Error al generar imagen ({modo_ai}): {str(e)}"
        )


@router.get("/estado-proveedores")
async def estado_proveedores(
    usuario_actual: Usuario = Depends(get_current_user)
):
    """
    Verifica el estado del motor textual y gráfico según el modo del usuario activo.
    """
    modo_ai = getattr(usuario_actual, "ai_mode", "cloud_free") or "cloud_free"

    estado_texto = await text_engine.verificar_estado(modo=modo_ai)
    estado_imagen = await image_engine.verificar_estado(modo=modo_ai)

    return {
        "modo_usuario": modo_ai,
        "texto": estado_texto,
        "imagen": estado_imagen,
        "cloud_free_disponible": True,
        "local_disponible": estado_texto.get("estado") == "OPERATIVO" or estado_imagen.get("estado") == "OPERATIVO"
    }


@router.post("/guion")
async def generar_guion_alias(
    datos: GenerarCapituloRequest,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Alias de /generate/capitulo para compatibilidad de rutas."""
    return await generar_capitulo(datos=datos, usuario_actual=usuario_actual, db=db)


@router.get("/estado-gemini")
async def estado_gemini():
    """Alias de compatibilidad para comprobación de estado de Gemini / Cloud Free."""
    estado_texto = await text_engine.verificar_estado(modo="cloud_free")
    return {
        "estado": estado_texto.get("estado", "OPERATIVO"),
        "mensaje": estado_texto.get("mensaje", "Gemini / Qwen Cloud Free operativo"),
        "modo": "cloud_free",
        "detalles": estado_texto
    }


@router.get("/estado-ia")
async def estado_ia_completo():
    """Diagnóstico detallado de todos los subsistemas de IA (Local y Cloud Free). Acceso público para healthchecks."""
    estado_ollama = await text_engine.verificar_estado(modo="local")
    estado_comfy = await image_engine.verificar_estado(modo="local")
    estado_cloud_texto = await text_engine.verificar_estado(modo="cloud_free")
    estado_cloud_img = await image_engine.verificar_estado(modo="cloud_free")

    return {
        "subsistemas": {
            "ollama_local": estado_ollama,
            "comfyui_local": estado_comfy,
            "cloud_free_texto": estado_cloud_texto,
            "cloud_free_imagen": estado_cloud_img
        }
    }