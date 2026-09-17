// api.js
// Cliente HTTP centralizado con Axios.
// Gestiona automáticamente el token JWT en todas las peticiones.

import axios from 'axios'

const BASE_URL = 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Interceptor: añade el token JWT automáticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('rdc_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// Interceptor: si el token expira, redirige al login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('rdc_token')
      localStorage.removeItem('rdc_usuario')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ─── AUTH ─────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (datos) => api.post('/auth/register', datos),
  login: (datos) => api.post('/auth/login', datos),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  getAiMode: () => api.get('/auth/ai-mode'),
  setAiMode: (aiMode) => api.patch('/auth/ai-mode', { ai_mode: aiMode }),
}

// ─── PROYECTOS ────────────────────────────────────────────────────────────
export const projectsAPI = {
  listar: () => api.get('/projects'),
  crear: (datos) => api.post('/projects', datos),
  obtener: (id) => api.get(`/projects/${id}`),
  eliminar: (id) => api.delete(`/projects/${id}`),
  estilosLegendarios: () => api.get('/projects/estilos-legendarios'),
  obtenerAnalytics: (id) => api.get(`/projects/analytics/${id}`),
}

// ─── GENERACIÓN IA ────────────────────────────────────────────────────────
export const generateAPI = {
  generarSinopsis: (datos) => api.post('/generate/sinopsis', datos),
  generarCapitulo: (datos) => api.post('/generate/capitulo', datos),
  generarDescripcionVineta: (datos) => api.post('/generate/descripcion-vineta', datos),
  mejorarDialogo: (datos) => api.post('/generate/mejorar-dialogo', datos),
  estadoGemini: () => api.get('/generate/estado-gemini'),
  estadoIA: () => api.get('/generate/estado-ia'),
  estadoProveedores: () => api.get('/generate/estado-proveedores'),
}

// ─── FIRMA VISUAL ─────────────────────────────────────────────────────────
export const styleAPI = {
  // Obtener estado actual de la firma visual del proyecto
  obtenerEstado: (idProyecto) =>
    api.get(`/style/estado/${idProyecto}`),

  // Subir imágenes de referencia (FormData con archivos)
  subirReferencias: (idProyecto, formData) =>
    api.post(`/style/upload-referencias/${idProyecto}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Iniciar análisis de imágenes con Gemini Vision
  analizarEstilo: (idProyecto) =>
    api.post(`/style/analizar/${idProyecto}`),

  // Bloquear el estilo como definitivo
  bloquearEstilo: (idProyecto) =>
    api.post(`/style/bloquear/${idProyecto}`),

  // Eliminar todas las referencias y reiniciar análisis
  eliminarReferencias: (idProyecto) =>
    api.delete(`/style/referencias/${idProyecto}`),
}

// ─── PERSONAJES ───────────────────────────────────────────────────────────
export const charactersAPI = {
  listar:   (idProyecto) =>
    api.get(`/characters/${idProyecto}`),

  crear:    (idProyecto, datos) =>
    api.post(`/characters/${idProyecto}`, datos),

  obtener:  (idProyecto, idPersonaje) =>
    api.get(`/characters/${idProyecto}/${idPersonaje}`),

  actualizar: (idProyecto, idPersonaje, datos, regenerarFicha = false) =>
    api.put(`/characters/${idProyecto}/${idPersonaje}?regenerar_ficha=${regenerarFicha}`, datos),

  eliminar: (idProyecto, idPersonaje) =>
    api.delete(`/characters/${idProyecto}/${idPersonaje}`),

  regenerarFicha: (idProyecto, idPersonaje) =>
    api.post(`/characters/${idProyecto}/${idPersonaje}/regenerar-ficha`),
}

// ─── GENERACIÓN DE IMÁGENES ──────────────────────────────────────────────
export const imageAPI = {
  generarImagenVineta: (datos) =>
    api.post('/generate/imagen-vineta', datos),

  estadoProveedores: () =>
    api.get('/generate/estado-proveedores'),
}

// ─── EXPORTACIÓN ─────────────────────────────────────────────────────────
export const exportAPI = {
  exportarPDF: (idProyecto, idCapitulo, paginasBase64) =>
    api.post(
      `/export/pdf-capitulo/${idProyecto}/${idCapitulo}`,
      { paginas_base64: paginasBase64 },
      { responseType: 'blob' }   // importante: blob para descarga
    ),

  exportarPNG: (idProyecto, paginaBase64, nombre) =>
    api.post(
      `/export/png-pagina/${idProyecto}`,
      { pagina_base64: paginaBase64, nombre },
      { responseType: 'blob' }
    ),

  infoCapitulo: (idProyecto, idCapitulo) =>
    api.get(`/export/info-capitulo/${idProyecto}/${idCapitulo}`),
}

// ─── ESTADÍSTICAS ─────────────────────────────────────────────────────────
export const statsAPI = {
  estadisticasProyecto: (id) =>
    api.get(`/projects/estadisticas/${id}`),

  resumenUsuario: () =>
    api.get('/projects/resumen-usuario'),
}

export default api

// ─── CAPÍTULOS Y PÁGINAS ──────────────────────────────────────────────────
export const chaptersAPI = {
  // Capítulos
  listar:          (idProyecto) =>
    api.get(`/chapters/${idProyecto}`),

  crearCapitulo:   (idProyecto, datos) =>
    api.post(`/chapters/${idProyecto}`, datos),

  eliminarCapitulo: (idProyecto, idCapitulo) =>
    api.delete(`/chapters/${idProyecto}/capitulo/${idCapitulo}`),

  actualizarPublicacion: (idProyecto, idCapitulo, datos) =>
    api.patch(`/chapters/${idProyecto}/capitulo/${idCapitulo}/publish-status`, datos),

  darLike: (idProyecto, idCapitulo) =>
    api.post(`/chapters/${idProyecto}/capitulo/${idCapitulo}/like`),

  registrarLectura: (idProyecto, idCapitulo) =>
    api.post(`/chapters/${idProyecto}/capitulo/${idCapitulo}/view`),

  // Páginas
  crearPagina:     (idProyecto, idCapitulo, datos) =>
    api.post(`/chapters/${idProyecto}/capitulo/${idCapitulo}/pagina`, datos),

  obtenerPagina:   (idProyecto, idPagina) =>
    api.get(`/chapters/${idProyecto}/pagina/${idPagina}`),

  guardarCanvas:   (idProyecto, idPagina, datos) =>
    api.put(`/chapters/${idProyecto}/pagina/${idPagina}/guardar`, datos),

  eliminarPagina:  (idProyecto, idPagina) =>
    api.delete(`/chapters/${idProyecto}/pagina/${idPagina}`),
}