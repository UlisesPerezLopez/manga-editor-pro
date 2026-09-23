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
                if "avatar_url" not in columnas_usuarios:
                    print("🔄 Migrando tabla 'usuarios': añadiendo columna 'avatar_url'...")
                    conn.execute(text("ALTER TABLE usuarios ADD COLUMN avatar_url VARCHAR(500)"))
                    conn.commit()
                    print("✅ Columna 'avatar_url' añadida correctamente a 'usuarios'.")

            if "proyectos" in tablas:
                columnas_proyectos = [col["name"] for col in inspector.get_columns("proyectos")]
                cols_proj = [
                    ("portada_url", "TEXT"),
                    ("modo_creacion", "VARCHAR(20)"),
                    ("estilo_legendario", "VARCHAR(100)"),
                    ("system_prompt_maestro", "TEXT"),
                    ("paleta_colores", "JSON"),
                    ("tecnica_linea", "VARCHAR(50)"),
                    ("estilo_sombreado", "VARCHAR(50)"),
                    ("style_locked", "BOOLEAN DEFAULT 0"),
                    ("formato_lectura", "VARCHAR(20) DEFAULT 'manga'"),
                    ("sinopsis", "TEXT"),
                    ("premisa", "TEXT"),
                    ("genero", "VARCHAR(50)"),
                    ("tono", "VARCHAR(50)"),
                    ("num_capitulos", "INTEGER DEFAULT 5"),
                    ("firma_visual_extraida", "JSON"),
                    ("style_prompt", "TEXT"),
                    ("imagenes_referencia", "JSON"),
                    ("estilo_visual", "VARCHAR(100)"),
                ]
                for col_name, col_type in cols_proj:
                    if col_name not in columnas_proyectos:
                        print(f"🔄 Migrando tabla 'proyectos': añadiendo columna '{col_name}'...")
                        conn.execute(text(f"ALTER TABLE proyectos ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                        print(f"✅ Columna '{col_name}' añadida correctamente a 'proyectos'.")

            if "capitulos" in tablas:
                columnas_capitulos = [col["name"] for col in inspector.get_columns("capitulos")]
                cols_to_add = [
                    ("guion_json", "JSON"),
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

            if "personajes" in tablas:
                columnas_personajes = [col["name"] for col in inspector.get_columns("personajes")]
                cols_pers = [
                    ("avatar_url", "VARCHAR(500)"),
                    ("prompt_visual", "TEXT"),
                    ("vestimenta", "TEXT"),
                    ("adn_visual", "TEXT"),
                ]
                for col_name, col_type in cols_pers:
                    if col_name not in columnas_personajes:
                        print(f"🔄 Migrando tabla 'personajes': añadiendo columna '{col_name}'...")
                        conn.execute(text(f"ALTER TABLE personajes ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                        print(f"✅ Columna '{col_name}' añadida correctamente a 'personajes'.")

            if "vinetas" in tablas:
                columnas_vinetas = [col["name"] for col in inspector.get_columns("vinetas")]
                cols_vin = [
                    ("numero_vineta", "INTEGER DEFAULT 1"),
                    ("plano", "VARCHAR(50)"),
                    ("descripcion_escena", "TEXT"),
                    ("dialogo", "TEXT"),
                    ("imagen_url", "VARCHAR(500)"),
                    ("prompt_usado", "TEXT"),
                ]
                for col_name, col_type in cols_vin:
                    if col_name not in columnas_vinetas:
                        print(f"🔄 Migrando tabla 'vinetas': añadiendo columna '{col_name}'...")
                        conn.execute(text(f"ALTER TABLE vinetas ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                        print(f"✅ Columna '{col_name}' añadida correctamente a 'vinetas'.")
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