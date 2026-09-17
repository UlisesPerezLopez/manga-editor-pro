#!/usr/bin/env python3
# migrate_to_postgres.py
# Script CLI para migrar todos los datos y esquemas desde SQLite local hacia PostgreSQL en producción.

import sys
import os
from pathlib import Path
import argparse
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

# Asegurar path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from database.database import Base
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

# Orden estricto de tablas respetando dependencias de Foreign Keys
MODELOS_ORDENADOS = [
    Usuario,
    Proyecto,
    Personaje,
    Capitulo,
    Pagina,
    Vineta,
    GloboTexto,
    PromptHistorial,
    ReferenciaEstilo
]


def migrar_datos(sqlite_path: str, postgres_url: str, recrear_tablas: bool = False):
    """
    Ejecuta la migración completa de tablas y registros desde SQLite a PostgreSQL.
    """
    print("=" * 70)
    print("🚀 MEP — MANGA EDITOR PRO: MIGRACIÓN A POSTGRESQL")
    print("=" * 70)
    print(f"📁 Origen SQLite:     {sqlite_path}")
    print(f"🐘 Destino PostgreSQL: {postgres_url.split('@')[-1] if '@' in postgres_url else postgres_url}")
    print("-" * 70)

    if not os.path.exists(sqlite_path):
        print(f"❌ Error: El archivo SQLite '{sqlite_path}' no existe.")
        sys.exit(1)

    # 1. Crear conexiones
    sqlite_engine = create_engine(f"sqlite:///{Path(sqlite_path).as_posix()}", connect_args={"check_same_thread": False})
    postgres_engine = create_engine(postgres_url)

    SqliteSession = sessionmaker(bind=sqlite_engine)
    PostgresSession = sessionmaker(bind=postgres_engine)

    sqlite_db = SqliteSession()
    postgres_db = PostgresSession()

    try:
        # 2. Recrear o asegurar tablas en PostgreSQL
        if recrear_tablas:
            print("⚠️ Recreando todas las tablas en PostgreSQL...")
            Base.metadata.drop_all(bind=postgres_engine)

        print("🔨 Creando tablas y esquemas en PostgreSQL...")
        Base.metadata.create_all(bind=postgres_engine)
        print("✅ Esquema de tablas creado con éxito.")

        # 3. Migración tabla por tabla
        total_migrado = 0

        for Modelo in MODELOS_ORDENADOS:
            nombre_tabla = Modelo.__tablename__
            registros_sqlite = sqlite_db.query(Modelo).all()
            num_registros = len(registros_sqlite)

            print(f"📦 Migrando tabla '{nombre_tabla}' ({num_registros} registros)...", end=" ")

            if num_registros == 0:
                print("⏭️ Vacía")
                continue

            for obj in registros_sqlite:
                # Extraer atributos como diccionario limpio
                datos_obj = {
                    c.name: getattr(obj, c.name)
                    for c in Modelo.__table__.columns
                }
                nuevo_obj = Modelo(**datos_obj)
                postgres_db.merge(nuevo_obj)

            postgres_db.commit()
            print(f"✅ {num_registros} registros transferidos")
            total_migrado += num_registros

            # 4. Ajustar secuencias de PostgreSQL (para auto-increment IDs)
            try:
                with postgres_engine.connect() as conn:
                    conn.execute(text(
                        f"SELECT setval(pg_get_serial_sequence('{nombre_tabla}', 'id'), "
                        f"coalesce(max(id), 1)) FROM {nombre_tabla};"
                    ))
                    conn.commit()
            except Exception:
                pass

        print("-" * 70)
        print(f"🎉 ¡MIGRACIÓN COMPLETADA CON ÉXITO! ({total_migrado} registros transferidos)")
        print("=" * 70)

    except Exception as err:
        postgres_db.rollback()
        print(f"\n❌ Error crítico durante la migración: {err}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        sqlite_db.close()
        postgres_db.close()


def main():
    parser = argparse.ArgumentParser(description="Migración segura de datos SQLite a PostgreSQL para MEP.")
    default_sqlite = Path(__file__).resolve().parent.parent / "rdc_manga.db"
    
    parser.add_argument(
        "--sqlite-path",
        default=str(default_sqlite),
        help="Ruta al archivo rdc_manga.db local (por defecto: backend/rdc_manga.db)"
    )
    parser.add_argument(
        "--postgres-url",
        default=os.getenv("DATABASE_URL") or os.getenv("TARGET_DATABASE_URL"),
        help="Cadena de conexión PostgreSQL (ej. postgresql://user:pass@host:5432/mep_db)"
    )
    parser.add_argument(
        "--recreate-tables",
        action="store_true",
        help="Borra y recrea las tablas en el destino antes de migrar (Cuidado en producción)"
    )

    args = parser.parse_args()

    if not args.postgres_url or "sqlite" in args.postgres_url:
        print("❌ Error: Debes especificar una URL de PostgreSQL válida con --postgres-url o en la variable DATABASE_URL.")
        print("Ejemplo: python migrate_to_postgres.py --postgres-url postgresql://mep_user:pass@localhost:5432/mep_db")
        sys.exit(1)

    migrar_datos(args.sqlite_path, args.postgres_url, args.recreate_tables)


if __name__ == "__main__":
    main()
