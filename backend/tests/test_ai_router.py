# backend/tests/test_ai_router.py
# Pruebas unitarias y de integración mockeadas para AiRouterService y endpoints de FreeLLMAPI.

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app
from services.ai_router import generar_texto_guion, generar_imagen_panel


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
    mock_item.url = "data:image/png;base64,mock_image_data"
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
    assert data["image_url"] == "data:image/png;base64,mock_image_data"
    assert data["result"] == "data:image/png;base64,mock_image_data"


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
def test_generar_imagen_panel_b64(mock_get_client):
    """Prueba unitaria para generar_imagen_panel con fallback b64."""
    mock_openai = MagicMock()
    mock_item = MagicMock()
    mock_item.url = None
    mock_item.b64_json = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    mock_response = MagicMock()
    mock_response.data = [mock_item]
    mock_openai.images.generate.return_value = mock_response
    mock_get_client.return_value = mock_openai

    url = generar_imagen_panel(prompt="Guerrero en combate")
    assert url.startswith("data:image/png;base64,")
