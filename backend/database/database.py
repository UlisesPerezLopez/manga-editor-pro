# database.py
# Configuración central de SQLAlchemy para RDC Manga Editor Pro
# Este archivo crea el motor de base de datos y la sesión

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pathlib import Path
import os
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)
load_dotenv()

# URL de la base de datos desde variables de entorno
# Por defecto usa SQLite local apuntando siempre a backend/rdc_manga.db
DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent / "rdc_manga.db"
DATABASE_URL = os.getenv("DATABASE_URL") or f"sqlite:///{DEFAULT_DB_PATH.as_posix()}"

# Crear el motor de base de datos
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args
)

# Fábrica de sesiones - cada petición API obtiene su propia sesión
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para todos los modelos ORM
Base = declarative_base()


def get_db():
    """
    Generador de sesiones de base de datos.
    Se usa como dependencia en los endpoints de FastAPI.
    Garantiza que la sesión se cierre siempre, incluso si hay errores.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()