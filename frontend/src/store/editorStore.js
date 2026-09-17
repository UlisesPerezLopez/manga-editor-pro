// editorStore.js
// Estado global del editor de páginas con Zustand.
// Gestiona capítulos, página activa, herramienta activa y guardado.

import { create } from 'zustand'
import { chaptersAPI } from '../services/api'
import {
  guardarBorradorLocal,
  obtenerBorradorLocal,
  marcarBorradorSincronizado
} from '../services/indexedDbService'

const useEditorStore = create((set, get) => ({
  // Estructura de capítulos y páginas
  capitulos: [],
  paginaActiva: null,       // objeto Pagina completo con canvas_json
  capituloActivo: null,     // objeto Capitulo activo

  // Herramienta activa en el canvas
  herramientaActiva: 'seleccionar', // seleccionar|vineta|bocadillo|texto

  // Estados de UI
  cargando: false,
  guardando: false,
  ultimoGuardado: null,     // timestamp del último guardado
  panelIzqAbierto: true,
  panelDerAbierto: true,

  // ─── CAPÍTULOS ────────────────────────────────────────────────────────

  cargarCapitulos: async (idProyecto) => {
    set({ cargando: true })
    try {
      const r = await chaptersAPI.listar(idProyecto)
      let caps = r.data || []

      // DESBLOQUEO INICIAL AUTOMÁTICO:
      // Si el proyecto no tiene capítulos creados, crear Capítulo 1 -> Página 1
      if (caps.length === 0) {
        try {
          const resCap = await chaptersAPI.crearCapitulo(idProyecto, {
            numero: 1,
            titulo: 'Capítulo 1'
          })
          if (resCap?.data) {
            const capNuevo = resCap.data
            const resPag = await chaptersAPI.crearPagina(idProyecto, capNuevo.id, {
              numero: 1,
              layout_template: 'blank'
            })
            if (resPag?.data) {
              capNuevo.paginas = [resPag.data]
              caps = [capNuevo]
              set({ capitulos: caps, cargando: false })
              get().cargarPagina(idProyecto, resPag.data.id, capNuevo)
              return
            }
          }
        } catch (errAuto) {
          console.warn('Error auto-creando capítulo inicial:', errAuto)
        }
      } else {
        // Si hay capítulos pero el primero no tiene páginas, crear Página 1
        const primerCap = caps[0]
        if (!primerCap.paginas || primerCap.paginas.length === 0) {
          try {
            const resPag = await chaptersAPI.crearPagina(idProyecto, primerCap.id, {
              numero: 1,
              layout_template: 'blank'
            })
            if (resPag?.data) {
              primerCap.paginas = [resPag.data]
            }
          } catch (e) {}
        }

        // Cargar automáticamente la primera página si no hay página activa
        if (!get().paginaActiva && primerCap.paginas && primerCap.paginas.length > 0) {
          set({ capitulos: caps, cargando: false })
          get().cargarPagina(idProyecto, primerCap.paginas[0].id, primerCap)
          return
        }
      }

      set({ capitulos: caps, cargando: false })
    } catch (e) {
      console.error('Error cargando capítulos:', e)
      set({ cargando: false })
    }
  },

  crearCapitulo: async (idProyecto, datos) => {
    try {
      const r = await chaptersAPI.crearCapitulo(idProyecto, datos)
      set(state => ({
        capitulos: [...state.capitulos, r.data].sort((a, b) => a.numero - b.numero)
      }))
      return { exito: true, capitulo: r.data }
    } catch (e) {
      const msg = e.response?.data?.detail || 'Error al crear capítulo'
      return { exito: false, error: msg }
    }
  },

  eliminarCapitulo: async (idProyecto, idCapitulo) => {
    try {
      await chaptersAPI.eliminarCapitulo(idProyecto, idCapitulo)
      set(state => ({
        capitulos: state.capitulos.filter(c => c.id !== idCapitulo),
        paginaActiva: state.capituloActivo?.id === idCapitulo
          ? null : state.paginaActiva,
        capituloActivo: state.capituloActivo?.id === idCapitulo
          ? null : state.capituloActivo,
      }))
      return { exito: true }
    } catch (e) {
      return { exito: false, error: 'Error al eliminar capítulo' }
    }
  },

  // ─── PÁGINAS ──────────────────────────────────────────────────────────

  crearPagina: async (idProyecto, idCapitulo, datos) => {
    try {
      const r = await chaptersAPI.crearPagina(idProyecto, idCapitulo, datos)
      set(state => ({
        capitulos: state.capitulos.map(c =>
          c.id === idCapitulo
            ? { ...c, paginas: [...(c.paginas || []), r.data]
                              .sort((a, b) => a.numero - b.numero) }
            : c
        )
      }))
      return { exito: true, pagina: r.data }
    } catch (e) {
      const msg = e.response?.data?.detail || 'Error al crear página'
      return { exito: false, error: msg }
    }
  },

  cargarPagina: async (idProyecto, idPagina, capitulo) => {
    set({ cargando: true })
    try {
      let paginaData = null
      try {
        const r = await chaptersAPI.obtenerPagina(idProyecto, idPagina)
        paginaData = r.data
      } catch (errRed) {
        console.warn('Carga de red fallida, intentando desde IndexedDB offline:', errRed)
      }

      // Comprobar si existe un borrador local en IndexedDB más reciente o no sincronizado
      const borradorLocal = await obtenerBorradorLocal(idProyecto, idPagina)
      if (borradorLocal && borradorLocal.canvas_json) {
        if (!paginaData || !borradorLocal.sincronizado) {
          paginaData = {
            ...(paginaData || { id: idPagina, numero: 1 }),
            canvas_json: borradorLocal.canvas_json,
            es_borrador_local: true
          }
        }
      }

      set({
        paginaActiva: paginaData,
        capituloActivo: capitulo,
        cargando: false
      })
    } catch (e) {
      console.error('Error cargando página:', e)
      set({ cargando: false })
    }
  },

  guardarCanvas: async (idProyecto, idPagina, canvasJson) => {
    set({ guardando: true })

    // 1. Guardar de forma inmediata en IndexedDB (offline-safe)
    await guardarBorradorLocal(idProyecto, idPagina, canvasJson)

    // 2. Intentar guardar en backend FastAPI si hay red
    try {
      await chaptersAPI.guardarCanvas(idProyecto, idPagina, {
        canvas_json: canvasJson
      })
      await marcarBorradorSincronizado(idProyecto, idPagina)

      set({
        guardando: false,
        ultimoGuardado: new Date()
      })
      return { exito: true, online: true }
    } catch (e) {
      console.warn('Guardado en servidor fallido. Guardado preservado en IndexedDB:', e)
      set({
        guardando: false,
        ultimoGuardado: new Date()
      })
      return { exito: true, online: false, localOffline: true }
    }
  },

  eliminarPagina: async (idProyecto, idPagina, idCapitulo) => {
    try {
      await chaptersAPI.eliminarPagina(idProyecto, idPagina)
      set(state => ({
        capitulos: state.capitulos.map(c =>
          c.id === idCapitulo
            ? { ...c, paginas: c.paginas.filter(p => p.id !== idPagina) }
            : c
        ),
        paginaActiva: state.paginaActiva?.id === idPagina
          ? null : state.paginaActiva
      }))
      return { exito: true }
    } catch (e) {
      return { exito: false }
    }
  },

  // ─── UI ───────────────────────────────────────────────────────────────

  setHerramientaActiva: (herramienta) =>
    set({ herramientaActiva: herramienta }),

  togglePanelIzq: () =>
    set(state => ({ panelIzqAbierto: !state.panelIzqAbierto })),

  togglePanelDer: () =>
    set(state => ({ panelDerAbierto: !state.panelDerAbierto })),

  limpiarEditor: () => set({
    capitulos: [],
    paginaActiva: null,
    capituloActivo: null,
    ultimoGuardado: null
  }),
}))

export default useEditorStore