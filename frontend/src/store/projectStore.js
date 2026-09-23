// projectStore.js
// Estado global del proyecto activo con Zustand.
// Gestiona el proyecto abierto, sus capítulos y el estado de generación.

import { create } from 'zustand'
import { projectsAPI, generateAPI, vinetasAPI } from '../services/api'

const useProjectStore = create((set, get) => ({
  // Proyecto actualmente abierto
  proyectoActivo: null,
  capitulos: [],
  guionGenerado: null,
  capitulosGuiones: {}, // Mapeo de desglose técnico por número de capítulo: { [num]: { titulo_capitulo, sinopsis, escenas: [...] } }
  sinopsisGenerada: null,

  // Mapa indexado por: `${proyectoId}_${capNum}_${pagNum}_${vinNum}`
  vinetasEstudio: {},
  vinetasCatalogo: [],
  cargandoVinetasCatalogo: false,

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

  removerImagenVineta: (clave) => set(state => {
    const copiaEstudio = { ...state.vinetasEstudio }
    if (copiaEstudio[clave]) {
      copiaEstudio[clave] = {
        ...copiaEstudio[clave],
        imagen_url: null,
        prompt_usado: '',
        timestamp: Date.now()
      }
    }

    const partes = String(clave || '').split('_')
    const capNum = partes.length >= 4 ? Number(partes[1]) : null
    const pagNum = partes.length >= 4 ? Number(partes[2]) : null
    const vinNum = partes.length >= 4 ? Number(partes[3]) : null

    const nuevoCatalogo = (state.vinetasCatalogo || []).map(v => {
      if (
        capNum !== null &&
        Number(v.capitulo_num) === capNum &&
        Number(v.pagina_num) === pagNum &&
        Number(v.vineta_num) === vinNum
      ) {
        return { ...v, imagen_url: null, prompt_usado: '' }
      }
      return v
    })

    let nuevosGuiones = { ...state.capitulosGuiones }
    if (capNum !== null && nuevosGuiones[capNum]) {
      const g = JSON.parse(JSON.stringify(nuevosGuiones[capNum]))
      const colecciones = [g.paginas, g.escenas].filter(Boolean)
      colecciones.forEach(paginas => {
        paginas.forEach(pag => {
          const numP = pag.numero !== undefined ? pag.numero : pag.numero_pagina
          if (Number(numP) === pagNum) {
            (pag.vinetas || []).forEach(vin => {
              if (Number(vin.numero) === vinNum) {
                vin.imagen_url = null
                vin.prompt_usado = ''
              }
            })
          }
        })
      })
      nuevosGuiones[capNum] = g
    }

    return {
      vinetasEstudio: copiaEstudio,
      vinetasCatalogo: nuevoCatalogo,
      capitulosGuiones: nuevosGuiones
    }
  }),

  limpiarTodasVinetasCapitulo: (proyectoId, capNum) => set(state => {
    const prefijo = `${proyectoId}_${capNum}_`
    const copiaEstudio = { ...state.vinetasEstudio }
    Object.keys(copiaEstudio).forEach(k => {
      if (k.startsWith(prefijo)) {
        copiaEstudio[k] = {
          ...copiaEstudio[k],
          imagen_url: null,
          prompt_usado: '',
          timestamp: Date.now()
        }
      }
    })

    const nuevoCatalogo = (state.vinetasCatalogo || []).map(v => {
      if (Number(v.capitulo_num) === Number(capNum)) {
        return { ...v, imagen_url: null, prompt_usado: '' }
      }
      return v
    })

    let nuevosGuiones = { ...state.capitulosGuiones }
    if (nuevosGuiones[capNum]) {
      const g = JSON.parse(JSON.stringify(nuevosGuiones[capNum]))
      const colecciones = [g.paginas, g.escenas].filter(Boolean)
      colecciones.forEach(paginas => {
        paginas.forEach(pag => {
          (pag.vinetas || []).forEach(vin => {
            vin.imagen_url = null
            vin.prompt_usado = ''
          })
        })
      })
      nuevosGuiones[capNum] = g
    }

    return {
      vinetasEstudio: copiaEstudio,
      vinetasCatalogo: nuevoCatalogo,
      capitulosGuiones: nuevosGuiones
    }
  }),

  // Carga todas las viñetas generadas del proyecto desde SQLite
  cargarVinetasCatalogo: async (idProyecto) => {
    if (!idProyecto) return []
    set({ cargandoVinetasCatalogo: true })
    try {
      const res = await vinetasAPI.listarVinetas(idProyecto)
      const list = Array.isArray(res?.data) ? res.data : []
      set({ vinetasCatalogo: list, cargandoVinetasCatalogo: false })
      return list
    } catch (e) {
      console.warn('[projectStore] Error cargando catálogo de viñetas:', e)
      set({ cargandoVinetasCatalogo: false })
      return []
    }
  },

  // Sube imágenes locales para el capítulo y actualiza el catálogo
  subirImagenesCapitulo: async (idProyecto, capNum, archivos) => {
    if (!idProyecto || !capNum || !archivos || archivos.length === 0) return []
    set({ cargandoVinetasCatalogo: true })
    try {
      const formData = new FormData()
      Array.from(archivos).forEach((archivo) => {
        formData.append('imagenes', archivo)
      })

      const res = await vinetasAPI.subirImagenes(idProyecto, capNum, formData)
      if (res?.data?.exito) {
        await get().cargarVinetasCatalogo(idProyecto)
        return res.data.vinetas || []
      }
      set({ cargandoVinetasCatalogo: false })
      return []
    } catch (e) {
      console.error('[projectStore] Error subiendo imágenes locales:', e)
      set({ cargandoVinetasCatalogo: false })
      throw e
    }
  },

  // Selector que consolida viñetas del capítulo actual (BD + memoria en tiempo real)
  getVinetasCapitulo: (capituloNum) => {
    const state = get()
    const targetCap = capituloNum !== undefined && capituloNum !== null && !isNaN(Number(capituloNum))
      ? Number(capituloNum)
      : null

    // 1. Viñetas de BD con imagen
    const deCatalogo = (state.vinetasCatalogo || [])
      .filter(v => {
        const vCap = Number(v.capitulo_num ?? v.capitulo ?? v.capNum)
        return (targetCap === null || vCap === targetCap) && Boolean(v.imagen_url)
      })
      .map(v => ({
        ...v,
        capitulo_num: Number(v.capitulo_num ?? v.capitulo ?? v.capNum),
        pagina_num: Number(v.pagina_num ?? v.pagina ?? v.pagNum),
        vineta_num: Number(v.vineta_num ?? v.vineta ?? v.vinNum)
      }))

    // 2. Viñetas generadas en memoria durante la sesión en PanelArtStudio
    const deEstudio = Object.entries(state.vinetasEstudio || {}).map(([clave, v]) => {
      const partes = String(clave).split('_')
      let cap = null, pag = null, vin = null
      if (partes.length >= 4) {
        cap = Number(partes[1])
        pag = Number(partes[2])
        vin = Number(partes[3])
      } else if (partes.length === 3) {
        cap = Number(partes[0])
        pag = Number(partes[1])
        vin = Number(partes[2])
      }
      return {
        id: `estudio_${clave}`,
        capitulo_num: v.capitulo_num !== undefined ? Number(v.capitulo_num) : cap,
        pagina_num: v.pagina_num !== undefined ? Number(v.pagina_num) : pag,
        vineta_num: v.vineta_num !== undefined ? Number(v.vineta_num) : vin,
        imagen_url: v.imagen_url,
        descripcion_escena: v.descripcion || v.descripcion_escena,
        plano: v.plano,
        dialogo: v.dialogo,
        prompt_usado: v.prompt_usado
      }
    }).filter(v => (targetCap === null || Number(v.capitulo_num) === targetCap) && Boolean(v.imagen_url))

    // Mapa unificado indexado por cap_pag_vin (la memoria en vivo prevalece sobre la BD)
    const mapa = new Map()
    deCatalogo.forEach(v => mapa.set(`${v.capitulo_num}_${v.pagina_num}_${v.vineta_num}`, v))
    deEstudio.forEach(v => mapa.set(`${v.capitulo_num}_${v.pagina_num}_${v.vineta_num}`, v))

    return Array.from(mapa.values())
  },

  limpiarGuion: () => set({ guionGenerado: null, errorGuion: null }),
  limpiarSinopsis: () => set({ sinopsisGenerada: null, errorSinopsis: null }),
  limpiarTodo: () => set({
    proyectoActivo: null,
    capitulos: [],
    capitulosGuiones: {},
    vinetasEstudio: {},
    vinetasCatalogo: [],
    cargandoVinetasCatalogo: false,
    guionGenerado: null,
    sinopsisGenerada: null,
    errorProyecto: null,
    errorGuion: null,
    errorSinopsis: null
  }),
}))

export default useProjectStore