# backend/services/ai_router.py
# Servicio centralizado de enrutamiento IA con FreeLLMAPI (estándar OpenAI).
# Soporta generación de guiones/diálogos con LLMs gratuitos y viñetas/portadas de alta fidelidad con FLUX (FLUX.1 Dev y FLUX.1 [schnell]).

import os
import json
import uuid
import logging
import base64
import httpx
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


def traducir_texto(texto: str, sys_prompt: str, timeout: float = 8.0) -> str:
    """Invoca a Gemini Flash para traducir y sintetizar texto. Si falla, retorna el texto original limpio."""
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
        logger.warning(f"⚠️ No se pudo realizar síntesis LLM del prompt ({e}). Usando texto original limpio.")

    return texto_limpio


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

    return traducir_texto(texto_limpio, sys_prompt, timeout=8.0)


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
    
    Procesa la respuesta (URL remota o Base64), la almacena localmente en uploads/<subdirectorio>/
    y retorna la URL relativa accesible.
    PROHIBIDO terminantemente el uso de Pollinations.ai o imágenes degradadas.

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

    # Si se agotaron los modelos sin éxito
    logger.error(f"❌ Fallaron todos los modelos de imagen FreeLLMAPI intentados ({modelos_a_intentar}): {ultimo_error}", exc_info=True)
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=f"Error en proveedor de imagen FreeLLMAPI: {str(ultimo_error)}"
    )
