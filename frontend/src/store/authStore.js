import { create } from 'zustand'
import { authAPI } from '../services/api'

// Utilidad para extraer y formatear el mensaje exacto de error devuelto por FastAPI (HTTP 400/401/422)
export const formatearErrorBackend = (error, fallback = 'Ocurrió un error') => {
  if (!error?.response) {
    return error?.message || fallback
  }

  const detail = error.response.data?.detail
  if (!detail) {
    return error.response.data?.mensaje || error.response.data?.message || fallback
  }

  // Si es un string simple (HTTP 400, 401, 403, 404)
  if (typeof detail === 'string') {
    return detail
  }

  // Si es una lista de validación de Pydantic (HTTP 422)
  if (Array.isArray(detail)) {
    return detail
      .map(err => {
        const campo = Array.isArray(err.loc) ? err.loc[err.loc.length - 1] : ''
        const campoFormateado = campo && campo !== 'body' ? `[${campo}] ` : ''
        return `${campoFormateado}${err.msg || JSON.stringify(err)}`
      })
      .join(' | ')
  }

  // Si es un objeto estructurado
  if (typeof detail === 'object') {
    return detail.mensaje || detail.message || JSON.stringify(detail)
  }

  return String(detail)
}

const useAuthStore = create((set) => ({
  // Estado inicial
  usuario: JSON.parse(localStorage.getItem('rdc_usuario')) || null,
  token: localStorage.getItem('rdc_token') || null,
  cargando: false,
  error: null,

  // ─── ACCIONES ──────────────────────────────────────────────

  login: async (email, password, recordarme = false) => {
    set({ cargando: true, error: null })
    try {
      const respuesta = await authAPI.login({ email, password, recordarme })
      const { access_token, usuario } = respuesta.data

      // Guardar en localStorage para persistencia
      localStorage.setItem('rdc_token', access_token)
      localStorage.setItem('rdc_usuario', JSON.stringify(usuario))

      set({ token: access_token, usuario, cargando: false, error: null })
      return { exito: true }
    } catch (error) {
      const mensaje = formatearErrorBackend(error, 'Error al iniciar sesión')
      set({ cargando: false, error: mensaje })
      return { exito: false, error: mensaje }
    }
  },

  register: async (username, email, password, nombre_artistico) => {
    set({ cargando: true, error: null })
    try {
      const respuesta = await authAPI.register({ username, email, password, nombre_artistico })
      set({ cargando: false, error: null })
      return { exito: true, mensaje: respuesta.data?.mensaje }
    } catch (error) {
      const mensaje = formatearErrorBackend(error, 'Error al registrarse')
      set({ cargando: false, error: mensaje })
      return { exito: false, error: mensaje }
    }
  },

  setUsuario: (usuario) => {
    localStorage.setItem('rdc_usuario', JSON.stringify(usuario))
    set({ usuario })
  },

  actualizarAvatar: async (avatarUrl) => {
    try {
      const res = await authAPI.actualizarAvatar(avatarUrl)
      if (res?.data) {
        localStorage.setItem('rdc_usuario', JSON.stringify(res.data))
        set({ usuario: res.data })
        return { exito: true, usuario: res.data }
      }
    } catch (error) {
      // Fallback local si el backend está offline o en modo mock
      set(state => {
        const updated = { ...(state.usuario || {}), avatar_url: avatarUrl }
        localStorage.setItem('rdc_usuario', JSON.stringify(updated))
        return { usuario: updated }
      })
      return { exito: true }
    }
  },

  logout: () => {
    localStorage.removeItem('rdc_token')
    localStorage.removeItem('rdc_usuario')
    set({ usuario: null, token: null, error: null })
  },

  limpiarError: () => set({ error: null }),
}))

export default useAuthStore