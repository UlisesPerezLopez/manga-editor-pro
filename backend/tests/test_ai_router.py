# backend/tests/test_ai_router.py
# Pruebas unitarias y de integración mockeadas para AiRouterService y endpoints de FreeLLMAPI.

import pytest
import base64
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
from fastapi.testclient import TestClient
from main import app
from services.ai_router import generar_texto_guion, generar_imagen_panel, is_connection_error


@pytest.fixture
def client():
    return TestClient(app)


@patch("services.ai_router.get_openai_client")
def test_api_ai_test_chat_endpoint(mock_get_client, client):
    """Prueba que /api/ai/test-chat responda HTTP 200 con mock sin llamadas de red."""
    mock_openai = MagicMock()
    mock_message = MagicMock()
    mock_message.content = "¡Hola Mangaka! FreeLLMAPI conectado con éxito a MEP."
    mock_choice = MagicMock()
    mock_choice.message = mock_message
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_openai.chat.completions.create.return_value = mock_response
    mock_get_client.return_value = mock_openai

    response = client.post("/api/ai/test-chat", json={
        "prompt": "Responde con una sola palabra: 'Conectado'",
        "model": "gemini-3.7-flash"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["provider"] == "FreeLLMAPI"
    assert data["result"] == "¡Hola Mangaka! FreeLLMAPI conectado con éxito a MEP."
    assert len(data["result"]) > 0


@patch("services.ai_router.get_openai_client")
def test_api_ai_test_image_endpoint(mock_get_client, client):
    """Prueba que /api/ai/test-image responda HTTP 200 con URL mockeada sin peticiones de red."""
    mock_openai = MagicMock()
    mock_item = MagicMock()
    mock_item.url = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    mock_item.b64_json = None
    mock_response = MagicMock()
    mock_response.data = [mock_item]
    mock_openai.images.generate.return_value = mock_response
    mock_get_client.return_value = mock_openai

    response = client.post("/api/ai/test-image", json={
        "prompt": "Un boceto simple de rostro manga",
        "size": "512x512"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["provider"] == "FreeLLMAPI"
    assert "image_url" in data
    assert data["image_url"].startswith("/uploads/portadas/") or data["image_url"].startswith("data:image")


@patch("services.ai_router.get_openai_client")
def test_generar_texto_guion_json_mode(mock_get_client):
    """Prueba unitaria para generar_texto_guion en modo JSON."""
    mock_openai = MagicMock()
    mock_message = MagicMock()
    mock_message.content = '{"titulo": "Aventura Épica", "arcos": ["Origen", "Clímax"]}'
    mock_choice = MagicMock()
    mock_choice.message = mock_message
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_openai.chat.completions.create.return_value = mock_response
    mock_get_client.return_value = mock_openai

    resultado = generar_texto_guion(
        prompt="Genera arcos narrativos",
        json_mode=True
    )
    assert isinstance(resultado, dict)
    assert resultado["titulo"] == "Aventura Épica"
    assert len(resultado["arcos"]) == 2


@patch("services.ai_router.get_openai_client")
def test_generar_imagen_panel_dev_ok(mock_get_client):
    """Prueba unitaria para generar_imagen_panel despachando al modelo principal FLUX.1 Dev con timeout=90."""
    mock_openai = MagicMock()
    mock_item = MagicMock()
    mock_item.url = None
    mock_item.b64_json = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    mock_response = MagicMock()
    mock_response.data = [mock_item]
    mock_openai.images.generate.return_value = mock_response
    mock_get_client.return_value = mock_openai

    url = generar_imagen_panel(prompt="Guerrero en combate", size="768x1024", proyecto_id=42)
    assert url.startswith("/uploads/portadas/42_")
    mock_openai.images.generate.assert_called_once_with(
        model="black-forest-labs/flux-1-dev",
        prompt="Guerrero en combate",
        size="768x1024",
        timeout=90.0
    )


@patch("services.ai_router.get_openai_client")
def test_generar_imagen_panel_fallback_schnell(mock_get_client):
    """Prueba que si FLUX.1 Dev reporta sobrecarga o error no de conexión, reintente con FLUX.1 Schnell."""
    mock_openai = MagicMock()
    
    # Primera llamada a Dev falla (error de cuota/sobrecarga)
    # Segunda llamada a Schnell tiene éxito
    mock_item = MagicMock()
    mock_item.url = None
    mock_item.b64_json = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    mock_resp_schnell = MagicMock()
    mock_resp_schnell.data = [mock_item]

    mock_openai.images.generate.side_effect = [
        Exception("Model overloaded / Rate limit exceeded"),
        mock_resp_schnell
    ]
    mock_get_client.return_value = mock_openai

    url = generar_imagen_panel(prompt="Portada Shonen", size="768x1024")
    assert url.startswith("/uploads/portadas/cover_")
    assert mock_openai.images.generate.call_count == 2
    
    # Verificar modelos llamados en orden
    calls = mock_openai.images.generate.call_args_list
    assert calls[0].kwargs["model"] == "black-forest-labs/flux-1-dev"
    assert calls[1].kwargs["model"] == "@cf/black-forest-labs/flux-1-schnell"


@patch("services.ai_router.get_openai_client")
def test_generar_imagen_panel_connection_error_502(mock_get_client):
    """Prueba que ante error de conexión en puerto 31415 (WinError 10061 / Connection refused) lance HTTP 502 explícito."""
    mock_openai = MagicMock()
    mock_openai.images.generate.side_effect = ConnectionRefusedError("[WinError 10061] No se puede establecer una conexión ya que el equipo de destino denegó expresamente dicha conexión")
    mock_get_client.return_value = mock_openai

    with pytest.raises(HTTPException) as exc_info:
        generar_imagen_panel(prompt="Guerrero en combate")
    
    assert exc_info.value.status_code == 502
    assert "No se pudo conectar con el servidor local de FreeLLMAPI en el puerto 31415" in exc_info.value.detail
    assert "Asegúrate de que la aplicación FreeLLMAPI esté abierta y tenga activado FLUX" in exc_info.value.detail


@patch("httpx.Client")
@patch("services.ai_router.get_openai_client")
def test_generar_imagen_panel_download_remote_url(mock_get_client, mock_httpx_cls):
    """Prueba que si FreeLLMAPI devuelve una URL remota HTTP/HTTPS, se descargue y almacene localmente."""
    mock_openai = MagicMock()
    mock_item = MagicMock()
    mock_item.url = "https://images.freellmapi.local/generated/12345.png"
    mock_item.b64_json = None
    mock_response = MagicMock()
    mock_response.data = [mock_item]
    mock_openai.images.generate.return_value = mock_response
    mock_get_client.return_value = mock_openai

    # Mock httpx download
    mock_http_inst = MagicMock()
    mock_dl_resp = MagicMock()
    mock_dl_resp.status_code = 200
    mock_dl_resp.content = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDRfake_png_data"
    mock_http_inst.get.return_value = mock_dl_resp
    mock_http_inst.__enter__.return_value = mock_http_inst
    mock_http_inst.__exit__.return_value = False
    mock_httpx_cls.return_value = mock_http_inst

    url = generar_imagen_panel(prompt="Heroe épico", size="1024x1024", proyecto_id=99)
    assert url.startswith("/uploads/portadas/99_")
    mock_http_inst.get.assert_called_once_with("https://images.freellmapi.local/generated/12345.png")


def test_is_connection_error_helper():
    """Valida la detección precisa de errores de conexión y socket en is_connection_error."""
    from openai import APIConnectionError
    import httpx
    
    assert is_connection_error(APIConnectionError(request=MagicMock())) is True
    assert is_connection_error(ConnectionRefusedError("Connection refused")) is True
    assert is_connection_error(httpx.ConnectError("Connection failed")) is True
    assert is_connection_error(Exception("[WinError 10061] No connection could be made")) is True
    assert is_connection_error(Exception("Target machine actively refused it")) is True
    assert is_connection_error(ValueError("Invalid json format")) is False
