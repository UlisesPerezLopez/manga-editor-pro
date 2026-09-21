// characterStore.js
// Estado global de personajes del proyecto activo con Zustand.

import { create } from 'zustand'
import { charactersAPI } from '../services/api'

const useCharacterStore = create((set, get) => ({
  personajes: [],
  personajeEditando: null,   // personaje abierto en el modal de edición
  cargando: false,
  guardando: false,
  generandoAvatar: false,
  error: null,

  // ─── ACCIONES ──────────────────────────────────────────────────────────

  cargarPersonajes: async (idProyecto) => {
    if (!idProyecto) return []
    set({ cargando: true, error: null })
    try {
      const r = await charactersAPI.listar(idProyecto)
      const lista = r?.data || []
      set({ personajes: lista, cargando: false })
      return lista
    } catch (e) {
      set({ error: 'Error al cargar personajes', cargando: false })
      return []
    }
  },

  crearPersonaje: async (idProyecto, datos) => {
    set({ guardando: true, error: null })
    try {
      const r = await charactersAPI.crear(idProyecto, datos)
      const nuevo = r?.data
      if (nuevo) {
        set(state => ({
          personajes: [...state.personajes, nuevo],
          guardando: false
        }))
      }
      return { exito: true, personaje: nuevo }
    } catch (e) {
      const msg = e.response?.data?.detail || 'Error al crear personaje'
      set({ error: msg, guardando: false })
      return { exito: false, error: msg }
    }
  },

  actualizarPersonaje: async (idProyecto, idPersonaje, datos, regenerarFicha = false) => {
    set({ guardando: true, error: null })
    try {
      const r = await charactersAPI.actualizar(idProyecto, idPersonaje, datos, regenerarFicha)
      const actualizado = r?.data
      if (actualizado) {
        set(state => ({
          personajes: state.personajes.map(p =>
            p.id === idPersonaje ? actualizado : p
          ),
          personajeEditando: state.personajeEditando?.id === idPersonaje ? actualizado : state.personajeEditando,
          guardando: false
        }))
      }
      return { exito: true, personaje: actualizado }
    } catch (e) {
      const msg = e.response?.data?.detail || 'Error al actualizar'
      set({ error: msg, guardando: false })
      return { exito: false, error: msg }
    }
  },

  eliminarPersonaje: async (idProyecto, idPersonaje) => {
    try {
      await charactersAPI.eliminar(idProyecto, idPersonaje)
      set(state => ({
        personajes: state.personajes.filter(p => p.id !== idPersonaje),
        personajeEditando: state.personajeEditando?.id === idPersonaje ? null : state.personajeEditando
      }))
      return { exito: true }
    } catch (e) {
      return { exito: false, error: 'Error al eliminar personaje' }
    }
  },

  generarAvatar: async (idProyecto, idPersonaje, datos = {}) => {
    set({ generandoAvatar: true, error: null })
    try {
      const r = await charactersAPI.generarAvatar(idProyecto, idPersonaje, datos)
      const data = r?.data || {}
      if (data?.exito && data?.personaje) {
        set(state => ({
          personajes: state.personajes.map(p =>
            p.id === idPersonaje ? data.personaje : p
          ),
          personajeEditando: state.personajeEditando?.id === idPersonaje ? data.personaje : state.personajeEditando,
          generandoAvatar: false
        }))
      } else {
        set({ generandoAvatar: false })
      }
      return { exito: true, data }
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || 'Error al generar avatar con Firma Visual'
      set({ error: msg, generandoAvatar: false })
      return { exito: false, error: msg }
    }
  },

  importarPersonajesDelGuion: async (idProyecto, datos = {}) => {
    set({ cargando: true, error: null })
    try {
      const r = await charactersAPI.importarDelGuion(idProyecto, datos)
      const data = r?.data || {}
      if (data?.personajes) {
        set({ personajes: data.personajes, cargando: false })
      } else {
        set({ cargando: false })
      }
      return { exito: true, data }
    } catch (e) {
      const msg = e.response?.data?.detail || 'Error al importar personajes'
      set({ error: msg, cargando: false })
      return { exito: false, error: msg }
    }
  },

  regenerarFicha: async (idProyecto, idPersonaje) => {
    set({ guardando: true, error: null })
    try {
      const r = await charactersAPI.regenerarFicha(idProyecto, idPersonaje)
      const data = r?.data
      if (data) {
        set(state => ({
          personajes: state.personajes.map(p =>
            p.id === idPersonaje ? data : p
          ),
          guardando: false
        }))
      }
      return { exito: true, personaje: data }
    } catch (e) {
      const msg = e.response?.data?.detail || 'Error al regenerar ficha'
      set({ error: msg, guardando: false })
      return { exito: false, error: msg }
    }
  },

  setPersonajeEditando: (personaje) => set({ personajeEditando: personaje }),
  limpiarError: () => set({ error: null }),
}))

export default useCharacterStore