# routers/characters.py
# CRUD completo de personajes para MEP — Manga Editor Pro.
# Vincula la información narrativa con la generación de retratos de alta fidelidad (FLUX.1 Dev) y Firma Visual.

import uuid
import json
from pathlib import Path
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database.database import get_db
from database.models import Personaje, Proyecto, Usuario
from models.schemas import (
    PersonajeCrearCompleto,
    PersonajeActualizar,
    PersonajeRespuestaCompleta,
    GenerarAvatarPersonajeRequest,
    MensajeRespuesta
)
from services.text_engine import text_engine
from utils.dependencies import get_current_user

router = APIRouter(tags=["Personajes"])

PERSONAJES_UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads" / "personajes"


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


# ─── CREACIÓN DE PERSONAJES ──────────────────────────────────────────────────

@router.post("/projects/{proyecto_id}/personajes",
             response_model=PersonajeRespuestaCompleta,
             status_code=status.HTTP_201_CREATED)
@router.post("/characters/{proyecto_id}",
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
    Si generar_ficha_ia=True, genera automáticamente la ficha técnica IA.
    """
    modo_ai = getattr(usuario_actual, "ai_mode", "cloud_free") or "cloud_free"

    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()

    if not proyecto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proyecto no encontrado"
        )

    ropa = datos.ropa_tipica or datos.vestimenta
    prompt_ia = None

    if datos.generar_ficha_ia and (datos.descripcion_fisica or datos.personalidad):
        try:
            prompt_ia = await _generar_ficha_tecnica(
                personaje_data=datos.model_dump(),
                nombre_proyecto=proyecto.nombre,
                system_prompt_estilo=proyecto.system_prompt_maestro,
                modo=modo_ai
            )
        except Exception as e:
            print(f"⚠️ No se pudo generar Ficha Técnica: {e}")
            prompt_ia = None

    nuevo_personaje = Personaje(
        id_proyecto=proyecto_id,
        nombre=datos.nombre.strip(),
        rol=datos.rol or "protagonista",
        descripcion_fisica=datos.descripcion_fisica,
        ropa_tipica=ropa,
        personalidad=datos.personalidad,
        arco_narrativo=datos.arco_narrativo,
        motivacion=datos.motivacion,
        avatar_url=datos.avatar_url,
        prompt_visual=datos.prompt_visual or prompt_ia,
        prompt_ia=prompt_ia
    )

    db.add(nuevo_personaje)
    db.commit()
    db.refresh(nuevo_personaje)

    return nuevo_personaje


# ─── LISTADO Y CONSULTA ─────────────────────────────────────────────────────

@router.get("/projects/{proyecto_id}/personajes",
            response_model=List[PersonajeRespuestaCompleta])
@router.get("/characters/{proyecto_id}",
            response_model=List[PersonajeRespuestaCompleta])
async def listar_personajes(
    proyecto_id: int,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Devuelve todos los personajes de un proyecto.
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


@router.get("/projects/{proyecto_id}/personajes/{personaje_id}",
            response_model=PersonajeRespuestaCompleta)
@router.get("/characters/{proyecto_id}/{personaje_id}",
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


# ─── ACTUALIZACIÓN Y EDICIÓN ────────────────────────────────────────────────

@router.put("/projects/{proyecto_id}/personajes/{personaje_id}",
            response_model=PersonajeRespuestaCompleta)
@router.put("/characters/{proyecto_id}/{personaje_id}",
            response_model=PersonajeRespuestaCompleta)
@router.patch("/projects/{proyecto_id}/personajes/{personaje_id}",
              response_model=PersonajeRespuestaCompleta)
@router.patch("/characters/{proyecto_id}/{personaje_id}",
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
    Actualiza los datos de la ficha técnica de un personaje.
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

    datos_actualizacion = datos.model_dump(exclude_unset=True)
    if "vestimenta" in datos_actualizacion and datos_actualizacion["vestimenta"] is not None:
        personaje.ropa_tipica = datos_actualizacion["vestimenta"]
    if "ropa_tipica" in datos_actualizacion and datos_actualizacion["ropa_tipica"] is not None:
        personaje.ropa_tipica = datos_actualizacion["ropa_tipica"]

    for campo, valor in datos_actualizacion.items():
        if campo not in ["vestimenta", "ropa_tipica"] and hasattr(personaje, campo):
            setattr(personaje, campo, valor)

    if regenerar_ficha:
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
        except Exception as e:
            print(f"⚠️ Error regenerando Ficha Técnica: {e}")

    db.commit()
    db.refresh(personaje)
    return personaje


# ─── ELIMINACIÓN DE PERSONAJE ───────────────────────────────────────────────

@router.delete("/projects/{proyecto_id}/personajes/{personaje_id}",
               response_model=MensajeRespuesta)
@router.delete("/characters/{proyecto_id}/{personaje_id}",
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


# ─── GENERADOR DE RETRATO / AVATAR CON FIRMA VISUAL ─────────────────────────

@router.post("/projects/{proyecto_id}/personajes/{personaje_id}/generar-avatar")
@router.post("/characters/{proyecto_id}/{personaje_id}/generar-avatar")
async def generar_avatar_personaje(
    proyecto_id: int,
    personaje_id: int,
    datos: Optional[GenerarAvatarPersonajeRequest] = None,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Genera un retrato/avatar oficial para el personaje aplicando la Firma Visual activa
    del proyecto y los rasgos de la ficha técnica sobre FLUX.1 Dev (FreeLLMAPI).
    Guarda la imagen en 'uploads/personajes/{proyecto_id}_{personaje_id}_{uuid}.png'.
    """
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

    aspect_ratio = datos.aspect_ratio if (datos and datos.aspect_ratio) else "1:1"
    ar_dims = {
        "1:1": "1024x1024",
        "3:4": "768x1024",
        "2:3": "768x1152",
        "9:16": "576x1024"
    }
    size_str = ar_dims.get(aspect_ratio, "1024x1024")

    # Detectar si el proyecto o personaje corresponde a la Escuela Bruguera / Caricatura clásica española
    texto_chequeo = " ".join([
        proyecto.nombre or "",
        proyecto.premisa or "",
        proyecto.sinopsis or "",
        proyecto.estilo_legendario or "",
        proyecto.style_prompt or "",
        proyecto.system_prompt_maestro or "",
        personaje.descripcion_fisica or "",
    ]).lower()

    es_bruguera = any(k in texto_chequeo for k in [
        "bruguera", "ibañez", "ibáñez", "mortadelo", "mortadela", "salchichon", "salchichón", "tebeo", "caricatura clásica", "caricatura clasica"
    ])

    BRUGUERA_STYLE_PROMPT = (
        "classic Spanish caricature comic style, Escuela Bruguera aesthetic, Francisco Ibáñez cartoon art, "
        "thick expressive black ink contours, clean flat primary colors, humorous dynamic cartoon character, "
        "lively comic panel composition, traditional European comic coloring"
    )

    # Extraer estilo de Firma Visual
    estilo_prompt = proyecto.style_prompt or proyecto.system_prompt_maestro or ""
    if not estilo_prompt and proyecto.modo_creacion == "legendario" and proyecto.estilo_legendario:
        from data.style_presets import LEGENDARY_PRESETS_DATA
        preset_clean = proyecto.estilo_legendario.replace("legendario_", "").replace("aleatorio_", "")
        preset = LEGENDARY_PRESETS_DATA.get(preset_clean) or LEGENDARY_PRESETS_DATA.get(proyecto.estilo_legendario)
        if preset:
            estilo_prompt = preset.get("prompt_imagen", "")

    if not estilo_prompt:
        estilo_prompt = BRUGUERA_STYLE_PROMPT if es_bruguera else "manga artstyle, crisp clean ink lines, professional screentone shading, high contrast, anime masterpiece"

    # Compilar prompt de retrato
    if datos and datos.prompt_personalizado and len(datos.prompt_personalizado.strip()) > 3:
        prompt_custom = datos.prompt_personalizado.strip()
        if es_bruguera:
            # Eliminar posibles desvíos hacia manga/anime genérico
            for contaminante in ["anime masterpiece", "screentone shading", "manga artstyle", "manga style"]:
                prompt_custom = prompt_custom.replace(contaminante, "")
            if not any(k in prompt_custom.lower() for k in ["bruguera", "ibañez", "ibanez"]):
                prompt_final = f"{BRUGUERA_STYLE_PROMPT}, {prompt_custom}"
            else:
                prompt_final = prompt_custom
        else:
            prompt_final = prompt_custom
    elif es_bruguera:
        partes = [
            BRUGUERA_STYLE_PROMPT,
            f"character portrait concept art of {personaje.nombre}"
        ]
        if personaje.rol:
            partes.append(f"role: {personaje.rol}")
        if personaje.descripcion_fisica:
            partes.append(personaje.descripcion_fisica)
        vestimenta = personaje.ropa_tipica or getattr(personaje, 'vestimenta', None)
        if vestimenta:
            partes.append(f"wearing {vestimenta}")
        if personaje.personalidad:
            partes.append(f"attitude: {personaje.personalidad}")
        partes.append("official character model sheet, clean bold cartoon outlines, vibrant colors, expressive funny face, comic masterpiece")
        prompt_final = ", ".join([p for p in partes if p])
    else:
        partes = [f"Portrait character concept art of {personaje.nombre}"]
        if personaje.rol:
            partes.append(f"role: {personaje.rol}")
        if personaje.descripcion_fisica:
            partes.append(personaje.descripcion_fisica)
        vestimenta = personaje.ropa_tipica or getattr(personaje, 'vestimenta', None)
        if vestimenta:
            partes.append(f"wearing {vestimenta}")
        if personaje.personalidad:
            partes.append(f"attitude: {personaje.personalidad}")
        partes.append(estilo_prompt)
        partes.append("official character concept art sheet portrait, clean lineart, vibrant colors, highly detailed face, masterpiece")
        prompt_final = ", ".join(partes)

    from services.ai_router import generar_imagen_panel
    res_raw = generar_imagen_panel(prompt=prompt_final, size=size_str, proyecto_id=proyecto_id)

    PERSONAJES_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    nombre_archivo = f"{proyecto_id}_{personaje_id}_{uuid.uuid4().hex[:8]}.png"
    ruta_disco = PERSONAJES_UPLOAD_DIR / nombre_archivo
    ruta_web = f"/uploads/personajes/{nombre_archivo}"

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
        elif isinstance(res_raw, str) and res_raw.startswith("/uploads/"):
            ruta_web = res_raw
        elif isinstance(res_raw, str):
            ruta_web = res_raw
    except Exception as err_save:
        print(f"⚠️ Error guardando avatar local: {err_save}")
        if isinstance(res_raw, str):
            ruta_web = res_raw

    personaje.avatar_url = ruta_web
    personaje.prompt_visual = prompt_final
    db.commit()
    db.refresh(personaje)

    return {
        "exito": True,
        "avatar_url": ruta_web,
        "prompt_usado": prompt_final,
        "aspect_ratio": aspect_ratio,
        "personaje": personaje
    }


# ─── IMPORTACIÓN DE PERSONAJES DESDE EL GUION ────────────────────────────────

@router.post("/projects/{proyecto_id}/personajes/importar-del-guion")
@router.post("/characters/{proyecto_id}/importar-del-guion")
async def importar_personajes_del_guion(
    proyecto_id: int,
    datos: Optional[dict] = None,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Importa los personajes sugeridos desde la sinopsis del proyecto o guion de capítulos
    y los añade como fichas de personajes si no existen aún en la base de datos.
    """
    from database.models import Capitulo
    from services.ai_router import generar_texto_guion

    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()

    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    personajes_existentes = {
        p.nombre.lower().strip(): p
        for p in db.query(Personaje).filter(Personaje.id_proyecto == proyecto_id).all()
    }

    candidatos = []
    if datos and isinstance(datos.get("personajes"), list):
        candidatos.extend(datos["personajes"])
    elif datos and isinstance(datos.get("personajes_sugeridos"), list):
        candidatos.extend(datos["personajes_sugeridos"])

    # 1. Intentar extraer de la sinopsis guardada en el proyecto
    if proyecto.sinopsis:
        try:
            data_sinopsis = json.loads(proyecto.sinopsis)
            if isinstance(data_sinopsis, dict) and "personajes_sugeridos" in data_sinopsis:
                candidatos.extend(data_sinopsis["personajes_sugeridos"])
        except Exception:
            pass

    # 2. Intentar extraer de los desgloses guion_json de los capítulos
    capitulos = db.query(Capitulo).filter(Capitulo.id_proyecto == proyecto_id).all()
    texto_capitulos_acumulado = []

    for cap in capitulos:
        if cap.sinopsis:
            texto_capitulos_acumulado.append(f"Capítulo {cap.numero} ({cap.titulo or ''}): {cap.sinopsis}")
        if cap.guion_json:
            try:
                g_data = json.loads(cap.guion_json) if isinstance(cap.guion_json, str) else cap.guion_json
                if isinstance(g_data, dict):
                    if "personajes" in g_data and isinstance(g_data["personajes"], list):
                        candidatos.extend(g_data["personajes"])
                    # Extraer menciones en escenas
                    escenas = g_data.get("escenas", [])
                    for esc in escenas:
                        for vin in esc.get("vinetas", []):
                            pers_vin = vin.get("personajes", [])
                            if isinstance(pers_vin, list):
                                for p_nom in pers_vin:
                                    if isinstance(p_nom, str) and p_nom.strip() and p_nom.strip().lower() not in personajes_existentes:
                                        candidatos.append({
                                            "nombre": p_nom.strip(),
                                            "rol": "secundario",
                                            "descripcion_fisica": f"Personaje que aparece en el Capítulo {cap.numero}",
                                            "ropa_tipica": "Atuendo acorde a la escena"
                                        })
            except Exception:
                pass

    # 3. Si aún no hay candidatos, usar LLM estructurado para extraerlos del contexto
    if not candidatos:
        try:
            contexto_narrativo = f"""Título: {proyecto.nombre}
Premisa: {proyecto.premisa or 'Aventura de manga profesional'}
Sinopsis: {proyecto.sinopsis or 'Historia y personajes de cómic'}
Capítulos: {' | '.join(texto_capitulos_acumulado[:4]) if texto_capitulos_acumulado else 'Capítulo inicial'}"""

            prompt_ext = f"""Analiza el contexto de esta obra manga y extrae la lista de personajes principales, aliados, rivales y antagonistas.

Contexto:
{contexto_narrativo}

Responde ÚNICAMENTE un JSON con este formato exacto:
[
  {{
    "nombre": "Nombre",
    "rol": "protagonista",
    "descripcion_fisica": "Rasgos físicos esenciales",
    "vestimenta": "Ropa característica",
    "personalidad": "Personalidad y actitud",
    "motivacion": "Objetivo principal"
  }}
]"""
            res_llm = generar_texto_guion(
                prompt=prompt_ext,
                system_prompt="Eres un editor manga experto en extracción y diseño de fichas de personajes.",
                json_mode=True
            )
            if isinstance(res_llm, list):
                candidatos.extend(res_llm)
            elif isinstance(res_llm, dict) and "personajes" in res_llm:
                candidatos.extend(res_llm["personajes"])
        except Exception as e_llm:
            print(f"⚠️ Extracción LLM de personajes falló: {e_llm}")

    creados = []
    for cand in candidatos:
        if not isinstance(cand, dict):
            continue
        nom = cand.get("nombre", "").strip()
        if not nom or nom.lower() in personajes_existentes:
            continue

        nuevo = Personaje(
            id_proyecto=proyecto_id,
            nombre=nom,
            rol=cand.get("rol", "secundario"),
            descripcion_fisica=cand.get("descripcion_fisica") or cand.get("descripcion") or "",
            ropa_tipica=cand.get("ropa_tipica") or cand.get("vestimenta") or "",
            personalidad=cand.get("personalidad") or "",
            motivacion=cand.get("motivacion") or cand.get("arco") or "",
            prompt_visual=cand.get("prompt_visual") or None
        )
        db.add(nuevo)
        personajes_existentes[nom.lower()] = nuevo
        creados.append(nuevo)

    db.commit()
    for c in creados:
        db.refresh(c)

    todos = db.query(Personaje).filter(Personaje.id_proyecto == proyecto_id).all()
    return {
        "exito": True,
        "importados": len(creados),
        "mensaje": f"Se han importado {len(creados)} personaje(s) desde el guion.",
        "personajes": todos
    }


# ─── GENERADOR DINÁMICO DE IDEAS Y ARQUETIPOS DE PERSONAJES ──────────────────

@router.post("/projects/{proyecto_id}/personajes/generar-idea")
@router.post("/characters/{proyecto_id}/generar-idea")
async def generar_idea_personaje(
    proyecto_id: int,
    datos: Optional[dict] = None,
    usuario_actual: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Genera dinámicamente una propuesta estructurada de personaje (nombre, físico, vestimenta, personalidad, motivación)
    coherente con el género, tono y sinopsis del proyecto.
    """
    from services.ai_router import generar_texto_guion

    proyecto = db.query(Proyecto).filter(
        Proyecto.id == proyecto_id,
        Proyecto.id_usuario == usuario_actual.id
    ).first()

    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    rol = (datos.get("rol_sugerido") if datos else None) or "protagonista"
    genero = proyecto.genero or (datos.get("genero") if datos else "shonen")
    tono = proyecto.tono or (datos.get("tono") if datos else "épico")

    premisa_obra = proyecto.premisa or proyecto.sinopsis or "Historia narrativa visual"
    estilo_visual_obra = getattr(proyecto, "estilo_visual", None) or proyecto.style_prompt or proyecto.estilo_legendario or "Estilo propio"

    # Detección de estilo Escuela Bruguera / Caricatura clásica española
    texto_chequeo = " ".join([
        proyecto.nombre or "",
        premisa_obra,
        estilo_visual_obra,
        proyecto.system_prompt_maestro or "",
    ]).lower()

    es_bruguera = any(k in texto_chequeo for k in [
        "bruguera", "ibañez", "ibáñez", "mortadelo", "mortadela", "salchichon", "salchichón", "tebeo", "caricatura clásica", "caricatura clasica"
    ])

    if es_bruguera:
        prompt_idea = f"""Genera una ficha de personaje de cómic humorístico/slapstick al más puro estilo de la Escuela Bruguera y tebeo clásico español (Francisco Ibáñez).
Título de la obra: {proyecto.nombre}
Premisa/Argumento: {premisa_obra}
Estilo Visual del proyecto: {estilo_visual_obra}
Rol requerido: {rol}

DIRECTRICES ESTRICTAS:
- PROHIBIDO el uso de terminología o estética manga/anime japonés (nada de shonen, ki, ojos gigantes de anime, armaduras fantásticas o tropos nipones).
- El personaje debe pertenecer al universo del tebeo humorístico español y comedia castiza (personajes estrafalarios, narigudos, calvos cómicos, jefes iracundos, científicos locos).

Responde ÚNICAMENTE con un objeto JSON con esta estructura exacta:
{{
  "nombre": "Nombre cómico y castizo del personaje (estilo tebeo clásico español)",
  "rol": "{rol}",
  "descripcion_fisica": "Descripción física caricaturesca y exagerada al estilo tebeo español (nariz prominente, calvicie cómica, bigote ridículo, ojos saltones)",
  "vestimenta": "Ropa estrafalaria, traje arrugado, pajarita torcida o bata chamuscada",
  "personalidad": "Carácter histriónico, propenso a malentendidos, torpe y de genio vivo",
  "arco_narrativo": "Intentará cumplir su cometido pero terminará provocando un caos mayúsculo y una persecución final",
  "motivacion": "Objetivo mundano o disparatado (evitar que el jefe le eche la bronca, cobrar a fin de mes, probar un invento absurdo)"
}}"""
        system_prompt_idea = "Eres un legendario guionista y dibujante de historietas cómicas de la Escuela Bruguera y del tebeo español clásico (al estilo Francisco Ibáñez y Vázquez). Prohibido terminantemente utilizar clichés o tropos de manga japonés."
    else:
        prompt_idea = f"""Genera una ficha de personaje manga original y atractiva para una obra del género '{genero}' y tono '{tono}'.
Título de la obra: {proyecto.nombre}
Premisa/Argumento: {premisa_obra}
Estilo Visual del proyecto: {estilo_visual_obra}
Rol requerido: {rol}

Responde ÚNICAMENTE con un objeto JSON con esta estructura exacta:
{{
  "nombre": "Nombre memorable del personaje",
  "rol": "{rol}",
  "descripcion_fisica": "Descripción física detallada (peinado, color de ojos, complexión, marcas distintivas)",
  "vestimenta": "Ropa y atuendo icónico con estilo manga",
  "personalidad": "Rasgos de personalidad, virtudes, defectos y actitud",
  "arco_narrativo": "Evolución psicológica y conflicto interno del personaje",
  "motivacion": "Objetivo principal que persigue con determinación"
}}"""
        system_prompt_idea = "Eres un guionista y diseñador de personajes manga de primer nivel (Jump/Shonen Magazine)."

    try:
        resultado = generar_texto_guion(
            prompt=prompt_idea,
            system_prompt=system_prompt_idea,
            json_mode=True
        )
        if isinstance(resultado, dict) and "nombre" in resultado:
            return {
                "exito": True,
                "propuesta": resultado
            }
        raise ValueError("Respuesta no estructurada del LLM")
    except Exception as err:
        if es_bruguera:
            ARQUETIPOS_FALLBACK = {
                "protagonista": {
                    "nombre": "Filemón Pi",
                    "rol": "protagonista",
                    "descripcion_fisica": "Hombre enjuto con dos pelos en la cabeza, nariz prominente de patata y expresión de perenne agobio.",
                    "vestimenta": "Camisa blanca con pajarita negra y pantalones oscuros remangados.",
                    "personalidad": "Autoritario, gruñón y convencido de su genialidad, aunque siempre acaba escaldado.",
                    "arco_narrativo": "Intentará resolver un caso de forma impecable pero sus métodos le estallarán en la cara.",
                    "motivacion": "Conservar el empleo y esquivar las iras de su superior."
                },
                "rival": {
                    "nombre": "Agente Torpínez",
                    "rol": "rival",
                    "descripcion_fisica": "Agente rival con gabardina tres tallas más grande y sombrero calado hasta los ojos.",
                    "vestimenta": "Gabardina desgastada, gafas oscuras desalineadas y zapatones enormes.",
                    "personalidad": "Presuntuoso, torpe de solemnidad y envidioso de cualquier mérito ajeno.",
                    "arco_narrativo": "Tratará de boicotear al protagonista y sus trampas siempre le explotarán a él.",
                    "motivacion": "Ganarse el favor del director general a base de chivatazos ridículos."
                },
                "mentor": {
                    "nombre": "Profesor Chiflández",
                    "rol": "mentor",
                    "descripcion_fisica": "Científico anciano con calva reluciente, bata blanca chamuscada y gafas de culo de vaso.",
                    "vestimenta": "Bata de laboratorio deshilachada, pajarita torcida y pantuflas a cuadros.",
                    "personalidad": "Genio despistado, optimista empedernido ante las explosiones catastróficas de sus inventos.",
                    "arco_narrativo": "Creará máquinas inverosímiles que siempre causarán el efecto opuesto al deseado.",
                    "motivacion": "Ganar el premio al invento del siglo sin demoler el vecindario en el intento."
                },
                "antagonista": {
                    "nombre": "El Superintendente Rabietas",
                    "rol": "antagonista",
                    "descripcion_fisica": "Hombre corpulento de mirada fulminante, bigote espeso y rostro encendido de cólera.",
                    "vestimenta": "Traje azul marino de raya diplomática, chaleco abotonado y puro humeante.",
                    "personalidad": "Colérico, despiadado, impaciente y propenso a arrojar mobiliario de oficina.",
                    "arco_narrativo": "Exigirá misiones imposibles y acabará persiguiendo a sus subordinados con un mazo gigante.",
                    "motivacion": "Mantener la disciplina a golpe de gritos y persecuciones implacables."
                }
            }
        else:
            # Fallback inteligente según rol (manga / obra propia estándar)
            ARQUETIPOS_FALLBACK = {
                "protagonista": {
                    "nombre": "Ren Kurogane",
                    "rol": "protagonista",
                    "descripcion_fisica": "Joven de cabello oscuro despeinado, ojos ámbar intensos y cicatriz en la mejilla izquierda.",
                    "vestimenta": "Túnica de combate reforzada con placas de cuero negro y brazales metálicos grabados.",
                    "personalidad": "Determinado, testarudo pero con un inquebrantable sentido de justicia hacia sus compañeros.",
                    "arco_narrativo": "Deberá aprender que la fuerza bruta no compensa la falta de sabiduría y templanza.",
                    "motivacion": "Descubrir la verdad tras la desaparición de su maestro y proteger a su clan."
                },
                "rival": {
                    "nombre": "Kaelen Vane",
                    "rol": "rival",
                    "descripcion_fisica": "Chico esbelto de cabello plateado lacio, mirada fría y calculadora con ojos celestes.",
                    "vestimenta": "Uniforme formal blanco y azul marino con capa corta y guantes de seda.",
                    "personalidad": "Perfeccionista, distante y orgulloso, oculta una profunda inseguridad.",
                    "arco_narrativo": "Comprenderá que el valor de un rival radica en el crecimiento mutuo y no en la destrucción del otro.",
                    "motivacion": "Superar las asfixiantes expectativas de su linaje aristocrático."
                },
                "mentor": {
                    "nombre": "Maestro Jubei",
                    "rol": "mentor",
                    "descripcion_fisica": "Veterano de barba recortada, mirada curtida por la batalla y postura relajada pero alerta.",
                    "vestimenta": "Kimono tradicional desgastado con vendajes en los antebrazos y sandalias de madera.",
                    "personalidad": "Sarcástico, excéntrico y aficionado al té, pero implacable en combate.",
                    "arco_narrativo": "Encontrar la redención entrenando a la próxima generación antes de que su tiempo termine.",
                    "motivacion": "Evitar que la historia repita los sangrientos errores de su juventud."
                },
                "antagonista": {
                    "nombre": "Lord Malakor",
                    "rol": "antagonista",
                    "descripcion_fisica": "Figura imponente de mirada gélida, cabello azabache largo y aura intimidante.",
                    "vestimenta": "Armadura oscura con filigranas doradas y una capa larga color carmesí.",
                    "personalidad": "Carismático, despiadado e ideológicamente convencido de que el fin justifica los medios.",
                    "arco_narrativo": "La caída de un visionario que perdió la empatía en su búsqueda de orden perfecto.",
                    "motivacion": "Reconstruir el mundo erradicando lo que considera debilidades humanas."
                }
            }
        prop = ARQUETIPOS_FALLBACK.get(rol, ARQUETIPOS_FALLBACK["protagonista"])
        return {
            "exito": True,
            "propuesta": prop,
            "nota": "Generado mediante arquetipo rápido"
        }


# ─── REGENERAR FICHA TÉCNICA ────────────────────────────────────────────────

@router.post("/characters/{proyecto_id}/{personaje_id}/regenerar-ficha",
             response_model=PersonajeRespuestaCompleta)
@router.post("/projects/{proyecto_id}/personajes/{personaje_id}/regenerar-ficha",
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
            detail="El personaje necesita descripción física o personalidad para generar la Ficha Técnica IA"
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