import os
import httpx
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, Any
from services.ai_router import generar_texto_guion, generar_imagen_panel

router = APIRouter(prefix="/api/ai", tags=["Test de IA (FreeLLMAPI)"])


class ChatTestRequest(BaseModel):
    prompt: Optional[str] = Field(default="Di '¡Hola Mangaka! FreeLLMAPI conectado con éxito a MEP.'", description="Instrucción de prueba")
    system_prompt: Optional[str] = Field(default=None, description="System prompt opcional")
    model: Optional[str] = Field(default=None, description="Modelo LLM (por defecto gemini-3.7-flash)")
    json_mode: Optional[bool] = Field(default=False, description="Activar modo JSON")


class ImageTestRequest(BaseModel):
    prompt: Optional[str] = Field(default="Un guerrero manga shōnen con espada de fuego, estilo blanco y negro entintado profesional", description="Prompt de viñeta")
    model: Optional[str] = Field(default=None, description="Modelo de difusión (por defecto @cf/black-forest-labs/flux-1-schnell)")
    size: Optional[str] = Field(default="1024x1024", description="Dimensiones de la imagen")


@router.post("/test-chat")
async def ai_test_chat(datos: Optional[ChatTestRequest] = None):
    """
    Envía un ping/mensaje a Gemini 3.7 Flash o modelo configurado vía FreeLLMAPI.
    Devuelve: { "status": "ok", "provider": "FreeLLMAPI", "result": respuesta }
    """
    prompt = datos.prompt if (datos and datos.prompt) else "Di '¡Hola Mangaka! FreeLLMAPI conectado con éxito a MEP.'"
    system_prompt = datos.system_prompt if datos else None
    model = datos.model if datos else None
    json_mode = datos.json_mode if datos else False

    try:
        respuesta = generar_texto_guion(
            prompt=prompt,
            system_prompt=system_prompt,
            json_mode=json_mode,
            model=model
        )
        return {
            "status": "ok",
            "provider": "FreeLLMAPI",
            "result": respuesta
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error comunicando con FreeLLMAPI en test-chat: {str(e)}"
        )


@router.post("/test-image")
async def ai_test_image(datos: Optional[ImageTestRequest] = None):
    """
    Envía una solicitud de viñeta a @cf/black-forest-labs/flux-1-schnell y devuelve la URL generada.
    Devuelve: { "status": "ok", "provider": "FreeLLMAPI", "result": url, "image_url": url }
    """
    prompt = datos.prompt if (datos and datos.prompt) else "Un guerrero manga shōnen con espada de fuego, estilo entintado"
    model = datos.model if datos else None
    size = datos.size if datos else "1024x1024"

    try:
        url_generada = generar_imagen_panel(
            prompt=prompt,
            size=size,
            model=model
        )
        return {
            "status": "ok",
            "provider": "FreeLLMAPI",
            "result": url_generada,
            "image_url": url_generada
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error generando imagen con FreeLLMAPI en test-image: {str(e)}"
        )


@router.get("/health/freellmapi")
async def health_freellmapi():
    """
    Verifica de forma ultraligera (timeout 500ms) si el servicio FreeLLMAPI responde en el puerto 31415.
    """
    base_url = os.getenv("FREELLMAPI_BASE_URL", "http://127.0.0.1:31415/v1")
    check_url = base_url.rstrip("/").removesuffix("/v1")
    if not check_url:
        check_url = "http://127.0.0.1:31415"

    online = False
    detail = "Motor local no detectado en el puerto 31415"

    try:
        async with httpx.AsyncClient(timeout=0.5) as client:
            try:
                resp = await client.get(f"{check_url}/v1/models")
                online = resp.status_code < 500
                detail = "FreeLLMAPI conectado y respondiendo en el puerto 31415" if online else f"HTTP {resp.status_code}"
            except Exception:
                resp = await client.get(check_url)
                online = resp.status_code < 500
                detail = "Puerto 31415 activo" if online else f"HTTP {resp.status_code}"
    except Exception:
        online = False
        detail = "Motor local FreeLLMAPI no detectado en el puerto 31415 (Desconectado)"

    return {
        "status": "ok",
        "online": online,
        "service": "FreeLLMAPI",
        "url": check_url,
        "detail": detail
    }

