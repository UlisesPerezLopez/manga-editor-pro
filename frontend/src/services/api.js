// api.js
// Cliente HTTP centralizado con Axios.
// Gestiona automáticamente el token JWT en todas las peticiones.

import axios from 'axios'

const BASE_URL = 'http://localhost:8000'

export const obtenerUrlImagen = (ruta) => {
  if (!ruta) return null
  if (ruta.startsWith('http://') || ruta.startsWith('https://') || ruta.startsWith('data:')) {
    return ruta
  }
  const backendBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
  return `${backendBase}${ruta.startsWith('/') ? '' : '/'}${ruta}`
}

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
  actualizarAvatar: (avatarUrl) => api.patch('/auth/avatar', { avatar_url: avatarUrl }),
}

// ─── PROYECTOS ────────────────────────────────────────────────────────────
export const projectsAPI = {
  listar: () => api.get('/projects'),
  crear: (datos) => {
    const modo = datos.modo_creacion || datos.creation_mode || 'propio'
    const formato = datos.formato_lectura || datos.reading_format || 'manga'
    const estilo = modo === 'legendario' ? (datos.estilo_legendario || null) : null
    const payload = {
      nombre: (datos.nombre || '').trim(),
      modo_creacion: modo,
      formato_lectura: formato,
      estilo_legendario: estilo,
    }
    return api.post('/projects', payload)
  },
  obtener: (id) => api.get(`/projects/${id}`),
  actualizar: (id, datos) => api.patch(`/projects/${id}`, datos),
  eliminar: (id) => api.delete(`/projects/${id}`),
  actualizarPortada: (id, portadaUrl) => api.patch(`/projects/${id}/portada`, { portada_url: portadaUrl }),
  estilosLegendarios: () => api.get('/projects/estilos-legendarios'),
  obtenerAnalytics: (id) => api.get(`/projects/analytics/${id}`),

  // Firma Visual & Portadas
  obtenerFirmaVisual: (id) => api.get(`/projects/${id}/firma-visual`),
  subirReferenciasFirma: (id, formData) =>
    api.post(`/projects/${id}/firma-visual/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  analizarFirmaVisual: (id) => api.post(`/projects/${id}/firma-visual/analizar`),
  actualizarFirmaVisual: (id, datos) => api.patch(`/projects/${id}/firma-visual`, datos),
  sortearEstiloAleatorio: (id) => api.post(`/projects/${id}/firma-visual/sortear-aleatorio`),
  eliminarReferenciasFirma: (id) => api.delete(`/projects/${id}/firma-visual/referencias`),
  generarPortada: (id, datos) => api.post(`/projects/${id}/generar-portada`, datos),
  obtenerDetalleEstilo: (styleId) => api.get(`/projects/styles/${styleId}`),
  borrarImagenVineta: (id, cap, pag, vin) => api.delete(`/projects/${id}/vinetas/${cap}/${pag}/${vin}/imagen`),
  purgarImagenesCapitulo: (id, cap) => api.post(`/projects/${id}/vinetas/${cap}/purgar-imagenes`),
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

// ─── FIRMA VISUAL (ALIAS STYLE API) ───────────────────────────────────────
export const styleAPI = {
  // Obtener estado actual de la firma visual del proyecto
  obtenerEstado: (idProyecto) =>
    api.get(`/projects/${idProyecto}/firma-visual`),

  // Subir imágenes de referencia (FormData con archivos)
  subirReferencias: (idProyecto, formData) =>
    api.post(`/projects/${idProyecto}/firma-visual/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Iniciar análisis de imágenes con Gemini Vision
  analizarEstilo: (idProyecto) =>
    api.post(`/projects/${idProyecto}/firma-visual/analizar`),

  // Bloquear o actualizar el estilo
  actualizarFirma: (idProyecto, datos) =>
    api.patch(`/projects/${idProyecto}/firma-visual`, datos),

  // Bloquear el estilo como definitivo
  bloquearEstilo: (idProyecto, datos = {}) =>
    api.patch(`/projects/${idProyecto}/firma-visual`, { ...datos, style_locked: true }),

  // Re-sorteo de estilo aleatorio
  sortearAleatorio: (idProyecto) =>
    api.post(`/projects/${idProyecto}/firma-visual/sortear-aleatorio`),

  // Eliminar todas las referencias y reiniciar análisis
  eliminarReferencias: (idProyecto) =>
    api.delete(`/projects/${idProyecto}/firma-visual/referencias`),

  // Obtener detalles de la biblia de estilos y galería de referencias
  obtenerDetalleEstilo: (styleId) =>
    api.get(`/projects/styles/${styleId}`),
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

  generarAvatar: (idProyecto, idPersonaje, datos = {}) =>
    api.post(`/characters/${idProyecto}/${idPersonaje}/generar-avatar`, datos),

  importarDelGuion: (idProyecto, datos = {}) =>
    api.post(`/characters/${idProyecto}/importar-del-guion`, datos),

  generarIdea: (idProyecto, datos = {}) =>
    api.post(`/characters/${idProyecto}/generar-idea`, datos),

  regenerarFicha: (idProyecto, idPersonaje) =>
    api.post(`/characters/${idProyecto}/${idPersonaje}/regenerar-ficha`),

  calibrarAdnVision: (idProyecto, idPersonaje) =>
    api.post(`/projects/${idProyecto}/personajes/${idPersonaje}/calibrar-adn-vision`),
}


// ─── GENERADOR DE VIÑETAS (PANEL ART STUDIO API) ──────────────────────────
export const vinetasAPI = {
  generarImagen: (idProyecto, datos) =>
    api.post(`/projects/${idProyecto}/vinetas/generar-imagen`, datos),

  guardarVineta: (idProyecto, datos) =>
    api.patch(`/projects/${idProyecto}/vinetas/guardar`, datos),

  listarVinetas: (idProyecto) =>
    api.get(`/projects/${idProyecto}/vinetas`),

  borrarImagenVineta: (id, cap, pag, vin) =>
    api.delete(`/projects/${id}/vinetas/${cap}/${pag}/${vin}/imagen`),

  purgarImagenesCapitulo: (id, cap) =>
    api.post(`/projects/${id}/vinetas/${cap}/purgar-imagenes`),

  checkFreeLLMAPI: () =>
    api.get('/api/ai/health/freellmapi'),
}

export const borrarImagenVineta = (id, cap, pag, vin) =>
  api.delete(`/projects/${id}/vinetas/${cap}/${pag}/${vin}/imagen`)

export const purgarImagenesCapitulo = (id, cap) =>
  api.post(`/projects/${id}/vinetas/${cap}/purgar-imagenes`)


// ─── GENERACIÓN DE IMÁGENES ──────────────────────────────────────────────
export const imageAPI = {
  generarImagenVineta: (datos) =>
    api.post('/generate/imagen-vineta', datos),

  estadoProveedores: () =>
    api.get('/generate/estado-proveedores'),

  checkFreeLLMAPI: () =>
    api.get('/api/ai/health/freellmapi'),
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

  actualizarCapitulo: (idProyecto, idCapitulo, datos) =>
    api.patch(`/chapters/${idProyecto}/capitulo/${idCapitulo}`, datos),

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