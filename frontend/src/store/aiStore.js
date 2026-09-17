// aiStore.js
// Store global de Zustand para control del motor de IA dual (Cloud Free vs Local GPU).

import { create } from 'zustand'
import { authAPI, generateAPI } from '../services/api'
import useAuthStore from './authStore'

const useAiStore = create((set, get) => ({
  // Estado inicial
  aiMode: localStorage.getItem('mep_ai_mode') || 'cloud_free',
  estadoIA: null,
  cargando: false,
  verificando: false,
  error: null,
  bannerErrorVisible: false,
  mensajeBanner: null,

  // Inicializar modo de IA desde el perfil del usuario o localStorage
  inicializar: () => {
    const usuario = useAuthStore.getState().usuario
    if (usuario?.ai_mode) {
      set({ aiMode: usuario.ai_mode })
      localStorage.setItem('mep_ai_mode', usuario.ai_mode)
    }
    get().verificarEstadoIA()
  },

  // Cambiar modo de IA ('cloud_free' o 'local')
  setAiMode: async (nuevoModo) => {
    if (nuevoModo !== 'cloud_free' && nuevoModo !== 'local') return

    set({ cargando: true, error: null })
    try {
      localStorage.setItem('mep_ai_mode', nuevoModo)
      set({ aiMode: nuevoModo })

      // Sincronizar con el backend si hay sesión activa
      const token = useAuthStore.getState().token
      if (token) {
        await authAPI.setAiMode(nuevoModo)
        const usuarioActual = useAuthStore.getState().usuario
        if (usuarioActual) {
          const usuarioActualizado = { ...usuarioActual, ai_mode: nuevoModo }
          localStorage.setItem('rdc_usuario', JSON.stringify(usuarioActualizado))
          useAuthStore.setState({ usuario: usuarioActualizado })
        }
      }

      // Verificar estado del nuevo motor inmediatamente
      await get().verificarEstadoIA()
      set({ cargando: false })
      return { exito: true }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Error al cambiar modo de IA'
      set({ cargando: false, error: msg })
      return { exito: false, error: msg }
    }
  },

  // Diagnóstico en tiempo real del estado de los subsistemas
  verificarEstadoIA: async () => {
    set({ verificando: true })
    try {
      const token = useAuthStore.getState().token
      if (!token) {
        set({ verificando: false })
        return
      }

      const res = await generateAPI.estadoIA()
      const data = res.data
      set({ estadoIA: data })

      const modoActual = get().aiMode
      if (modoActual === 'local') {
        const ollamaOffline = data?.subsistemas?.ollama_local?.estado !== 'OPERATIVO'
        const comfyOffline = data?.subsistemas?.comfyui_local?.estado !== 'OPERATIVO'

        if (ollamaOffline || comfyOffline) {
          const detalles = []
          if (ollamaOffline) detalles.push('Ollama (http://127.0.0.1:11434)')
          if (comfyOffline) detalles.push('ComfyUI (http://127.0.0.1:8188)')

          set({
            bannerErrorVisible: true,
            mensajeBanner: `Los servicios locales no responden: ${detalles.join(', ')}.`
          })
        } else {
          set({ bannerErrorVisible: false, mensajeBanner: null })
        }
      } else {
        set({ bannerErrorVisible: false, mensajeBanner: null })
      }
    } catch {
      // Error silencioso en polling
    } finally {
      set({ verificando: false })
    }
  },

  // Fallback directo a modo Cloud Free
  cambiarACloudTemporal: async () => {
    await get().setAiMode('cloud_free')
    set({ bannerErrorVisible: false, mensajeBanner: null })
  },

  // Cerrar banner de advertencia
  cerrarBanner: () => set({ bannerErrorVisible: false })
}))

export default useAiStore
