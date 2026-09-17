// projectStore.js
// Estado global del proyecto activo con Zustand.
// Gestiona el proyecto abierto, sus capítulos y el estado de generación.

import { create } from 'zustand'
import { projectsAPI, generateAPI } from '../services/api'

const useProjectStore = create((set, get) => ({
  // Proyecto actualmente abierto
  proyectoActivo: null,
  capitulos: [],
  guionGenerado: null,
  sinopsisGenerada: null,

  // Estados de carga
  cargandoProyecto: false,
  generandoGuion: false,
  generandoSinopsis: false,

  // Errores
  errorProyecto: null,
  errorGuion: null,
  errorSinopsis: null,

  // ─── ACCIONES ──────────────────────────────────────────────────────────

  setProyectoActivo: (proyecto) => set({
    proyectoActivo: proyecto,
    cargandoProyecto: false,
    errorProyecto: null
  }),

  cargarProyecto: async (id) => {
    if (!id) return null
    set({ cargandoProyecto: true, errorProyecto: null })
    try {
      const respuesta = await projectsAPI.obtener(id)
      set({ proyectoActivo: respuesta.data, cargandoProyecto: false })
      return respuesta.data
    } catch (error) {
      console.error('Error al cargar proyecto:', error)
      const msg = error.response?.data?.detail || 'Error al cargar proyecto'
      set({ cargandoProyecto: false, errorProyecto: msg })
      return null
    }
  },

  generarSinopsis: async (titulo, genero, tono, premisa, numCapitulos) => {
    set({ generandoSinopsis: true, errorSinopsis: null, sinopsisGenerada: null })
    try {
      const respuesta = await generateAPI.generarSinopsis({
        titulo, genero, tono, premisa,
        num_capitulos: numCapitulos
      })
      set({
        sinopsisGenerada: respuesta.data.datos,
        generandoSinopsis: false
      })
      return { exito: true, datos: respuesta.data.datos }
    } catch (error) {
      const status = error.response?.status
      let msg = error.response?.data?.detail
      if (!msg) {
        if (status === 404) msg = 'El endpoint de generación no fue encontrado (404). Verifica que el backend esté actualizado.'
        else if (status === 503) msg = 'El motor de IA está temporalmente no disponible (503). Reintenta en unos instantes.'
        else msg = error.message || 'Error al generar sinopsis'
      }
      set({ errorSinopsis: msg, generandoSinopsis: false })
      return { exito: false, error: msg }
    }
  },

  generarCapitulo: async (idProyecto, numeroCapitulo, premisa, genero, tono) => {
    set({ generandoGuion: true, errorGuion: null, guionGenerado: null })
    try {
      const respuesta = await generateAPI.generarCapitulo({
        id_proyecto: idProyecto,
        numero_capitulo: numeroCapitulo,
        premisa,
        genero,
        tono,
        guardar_en_bd: true
      })
      set({
        guionGenerado: respuesta.data.datos,
        generandoGuion: false
      })
      return { exito: true, datos: respuesta.data.datos }
    } catch (error) {
      const status = error.response?.status
      let msg = error.response?.data?.detail
      if (!msg) {
        if (status === 404) msg = 'El endpoint de guion o el proyecto no fue encontrado (404).'
        else if (status === 503) msg = 'El motor de IA está temporalmente no disponible (503). Reintenta en unos instantes.'
        else msg = error.message || 'Error al generar capítulo'
      }
      set({ errorGuion: msg, generandoGuion: false })
      return { exito: false, error: msg }
    }
  },

  limpiarGuion: () => set({ guionGenerado: null, errorGuion: null }),
  limpiarSinopsis: () => set({ sinopsisGenerada: null, errorSinopsis: null }),
  limpiarTodo: () => set({
    proyectoActivo: null,
    capitulos: [],
    guionGenerado: null,
    sinopsisGenerada: null,
    errorProyecto: null,
    errorGuion: null,
    errorSinopsis: null
  }),
}))

export default useProjectStore