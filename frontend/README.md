# 🎌 MEP — Manga Editor Pro

**Suite profesional de creación de cómics manga con IA**  
*MEP Manga · v2.0.0*

---

## ✨ Características principales

- 🎨 **Firma Visual** — Analiza 15-25 imágenes de referencia con Gemini Vision y genera el ADN visual único del proyecto
- ⚡ **10 Estilos Legendarios** — Shonen, Shojo, Seinen, Cyberpunk, Franco-Belge y más
- 📝 **Guionista IA** — Gemini 2.5 Flash genera sinopsis, arcos narrativos y guiones completos
- 👤 **Personajes con Ficha Técnica IA** — Coherencia visual garantizada en cada viñeta
- 🖼️ **Editor de páginas** — Canvas Fabric.js con viñetas, bocadillos y capas
- 🎨 **Generación de imágenes** — Replicate Flux Schnell + Gemini Imagen 3
- 📤 **Exportación Pro** — PNG (hasta 3×) y PDF listo para imprenta

---

## 🛠️ Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + TailwindCSS 3 |
| Canvas | Fabric.js 6 |
| Estado | Zustand |
| Backend | Python 3.11 + FastAPI |
| Base de datos | SQLite (dev) / PostgreSQL (prod) |
| IA texto | Google Gemini 2.5 Flash |
| IA imágenes | Replicate Flux Schnell + Gemini Imagen 3 |
| Auth | JWT + bcrypt |
| Deploy | Vercel (frontend) + Render (backend) |

---

## 🚀 Instalación local

### Requisitos previos
- Python 3.11+
- Node.js 18+
- Cuenta en [Google AI Studio](https://aistudio.google.com) (API key gratuita)
- Cuenta en [Replicate](https://replicate.com) (pay-per-use, ~$0.003/imagen)

### Backend

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate          # Windows
source venv/bin/activate         # Linux/Mac
pip install -r requirements.txt

# Copiar y configurar variables de entorno
copy .env.example .env           # Windows
cp .env.example .env             # Linux/Mac
# Editar .env con tus API keys

python main.py
# API disponible en http://localhost:8000
# Docs en http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# App disponible en http://localhost:5173
```

---

## 🔑 Variables de entorno necesarias

```env
GEMINI_API_KEY=tu_clave_de_google
REPLICATE_API_TOKEN=r8_xxxxxxxx
SECRET_KEY=clave-secreta-jwt-minimo-32-chars
```

---

## 📁 Estructura del proyecto

```
rdc-manga-editor-pro/
├── backend/
│   ├── database/        # Modelos SQLAlchemy + inicialización
│   ├── routers/         # Endpoints FastAPI (auth, projects, generate...)
│   ├── services/        # Gemini, Replicate, StyleAnalyzer
│   ├── models/          # Schemas Pydantic
│   ├── utils/           # JWT, rate limiter, dependencias
│   ├── uploads/         # Imágenes de referencia subidas
│   └── main.py
└── frontend/
    ├── src/
    │   ├── pages/       # Login, Dashboard, ProjectStudio...
    │   ├── components/  # StyleWizard, Characters, Editor, Export...
    │   ├── store/       # Zustand stores
    │   └── services/    # API client (Axios)
    └── public/          # Assets estáticos + PWA manifest
```

---

## 🌐 Deploy en producción

### Frontend → Vercel
1. Conecta el repositorio en [vercel.com](https://vercel.com)
2. Root directory: `frontend`
3. Build command: `npm run build`
4. Variables de entorno: `VITE_API_URL=https://tu-backend.render.com`

### Backend → Render
1. New Web Service en [render.com](https://render.com)
2. Root directory: `backend`
3. Build command: `pip install -r requirements.txt`
4. Start command: `python main.py`
5. Variables de entorno: todas las del `.env`

---

## 📄 Licencia

Proyecto privado — Raíces de Ceniza © 2026

---

*Hecho con ❤️ y mucho café* Tito Uli. UPZ Creaciones.