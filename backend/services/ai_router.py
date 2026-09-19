# backend/services/ai_router.py
# Servicio centralizado de enrutamiento IA con FreeLLMAPI (estándar OpenAI).
# Soporta generación de guiones/diálogos con LLMs gratuitos y viñetas con FLUX.1 [schnell].

import os
import json
import logging
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI

# Asegurar carga de variables de entorno
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)
load_dotenv()

logger = logging.getLogger("mep.ai_router")

def get_openai_client() -> OpenAI:
    """
    Obtiene una instancia de cliente OpenAI configurada con las variables de entorno de FreeLLMAPI.
    """
    base_url = os.getenv("FREELLMAPI_BASE_URL", "http://127.0.0.1:31415/v1")
    api_key = os.getenv("FREELLMAPI_API_KEY", "dummy-key")
    return OpenAI(
        base_url=base_url,
        api_key=api_key
    )

client = get_openai_client()


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
        
    cli = get_openai_client()
    response = cli.chat.completions.create(**params)
    content = response.choices[0].message.content
    
    if json_mode:
        try:
            return json.loads(content)
        except Exception as e:
            logger.warning(f"Error parseando JSON de respuesta del modelo {modelo_usar}: {e}")
            return content
            
    return content


def generar_imagen_panel(prompt: str, size: str = "1024x1024", model: str = None):
    """
    Genera viñetas de cómic/manga con FLUX.1 [schnell] a través de FreeLLMAPI.
    
    :param prompt: Prompt descriptivo de la escena/personaje en la viñeta.
    :param size: Dimensiones de la imagen (por defecto 1024x1024).
    :param model: Modelo de difusión (por defecto DEFAULT_IMAGE_MODEL).
    :return: URL pública o data URI base64 de la imagen generada.
    """
    modelo_usar = model or os.getenv("DEFAULT_IMAGE_MODEL", "@cf/black-forest-labs/flux-1-schnell")
    cli = get_openai_client()
    response = cli.images.generate(
        model=modelo_usar,
        prompt=prompt,
        size=size
    )
    item = response.data[0]
    if getattr(item, "url", None):
        return item.url
    if getattr(item, "b64_json", None):
        b64 = item.b64_json
        if not b64.startswith("data:image"):
            return f"data:image/png;base64,{b64}"
        return b64
    return getattr(item, "url", None)
