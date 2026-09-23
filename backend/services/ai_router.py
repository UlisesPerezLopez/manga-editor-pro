# backend/services/ai_router.py
# Servicio centralizado de enrutamiento IA con FreeLLMAPI (estándar OpenAI).
# Soporta generación de guiones/diálogos con LLMs gratuitos y viñetas/portadas de alta fidelidad con FLUX (FLUX.1 Dev y FLUX.1 [schnell]).

import os
import json
import uuid
import logging
import base64
import httpx
import re
import urllib.parse
from pathlib import Path
from typing import Optional, List
from dotenv import load_dotenv
from openai import OpenAI, APIConnectionError
from fastapi import HTTPException, status

# Asegurar carga de variables de entorno
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)
load_dotenv()

logger = logging.getLogger("mep.ai_router")

PORTADAS_DIR = Path(__file__).resolve().parent.parent / "uploads" / "portadas"


def get_openai_client(timeout: float = 90.0, max_retries: int = 2) -> OpenAI:
    """
    Obtiene una instancia de cliente OpenAI configurada con las variables de entorno de FreeLLMAPI.
    """
    base_url = os.getenv("FREELLMAPI_BASE_URL", "http://127.0.0.1:31415/v1")
    api_key = os.getenv("FREELLMAPI_API_KEY", "freellmapi-8a7bcc2bc7c20aa93fa17444b46a00d6140c9c58288d1eeb")
    return OpenAI(
        base_url=base_url,
        api_key=api_key,
        timeout=timeout,
        max_retries=max_retries
    )


def is_connection_error(e: Exception) -> bool:
    """
    Verifica si la excepción corresponde a un fallo de conexión física o socket cerrado
    (puerto 31415 no disponible / WinError 10061).
    """
    if isinstance(e, (APIConnectionError, ConnectionRefusedError, httpx.ConnectError, httpx.NetworkError)):
        return True
    msg = str(e).lower()
    return any(kw in msg for kw in [
        "10061",
        "connection refused",
        "connection error",
        "connect error",
        "failed to establish a new connection",
        "target machine actively refused it",
        "connection reset",
        "remote host closed"
    ])


def _guardar_imagen_local(img_bytes: bytes, proyecto_id: Optional[int] = None, subdirectorio: str = "portadas") -> str:
    """
    Guarda un payload binario de imagen en el subdirectorio especificado de uploads/.
    Devuelve la ruta web servible (/uploads/{subdirectorio}/...).
    """
    directorio = Path(__file__).resolve().parent.parent / "uploads" / subdirectorio
    directorio.mkdir(parents=True, exist_ok=True)
    prefijo = str(proyecto_id) if proyecto_id is not None else ("cover" if subdirectorio == "portadas" else "gen")
    nombre = f"{prefijo}_{uuid.uuid4().hex[:12]}.png"
    destino = directorio / nombre
    with open(destino, "wb") as f:
        f.write(img_bytes)
    return f"/uploads/{subdirectorio}/{nombre}"


def asegurar_longitud_prompt(prompt_base: str, limite_max: int = 1800) -> str:
    """Garantiza que el prompt nunca supere el límite de 2048 caracteres de Cloudflare Workers AI."""
    if not prompt_base or len(prompt_base) <= limite_max:
        return prompt_base or ""
    
    recortado = prompt_base[:limite_max]
    ultimo_punto = recortado.rfind('.')
    if ultimo_punto > limite_max // 2:
        return recortado[:ultimo_punto + 1]
    return recortado.rstrip() + "..."


# ─── DICCIONARIOS Y AUXILIARES DE TRADUCCIÓN ASISTIDA DE CÓMIC ──────────────

PALABRAS_ESPANOL = {
    "de", "la", "el", "en", "un", "una", "los", "las", "con", "por", "para",
    "sobre", "frente", "al", "del", "mientras", "rodillas", "acera", "lupa",
    "huella", "huellas", "columpio", "columpios", "balancea", "cuerdas",
    "cuerda", "despavoridos", "transeúntes", "transeuntes", "desenvaina",
    "llamas", "espada", "espadas", "templo", "ruinas", "espadachín", "espadachin",
    "callejón", "callejon", "tejado", "edificio", "bosque", "castillo",
    "sombrero", "gabardina", "empuja", "empujando", "mirando", "sostiene",
    "sosteniendo", "corren", "corre", "corriendo", "saltando", "gritando",
    "sonríe", "sonrie", "ojos", "cabello", "pelo", "oscuro", "espaldar",
    "parque", "calle", "ciudad", "arma", "dispara", "disparando"
}

DICCIONARIO_FRASES_ES_EN = [
    # Frases compuestas específicas (de más larga a más corta)
    (r"\bde rodillas en la acera\b", "kneeling on the sidewalk"),
    (r"\bexaminando una huella con una lupa\b", "examining a footprint with a magnifying glass"),
    (r"\bexaminando una huella con lupa\b", "examining a footprint with a magnifying glass"),
    (r"\bexaminando una huella\b", "examining a footprint"),
    (r"\bcon una lupa\b", "with a magnifying glass"),
    (r"\bcon lupa\b", "with a magnifying glass"),
    (r"\bcorren despavoridos\b", "running away in panic"),
    (r"\bcorriendo despavoridos\b", "running away in panic"),
    (r"\bcorre despavorido\b", "running away in panic"),
    (r"\bdesenvaina su espada en llamas frente al templo\b", "drawing a flaming sword in front of the temple"),
    (r"\bdesenvaina su espada en llamas\b", "drawing a flaming sword"),
    (r"\bdesenvaina su espada\b", "drawing a sword"),
    (r"\bdesenvaina la espada\b", "drawing the sword"),
    (r"\bfrente al templo\b", "in front of the temple"),
    (r"\bfrente a las ruinas\b", "in front of the ruins"),
    (r"\bfrente al\b", "in front of the"),
    (r"\bfrente a\b", "in front of"),
    (r"\ben llamas\b", "in flames"),
    (r"\ben un columpio\b", "on a swing"),
    (r"\ben el columpio\b", "on the swing"),
    (r"\bbalancea en el columpio\b", "swinging on the swing"),
    (r"\bse balancea en un columpio\b", "swinging on a swing"),
    (r"\bse balancea en el columpio\b", "swinging on the swing"),
    (r"\bsosteniendo las cuerdas\b", "holding the ropes"),
    (r"\bsostiene las cuerdas\b", "holding the ropes"),
    (r"\bmientras empuja el columpio\b", "while pushing the swing"),
    (r"\bempuja el columpio\b", "pushing the swing"),
    (r"\bmientras empuja\b", "while pushing"),
    (r"\bmientras se balancea\b", "while swinging"),
    (r"\bmirando hacia\b", "looking towards"),
    (r"\bmira fijamente\b", "staring intently"),
    (r"\ben medio de\b", "in the middle of"),
    (r"\bbajo la lluvia\b", "under the rain"),
    (r"\ben la noche\b", "at night"),
    (r"\ben el parque\b", "in the park"),
    (r"\ben el tejado\b", "on the rooftop"),
    (r"\ben el callejón\b", "in the alleyway"),
    (r"\ben el callejon\b", "in the alleyway"),
    (r"\ben la acera\b", "on the sidewalk"),
    (r"\ben la calle\b", "in the street"),
    (r"\bde rodillas\b", "kneeling"),
]

DICCIONARIO_TERMINOS_ES_EN = [
    (r"\bacera\b", "sidewalk"),
    (r"\blupa\b", "magnifying glass"),
    (r"\bhuellas\b", "footprints"),
    (r"\bhuella\b", "footprint"),
    (r"\bcolumpios\b", "swings"),
    (r"\bcolumpio\b", "swing"),
    (r"\bbalanceándose\b", "swinging"),
    (r"\bbalanceandose\b", "swinging"),
    (r"\bbalancea\b", "swinging"),
    (r"\bcuerdas\b", "ropes"),
    (r"\bcuerda\b", "rope"),
    (r"\bmientras\b", "while"),
    (r"\btranseúntes\b", "passersby"),
    (r"\btranseuntes\b", "passersby"),
    (r"\bdespavoridos\b", "panicked"),
    (r"\bdespavorido\b", "panicked"),
    (r"\bdespavorida\b", "panicked"),
    (r"\bdesenvaina\b", "draws sword"),
    (r"\bespadas\b", "swords"),
    (r"\bespada\b", "sword"),
    (r"\btemplos\b", "temples"),
    (r"\btemplo\b", "temple"),
    (r"\bruinas\b", "ruins"),
    (r"\bruina\b", "ruin"),
    (r"\bllamas\b", "flames"),
    (r"\bcallejón\b", "alleyway"),
    (r"\bcallejon\b", "alleyway"),
    (r"\btejados\b", "rooftops"),
    (r"\btejado\b", "rooftop"),
    (r"\bparque\b", "park"),
    (r"\bnoche\b", "night"),
    (r"\blluvia\b", "rain"),
    (r"\bbosque\b", "forest"),
    (r"\bcastillo\b", "castle"),
    (r"\bsombrero\b", "hat"),
    (r"\bgabardina\b", "trench coat"),
    (r"\bcorriendo\b", "running"),
    (r"\bcorren\b", "running"),
    (r"\bcorre\b", "running"),
    (r"\bcaminan\b", "walking"),
    (r"\bcamina\b", "walking"),
    (r"\bsaltando\b", "jumping"),
    (r"\bsaltan\b", "jumping"),
    (r"\bsalta\b", "jumping"),
    (r"\bempujando\b", "pushing"),
    (r"\bempujan\b", "pushing"),
    (r"\bempuja\b", "pushing"),
    (r"\bgritando\b", "shouting"),
    (r"\bgritan\b", "shouting"),
    (r"\bgrita\b", "shouting"),
    (r"\bsonriendo\b", "smiling"),
    (r"\bsonríe\b", "smiling"),
    (r"\bsonrie\b", "smiling"),
    (r"\bmirando\b", "looking"),
    (r"\bmiran\b", "looking"),
    (r"\bmira\b", "looking"),
    (r"\bbuscando\b", "searching"),
    (r"\bbuscan\b", "searching"),
    (r"\bbusca\b", "searching"),
    (r"\bsosteniendo\b", "holding"),
    (r"\bsostienen\b", "holding"),
    (r"\bsostiene\b", "holding"),
    (r"\bviento\b", "wind"),
    (r"\bnubes\b", "clouds"),
    (r"\bnube\b", "cloud"),
    (r"\bsol\b", "sun"),
    (r"\bcielo\b", "sky"),
    (r"\boscura\b", "dark"),
    (r"\boscuras\b", "dark"),
    (r"\boscuros\b", "dark"),
    (r"\boscuro\b", "dark"),
    (r"\broja\b", "red"),
    (r"\brojas\b", "red"),
    (r"\brojos\b", "red"),
    (r"\brojo\b", "red"),
    (r"\bazules\b", "blue"),
    (r"\bazul\b", "blue"),
    (r"\bblanca\b", "white"),
    (r"\bblanco\b", "white"),
    (r"\bnegra\b", "black"),
    (r"\bnegro\b", "black"),
    (r"\bojos\b", "eyes"),
    (r"\bcabello\b", "hair"),
    (r"\bpelo\b", "hair"),
    (r"\bespadachín\b", "swordsman"),
    (r"\bespadachin\b", "swordsman"),
    (r"\bde\b", "of"),
    (r"\ben\b", "in"),
    (r"\bcon\b", "with"),
    (r"\bsobre\b", "on"),
    (r"\bpor\b", "through"),
    (r"\bpara\b", "to"),
    (r"\by\b", "and"),
    (r"\bel\b", "the"),
    (r"\bla\b", "the"),
    (r"\blos\b", "the"),
    (r"\blas\b", "the"),
    (r"\bun\b", "a"),
    (r"\buna\b", "a"),
    (r"\bunos\b", "some"),
    (r"\bunas\b", "some"),
    (r"\bsu\b", "their"),
    (r"\bsus\b", "their"),
    (r"\bal\b", "to the"),
    (r"\bdel\b", "of the"),
]


def contiene_espanol(texto: str) -> bool:
    """Detecta si un texto contiene caracteres o palabras comunes en español."""
    if not texto or not isinstance(texto, str):
        return False
    if re.search(r'[áéíóúÁÉÍÓÚñÑ¿¡]', texto):
        return True
    tokens = set(re.findall(r'\b[a-zA-ZáéíóúÁÉÍÓÚñÑ]+\b', texto.lower()))
    return len(tokens.intersection(PALABRAS_ESPANOL)) > 0


def traducir_escena_asistida(texto: str) -> str:
    """Traduce de forma determinista y asistida escenas de cómic/manga de español a inglés."""
    if not texto or not isinstance(texto, str):
        return ""
    res = texto
    for patron, reemplazo in DICCIONARIO_FRASES_ES_EN:
        res = re.sub(patron, reemplazo, res, flags=re.IGNORECASE)
    for patron, reemplazo in DICCIONARIO_TERMINOS_ES_EN:
        res = re.sub(patron, reemplazo, res, flags=re.IGNORECASE)
    res = re.sub(r'\s+', ' ', res).strip()
    return res


def traducir_texto(texto: str, sys_prompt: str, timeout: float = 8.0) -> str:
    """Invoca a Gemini Flash para traducir y sintetizar texto. Si falla, retorna traducción asistida de contingencia."""
    texto_limpio = (texto or "").strip()
    if not texto_limpio:
        return ""

    # Si ya contiene marcas en inglés de viñeta o model sheet, retornar tal cual
    if any(indicador in texto_limpio for indicador in [
        "Characters in scene:",
        "Characters depicted in panel:",
        "Characters in panel:",
        "Characters:",
        "comic panel art",
        "character portrait concept art",
        "official character model sheet",
        "wide establishing shot",
        "medium shot",
        "close-up shot"
    ]):
        return texto_limpio

    try:
        modelo_texto = os.getenv("DEFAULT_TEXT_MODEL", "gemini-3.7-flash")
        cli = get_openai_client(timeout=timeout, max_retries=0)
        response = cli.chat.completions.create(
            model=modelo_texto,
            messages=[
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": texto_limpio}
            ],
            temperature=0.3,
            timeout=timeout
        )
        content = response.choices[0].message.content
        if content and isinstance(content, str) and len(content.strip()) > 2:
            return content.strip().strip('"').strip("'")
    except Exception as e:
        logger.warning(f"⚠️ No se pudo realizar síntesis LLM del prompt ({e}). Usando traducción asistida de contingencia.")
        return traducir_escena_asistida(texto_limpio)

    return traducir_escena_asistida(texto_limpio) if contiene_espanol(texto_limpio) else texto_limpio


def optimizar_descripcion_escena_con_llm(texto_escena_es: str, personajes_info: Optional[List[str]] = None) -> str:
    """Traduce y condensa fielmente la escena del usuario al inglés, asegurando la presencia y acciones de todos los personajes."""
    texto_limpio = (texto_escena_es or "").strip()
    if not texto_limpio:
        return ""

    sys_prompt = (
        "You are a comic storyboard prompt condenser for FLUX.1. "
        "Translate and condense this Spanish comic panel into a concise, vivid English prompt. "
        "Preserve characters, interactions, objects (e.g. cake flying, chasing with wooden spoon), and physical actions. "
        "Keep it punchy and under 400 characters. Output ONLY the English prompt."
    )
    if personajes_info:
        sys_prompt += f" Characters to keep: {', '.join(personajes_info)}."

    resultado = traducir_texto(texto_limpio, sys_prompt, timeout=8.0)
    if contiene_espanol(resultado):
        resultado = traducir_escena_asistida(resultado)
    return resultado


def traducir_y_optimizar_prompt_flux(
    texto_escena: str = "",
    prompt: str = "",
    style_prompt: str = "",
    seed: Optional[int] = None,
    proyecto: Optional[object] = None,
    personajes_info: Optional[List[str]] = None,
    **kwargs
) -> str:
    """
    Función de compatibilidad que delega directamente en optimizar_descripcion_escena_con_llm.
    Sin interceptores ni plantillas hardcodeadas.
    """
    texto_evaluar = (prompt or texto_escena or "").strip()
    return optimizar_descripcion_escena_con_llm(texto_evaluar, personajes_info=personajes_info)


def generar_texto_guion(prompt: str, system_prompt: str = None, json_mode: bool = False, model: str = None):
    """
    Genera texto, sinopsis, arcos o guiones técnicos con LLMs gratuitos vía FreeLLMAPI.
    
    :param prompt: Prompt de usuario o instrucción creativa.
    :param system_prompt: Instrucciones de rol o contexto para el modelo.
    :param json_mode: Si es True, fuerza formato JSON y parsea la respuesta.
    :param model: Nombre opcional del modelo; si no se indica, usa DEFAULT_JSON_MODEL o DEFAULT_TEXT_MODEL.
    :return: Texto generado o dict JSON parseado.
    """
    modelo_usar = model or (os.getenv("DEFAULT_JSON_MODEL") if json_mode else os.getenv("DEFAULT_TEXT_MODEL"))
    if not modelo_usar:
        modelo_usar = "Qwen/Qwen3-Coder-480B-A35B-Instruct" if json_mode else "gemini-3.7-flash"

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})
    
    params = {
        "model": modelo_usar,
        "messages": messages,
        "temperature": 0.7
    }
    if json_mode:
        params["response_format"] = {"type": "json_object"}
        
    try:
        cli = get_openai_client(timeout=60.0)
        response = cli.chat.completions.create(**params)
        content = response.choices[0].message.content
        
        if json_mode:
            try:
                return json.loads(content)
            except Exception as e:
                logger.warning(f"Error parseando JSON de respuesta del modelo {modelo_usar}: {e}")
                return content
                
        return content
    except HTTPException:
        raise
    except Exception as e:
        if is_connection_error(e):
            logger.error(f"❌ Error de conexión con FreeLLMAPI en puerto 31415: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="No se pudo conectar con el servidor local de FreeLLMAPI en el puerto 31415. Asegúrate de que la aplicación FreeLLMAPI esté abierta."
            )
        logger.error(f"❌ Error en proveedor de texto FreeLLMAPI ({modelo_usar}): {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error en proveedor de texto FreeLLMAPI: {str(e)}"
        )


def _es_error_429_o_cuota(e: Exception) -> bool:
    """Detecta si la excepción corresponde a error 429 de límite de cuota o neuronas agotadas en Cloudflare."""
    if not e:
        return False
    msg = str(e).lower()
    status_code = getattr(e, "status_code", None)
    if status_code == 429:
        return True
    return any(kw in msg for kw in [
        "429", "quota", "rate limit", "rate_limit", "neurons", "limit reached", "exhausted", "too many requests", "cloudflare"
    ])


def generar_imagen_pollinations_flux_sync(
    prompt: str,
    width: int = 1024,
    height: int = 1024,
    seed: Optional[int] = None
) -> bytes:
    """Fallback gratuito sin límites cuando Cloudflare Workers AI agota sus 10.000 neuronas (versión síncrona)."""
    prompt_encoded = urllib.parse.quote(prompt)
    seed_param = f"&seed={seed}" if seed is not None else ""
    url = f"https://image.pollinations.ai/prompt/{prompt_encoded}?model=flux&width={width}&height={height}&nologo=true{seed_param}"
    logger.info(f"🌐 [POLLINATIONS FLUX.1] Solicitando imagen de respaldo: {url[:100]}...")
    with httpx.Client(timeout=60.0, follow_redirects=True) as client:
        resp = client.get(url)
        if resp.status_code == 200 and len(resp.content) > 1000:
            return resp.content
    raise HTTPException(status_code=502, detail="Todos los proveedores de imagen fallaron (FreeLLMAPI y Pollinations Fallback)")


async def generar_imagen_pollinations_flux(
    prompt: str,
    width: int = 1024,
    height: int = 1024,
    seed: Optional[int] = None
) -> bytes:
    """Fallback gratuito sin límites cuando Cloudflare Workers AI agota sus 10.000 neuronas (versión asíncrona)."""
    prompt_encoded = urllib.parse.quote(prompt)
    seed_param = f"&seed={seed}" if seed is not None else ""
    url = f"https://image.pollinations.ai/prompt/{prompt_encoded}?model=flux&width={width}&height={height}&nologo=true{seed_param}"
    logger.info(f"🌐 [POLLINATIONS FLUX.1] Solicitando imagen de respaldo: {url[:100]}...")
    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        resp = await client.get(url)
        if resp.status_code == 200 and len(resp.content) > 1000:
            return resp.content
    raise HTTPException(status_code=502, detail="Todos los proveedores de imagen fallaron (FreeLLMAPI y Pollinations Fallback)")


def generar_imagen_panel(
    prompt: str,
    size: str = "1024x1024",
    model: str = None,
    proyecto_id: Optional[int] = None,
    seed: Optional[int] = None,
    subdirectorio: str = "portadas",
    proyecto: Optional[object] = None
) -> str:
    """
    Genera viñetas de cómic/manga y portadas oficiales consumiendo exclusivamente
    los modelos de imagen de alta fidelidad habilitados en FreeLLMAPI:
    - Modelo principal: FLUX.1 Dev (`black-forest-labs/flux-1-dev`)
    - Modelo secundario: FLUX.1 [schnell] (`@cf/black-forest-labs/flux-1-schnell` de Cloudflare)
    - Fallback de contingencia: Pollinations FLUX.1 cuando Cloudflare agota la cuota diaria (429 / 10,000 neurons)
    
    Procesa la respuesta (URL remota o Base64), la almacena localmente en uploads/<subdirectorio>/
    y retorna la URL relativa accesible.

    :param prompt: Prompt descriptivo de la escena/personaje/portada.
    :param size: Dimensiones o aspect ratio de la imagen (ej. 768x1024, 768x1152, 576x1024, 1024x1024).
    :param model: Modelo de difusión opcional. Si no se pasa, intenta FLUX.1 Dev y luego FLUX.1 Schnell.
    :param proyecto_id: ID opcional del proyecto para vincular el nombre del archivo en disco.
    :param seed: Semilla aleatoria opcional para variaciones estocásticas exactas.
    :param subdirectorio: Directorio de destino ('portadas', 'vinetas', 'personajes').
    :param proyecto: Objeto opcional del proyecto para acceder a metadatos de estilo.
    :return: URL relativa servible (/uploads/.../...) o URI base64.
    """
    prompt_final = asegurar_longitud_prompt((prompt or "").strip(), limite_max=1800)

    modelos_a_intentar: List[str] = []
    if model:
        modelos_a_intentar.append(model)
    else:
        # 1. Modelo principal de alta fidelidad FLUX.1 Dev (NVIDIA NIM / Local)
        modelo_principal = os.getenv("DEFAULT_IMAGE_MODEL", "black-forest-labs/flux-1-dev")
        modelos_a_intentar.append(modelo_principal)
        
        # 2. Modelo secundario / fallback rápido FLUX.1 [schnell] (Cloudflare)
        modelo_secundario = os.getenv("SECONDARY_IMAGE_MODEL", "@cf/black-forest-labs/flux-1-schnell")
        if modelo_secundario not in modelos_a_intentar:
            modelos_a_intentar.append(modelo_secundario)

    cli = get_openai_client(timeout=90.0)
    ultimo_error = None

    for idx, modelo_actual in enumerate(modelos_a_intentar):
        try:
            logger.info(f"🎨 Despachando generación de imagen a FreeLLMAPI [{modelo_actual}] ({size}) [seed={seed}]: {prompt_final[:80]}...")
            
            extra_payload = {}
            if seed is not None:
                extra_payload["seed"] = int(seed)

            gen_kwargs = {
                "model": modelo_actual,
                "prompt": prompt_final,
                "size": size,
                "timeout": 90.0
            }
            if extra_payload:
                gen_kwargs["extra_body"] = extra_payload

            modelo_usar = modelo_actual
            print("\n" + "="*60)
            print(">>> [FLUX.1 INFERENCE] PROMPT FINAL ENVIADO:\n", prompt_final)
            print(f">>> MODELO: {modelo_usar} | SEED: {seed} | SIZE: {size}")
            print("="*60 + "\n")

            response = cli.images.generate(**gen_kwargs)

            if not response.data or len(response.data) == 0:
                raise ValueError("Respuesta vacía recibida de FreeLLMAPI.")

            item = response.data[0]

            # 1. Procesar respuesta en Base64
            if getattr(item, "b64_json", None) and item.b64_json:
                b64_str = item.b64_json
                if b64_str.startswith("data:image"):
                    b64_str = b64_str.split(",", 1)[-1]
                try:
                    img_bytes = base64.b64decode(b64_str)
                    return _guardar_imagen_local(img_bytes, proyecto_id=proyecto_id, subdirectorio=subdirectorio)
                except Exception as e_dec:
                    logger.warning(f"Error decodificando y guardando Base64 localmente: {e_dec}")
                    return f"data:image/png;base64,{b64_str}"

            # 2. Procesar respuesta en URL
            if getattr(item, "url", None) and item.url:
                url_val = item.url
                if url_val.startswith("data:image"):
                    try:
                        b64_str = url_val.split(",", 1)[-1]
                        img_bytes = base64.b64decode(b64_str)
                        return _guardar_imagen_local(img_bytes, proyecto_id=proyecto_id, subdirectorio=subdirectorio)
                    except Exception:
                        return url_val
                elif url_val.startswith("http://") or url_val.startswith("https://"):
                    try:
                        with httpx.Client(timeout=30.0, follow_redirects=True) as http_client:
                            r = http_client.get(url_val)
                            if r.status_code == 200:
                                return _guardar_imagen_local(r.content, proyecto_id=proyecto_id, subdirectorio=subdirectorio)
                    except Exception as e_dl:
                        logger.warning(f"No se pudo descargar imagen remota {url_val}: {e_dl}")
                    return url_val
                elif url_val.startswith("/uploads/"):
                    return url_val
                return url_val

            raise ValueError("La respuesta de FreeLLMAPI no contiene 'url' ni 'b64_json'")

        except Exception as e:
            ultimo_error = e
            # Si el fallo es de conexión directa al servidor FreeLLMAPI (puerto 31415 apagado / WinError 10061),
            # no tiene sentido reintentar con el modelo secundario ya que el daemon no responde.
            if is_connection_error(e):
                logger.error(f"❌ Conexión rechazada con FreeLLMAPI (puerto 31415): {e}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="No se pudo conectar con el servidor local de FreeLLMAPI en el puerto 31415. Asegúrate de que la aplicación FreeLLMAPI esté abierta y tenga activado FLUX en la sección Modelos > Imagen."
                )

            logger.warning(f"⚠️ Falló generación con modelo '{modelo_actual}' ({e}). Intentando alternativa...")

    # Si se agotaron los modelos de FreeLLMAPI (o arrojó 429 por límite de Cloudflare / 502),
    # activar automáticamente el fallback a Pollinations FLUX.1 sin arrojar error 502 al usuario.
    if _es_error_429_o_cuota(ultimo_error):
        logger.warning("⚠️ [CUOTA CLOUDFLARE AGOTADA]: Conmutando automáticamente a Pollinations FLUX.1...")
        print("\n" + "="*70)
        print(">>> ⚠️ [CUOTA CLOUDFLARE AGOTADA]: Conmutando automáticamente a Pollinations FLUX.1...")
        print("="*70 + "\n")
    else:
        logger.warning(f"⚠️ [FREELLMAPI ERROR]: Conmutando automáticamente a Pollinations FLUX.1 ({ultimo_error})...")
        print(f"\n>>> ⚠️ [FREELLMAPI ERROR]: Conmutando automáticamente a Pollinations FLUX.1 ({ultimo_error})...\n")

    try:
        width = 1024
        height = 1024
        if size and "x" in size:
            try:
                parts = size.split("x")
                width = int(parts[0])
                height = int(parts[1])
            except Exception:
                width = 1024
                height = 1024

        img_bytes = generar_imagen_pollinations_flux_sync(
            prompt=prompt_final,
            width=width,
            height=height,
            seed=seed
        )
        return _guardar_imagen_local(img_bytes, proyecto_id=proyecto_id, subdirectorio=subdirectorio)
    except Exception as e_poll:
        logger.error(f"❌ Fallaron todos los modelos de imagen FreeLLMAPI ({ultimo_error}) y Pollinations ({e_poll})", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Todos los proveedores de imagen fallaron (FreeLLMAPI: {str(ultimo_error)} | Pollinations Fallback: {str(e_poll)})"
        )



def extraer_adn_visual_multimodal(
    ruta_imagen: str,
    descripcion_base: str = "",
    ropa_base: str = ""
) -> str:
    """
    Analiza visualmente el avatar oficial de un personaje mediante Gemini 2.5 Flash
    (con fallback asistido de traducción y condensación) y extrae su ADN Visual técnico
    inmutable en inglés (< 250 caracteres, tokens separados por comas).
    """
    logger.info(f"👁️ Extrayendo ADN visual multimodal para imagen: {ruta_imagen}")

    img_bytes = None
    mime_type = "image/png"

    posibles_rutas = []
    p_orig = Path(ruta_imagen)
    if p_orig.is_absolute() and p_orig.exists():
        posibles_rutas.append(p_orig)
    else:
        limpio = ruta_imagen.lstrip("/").replace("\\", "/")
        posibles_rutas.append(Path(limpio))
        posibles_rutas.append(Path("backend") / limpio)
        posibles_rutas.append(Path(__file__).resolve().parent.parent / limpio)
        posibles_rutas.append(Path(__file__).resolve().parent.parent / "uploads" / "personajes" / Path(limpio).name)

    archivo_encontrado = None
    for pr in posibles_rutas:
        if pr.exists() and pr.is_file():
            archivo_encontrado = pr
            break

    if archivo_encontrado:
        ext = archivo_encontrado.suffix.lower()
        mime_map = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".webp": "image/webp"
        }
        mime_type = mime_map.get(ext, "image/png")
        try:
            with open(archivo_encontrado, "rb") as f:
                img_bytes = f.read()
        except Exception as e_read:
            logger.warning(f"No se pudo leer archivo de imagen {archivo_encontrado}: {e_read}")
    elif ruta_imagen.startswith("data:image"):
        try:
            header, b64_str = ruta_imagen.split(",", 1)
            mime_type = header.split(";")[0].split(":")[1]
            img_bytes = base64.b64decode(b64_str)
        except Exception as e_b64:
            logger.warning(f"Error decodificando data URI: {e_b64}")

    system_prompt = (
        "You are a master character designer for comics. "
        "Analyze this 2D character portrait and extract an exact, immutable physical description in English for FLUX.1. "
        "Detail hair color, exact hairstyle, facial shape, eye color, nose shape, and every clothing item. "
        "DO NOT invent items not visible (no glasses unless present). "
        "Keep it under 250 characters, comma-separated tokens. Output ONLY the English tokens."
    )

    # 1. Intentar con Gemini 2.5 Flash multimodal si hay API key y bytes disponibles
    if img_bytes:
        gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
        if gemini_key:
            try:
                from google import genai
                from google.genai import types
                client = genai.Client(api_key=gemini_key)
                logger.info("Enviando imagen a Gemini 2.5 Flash para calibrar ADN visual...")
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=[
                        types.Part.from_bytes(
                            data=img_bytes,
                            mime_type=mime_type
                        ),
                        system_prompt
                    ]
                )
                if response and response.text:
                    texto = response.text.strip().strip('"').strip("'")
                    if ":" in texto and len(texto.split(":")[0]) < 25:
                        texto = texto.split(":", 1)[1].strip()
                    if texto:
                        if len(texto) > 250:
                            tokens = [t.strip() for t in texto.split(",") if t.strip()]
                            acc = []
                            for t in tokens:
                                if sum(len(x) + 2 for x in acc) + len(t) <= 245:
                                    acc.append(t)
                                else:
                                    break
                            texto = ", ".join(acc) if acc else texto[:245]
                        logger.info(f"✅ ADN Visual calibrado con Gemini: {texto}")
                        return texto
            except Exception as e_gemini:
                logger.warning(f"Gemini Vision falló al calibrar ADN ({e_gemini}). Aplicando fallback...")

    # 2. Fallback asistido: traducir y condensar descripcion_base y ropa_base
    base_text = f"{descripcion_base.strip()}, {ropa_base.strip()}".strip(" ,")
    if base_text:
        traduccion = traducir_escena_asistida(base_text)
        tokens_base = [t.strip() for t in traduccion.replace(".", ",").split(",") if t.strip()]
        adn_fallback = ", ".join(tokens_base)[:245].rstrip(", ")
        return adn_fallback or "characteristic comic character appearance, detailed face and attire"

    return "characteristic comic character appearance, detailed 2D comic art"

