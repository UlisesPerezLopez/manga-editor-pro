# 🚀 MEP — Manga Editor Pro: Guía Maestra de Despliegue en Producción

Esta guía detalla el protocolo técnico completo para desplegar **MEP (Manga Editor Pro)** en entornos de producción en la nube (**Vercel** para Frontend, **Render / Railway** para Backend y **PostgreSQL** administrado), así como despliegues contenerizados con **Docker**.

---

## 📋 1. Matriz de Variables de Entorno

### 🔹 Backend (FastAPI)
| Variable | Descripción | Valor de Ejemplo (Producción) | Requerido |
| :--- | :--- | :--- | :---: |
| `ENTORNO` | Entorno de ejecución (`production` / `development`) | `production` | **SÍ** |
| `DATABASE_URL` | URI de conexión a PostgreSQL | `postgresql://mep_user:pass@ep-host.render.com/mep_db` | **SÍ** |
| `JWT_SECRET_KEY` | Clave criptográfica para firmas JWT | `f7a29e4b1c8...` *(64+ caracteres aleatorios)* | **SÍ** |
| `FRONTEND_URL` | Origen permitido por CORS | `https://mep-editor.vercel.app` | **SÍ** |
| `GEMINI_API_KEY` | Token de Google AI Gemini (Guiones y Fichas) | `AIzaSy...` | Opcional |
| `REPLICATE_API_TOKEN` | Token de Replicate (Modelos LoRA y Flux) | `r8_...` | Opcional |
| `AI_MODE_DEFAULT` | Modo de IA por defecto (`cloud_free` o `local`) | `cloud_free` | No (def: cloud_free) |

### 🔹 Frontend (React 18 + Vite)
| Variable | Descripción | Valor de Ejemplo | Requerido |
| :--- | :--- | :--- | :---: |
| `VITE_API_URL` | URL base de la API del Backend | `https://mep-backend-api.onrender.com` | **SÍ** |

---

## ☁️ 2. Opción A: Despliegue Cloud (Vercel + Render + PostgreSQL)

### Paso 1: Base de Datos y Backend en Render
1. Conecta tu repositorio de GitHub en [Render.com](https://render.com).
2. Selecciona **New Blueprint Instance** y elige el archivo `render.yaml` del repositorio.
3. Render aprovisionará automáticamente:
   - 🐘 **PostgreSQL Database** (`mep-postgres-db`).
   - 🐍 **Web Service Backend** (`mep-backend-api`) con Python 3.11 y Uvicorn.
4. En el dashboard del backend, anota la URL pública generada (ej. `https://mep-backend-api.onrender.com`).

### Paso 2: Frontend en Vercel
1. Ve a [Vercel](https://vercel.com) e importa el repositorio.
2. Configura los parámetros del proyecto:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./frontend` (o raíz del proyecto)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Agrega la variable de entorno:
   - `VITE_API_URL` = `https://mep-backend-api.onrender.com`
4. Haz clic en **Deploy**. El archivo `vercel.json` configurará el enrutamiento SPA y caché automáticamente.

### Paso 3: Sincronizar CORS en Render
- Actualiza la variable `FRONTEND_URL` en el servicio de Render con el dominio final de Vercel (ej. `https://mep-editor.vercel.app`).

---

## 🐳 3. Opción B: Despliegue con Docker & Docker Compose

Para alojar la plataforma en un VPS (Ubuntu / Debian), AWS EC2 o DigitalOcean:

```bash
# 1. Clonar el repositorio en el servidor
git clone https://github.com/tu-usuario/rdc-manga-editor-pro.git
cd rdc-manga-editor-pro

# 2. Configurar variables de entorno en el archivo .env
cp .env.example .env

# 3. Construir y levantar todos los contenedores en segundo plano
docker compose up -d --build

# 4. Verificar estado de los servicios (Frontend :80, Backend :8000, DB :5432)
docker compose ps
```

---

## 🔄 4. Migración de Base de Datos (SQLite a PostgreSQL)

Si tienes datos locales en `backend/rdc_manga.db` y deseas transferirlos al PostgreSQL de producción:

```bash
# Ejecutar el script CLI de migración segura
python backend/database/migrate_to_postgres.py \
  --sqlite-path backend/rdc_manga.db \
  --postgres-url "postgresql://mep_user:password@host-de-produccion:5432/mep_db"
```

El script validará los esquemas, preservará relaciones de clave foránea y recalibrará las secuencias numéricas de PostgreSQL.

---

## 🧪 5. Protocolo de Verificación Post-Despliegue (Smoke Testing)

1. **Healthcheck Backend**:
   Visita `https://tu-backend.onrender.com/docs` (o `/generate/estado-ia`) y verifica respuesta `HTTP 200 OK`.
2. **Registro y Autenticación**:
   Crea una cuenta en el Frontend y verifica la recepción del token JWT y el perfil de usuario.
3. **Flujo Gráfico en Canvas**:
   Crea un proyecto, añade un capítulo y guarda una página; recarga el navegador para validar la persistencia en base de datos.
4. **PWA y Caché**:
   Abre las herramientas de desarrollador (`F12 -> Application -> Service Workers`) y verifica que el Service Worker y el manifiesto PWA se encuentran activos.
