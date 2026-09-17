# 📋 MEP — Manga Editor Pro: Checklist de Lanzamiento a Producción

Este documento sirve como protocolo de validación final y control de calidad antes y después de desplegar **MEP (v2.0)** en **Render** (Backend + PostgreSQL) y **Vercel** (Frontend).

---

## 🔒 1. Puerta de Calidad y Seguridad Pre-Push (Local)

- [x] **Auditoría de Secretos**: Ningún token o contraseña real se encuentra en archivos versionados. `.env` está en `.gitignore` y solo `.env.example` contiene las plantillas seguras.
- [x] **Cabeceras de Seguridad**: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` y `Content-Security-Policy` activos en FastAPI y Nginx.
- [x] **CORS Restrictivo**: Parámetro `ALLOWED_ORIGINS` configurado en `backend/main.py` para aceptar solo dominios autorizados de producción.
- [x] **Suite de Pruebas Automatizadas**: 5/5 pruebas E2E aprobadas en `pytest backend/tests/test_e2e_pipeline.py`.
- [x] **Compilación y Chunk Splitting**: `npm run build` ejecutado en `frontend/` generando bundles optimizados (`react-vendor`, `fabric-vendor`, `i18n-vendor`) en < 1 segundo sin warnings de tamaño excesivo.

---

## 🐘 2. Despliegue del Backend en Render

- [ ] **Paso 2.1**: Conectar el repositorio en [Render.com](https://render.com) utilizando el Blueprint `render.yaml`.
- [ ] **Paso 2.2**: Verificar aprovisionamiento de la base de datos PostgreSQL administrada (`mep-postgres-db`).
- [ ] **Paso 2.3**: Comprobar variables de entorno inyectadas:
  - `ENTORNO` = `production`
  - `DATABASE_URL` = *(automático desde PostgreSQL de Render)*
  - `JWT_SECRET_KEY` = *(generado aleatoriamente)*
  - `FRONTEND_URL` = `https://tu-app-en-vercel.vercel.app`
- [ ] **Paso 2.4**: Validar que el endpoint `https://tu-backend.onrender.com/health` devuelva `{"status": "healthy"}`.

---

## 🌐 3. Despliegue del Frontend en Vercel

- [ ] **Paso 3.1**: Importar el repositorio en [Vercel](https://vercel.com).
- [ ] **Paso 3.2**: Configurar Framework Preset: `Vite`, Root Directory: `frontend/` (o raíz), Build Command: `npm run build`, Output Directory: `dist`.
- [ ] **Paso 3.3**: Configurar variable de entorno:
  - `VITE_API_URL` = `https://tu-backend.onrender.com`
- [ ] **Paso 3.4**: Desplegar y comprobar que `vercel.json` gestione correctamente el enrutamiento SPA y caché edge.

---

## 🔄 4. Migración de Datos SQLite a PostgreSQL (Opcional)

Si existen datos locales previos en `backend/rdc_manga.db` que deban transferirse a PostgreSQL:

```bash
python backend/database/migrate_to_postgres.py \
  --sqlite-path backend/rdc_manga.db \
  --postgres-url "postgresql://mep_user:password@host-render-postgres:5432/mep_manga_db"
```

- [ ] Validar que el conteo de usuarios, proyectos, capítulos y páginas coincida exactamente.

---

## 🚀 5. Smoke Testing y Verificación Post-Lanzamiento

Ejecutar el script automatizado contra los dominios reales desplegados:

```bash
python scripts/smoke_test.py \
  --backend-url "https://mep-backend-api.onrender.com" \
  --frontend-url "https://mep-editor.vercel.app"
```

### Protocolo Manual de Comprobación:
1. [ ] **Registro / Login**: Crear un usuario nuevo y verificar almacenamiento seguro de token JWT.
2. [ ] **Firma Visual & Personajes**: Crear un proyecto manga y añadir un personaje.
3. [ ] **Canvas Fabric.js**: Crear una página, añadir viñetas y verificar auto-guardado en base de datos.
4. [ ] **Lector Interactivo**: Abrir en modo Webtoon y Manga D→I; comprobar contador de likes y vistas.
5. [ ] **PWA Offline**: Verificar registro del Service Worker en `DevTools -> Application -> Service Workers`.
