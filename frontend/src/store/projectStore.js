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
  capitulosGuiones: {}, // Mapeo de desglose técnico por número de capítulo: { [num]: { titulo_capitulo, sinopsis, escenas: [...] } }
  sinopsisGenerada: null,

  // Mapa indexado por: `${proyectoId}_${capNum}_${pagNum}_${vinNum}`
  vinetasEstudio: {},

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
      const datosGuion = respuesta.data.datos
      set(state => ({
        guionGenerado: datosGuion,
        capitulosGuiones: {
          ...state.capitulosGuiones,
          [numeroCapitulo]: datosGuion
        },
        generandoGuion: false
      }))
      return { exito: true, datos: datosGuion }
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

  actualizarPortada: async (idProyecto, portadaUrl) => {
    try {
      const res = await projectsAPI.actualizarPortada(idProyecto, portadaUrl)
      if (res?.data) {
        set(state => ({
          proyectoActivo: state.proyectoActivo?.id === idProyecto
            ? { ...state.proyectoActivo, portada_url: portadaUrl }
            : state.proyectoActivo
        }))
        return { exito: true, proyecto: res.data }
      }
    } catch (e) {
      console.warn('Error backend al actualizar portada, aplicando cambio local:', e)
      set(state => ({
        proyectoActivo: state.proyectoActivo?.id === idProyecto
          ? { ...state.proyectoActivo, portada_url: portadaUrl }
          : state.proyectoActivo
      }))
      return { exito: true }
    }
  },

  actualizarProyecto: async (idProyectoOrObj, datos) => {
    if (typeof idProyectoOrObj === 'object' && idProyectoOrObj !== null) {
      const obj = idProyectoOrObj.data || idProyectoOrObj
      set(state => ({
        proyectoActivo: state.proyectoActivo?.id === obj.id
          ? { ...state.proyectoActivo, ...obj }
          : (state.proyectoActivo || obj)
      }))
      return { exito: true, proyecto: obj }
    }
    const idProyecto = idProyectoOrObj
    try {
      const res = await projectsAPI.actualizar(idProyecto, datos)
      if (res?.data) {
        set(state => ({
          proyectoActivo: state.proyectoActivo?.id === idProyecto
            ? { ...state.proyectoActivo, ...res.data }
            : state.proyectoActivo
        }))
        return { exito: true, proyecto: res.data }
      }
      return { exito: false }
    } catch (e) {
      console.warn('Error backend al actualizar proyecto, aplicando local:', e)
      set(state => ({
        proyectoActivo: state.proyectoActivo?.id === idProyecto
          ? { ...state.proyectoActivo, ...datos }
          : state.proyectoActivo
      }))
      return { exito: true, local: true }
    }
  },


  setGuionCapitulo: (numeroCapitulo, guion) => set(state => ({
    capitulosGuiones: {
      ...state.capitulosGuiones,
      [numeroCapitulo]: guion
    },
    guionGenerado: guion
  })),

  actualizarGuionCapitulo: (numeroCapitulo, updater) => set(state => {
    const actual = state.capitulosGuiones[numeroCapitulo] || null
    const nuevo = typeof updater === 'function' ? updater(actual) : updater
    return {
      capitulosGuiones: {
        ...state.capitulosGuiones,
        [numeroCapitulo]: nuevo
      },
      guionGenerado: nuevo
    }
  }),

  setSinopsisGenerada: (sinopsis) => set({ sinopsisGenerada: sinopsis }),
  setGuionGenerado: (guion) => set({ guionGenerado: guion }),

  actualizarSinopsisGenerada: (updater) => set(state => ({
    sinopsisGenerada: typeof updater === 'function' ? updater(state.sinopsisGenerada) : updater
  })),

  actualizarGuionGenerado: (updater) => set(state => ({
    guionGenerado: typeof updater === 'function' ? updater(state.guionGenerado) : updater
  })),

  setVinetaEstudio: (clave, datos) => set(state => ({
    vinetasEstudio: {
      ...state.vinetasEstudio,
      [clave]: { ...(state.vinetasEstudio[clave] || {}), ...datos }
    }
  })),

  limpiarGuion: () => set({ guionGenerado: null, errorGuion: null }),
  limpiarSinopsis: () => set({ sinopsisGenerada: null, errorSinopsis: null }),
  limpiarTodo: () => set({
    proyectoActivo: null,
    capitulos: [],
    capitulosGuiones: {},
    vinetasEstudio: {},
    guionGenerado: null,
    sinopsisGenerada: null,
    errorProyecto: null,
    errorGuion: null,
    errorSinopsis: null
  }),
}))

export default useProjectStore