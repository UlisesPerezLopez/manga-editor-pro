# init_db.py
# Script para crear todas las tablas en la base de datos SQLite y migrar columnas automáticamente.

import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from sqlalchemy import inspect, text
from database.database import engine, Base

# Importar TODOS los modelos para que SQLAlchemy los registre
from database.models import (
    Usuario,
    Proyecto,
    Personaje,
    Capitulo,
    Pagina,
    Vineta,
    GloboTexto,
    PromptHistorial,
    ReferenciaEstilo
)


def _migrar_columnas():
    """
    Verifica y aplica migraciones ligeras para SQLite cuando se añaden columnas a modelos existentes.
    """
    try:
        inspector = inspect(engine)
        tablas = inspector.get_table_names()
        
        with engine.connect() as conn:
            if "usuarios" in tablas:
                columnas_usuarios = [col["name"] for col in inspector.get_columns("usuarios")]
                if "ai_mode" not in columnas_usuarios:
                    print("🔄 Migrando tabla 'usuarios': añadiendo columna 'ai_mode'...")
                    conn.execute(text("ALTER TABLE usuarios ADD COLUMN ai_mode VARCHAR(30) DEFAULT 'cloud_free'"))
                    conn.commit()
                    print("✅ Columna 'ai_mode' añadida correctamente a 'usuarios'.")

            if "capitulos" in tablas:
                columnas_capitulos = [col["name"] for col in inspector.get_columns("capitulos")]
                cols_to_add = [
                    ("is_published", "BOOLEAN DEFAULT 0"),
                    ("is_premium", "BOOLEAN DEFAULT 0"),
                    ("early_access", "BOOLEAN DEFAULT 0"),
                    ("views_count", "INTEGER DEFAULT 0"),
                    ("likes_count", "INTEGER DEFAULT 0"),
                ]
                for col_name, col_type in cols_to_add:
                    if col_name not in columnas_capitulos:
                        print(f"🔄 Migrando tabla 'capitulos': añadiendo columna '{col_name}'...")
                        conn.execute(text(f"ALTER TABLE capitulos ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                        print(f"✅ Columna '{col_name}' añadida correctamente a 'capitulos'.")
    except Exception as e:
        print(f"ℹ️ Verificación de migración: {e}")


def init_db():
    """
    Crea todas las tablas definidas en los modelos si no existen todavía.
    Es seguro ejecutarlo varias veces: no borra datos existentes.
    """
    print("🎌 Iniciando creación y verificación de tablas en la base de datos...")
    Base.metadata.create_all(bind=engine)
    _migrar_columnas()
    print("✅ Tablas listas:")
    print("   - usuarios (con soporte ai_mode: local/cloud_free)")
    print("   - proyectos")
    print("   - personajes")
    print("   - capitulos")
    print("   - paginas")
    print("   - vinetas")
    print("   - globos_texto")
    print("   - prompts_historial")
    print("   - referencias_estilo")
    print("🚀 Base de datos lista para usar.")


if __name__ == "__main__":
    init_db()