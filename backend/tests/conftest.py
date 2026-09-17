# conftest.py
# Configuración global de fixtures para la suite de pruebas automatizadas con pytest

import pytest
import os
import sys
from pathlib import Path

# Añadir el directorio backend al sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from database.database import Base, get_db
from database.models import (
    Usuario, Proyecto, Personaje, Capitulo, Pagina, Vineta, GloboTexto, PromptHistorial, ReferenciaEstilo
)
from main import app

# Base de datos SQLite temporal en memoria para pruebas aisladas
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

engine_test = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Crea todas las tablas al inicio de la sesión de pruebas."""
    Base.metadata.create_all(bind=engine_test)
    yield
    Base.metadata.drop_all(bind=engine_test)


@pytest.fixture
def db_session():
    """Proporciona una sesión de base de datos aislada para cada prueba."""
    connection = engine_test.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    """Cliente HTTP de prueba con dependencia de base de datos inyectada."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
