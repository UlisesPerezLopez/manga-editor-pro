# backend/tests/test_ai_router.py
# Pruebas unitarias y de integración para el servicio AiRouterService y endpoints de FreeLLMAPI.

import pytest
from fastapi.testclient import TestClient
from main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_api_ai_test_chat_endpoint(client):
    response = client.post("/api/ai/test-chat", json={
        "prompt": "Responde con una sola palabra: 'Conectado'",
        "model": "gemini-3.7-flash"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["provider"] == "FreeLLMAPI"
    assert "result" in data
    assert len(data["result"]) > 0

def test_api_ai_test_image_endpoint(client):
    response = client.post("/api/ai/test-image", json={
        "prompt": "Un boceto simple de rostro manga",
        "size": "512x512"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["provider"] == "FreeLLMAPI"
    assert "image_url" in data
    assert data["image_url"] is not None
