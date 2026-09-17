// characterStore.js
// Estado global de personajes del proyecto activo con Zustand.

import { create } from 'zustand'
import { charactersAPI } from '../services/api'

const useCharacterStore = create((set, get) => ({
  personajes: [],
  personajeEditando: null,   // personaje abierto en el modal de edición
  cargando: false,
  guardando: false,
  error: null,

  // ─── ACCIONES ──────────────────────────────────────────────────────────

  cargarPersonajes: async (idProyecto) => {
    set({ cargando: true, error: null })
    try {
      const r = await charactersAPI.listar(idProyecto)
      set({ personajes: r.data, cargando: false })
    } catch (e) {
      set({ error: 'Error al cargar personajes', cargando: false })
    }
  },

  crearPersonaje: async (idProyecto, datos) => {
    set({ guardando: true, error: null })
    try {
      const r = await charactersAPI.crear(idProyecto, datos)
      set(state => ({
        personajes: [...state.personajes, r.data],
        guardando: false
      }))
      return { exito: true, personaje: r.data }
    } catch (e) {
      const msg = e.response?.data?.detail || 'Error al crear personaje'
      set({ error: msg, guardando: false })
      return { exito: false, error: msg }
    }
  },

  actualizarPersonaje: async (idProyecto, idPersonaje,
                               datos, regenerarFicha = false) => {
    set({ guardando: true, error: null })
    try {
      const r = await charactersAPI.actualizar(
        idProyecto, idPersonaje, datos, regenerarFicha
      )
      set(state => ({
        personajes: state.personajes.map(p =>
          p.id === idPersonaje ? r.data : p
        ),
        guardando: false
      }))
      return { exito: true, personaje: r.data }
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
        personajes: state.personajes.filter(p => p.id !== idPersonaje)
      }))
      return { exito: true }
    } catch (e) {
      return { exito: false, error: 'Error al eliminar personaje' }
    }
  },

  regenerarFicha: async (idProyecto, idPersonaje) => {
    set({ guardando: true, error: null })
    try {
      const r = await charactersAPI.regenerarFicha(idProyecto, idPersonaje)
      set(state => ({
        personajes: state.personajes.map(p =>
          p.id === idPersonaje ? r.data : p
        ),
        guardando: false
      }))
      return { exito: true, personaje: r.data }
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