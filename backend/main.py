# main.py
# Punto de entrada FINAL de la API RDC Manga Editor Pro v2.0
# Sprint 8: seguridad de producción, CORS restrictivo,
#            rate limiting HTTP y configuración completa.

import os
import sys

# Asegurar encoding UTF-8 en stdout/stderr para Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pathlib import Path
from dotenv import load_dotenv

# Cargar .env tanto de backend/ como de directorio raíz si existe
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)
load_dotenv()

from contextlib import asynccontextmanager
from database.init_db import init_db
from routers import auth, projects, chapters, generate, style, characters, export, ai_test

# ─── CONFIGURACIÓN ───────────────────────────────────────────────────────────

ENTORNO      = os.getenv("ENTORNO", "development")
ES_PRODUCCION = ENTORNO == "production"

# Orígenes permitidos según entorno y variables
ALLOWED_ORIGINS_RAW = os.getenv("ALLOWED_ORIGINS") or os.getenv("FRONTEND_URL", "")
if ALLOWED_ORIGINS_RAW:
    ORIGENES_CORS = [origin.strip() for origin in ALLOWED_ORIGINS_RAW.split(",") if origin.strip()]
else:
    ORIGENES_CORS = []

# Añadir defaults de desarrollo y producción
if not ES_PRODUCCION or not ORIGENES_CORS:
    ORIGENES_CORS.extend([
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:80",
        "http://localhost",
        "https://mep-editor.vercel.app",
        "https://rdc-manga-editor.vercel.app"
    ])
ORIGENES_CORS = list(set(ORIGENES_CORS))

# ─── LIFESPAN Y APLICACIÓN ───────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🎌 MEP — Manga Editor Pro API v2.0")
    print(f"   Entorno: {ENTORNO.upper()}")
    init_db()
    print("✅ Base de datos inicializada")
    print(f"🌐 CORS permitidos: {ORIGENES_CORS}")
    if not ES_PRODUCCION:
        print("📚 Documentación: http://localhost:8000/docs")
    yield

app = FastAPI(
    title="MEP — Manga Editor Pro API",
    description="Suite profesional de creación, publicación y monetización de cómics manga con IA",
    version="2.0.0",
    # En producción, ocultar la documentación pública si se desea
    docs_url=None if ES_PRODUCCION and os.getenv("HIDE_DOCS") == "true" else "/docs",
    redoc_url=None if ES_PRODUCCION and os.getenv("HIDE_DOCS") == "true" else "/redoc",
    lifespan=lifespan,
)

# ─── MIDDLEWARES DE SEGURIDAD ────────────────────────────────────────────────

# 1. Cabeceras de seguridad estrictas
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if ES_PRODUCCION:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# 2. CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGENES_CORS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Rate limiting HTTP básico por IP (en memoria)
# Para producción real usar SlowAPI o un proxy inverso como Nginx
from collections import defaultdict
import time

peticiones_por_ip: dict = defaultdict(list)
LIMITE_PETICIONES = 200    # peticiones permitidas
VENTANA_SEGUNDOS  = 60     # por minuto

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """
    Rate limiting básico por IP para prevenir abuso.
    200 peticiones/minuto por IP.
    """
    # Excluir rutas de archivos estáticos
    if request.url.path.startswith("/uploads"):
        return await call_next(request)

    ip = request.client.host if request.client else "unknown"
    ahora = time.time()

    # Limpiar peticiones antiguas
    peticiones_por_ip[ip] = [
        t for t in peticiones_por_ip[ip]
        if ahora - t < VENTANA_SEGUNDOS
    ]

    if len(peticiones_por_ip[ip]) >= LIMITE_PETICIONES:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "detail": f"Demasiadas peticiones. "
                          f"Límite: {LIMITE_PETICIONES}/min. "
                          f"Inténtalo en {VENTANA_SEGUNDOS}s."
            }
        )

    peticiones_por_ip[ip].append(ahora)
    return await call_next(request)


# Archivos estáticos (imágenes de referencia)
uploads_path = Path("uploads")
uploads_path.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

style_refs_path = Path(__file__).resolve().parent / "data" / "style_references"
if style_refs_path.exists():
    app.mount("/assets/style_references", StaticFiles(directory=str(style_refs_path)), name="style_references")

# ─── ROUTERS ─────────────────────────────────────────────────────────────────

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(chapters.router)
app.include_router(generate.router)
app.include_router(style.router)
app.include_router(characters.router)
app.include_router(export.router)
app.include_router(ai_test.router)

# ─── ENDPOINTS BÁSICOS ───────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "status":   "ONLINE",
        "proyecto": "RDC Manga Editor Pro",
        "version":  "2.0.0",
        "entorno":  ENTORNO
    }

@app.get("/health")
async def health_check():
    """Endpoint de health check para Render.com y monitorización."""
    return {"status": "healthy", "version": "2.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0" if ES_PRODUCCION else "127.0.0.1",
        port=int(os.getenv("PORT", 8000)),
        reload=not ES_PRODUCCION
    )