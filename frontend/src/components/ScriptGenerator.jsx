// ScriptGenerator.jsx
// Herramienta profesional "Guionista IA" para MEP — Manga Editor Pro.
// Flujo dual: 1.1 "Sinopsis y Arcos" (Premisa de Proyecto) y 1.2 "Guion de Capítulo" (Desglose de Escenas y Viñetas).
// Soporte integrado para Ideación Rápida (Flash Ideas), Persistencia Backend y los 3 Modos de Proyecto (Propio, Legendario, Aleatorio).

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Sparkles,
  Pencil,
  Check,
  X,
  Trash2,
  UserPlus,
  FolderPlus,
  RefreshCw,
  Cpu,
  Cloud,
  Layers,
  MessageSquare,
  CheckCircle2,
  Film,
  Camera,
  Save,
  Lightbulb,
  ArrowRight,
  BookOpen,
  Palette,
  Compass,
  Lock,
  AlertCircle,
  Plus,
  LayoutGrid,
  RotateCcw,
  FilePlus,
  Wand2
} from 'lucide-react'
import useProjectStore from '../store/projectStore'
import useAiStore from '../store/aiStore'
import { charactersAPI, chaptersAPI } from '../services/api'
import MangaIcon from './common/MangaIcon'
import { LEGENDARY_STYLES } from '../data/stylePresets'
import {
  GENEROS_DISPONIBLES,
  TONOS_DISPONIBLES,
  TIPOS_LAYOUT,
  ANGULOS_CAMARA,
  obtenerIdeaPremisa,
  obtenerIdeaCapitulo,
  obtenerGeneroPorEstilo
} from '../data/flashIdeas'

export default function ScriptGenerator({
  proyecto,
  onPersonajeCreado,
  onCapitulosCreados,
  onIrAFirmaVisual
}) {
  const { t } = useTranslation()
  const { aiMode } = useAiStore()
  const {
    generarSinopsis,
    generarCapitulo,
    generandoGuion,
    generandoSinopsis,
    guionGenerado,
    capitulosGuiones,
    sinopsisGenerada,
    errorGuion,
    errorSinopsis,
    setGuionCapitulo,
    actualizarGuionCapitulo,
    actualizarSinopsisGenerada,
    actualizarProyecto
  } = useProjectStore()

  // ─── Estado del Capítulo Activo y Pestaña ─────────────────────────────────────
  const [capituloActivoNum, setCapituloActivoNum] = useState(1)
  const [modo, setModo] = useState('sinopsis') // 'sinopsis' | 'capitulo'
  const [capitulosBD, setCapitulosBD] = useState([])
  const [tituloCapitulo, setTituloCapitulo] = useState('')
  const [guionCapituloTexto, setGuionCapituloTexto] = useState('')

  // ─── Guion Activo Aislado para el Capítulo Seleccionado (Acceso Seguro) ──────
  const guionActivo = (capitulosGuiones && capituloActivoNum)
    ? capitulosGuiones[capituloActivoNum] || null
    : null

  // ─── Modo del Proyecto ───────────────────────────────────────────────────────
  const modoProyecto = proyecto?.modo_creacion || 'propio'

  // ─── Estilo Sorteado para Modo Aleatorio ─────────────────────────────────────
  const [estiloSorteado, setEstiloSorteado] = useState(() => {
    if (modoProyecto === 'aleatorio') {
      if (proyecto?.estilo_legendario) {
        const cleanId = String(proyecto.estilo_legendario).replace(/^aleatorio_/, '')
        const encontrado = LEGENDARY_STYLES.find(s => s.id === cleanId)
        if (encontrado) return encontrado
      }
      return LEGENDARY_STYLES[Math.floor(Math.random() * LEGENDARY_STYLES.length)]
    }
    return null
  })

  // ─── Estado del Formulario Principal ─────────────────────────────────────────
  const [form, setForm] = useState(() => {
    let generoInicial = proyecto?.genero
    if (modoProyecto === 'aleatorio') {
      const estiloBase = estiloSorteado || LEGENDARY_STYLES[0]
      generoInicial = obtenerGeneroPorEstilo(estiloBase.id)
    } else if (!generoInicial) {
      generoInicial = 'Shōnen / Aventura'
    }

    return {
      genero: generoInicial,
      tono: proyecto?.tono || 'Épico y emotivo',
      premisa: proyecto?.premisa || proyecto?.sinopsis || '',
      num_capitulos: proyecto?.num_capitulos || 5,
    }
  })

  // ─── Sugerencias Rápidas (Flash Ideas) ───────────────────────────────────────
  const [flashPremisa, setFlashPremisa] = useState(() =>
    obtenerIdeaPremisa(form.genero, form.tono)
  )
  const [flashCapitulo, setFlashCapitulo] = useState(() =>
    obtenerIdeaCapitulo(capituloActivoNum || 1, form.num_capitulos)
  )
  const [flashPremisaAdoptada, setFlashPremisaAdoptada] = useState(false)
  const [flashCapituloAdoptado, setFlashCapituloAdoptado] = useState(false)

  // ─── Estados de Persistencia & Feedback ─────────────────────────────────────
  const [guardandoSinopsis, setGuardandoSinopsis] = useState(false)
  const [sinopsisGuardadaExito, setSinopsisGuardadaExito] = useState(false)
  const [guardandoCapitulo, setGuardandoCapitulo] = useState(false)
  const [capituloGuardadoExito, setCapituloGuardadoExito] = useState(false)

  // ─── Estados de Edición In-Place para el Desglose Técnico ───────────────────
  const [editandoSinopsisEpisodio, setEditandoSinopsisEpisodio] = useState(false)
  const [editandoPaginaIdx, setEditandoPaginaIdx] = useState(null)
  const [editandoVinetaKey, setEditandoVinetaKey] = useState(null)
  const [guardandoDesgloseBD, setGuardandoDesgloseBD] = useState(false)
  const [desgloseGuardadoExito, setDesgloseGuardadoExito] = useState(false)

  // ─── Asistente de Estructuración Guiada (Desglose Manual) ────────────────────
  const [wizardPaginas, setWizardPaginas] = useState(4)
  const [wizardVinetasPorPagina, setWizardVinetasPorPagina] = useState(4)

  // ─── CRUD Inline de Personajes y Capítulos Generados ─────────────────────────
  const [editandoPersonajeIdx, setEditandoPersonajeIdx] = useState(null)
  const [formEditPersonaje, setFormEditPersonaje] = useState({ nombre: '', rol: '', motivacion: '' })
  const [personajesAceptados, setPersonajesAceptados] = useState({})
  const [guardandoPersonaje, setGuardandoPersonaje] = useState({})

  const [editandoCapituloIdx, setEditandoCapituloIdx] = useState(null)
  const [formEditCapitulo, setFormEditCapitulo] = useState({ numero: 1, titulo: '', gancho: '' })
  const [creandoCapitulosEnBd, setCreandoCapitulosEnBd] = useState(false)
  const [capitulosAceptadosExito, setCapitulosAceptadosExito] = useState(false)

  // ─── Sincronizar Modo Aleatorio al Cargar o Cambiar Proyecto ──────────────────
  useEffect(() => {
    if (modoProyecto === 'aleatorio') {
      let estiloTarget = estiloSorteado
      if (proyecto?.estilo_legendario) {
        const cleanId = String(proyecto.estilo_legendario).replace(/^aleatorio_/, '')
        const encontrado = LEGENDARY_STYLES.find(s => s.id === cleanId)
        if (encontrado) {
          estiloTarget = encontrado
          setEstiloSorteado(encontrado)
        }
      }
      if (!estiloTarget) {
        estiloTarget = LEGENDARY_STYLES[Math.floor(Math.random() * LEGENDARY_STYLES.length)]
        setEstiloSorteado(estiloTarget)
      }

      const generoVinculado = obtenerGeneroPorEstilo(estiloTarget.id)
      setForm(prev => ({
        ...prev,
        genero: generoVinculado,
        tono: proyecto?.tono || prev.tono,
        premisa: proyecto?.premisa || proyecto?.sinopsis || prev.premisa,
        num_capitulos: proyecto?.num_capitulos || prev.num_capitulos,
      }))

      // Regenerar la idea rápida vinculada
      setFlashPremisa(obtenerIdeaPremisa(generoVinculado, proyecto?.tono || form.tono))
    } else if (proyecto) {
      setForm(prev => ({
        ...prev,
        genero: proyecto.genero || prev.genero,
        tono: proyecto.tono || prev.tono,
        premisa: proyecto.premisa || proyecto.sinopsis || prev.premisa,
        num_capitulos: proyecto.num_capitulos || prev.num_capitulos,
      }))
    }
  }, [modoProyecto, proyecto?.id, proyecto?.estilo_legendario])

  // ─── Sortear Nuevo Estilo en Modo Aleatorio ──────────────────────────────────
  const sortearNuevoEstilo = () => {
    const pool = LEGENDARY_STYLES.filter(s => s.id !== estiloSorteado?.id)
    const nuevo = pool[Math.floor(Math.random() * pool.length)]
    setEstiloSorteado(nuevo)

    const nuevoGenero = obtenerGeneroPorEstilo(nuevo.id)
    setForm(prev => ({
      ...prev,
      genero: nuevoGenero
    }))

    // Regenerar sugerencia de idea rápida inmediatamente
    const nuevaIdea = obtenerIdeaPremisa(nuevoGenero, form.tono, flashPremisa)
    setFlashPremisa(nuevaIdea)
    setFlashPremisaAdoptada(false)

    // Persistir en base de datos si el proyecto existe
    if (proyecto?.id) {
      actualizarProyecto(proyecto.id, {
        estilo_legendario: `aleatorio_${nuevo.id}`,
        genero: nuevoGenero
      })
    }
  }

  // ─── Cargar Capítulos del Proyecto ───────────────────────────────────────────
  const cargarCapitulos = useCallback(async () => {
    if (!proyecto?.id) return
    try {
      const res = await chaptersAPI.listar(proyecto.id)
      const data = res?.data || []
      setCapitulosBD(data)

      // Sincronizar guiones en el store de Zustand para capítulos que ya tengan guion_json en BD
      data.forEach(c => {
        if (c.guion_json) {
          let parsedGuion = c.guion_json
          if (typeof parsedGuion === 'string') {
            try {
              parsedGuion = JSON.parse(parsedGuion)
            } catch (e) {
              console.warn('Error parseando guion_json:', e)
            }
          }
          if (parsedGuion && typeof parsedGuion === 'object') {
            setGuionCapitulo(c.numero, parsedGuion)
          }
        }
      })

      // Sincronizar el capítulo activo si existe
      const capActual = data.find(c => c.numero === capituloActivoNum)
      if (capActual) {
        setTituloCapitulo(capActual.titulo || `Capítulo ${capActual.numero}`)
        setGuionCapituloTexto(capActual.sinopsis || '')
      }
    } catch (err) {
      console.warn('Error al listar capítulos:', err)
    }
  }, [proyecto?.id, capituloActivoNum, setGuionCapitulo])

  useEffect(() => {
    cargarCapitulos()
  }, [cargarCapitulos])

  // Sincronizar idea flash al cambiar de género o tono
  const regenerarFlashPremisa = () => {
    const nueva = obtenerIdeaPremisa(form.genero, form.tono, flashPremisa)
    setFlashPremisa(nueva)
    setFlashPremisaAdoptada(false)
  }

  const regenerarFlashCapitulo = (num = capituloActivoNum) => {
    const nueva = obtenerIdeaCapitulo(num, form.num_capitulos, flashCapitulo)
    setFlashCapitulo(nueva)
    setFlashCapituloAdoptado(false)
  }

  const handleGeneroChange = (e) => {
    if (modoProyecto === 'aleatorio') return // Bloqueado en modo aleatorio
    const nuevoGenero = e.target.value
    setForm(prev => ({ ...prev, genero: nuevoGenero }))
    const nueva = obtenerIdeaPremisa(nuevoGenero, form.tono, flashPremisa)
    setFlashPremisa(nueva)
    setFlashPremisaAdoptada(false)
  }

  const handleTonoChange = (e) => {
    const nuevoTono = e.target.value
    setForm(prev => ({ ...prev, tono: nuevoTono }))
    const nueva = obtenerIdeaPremisa(form.genero, nuevoTono, flashPremisa)
    setFlashPremisa(nueva)
    setFlashPremisaAdoptada(false)
  }

  // ─── Manejo de Selección de Capítulo ─────────────────────────────────────────
  const handleSeleccionarCapitulo = (num) => {
    const numero = parseInt(num, 10)
    setCapituloActivoNum(numero)
    const cap = capitulosBD.find(c => c.numero === numero)
    if (cap) {
      setTituloCapitulo(cap.titulo || `Capítulo ${numero}`)
      setGuionCapituloTexto(cap.sinopsis || '')
    } else {
      setTituloCapitulo(`Capítulo ${numero}`)
      setGuionCapituloTexto('')
    }
    regenerarFlashCapitulo(numero)
    setCapituloGuardadoExito(false)
    setDesgloseGuardadoExito(false)
    setEditandoSinopsisEpisodio(false)
    setEditandoPaginaIdx(null)
    setEditandoVinetaKey(null)
  }

  // ─── Adopción de Ideas Flash ────────────────────────────────────────────────
  const adoptarIdeaPremisa = () => {
    setForm(prev => ({ ...prev, premisa: flashPremisa }))
    setFlashPremisaAdoptada(true)
    setTimeout(() => setFlashPremisaAdoptada(false), 2500)
  }

  const adoptarIdeaCapitulo = () => {
    setGuionCapituloTexto(flashCapitulo)
    setFlashCapituloAdoptado(true)
    setTimeout(() => setFlashCapituloAdoptado(false), 2500)
  }

  // ─── Guardar Sinopsis en Backend ────────────────────────────────────────────
  const handleGuardarSinopsis = async () => {
    if (!proyecto?.id) return
    setGuardandoSinopsis(true)
    setSinopsisGuardadaExito(false)
    try {
      await actualizarProyecto(proyecto.id, {
        premisa: form.premisa,
        sinopsis: form.premisa,
        genero: form.genero,
        tono: form.tono,
        num_capitulos: parseInt(form.num_capitulos, 10) || 5
      })
      setSinopsisGuardadaExito(true)
      setTimeout(() => setSinopsisGuardadaExito(false), 3000)
    } catch (err) {
      console.error('Error al guardar sinopsis:', err)
      alert(err.response?.data?.detail || 'Error al guardar la sinopsis del proyecto.')
    } finally {
      setGuardandoSinopsis(false)
    }
  }

  // ─── Guardar Guion de Capítulo en Backend ───────────────────────────────────
  const handleGuardarCapitulo = async () => {
    if (!proyecto?.id) return
    setGuardandoCapitulo(true)
    setCapituloGuardadoExito(false)
    try {
      const capExistente = capitulosBD.find(c => c.numero === capituloActivoNum)
      const payload = {
        titulo: tituloCapitulo || `Capítulo ${capituloActivoNum}`,
        sinopsis: guionCapituloTexto,
        guion_json: guionActivo || (capExistente?.guion_json || null)
      }
      if (capExistente) {
        await chaptersAPI.actualizarCapitulo(proyecto.id, capExistente.id, payload)
      } else {
        await chaptersAPI.crearCapitulo(proyecto.id, {
          numero: capituloActivoNum,
          ...payload
        })
      }
      await cargarCapitulos()
      setCapituloGuardadoExito(true)
      setTimeout(() => setCapituloGuardadoExito(false), 3000)
      onCapitulosCreados?.()
    } catch (err) {
      console.error('Error al guardar guion del capítulo:', err)
      alert(err.response?.data?.detail || 'Error al guardar el guion del capítulo.')
    } finally {
      setGuardandoCapitulo(false)
    }
  }

  // ─── Guardar Cambios del Desglose en Backend (guion_json) ───────────────────
  const handleGuardarDesgloseBD = async () => {
    if (!proyecto?.id || !guionActivo) return
    setGuardandoDesgloseBD(true)
    setDesgloseGuardadoExito(false)
    try {
      const capExistente = capitulosBD.find(c => c.numero === capituloActivoNum)
      const tituloFinal = guionActivo.titulo_capitulo || tituloCapitulo || `Capítulo ${capituloActivoNum}`
      const sinopsisFinal = guionActivo.sinopsis || guionCapituloTexto || ''
      
      const payload = {
        titulo: tituloFinal,
        sinopsis: sinopsisFinal,
        guion_json: guionActivo
      }

      if (capExistente) {
        await chaptersAPI.actualizarCapitulo(proyecto.id, capExistente.id, payload)
      } else {
        await chaptersAPI.crearCapitulo(proyecto.id, {
          numero: capituloActivoNum,
          ...payload
        })
      }
      await cargarCapitulos()
      setDesgloseGuardadoExito(true)
      setTimeout(() => setDesgloseGuardadoExito(false), 3000)
      onCapitulosCreados?.()
    } catch (err) {
      console.error('Error al guardar desglose en BD:', err)
      alert(err.response?.data?.detail || 'Error al guardar los cambios del desglose en BD.')
    } finally {
      setGuardandoDesgloseBD(false)
    }
  }

  // ─── Asistente de Estructuración Guiada (Generación Manual de Esqueleto) ─────
  const handleGenerarEsqueleto = (numPagsParam, numVinsParam) => {
    const numPags = parseInt(numPagsParam ?? wizardPaginas, 10) || 4
    const numVins = parseInt(numVinsParam ?? wizardVinetasPorPagina, 10) || 4

    const escenas = []
    for (let p = 1; p <= numPags; p++) {
      const vinetas = []
      for (let v = 1; v <= numVins; v++) {
        let angulo = 'Plano medio'
        if (v === 1) angulo = 'Plano general'
        else if (v === numVins) angulo = 'Primer plano'

        vinetas.push({
          numero: v,
          angulo_camara: angulo,
          descripcion_visual: '',
          dialogo: ''
        })
      }

      let layout = 'standard'
      if (p === 1) layout = 'standard'
      else if (p === numPags) layout = 'cliffhanger'
      else if (p % 2 === 0) layout = 'dialogue'
      else layout = 'action'

      escenas.push({
        numero_pagina: p,
        tipo_layout: layout,
        descripcion_pagina: `Página ${p}: Desarrollo de la escena`,
        vinetas
      })
    }

    const nuevoGuion = {
      titulo_capitulo: tituloCapitulo || `Capítulo ${capituloActivoNum}`,
      sinopsis: guionCapituloTexto || '',
      num_paginas: numPags,
      tono_capitulo: form.tono || 'Épico y emotivo',
      escenas
    }

    setGuionCapitulo(capituloActivoNum, nuevoGuion)
    setDesgloseGuardadoExito(false)
  }

  const handleCrearPaginaEnBlanco = () => {
    const defaultVins = parseInt(wizardVinetasPorPagina, 10) || 3
    const vinetas = []
    for (let v = 1; v <= defaultVins; v++) {
      vinetas.push({
        numero: v,
        angulo_camara: v === 1 ? 'Plano general' : (v === defaultVins ? 'Primer plano' : 'Plano medio'),
        descripcion_visual: '',
        dialogo: ''
      })
    }

    const nuevoGuion = {
      titulo_capitulo: tituloCapitulo || `Capítulo ${capituloActivoNum}`,
      sinopsis: guionCapituloTexto || '',
      num_paginas: 1,
      tono_capitulo: form.tono || 'Épico y emotivo',
      escenas: [
        {
          numero_pagina: 1,
          tipo_layout: 'standard',
          descripcion_pagina: 'Página 1: Introducción de la escena',
          vinetas
        }
      ]
    }
    setGuionCapitulo(capituloActivoNum, nuevoGuion)
    setDesgloseGuardadoExito(false)
  }

  const handleAnadirNuevaPagina = () => {
    actualizarGuionCapitulo(capituloActivoNum, prev => {
      const escenasActuales = prev?.escenas ? [...prev.escenas] : []
      const nuevoNumPagina = escenasActuales.length + 1
      const defaultVins = parseInt(wizardVinetasPorPagina, 10) || 4
      const vinetas = []
      for (let v = 1; v <= defaultVins; v++) {
        vinetas.push({
          numero: v,
          angulo_camara: v === 1 ? 'Plano general' : (v === defaultVins ? 'Primer plano' : 'Plano medio'),
          descripcion_visual: '',
          dialogo: ''
        })
      }
      escenasActuales.push({
        numero_pagina: nuevoNumPagina,
        tipo_layout: 'standard',
        descripcion_pagina: `Página ${nuevoNumPagina}: Continuación de la escena`,
        vinetas
      })
      return {
        ...prev,
        num_paginas: escenasActuales.length,
        escenas: escenasActuales
      }
    })
    setDesgloseGuardadoExito(false)
  }

  const handleEliminarPagina = (pageIndex) => {
    actualizarGuionCapitulo(capituloActivoNum, prev => {
      if (!prev?.escenas) return prev
      const filtradas = prev.escenas.filter((_, idx) => idx !== pageIndex)
      const reindexadas = filtradas.map((p, idx) => ({ ...p, numero_pagina: idx + 1 }))
      return {
        ...prev,
        num_paginas: reindexadas.length,
        escenas: reindexadas
      }
    })
    setDesgloseGuardadoExito(false)
  }

  const handleLimpiarDesglose = () => {
    if (window.confirm(`¿Estás seguro de que deseas reiniciar el desglose del Capítulo ${capituloActivoNum}? Se borrarán las páginas del borrador actual.`)) {
      setGuionCapitulo(capituloActivoNum, null)
      setDesgloseGuardadoExito(false)
    }
  }

  // ─── Generación con IA (Gemini / Qwen) ──────────────────────────────────────
  const handleGenerarSinopsis = async () => {
    if (!form.premisa.trim()) return
    await generarSinopsis(
      proyecto?.nombre || 'Proyecto sin nombre',
      form.genero,
      form.tono,
      form.premisa,
      parseInt(form.num_capitulos, 10) || 5
    )
  }

  const handleGenerarCapitulo = async () => {
    if (!proyecto?.id) return
    const premisaParaGenerar = guionCapituloTexto.trim() || form.premisa.trim()
    if (!premisaParaGenerar) return

    const res = await generarCapitulo(
      proyecto.id,
      capituloActivoNum,
      premisaParaGenerar,
      form.genero,
      form.tono
    )

    if (res?.exito && res?.datos) {
      if (res.datos.titulo_capitulo) {
        setTituloCapitulo(res.datos.titulo_capitulo)
      }
      if (res.datos.sinopsis) {
        setGuionCapituloTexto(res.datos.sinopsis)
      }
      cargarCapitulos()
      onCapitulosCreados?.()
    }
  }

  // ─── CRUD de Personajes Sugeridos ───────────────────────────────────────────
  const iniciarEdicionPersonaje = (idx, p) => {
    setEditandoPersonajeIdx(idx)
    setFormEditPersonaje({
      nombre: p.nombre || '',
      rol: p.rol || 'protagonista',
      motivacion: p.motivacion || ''
    })
  }

  const guardarEdicionPersonaje = (idx) => {
    actualizarSinopsisGenerada(prev => {
      if (!prev?.personajes_sugeridos) return prev
      const nuevos = [...prev.personajes_sugeridos]
      nuevos[idx] = { ...nuevos[idx], ...formEditPersonaje }
      return { ...prev, personajes_sugeridos: nuevos }
    })
    setEditandoPersonajeIdx(null)
  }

  const eliminarPersonajeSugerido = (idx) => {
    actualizarSinopsisGenerada(prev => {
      if (!prev?.personajes_sugeridos) return prev
      return {
        ...prev,
        personajes_sugeridos: prev.personajes_sugeridos.filter((_, i) => i !== idx)
      }
    })
  }

  const regenerarPersonajeSugerido = (idx, p) => {
    const roles = ['protagonista', 'antagonista', 'apoyo', 'secundario']
    const nuevoRol = roles[(roles.indexOf(p.rol) + 1) % roles.length]
    actualizarSinopsisGenerada(prev => {
      if (!prev?.personajes_sugeridos) return prev
      const nuevos = [...prev.personajes_sugeridos]
      nuevos[idx] = {
        ...nuevos[idx],
        rol: nuevoRol,
        motivacion: `Enfoque alternativo: Motivación guiada por el honor y la supervivencia en ${form.genero}.`
      }
      return { ...prev, personajes_sugeridos: nuevos }
    })
  }

  const aceptarPersonajeOficial = async (idx, p) => {
    if (!proyecto?.id) return
    setGuardandoPersonaje(prev => ({ ...prev, [idx]: true }))
    try {
      await charactersAPI.crear(proyecto.id, {
        nombre: p.nombre,
        rol: p.rol || 'protagonista',
        motivacion: p.motivacion || '',
        descripcion_fisica: `Diseño narrativo conceptual: ${p.nombre}`,
        generar_ficha_ia: true
      })
      setPersonajesAceptados(prev => ({ ...prev, [idx]: true }))
      onPersonajeCreado?.()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al guardar personaje en el proyecto')
    } finally {
      setGuardandoPersonaje(prev => ({ ...prev, [idx]: false }))
    }
  }

  // ─── CRUD de Capítulos Sugeridos ───────────────────────────────────────────
  const iniciarEdicionCapitulo = (idx, cap) => {
    setEditandoCapituloIdx(idx)
    setFormEditCapitulo({
      numero: cap.numero || idx + 1,
      titulo: cap.titulo || '',
      gancho: cap.gancho || ''
    })
  }

  const guardarEdicionCapitulo = (idx) => {
    actualizarSinopsisGenerada(prev => {
      if (!prev?.estructura_capitulos) return prev
      const nuevos = [...prev.estructura_capitulos]
      nuevos[idx] = { ...nuevos[idx], ...formEditCapitulo }
      return { ...prev, estructura_capitulos: nuevos }
    })
    setEditandoCapituloIdx(null)
  }

  const eliminarCapituloSugerido = (idx) => {
    actualizarSinopsisGenerada(prev => {
      if (!prev?.estructura_capitulos) return prev
      return {
        ...prev,
        estructura_capitulos: prev.estructura_capitulos.filter((_, i) => i !== idx)
      }
    })
  }

  const aceptarTodosLosCapitulos = async () => {
    if (!proyecto?.id || !sinopsisGenerada?.estructura_capitulos?.length) return
    setCreandoCapitulosEnBd(true)
    try {
      for (const cap of sinopsisGenerada.estructura_capitulos) {
        await chaptersAPI.crearCapitulo(proyecto.id, {
          numero: parseInt(cap.numero, 10) || 1,
          titulo: cap.titulo || `Capítulo ${cap.numero}`,
          sinopsis: cap.gancho || ''
        })
      }
      setCapitulosAceptadosExito(true)
      await cargarCapitulos()
      onCapitulosCreados?.()
      setTimeout(() => setCapitulosAceptadosExito(false), 3000)
    } catch (err) {
      console.warn('Advertencia creando capítulos:', err)
      setCapitulosAceptadosExito(true)
      await cargarCapitulos()
    } finally {
      setCreandoCapitulosEnBd(false)
    }
  }

  const estaGenerando = generandoGuion || generandoSinopsis

  // Datos del estilo legendario si aplica (Modo Legendario)
  const estiloLegendarioInfo = useMemo(() => {
    if (modoProyecto === 'legendario' && proyecto?.estilo_legendario) {
      return LEGENDARY_STYLES.find(s => s.id === proyecto.estilo_legendario) || null
    }
    return null
  }, [modoProyecto, proyecto?.estilo_legendario])

  // Opciones de capítulos (unión de existentes en BD y rango planificado)
  const totalSlotsCapitulos = Math.max(
    parseInt(form.num_capitulos, 10) || 5,
    capitulosBD.length > 0 ? Math.max(...capitulosBD.map(c => c.numero)) : 1
  )

  const slotsCapitulos = useMemo(() => {
    const slots = []
    for (let i = 1; i <= totalSlotsCapitulos; i++) {
      const capExistente = capitulosBD.find(c => c.numero === i)
      slots.push({
        numero: i,
        titulo: capExistente?.titulo ? `Cap. ${i}: ${capExistente.titulo}` : `Capítulo ${i}`,
        existeEnBD: !!capExistente
      })
    }
    return slots
  }, [totalSlotsCapitulos, capitulosBD])

  // Etiqueta contextual de la idea flash del capítulo
  const tagFlashCapitulo = useMemo(() => {
    if (capituloActivoNum === 1) return 'Detonante & Llamada a la Aventura'
    if (capituloActivoNum >= (parseInt(form.num_capitulos, 10) || 5)) return 'Clímax & Desenlace Cumbre'
    return 'Escalada, Giros & Pruebas'
  }, [capituloActivoNum, form.num_capitulos])

  return (
    <div className="space-y-6">

      {/* ── BANNERS DIFERENCIADOS POR MODO DE PROYECTO ── */}
      {modoProyecto === 'propio' && (
        <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 flex items-start justify-between gap-4 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 mt-0.5">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <p className="text-amber-700 dark:text-amber-300 text-sm font-bold font-titulo">
                {t('studio.ownCreationModeActive') || 'Modo Creación Propia Activo'}
              </p>
              <p className="text-rdc-muted text-xs mt-0.5 leading-relaxed">
                {t('studio.calibrateVisualSignatureDesc') || 'Puedes calibrar y bloquear tu Firma Visual personalizada subiendo tus referencias artísticas para guiar el estilo de los personajes y páginas generadas.'}
              </p>
            </div>
          </div>
          {onIrAFirmaVisual && (
            <button
              onClick={onIrAFirmaVisual}
              className="flex-shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-titulo font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span>{t('sidebar.visualSignature') || 'Firma Visual'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {modoProyecto === 'legendario' && (
        <div className="bg-purple-500/10 border-2 border-purple-500/30 rounded-2xl p-4 flex items-start gap-3.5 backdrop-blur-sm">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center flex-shrink-0">
            {estiloLegendarioInfo?.icon ? (
              <img src={estiloLegendarioInfo.icon} alt="Icono Estilo" className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <MangaIcon name="modo_legendario" size={24} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-purple-600 dark:text-purple-300 text-sm font-bold font-titulo">
                {t('studio.legendaryStyle') || 'Estilo Legendario'}: {estiloLegendarioInfo?.name || proyecto?.estilo_legendario?.replace(/_/g, ' ') || 'Estilo Maestro'}
              </span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-600 dark:text-purple-300 font-bold">
                {t('studio.locked') || 'Bloqueado'}
              </span>
            </div>
            <p className="text-rdc-muted text-xs mt-0.5 leading-relaxed">
              {estiloLegendarioInfo?.subtitle || 'Directrices de entintado y narrativa calibradas con los pesos maestros.'}
            </p>
          </div>
        </div>
      )}

      {/* ── MODO ALEATORIO: FICHA OFICIAL DEL ESTILO SORTEADO ── */}
      {modoProyecto === 'aleatorio' && estiloSorteado && (
        <div className="bg-slate-900/5 dark:bg-slate-800/40 border-2 border-slate-900/20 dark:border-slate-700/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-sm shadow-sm">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0 shadow-xs">
              {estiloSorteado.icon ? (
                <img
                  src={estiloSorteado.icon}
                  alt={estiloSorteado.name}
                  className="w-10 h-10 object-contain flex-shrink-0"
                />
              ) : (
                <MangaIcon name="modo_aleatorio" size={24} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white text-sm font-titulo">
                  {t('studio.sortedStyle') || 'Estilo Sorteado'}: {estiloSorteado.name}
                </span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                  {t('studio.randomLocked') || 'Aleatorio Bloqueado'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                {estiloSorteado.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={sortearNuevoEstilo}
            className="flex-shrink-0 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-titulo font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            title="Sortear otro estilo del catálogo oficial de 25 estilos"
          >
            <span>{t('studio.rollAnotherStyle') || '🎲 Sortear Otro Estilo'}</span>
          </button>
        </div>
      )}

      {/* ── SELECTOR DE PESTAÑA PRINCIPAL (1.1 / 1.2) ── */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            id: 'sinopsis',
            iconName: 'contador_capitulos',
            label: t('scriptGenerator.tabSinopsis') || '1.1 Sinopsis y Arcos',
            desc: t('script.generalStructureDesc') || 'Estructura general, premisa y personajes'
          },
          {
            id: 'capitulo',
            iconName: 'guionista_ia',
            label: t('scriptGenerator.tabCapitulo') || '1.2 Guion de Capítulo',
            desc: t('script.technicalBreakdownDesc') || 'Desglose técnico de escenas, viñetas y diálogos'
          },
        ].map((m) => {
          const activo = modo === m.id
          return (
            <button
              key={m.id}
              onClick={() => setModo(m.id)}
              className={`border-2 rounded-2xl p-4 text-left transition-all duration-200 font-titulo flex items-center gap-3 cursor-pointer ${
                activo
                  ? 'border-rdc-accent bg-rdc-accent/15 text-rdc-text shadow-sm ring-1 ring-rdc-accent/30'
                  : 'border-rdc-border hover:border-rdc-muted text-rdc-muted hover:text-rdc-text bg-rdc-card/50'
              }`}
            >
              <div className={`p-2.5 rounded-xl flex items-center justify-center ${activo ? 'bg-rdc-accent text-white' : 'bg-rdc-secondary text-rdc-muted'}`}>
                <MangaIcon name={m.iconName} size={20} className="inline-block" />
              </div>
              <div>
                <p className="text-rdc-text text-sm font-bold leading-tight">{m.label}</p>
                <p className="text-rdc-muted text-[11px] mt-0.5">{m.desc}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          PESTAÑA 1.1: SINOPSIS Y ARCOS (Premisa del Proyecto)
         ══════════════════════════════════════════════════════════════════════════ */}
      {modo === 'sinopsis' && (
        <div className="space-y-5 bg-rdc-card/40 border border-rdc-border rounded-2xl p-5 sm:p-6 backdrop-blur-sm">

          {/* 1. SELECTORES BASE SUPERIORES */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Selector de Género (Bloqueado/Fijado en Modo Aleatorio) */}
            <div>
              <label className="block text-rdc-text text-xs uppercase font-bold font-titulo mb-1.5 flex items-center justify-between">
                <span>{t('scriptGenerator.genre') || 'Género'}</span>
                {modoProyecto === 'aleatorio' && (
                  <span className="text-[10px] font-mono uppercase text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Bloqueado
                  </span>
                )}
              </label>
              <select
                name="genero"
                value={form.genero}
                onChange={handleGeneroChange}
                disabled={modoProyecto === 'aleatorio'}
                className={`w-full rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium transition-colors ${
                  modoProyecto === 'aleatorio'
                    ? 'opacity-80 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 select-none'
                    : 'bg-rdc-secondary border border-rdc-border text-rdc-text focus:outline-none focus:border-rdc-accent'
                }`}
              >
                {GENEROS_DISPONIBLES.map(g => (
                  <option key={g} value={g}>{t(`script.genres.${g}`) || g}</option>
                ))}
              </select>
              {modoProyecto === 'aleatorio' && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1.5 font-titulo leading-tight">
                  <Lock className="w-3 h-3 flex-shrink-0" />
                  <span>{t('script.lockedGenreNote') || 'Género fijado por el estilo aleatorio. Pulsa "Sortear Otro Estilo" para cambiarlo.'}</span>
                </p>
              )}
            </div>

            {/* Selector de Tono (100% Interactivo en todos los modos) */}
            <div>
              <label className="block text-rdc-text text-xs uppercase font-bold font-titulo mb-1.5">
                {t('scriptGenerator.tone') || 'Tono'}
              </label>
              <select
                name="tono"
                value={form.tono}
                onChange={handleTonoChange}
                className="w-full bg-rdc-secondary border border-rdc-border rounded-xl px-3.5 py-2.5 text-rdc-text text-xs sm:text-sm font-medium focus:outline-none focus:border-rdc-accent transition-colors"
              >
                {TONOS_DISPONIBLES.map(tOption => (
                  <option key={tOption} value={tOption}>{t(`script.tones.${tOption}`) || tOption}</option>
                ))}
              </select>
            </div>

            {/* Número de Capítulos Planificados */}
            <div>
              <label className="block text-rdc-text text-xs uppercase font-bold font-titulo mb-1.5">
                {t('scriptGenerator.numChapters') || 'Capítulos Planificados'}
              </label>
              <input
                type="number"
                name="num_capitulos"
                value={form.num_capitulos}
                onChange={e => setForm(prev => ({ ...prev, num_capitulos: e.target.value }))}
                min={1}
                max={20}
                className="w-full bg-rdc-secondary border border-rdc-border rounded-xl px-3.5 py-2.5 text-rdc-text text-xs sm:text-sm font-medium focus:outline-none focus:border-rdc-accent transition-colors"
              />
            </div>
          </div>

          {/* 2. CAJA DE IDEA RÁPIDA (FLASH IDEA GENERATOR) */}
          <div className="bg-amber-500/10 border-2 border-amber-500/30 dark:border-amber-400/20 rounded-2xl p-4 sm:p-5 relative transition-all">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500 animate-pulse" />
                <span className="font-titulo font-bold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  {t('script.flashIdeaTitle') || 'Caja de Idea Rápida (Flash Idea)'}
                </span>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold">
                {t('script.instantSuggestion') || 'Sugerencia Instantánea'}
              </span>
            </div>

            <p className="text-rdc-text text-sm leading-relaxed italic my-2">
              "{flashPremisa}"
            </p>

            <div className="flex items-center justify-end gap-2.5 mt-3 pt-2 border-t border-amber-500/20">
              <button
                type="button"
                onClick={regenerarFlashPremisa}
                className="px-3 py-1.5 bg-rdc-secondary hover:bg-rdc-card text-rdc-text text-xs font-titulo font-medium rounded-xl border border-rdc-border flex items-center gap-1.5 transition-colors cursor-pointer"
                title={t('script.generateAnotherSuggestion') || 'Generar otra sugerencia rápida'}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t('script.newIdea') || 'Nueva Idea'}</span>
              </button>
              <button
                type="button"
                onClick={adoptarIdeaPremisa}
                className={`px-3.5 py-1.5 text-xs font-titulo font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                  flashPremisaAdoptada
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                }`}
              >
                {flashPremisaAdoptada ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{t('script.ideaAdopted') || '¡Idea Adoptada!'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t('script.adoptIdea') || 'Adoptar Idea'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3. CAMPO EDITABLE: PREMISA INICIAL / SINOPSIS */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-rdc-text text-xs uppercase tracking-wider font-bold font-titulo flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-rdc-accent" />
                {t('script.initialPremiseTitle') || 'Premisa Inicial / Sinopsis del Proyecto'}
              </label>
              <span className="text-[11px] text-rdc-muted font-mono">
                {t('script.charactersCount', { count: form.premisa.length }) || `${form.premisa.length} caracteres`}
              </span>
            </div>

            <textarea
              name="premisa"
              value={form.premisa}
              onChange={e => setForm(prev => ({ ...prev, premisa: e.target.value }))}
              rows={4}
              placeholder={t('script.premisePlaceholder') || 'Describe el núcleo narrativo, el conflicto del protagonista y el objetivo principal de la obra... O adopta una idea sugerida arriba.'}
              className="w-full bg-rdc-secondary/70 border-2 border-slate-900 dark:border-slate-700 rounded-xl
                         p-3.5 text-rdc-text placeholder-rdc-muted text-sm leading-relaxed
                         focus:outline-none focus:border-rdc-accent resize-none
                         shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] dark:shadow-none
                         transition-colors duration-200"
            />
          </div>

          {/* 4. BOTONES DE ACCIÓN: GUARDAR SINOPSIS & GENERAR CON IA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={handleGuardarSinopsis}
              disabled={guardandoSinopsis || !form.premisa.trim()}
              className={`py-3 px-4 rounded-xl font-titulo font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                sinopsisGuardadaExito
                  ? 'bg-emerald-600 text-white'
                  : 'bg-rdc-secondary hover:bg-rdc-card border border-rdc-border text-rdc-text hover:border-rdc-accent'
              }`}
            >
              {guardandoSinopsis ? (
                <>
                  <div className="w-4 h-4 border-2 border-rdc-text border-t-transparent rounded-full animate-spin" />
                  <span>{t('script.savingToDb') || 'Guardando en BD...'}</span>
                </>
              ) : sinopsisGuardadaExito ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>{t('script.synopsisSaved') || '✅ Sinopsis Guardada'}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-rdc-accent" />
                  <span>{t('script.saveSynopsis') || 'Guardar Sinopsis'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleGenerarSinopsis}
              disabled={estaGenerando || !form.premisa.trim()}
              className="py-3 px-4 bg-rdc-accent hover:bg-rdc-accent-hover text-white font-titulo font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generandoSinopsis ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generando Sinopsis y Arcos...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generar Sinopsis y Arcos con Gemini</span>
                </>
              )}
            </button>
          </div>

          {/* Motor Activo */}
          <div className="flex items-center justify-between text-[11px] text-rdc-muted font-titulo pt-1">
            <span className="flex items-center gap-1.5">
              {aiMode === 'local' ? <Cpu className="w-3.5 h-3.5 text-purple-400" /> : <Cloud className="w-3.5 h-3.5 text-emerald-400" />}
              Motor Activo:{' '}
              <strong className={aiMode === 'local' ? 'text-purple-400' : 'text-emerald-400'}>
                {aiMode === 'local' ? 'Qwen 2.5 Local (Ollama)' : 'Cloud Free (Gemini Flash / FreeLLMAPI)'}
              </strong>
            </span>
            <span className="text-[10px] opacity-75 font-mono">
              {aiMode === 'local' ? 'Local Port 11434' : 'Zero-Cost Cloud API'}
            </span>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          PESTAÑA 1.2: GUION DE CAPÍTULO (Desglose Técnico)
         ══════════════════════════════════════════════════════════════════════════ */}
      {modo === 'capitulo' && (
        <div className="space-y-5 bg-rdc-card/40 border border-rdc-border rounded-2xl p-5 sm:p-6 backdrop-blur-sm">

          {/* 1. SELECTOR DE CAPÍTULO Y TARJETA CONTEXTUAL */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Selector Desplegable de Capítulos */}
            <div>
              <label className="block text-rdc-text text-xs uppercase font-bold font-titulo mb-1.5">
                {t('scriptGenerator.chapterNumber') || 'Capítulo Activo'}
              </label>
              <select
                value={capituloActivoNum}
                onChange={e => handleSeleccionarCapitulo(e.target.value)}
                className="w-full bg-rdc-secondary border border-rdc-border rounded-xl px-3.5 py-2.5 text-rdc-text text-xs sm:text-sm font-medium focus:outline-none focus:border-rdc-accent transition-colors"
              >
                {slotsCapitulos.map(slot => (
                  <option key={slot.numero} value={slot.numero}>
                    {slot.titulo} {slot.existeEnBD ? '✓' : '(Nuevo)'}
                  </option>
                ))}
              </select>
            </div>

            {/* Título editable del capítulo */}
            <div className="md:col-span-2">
              <label className="block text-rdc-text text-xs uppercase font-bold font-titulo mb-1.5">
                Título del Capítulo {capituloActivoNum}
              </label>
              <input
                type="text"
                value={tituloCapitulo}
                onChange={e => setTituloCapitulo(e.target.value)}
                placeholder={`Ej: Capítulo ${capituloActivoNum}: El despertar del filo`}
                className="w-full bg-rdc-secondary border border-rdc-border rounded-xl px-3.5 py-2.5 text-rdc-text text-xs sm:text-sm font-medium focus:outline-none focus:border-rdc-accent transition-colors"
              />
            </div>
          </div>

          {/* Tarjeta Informativa Compacta de Contexto */}
          <div className="bg-rdc-card/70 border border-rdc-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-rdc-muted text-[10px] uppercase font-bold font-titulo tracking-wider block">
                {t('script.savedPremise') || 'Premisa Guardada del Proyecto'}
              </span>
              <p className="text-rdc-text text-xs mt-0.5 line-clamp-2 italic">
                {proyecto?.premisa || proyecto?.sinopsis || form.premisa || t('script.noSavedPremise') || 'Sin premisa guardada en el proyecto.'}
              </p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-2">
              <span className="text-[11px] font-titulo font-semibold px-2.5 py-1 rounded-lg bg-rdc-secondary border border-rdc-border text-rdc-accent">
                {modoProyecto === 'legendario'
                  ? `Estilo: ${estiloLegendarioInfo?.name || proyecto?.estilo_legendario || 'Legendario'}`
                  : modoProyecto === 'aleatorio'
                  ? `Estilo: ${estiloSorteado?.name || 'Aleatorio'}`
                  : (t('script.ownSignature') || 'Firma Propia')}
              </span>
            </div>
          </div>

          {/* 2. CAJA DE IDEA RÁPIDA DE CAPÍTULO */}
          <div className="bg-purple-500/10 border-2 border-purple-500/30 dark:border-purple-400/20 rounded-2xl p-4 sm:p-5 relative transition-all">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-purple-400 animate-pulse" />
                <span className="font-titulo font-bold text-xs uppercase tracking-wider text-purple-700 dark:text-purple-300">
                  {t('script.chapterFlashIdeaTitle', { num: capituloActivoNum }) || `Idea Rápida para Capítulo ${capituloActivoNum}`}
                </span>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 font-semibold">
                {tagFlashCapitulo}
              </span>
            </div>

            <p className="text-rdc-text text-sm leading-relaxed italic my-2">
              "{flashCapitulo}"
            </p>

            <div className="flex items-center justify-end gap-2.5 mt-3 pt-2 border-t border-purple-500/20">
              <button
                type="button"
                onClick={() => regenerarFlashCapitulo(capituloActivoNum)}
                className="px-3 py-1.5 bg-rdc-secondary hover:bg-rdc-card text-rdc-text text-xs font-titulo font-medium rounded-xl border border-rdc-border flex items-center gap-1.5 transition-colors cursor-pointer"
                title={t('script.generateAnotherSuggestion') || 'Generar otra sugerencia rápida'}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t('script.newIdea') || 'Nueva Idea'}</span>
              </button>
              <button
                type="button"
                onClick={adoptarIdeaCapitulo}
                className={`px-3.5 py-1.5 text-xs font-titulo font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                  flashCapituloAdoptado
                    ? 'bg-emerald-600 text-white'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                {flashCapituloAdoptado ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{t('script.ideaAdopted') || '¡Idea Adoptada!'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t('script.adoptIdea') || 'Adoptar Idea'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3. CAMPO EDITABLE: DESGLOSE Y ESCENAS DEL CAPÍTULO */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-rdc-text text-xs uppercase tracking-wider font-bold font-titulo flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-rdc-accent" />
                {t('script.chapterBreakdownTitle', { num: capituloActivoNum }) || `Desglose y Escenas del Capítulo ${capituloActivoNum}`}
              </label>
              <span className="text-[11px] text-rdc-muted font-mono">
                {t('script.charactersCount', { count: guionCapituloTexto.length }) || `${guionCapituloTexto.length} caracteres`}
              </span>
            </div>

            <textarea
              value={guionCapituloTexto}
              onChange={e => setGuionCapituloTexto(e.target.value)}
              rows={4}
              placeholder={t('script.chapterBreakdownPlaceholder', { num: capituloActivoNum }) || `Describe los eventos clave, detonantes, enfrentamientos y giros del Capítulo ${capituloActivoNum}... O adopta una idea sugerida arriba.`}
              className="w-full bg-rdc-secondary/70 border-2 border-slate-900 dark:border-slate-700 rounded-xl
                         p-3.5 text-rdc-text placeholder-rdc-muted text-sm leading-relaxed
                         focus:outline-none focus:border-rdc-accent resize-none
                         shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] dark:shadow-none
                         transition-colors duration-200"
            />
          </div>

          {/* 4. BOTONES DE ACCIÓN: GUARDAR GUION & GENERAR CON GEMINI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={handleGuardarCapitulo}
              disabled={guardandoCapitulo || !guionCapituloTexto.trim()}
              className={`py-3 px-4 rounded-xl font-titulo font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                capituloGuardadoExito
                  ? 'bg-emerald-600 text-white'
                  : 'bg-rdc-secondary hover:bg-rdc-card border border-rdc-border text-rdc-text hover:border-rdc-accent'
              }`}
            >
              {guardandoCapitulo ? (
                <>
                  <div className="w-4 h-4 border-2 border-rdc-text border-t-transparent rounded-full animate-spin" />
                  <span>Guardando en BD...</span>
                </>
              ) : capituloGuardadoExito ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>✅ Guion Guardado en BD</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-rdc-accent" />
                  <span>Guardar Guion del Capítulo</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleGenerarCapitulo}
              disabled={estaGenerando || (!guionCapituloTexto.trim() && !form.premisa.trim())}
              className="py-3 px-4 bg-rdc-accent hover:bg-rdc-accent-hover text-white font-titulo font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generandoGuion ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generando Guion Técnico de Viñetas...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generar Guion de Capítulo con Gemini</span>
                </>
              )}
            </button>
          </div>

          {/* Motor Activo */}
          <div className="flex items-center justify-between text-[11px] text-rdc-muted font-titulo pt-1">
            <span className="flex items-center gap-1.5">
              {aiMode === 'local' ? <Cpu className="w-3.5 h-3.5 text-purple-400" /> : <Cloud className="w-3.5 h-3.5 text-emerald-400" />}
              Motor Activo:{' '}
              <strong className={aiMode === 'local' ? 'text-purple-400' : 'text-emerald-400'}>
                {aiMode === 'local' ? 'Qwen 2.5 Local (GPU)' : 'Cloud Free (Gemini Flash / FLUX.1)'}
              </strong>
            </span>
            <span className="text-[10px] opacity-75 font-mono">
              Capítulo Activo: {capituloActivoNum} / {form.num_capitulos}
            </span>
          </div>

        </div>
      )}

      {/* ── MENSAJE DE ERROR GLOBAL ── */}
      {(errorGuion || errorSinopsis) && (
        <div className="bg-rdc-error/15 border border-rdc-error text-rdc-error rounded-xl p-4 text-xs font-titulo">
          <p className="font-bold mb-1 flex items-center gap-1.5">
            <X className="w-4 h-4" /> Error en Generación
          </p>
          <p>{errorGuion || errorSinopsis}</p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          RESULTADOS ESTRUCTURADOS: SINOPSIS & ARCOS
         ══════════════════════════════════════════════════════════════════════════ */}
      {modo === 'sinopsis' && sinopsisGenerada && (
        <div className="space-y-6 border-t border-rdc-border pt-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <h4 className="font-titulo text-xl text-rdc-accent font-bold flex items-center gap-2">
              <MangaIcon name="contador_capitulos" size={20} className="mr-1" />
              {t('scriptGenerator.tabSinopsis') || 'Sinopsis y Universo'}
            </h4>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-titulo flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Estado Persistente
            </span>
          </div>

          {/* Sinopsis de contraportada */}
          <div className="bg-rdc-card/70 border border-rdc-border rounded-2xl p-5">
            <p className="text-rdc-muted text-xs uppercase font-bold mb-2 font-titulo tracking-wider">
              Sinopsis de Contraportada
            </p>
            <p className="text-rdc-text text-sm leading-relaxed">
              {sinopsisGenerada.sinopsis_contraportada}
            </p>
          </div>

          {/* Personajes Sugeridos con CRUD Completo */}
          {sinopsisGenerada.personajes_sugeridos?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-rdc-muted text-xs uppercase font-bold font-titulo tracking-wider flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-rdc-accent" />
                  Personajes Sugeridos ({sinopsisGenerada.personajes_sugeridos.length})
                </p>
                <span className="text-[11px] text-rdc-muted">
                  Edita o acepta para registrar en el proyecto
                </span>
              </div>

              <div className="space-y-3">
                {sinopsisGenerada.personajes_sugeridos.map((p, i) => {
                  const estaEditando = editandoPersonajeIdx === i
                  const yaAceptado = personajesAceptados[i]
                  const cargandoGuardar = guardandoPersonaje[i]

                  return (
                    <div
                      key={i}
                      className={`bg-rdc-card border rounded-xl p-4 transition-all duration-200 ${
                        yaAceptado ? 'border-emerald-500/50 bg-emerald-950/10' : 'border-rdc-border hover:border-rdc-accent/50'
                      }`}
                    >
                      {estaEditando ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={formEditPersonaje.nombre}
                              onChange={e => setFormEditPersonaje(prev => ({ ...prev, nombre: e.target.value }))}
                              placeholder="Nombre del personaje"
                              className="bg-rdc-secondary border border-rdc-border rounded-lg px-3 py-1.5 text-xs text-rdc-text focus:outline-none focus:border-rdc-accent"
                            />
                            <select
                              value={formEditPersonaje.rol}
                              onChange={e => setFormEditPersonaje(prev => ({ ...prev, rol: e.target.value }))}
                              className="bg-rdc-secondary border border-rdc-border rounded-lg px-3 py-1.5 text-xs text-rdc-text focus:outline-none focus:border-rdc-accent"
                            >
                              <option value="protagonista">Protagonista</option>
                              <option value="antagonista">Antagonista</option>
                              <option value="apoyo">Apoyo / Aliado</option>
                              <option value="secundario">Secundario</option>
                            </select>
                          </div>
                          <textarea
                            value={formEditPersonaje.motivacion}
                            onChange={e => setFormEditPersonaje(prev => ({ ...prev, motivacion: e.target.value }))}
                            placeholder="Motivación y trasfondo"
                            rows={2}
                            className="w-full bg-rdc-secondary border border-rdc-border rounded-lg px-3 py-1.5 text-xs text-rdc-text focus:outline-none focus:border-rdc-accent resize-none"
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => setEditandoPersonajeIdx(null)}
                              className="px-3 py-1 bg-rdc-secondary text-rdc-muted hover:text-rdc-text text-xs rounded-lg flex items-center gap-1 font-titulo"
                            >
                              <X className="w-3.5 h-3.5" /> Descartar
                            </button>
                            <button
                              type="button"
                              onClick={() => guardarEdicionPersonaje(i)}
                              className="px-3 py-1 bg-rdc-accent text-white text-xs rounded-lg flex items-center gap-1 font-titulo font-semibold"
                            >
                              <Check className="w-3.5 h-3.5" /> Guardar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-rdc-text font-bold text-sm font-titulo">
                                {p.nombre}
                              </span>
                              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-rdc-secondary border border-rdc-border text-rdc-accent">
                                {p.rol}
                              </span>
                              {yaAceptado && (
                                <span className="text-[10px] text-emerald-400 font-titulo font-semibold flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Añadido
                                </span>
                              )}
                            </div>
                            <p className="text-rdc-muted text-xs mt-1 leading-relaxed">
                              {p.motivacion}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-auto">
                            {!yaAceptado ? (
                              <button
                                type="button"
                                onClick={() => aceptarPersonajeOficial(i, p)}
                                disabled={cargandoGuardar}
                                className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-titulo font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                                title="Agregar a la lista oficial de personajes"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>{cargandoGuardar ? 'Guardando...' : 'Aceptar'}</span>
                              </button>
                            ) : (
                              <span className="text-xs text-emerald-400 font-titulo px-2 py-1 bg-emerald-500/10 rounded-lg">
                                Registrado
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => iniciarEdicionPersonaje(i, p)}
                              className="p-1.5 text-rdc-muted hover:text-rdc-text bg-rdc-secondary hover:bg-rdc-card rounded-lg text-xs transition-colors cursor-pointer"
                              title="Editar personaje"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => regenerarPersonajeSugerido(i, p)}
                              className="p-1.5 text-rdc-muted hover:text-purple-400 bg-rdc-secondary hover:bg-rdc-card rounded-lg text-xs transition-colors cursor-pointer"
                              title="Regenerar rol / enfoque"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => eliminarPersonajeSugerido(i)}
                              className="p-1.5 text-rdc-muted hover:text-rdc-error bg-rdc-secondary hover:bg-rdc-card rounded-lg text-xs transition-colors cursor-pointer"
                              title="Eliminar de sugerencias"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Estructura de Capítulos con CRUD */}
          {sinopsisGenerada.estructura_capitulos?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-rdc-muted text-xs uppercase font-bold font-titulo tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-rdc-accent" />
                  Estructura de Capítulos ({sinopsisGenerada.estructura_capitulos.length})
                </p>

                <button
                  type="button"
                  onClick={aceptarTodosLosCapitulos}
                  disabled={creandoCapitulosEnBd || capitulosAceptadosExito}
                  className={`px-3 py-1.5 rounded-xl text-xs font-titulo font-semibold flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
                    capitulosAceptadosExito
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rdc-accent hover:bg-rdc-accent-hover text-white'
                  }`}
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>
                    {creandoCapitulosEnBd
                      ? 'Creando capítulos...'
                      : capitulosAceptadosExito
                      ? '✅ Capítulos creados en BD'
                      : 'Aceptar Capítulos en Proyecto'}
                  </span>
                </button>
              </div>

              <div className="space-y-3">
                {sinopsisGenerada.estructura_capitulos.map((cap, i) => {
                  const estaEditando = editandoCapituloIdx === i
                  return (
                    <div
                      key={i}
                      className="bg-rdc-card border border-rdc-border rounded-xl p-4 hover:border-rdc-accent/50 transition-colors"
                    >
                      {estaEditando ? (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={formEditCapitulo.numero}
                              onChange={e => setFormEditCapitulo(prev => ({ ...prev, numero: e.target.value }))}
                              className="w-16 bg-rdc-secondary border border-rdc-border rounded-lg px-2 py-1 text-xs text-rdc-text"
                            />
                            <input
                              type="text"
                              value={formEditCapitulo.titulo}
                              onChange={e => setFormEditCapitulo(prev => ({ ...prev, titulo: e.target.value }))}
                              placeholder="Título del capítulo"
                              className="flex-1 bg-rdc-secondary border border-rdc-border rounded-lg px-3 py-1 text-xs text-rdc-text"
                            />
                          </div>
                          <textarea
                            value={formEditCapitulo.gancho}
                            onChange={e => setFormEditCapitulo(prev => ({ ...prev, gancho: e.target.value }))}
                            placeholder="Gancho / Sinopsis del capítulo"
                            rows={2}
                            className="w-full bg-rdc-secondary border border-rdc-border rounded-lg px-3 py-1.5 text-xs text-rdc-text resize-none"
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => setEditandoCapituloIdx(null)}
                              className="px-2.5 py-1 bg-rdc-secondary text-rdc-muted hover:text-rdc-text text-xs rounded-lg flex items-center gap-1 font-titulo"
                            >
                              <X className="w-3 h-3" /> Descartar
                            </button>
                            <button
                              type="button"
                              onClick={() => guardarEdicionCapitulo(i)}
                              className="px-2.5 py-1 bg-rdc-accent text-white text-xs rounded-lg flex items-center gap-1 font-titulo font-semibold"
                            >
                              <Check className="w-3 h-3" /> Guardar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex gap-3">
                            <span className="font-manga text-xl text-rdc-accent min-w-[1.75rem] leading-none pt-0.5">
                              {cap.numero}
                            </span>
                            <div>
                              <p className="text-rdc-text text-sm font-bold font-titulo">{cap.titulo}</p>
                              <p className="text-rdc-muted text-xs mt-1 leading-relaxed">{cap.gancho}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => iniciarEdicionCapitulo(i, cap)}
                              className="p-1.5 text-rdc-muted hover:text-rdc-text bg-rdc-secondary hover:bg-rdc-card rounded-lg text-xs transition-colors cursor-pointer"
                              title="Editar capítulo"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => eliminarCapituloSugerido(i)}
                              className="p-1.5 text-rdc-muted hover:text-rdc-error bg-rdc-secondary hover:bg-rdc-card rounded-lg text-xs transition-colors cursor-pointer"
                              title="Eliminar capítulo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          RESULTADOS ESTRUCTURADOS: GUION DE CAPÍTULO TÉCNICO (Desglose por Capítulo)
         ══════════════════════════════════════════════════════════════════════════ */}
      {modo === 'capitulo' && (
        <div className="border-t border-rdc-border pt-6">
          {!guionActivo || !guionActivo.escenas?.length ? (
            /* ASISTENTE DE ESTRUCTURACIÓN GUIADA (ESTADO VACÍO / PASO PREVIO) */
            <div className="space-y-4">
              
              {/* Tarjeta del Asistente Guiado */}
              <div className="bg-gradient-to-br from-rdc-card/90 to-rdc-secondary/60 border-2 border-slate-900/20 dark:border-slate-700 rounded-2xl p-5 sm:p-6 shadow-md space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rdc-border/60 pb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rdc-accent/15 border border-rdc-accent/30 flex items-center justify-center text-rdc-accent flex-shrink-0">
                      <LayoutGrid className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="font-titulo font-bold text-rdc-text text-sm sm:text-base flex items-center gap-2">
                        <span>Asistente de Estructuración Guiada (Capítulo {capituloActivoNum})</span>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-rdc-accent/20 text-rdc-accent font-semibold">
                          Manual
                        </span>
                      </h5>
                      <p className="text-rdc-muted text-xs mt-0.5 leading-relaxed">
                        Configura la estructura de páginas y viñetas para rellenar los planos, descripciones y diálogos paso a paso sin IA o como borrador base.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Selector Páginas del Capítulo */}
                  <div className="bg-rdc-card/80 border border-rdc-border rounded-xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs uppercase font-bold text-rdc-text font-titulo flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-rdc-accent" />
                        <span>Páginas del Capítulo</span>
                      </label>
                      <span className="text-xs font-mono font-bold text-rdc-accent bg-rdc-secondary px-2.5 py-0.5 rounded-lg border border-rdc-border">
                        {wizardPaginas} Págs
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={40}
                        value={wizardPaginas}
                        onChange={e => setWizardPaginas(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-18 bg-rdc-secondary border border-rdc-border rounded-lg px-2.5 py-1.5 text-xs text-rdc-text font-bold focus:outline-none focus:border-rdc-accent text-center"
                      />
                      {/* Presets rápidos */}
                      <div className="flex flex-wrap gap-1.5 flex-1">
                        {[4, 8, 16, 20].map(n => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setWizardPaginas(n)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-titulo font-semibold transition-all cursor-pointer ${
                              wizardPaginas === n
                                ? 'bg-rdc-accent text-white shadow-xs'
                                : 'bg-rdc-secondary hover:bg-rdc-card text-rdc-muted hover:text-rdc-text border border-rdc-border'
                            }`}
                          >
                            {n} Págs
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Selector Viñetas por Página */}
                  <div className="bg-rdc-card/80 border border-rdc-border rounded-xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs uppercase font-bold text-rdc-text font-titulo flex items-center gap-1.5">
                        <Film className="w-3.5 h-3.5 text-rdc-accent" />
                        <span>Viñetas promedio por Página</span>
                      </label>
                      <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-300 bg-rdc-secondary px-2.5 py-0.5 rounded-lg border border-rdc-border">
                        {wizardVinetasPorPagina} Viñetas
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={wizardVinetasPorPagina}
                        onChange={e => setWizardVinetasPorPagina(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-18 bg-rdc-secondary border border-rdc-border rounded-lg px-2.5 py-1.5 text-xs text-rdc-text font-bold focus:outline-none focus:border-rdc-accent text-center"
                      />
                      {/* Presets rápidos */}
                      <div className="flex flex-wrap gap-1.5 flex-1">
                        {[3, 4, 5, 6].map(n => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setWizardVinetasPorPagina(n)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-titulo font-semibold transition-all cursor-pointer ${
                              wizardVinetasPorPagina === n
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'bg-rdc-secondary hover:bg-rdc-card text-rdc-muted hover:text-rdc-text border border-rdc-border'
                            }`}
                          >
                            {n} Viñetas
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botones de acción del asistente */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleGenerarEsqueleto(wizardPaginas, wizardVinetasPorPagina)}
                    className="w-full sm:flex-1 py-3 px-4 bg-gradient-to-r from-rdc-accent to-rdc-accent-hover hover:from-rdc-accent-hover hover:to-rdc-accent text-white font-titulo font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <LayoutGrid className="w-4 h-4" />
                    <span>📐 Generar Esqueleto de {wizardPaginas} Páginas ({wizardPaginas * wizardVinetasPorPagina} Viñetas)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCrearPaginaEnBlanco}
                    className="w-full sm:w-auto py-3 px-4 bg-rdc-secondary hover:bg-rdc-card text-rdc-text font-titulo font-semibold text-xs sm:text-sm rounded-xl border border-rdc-border hover:border-rdc-accent flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                  >
                    <FilePlus className="w-4 h-4 text-rdc-accent" />
                    <span>➕ 1 Página en Blanco</span>
                  </button>
                </div>
              </div>

              {/* Opción Alternativa IA */}
              <div className="border border-dashed border-slate-300 dark:border-slate-700/80 rounded-2xl p-5 text-center bg-slate-500/5 dark:bg-slate-900/20 backdrop-blur-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-left">
                  <p className="font-titulo font-bold text-xs text-rdc-text">
                    ¿Prefieres que la IA genere el desglose completo automáticamente?
                  </p>
                  <p className="text-rdc-muted text-[11px] mt-0.5">
                    Gemini estructurará las 20 páginas completas con planos, diálogos y ritmo narrativo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGenerarCapitulo}
                  disabled={estaGenerando || (!guionCapituloTexto.trim() && !form.premisa.trim())}
                  className="flex-shrink-0 px-4 py-2 bg-rdc-accent hover:bg-rdc-accent-hover text-white font-titulo font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generar con Gemini</span>
                </button>
              </div>

            </div>
          ) : (
            /* VISTA DEL DESGLOSE TÉCNICO AISLADO PARA ESTE CAPÍTULO CON FORMULARIOS GUIADOS */
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Encabezado del Capítulo */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <h4 className="font-titulo text-xl text-rdc-accent font-bold flex items-center gap-2">
                    <MangaIcon name="guionista_ia" size={20} className="mr-1" />
                    {guionActivo.titulo_capitulo || `Capítulo ${capituloActivoNum}`}
                  </h4>
                  <p className="text-rdc-muted text-xs mt-1 font-titulo">
                    {guionActivo.num_paginas || guionActivo.escenas?.length || 0} páginas desglosadas · {guionActivo.tono_capitulo || form.tono}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start">
                  <button
                    type="button"
                    onClick={handleLimpiarDesglose}
                    className="px-2.5 py-1 text-xs font-titulo font-medium rounded-lg bg-rdc-secondary hover:bg-rdc-card text-rdc-muted hover:text-rdc-error border border-rdc-border flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Reiniciar desglose técnico de este capítulo"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reiniciar Esqueleto</span>
                  </button>

                  <span className="text-emerald-400 text-xs bg-emerald-400/10 border border-emerald-400/30 px-3 py-1 rounded-full font-titulo flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Desglose Capítulo {capituloActivoNum}
                  </span>
                </div>
              </div>

              {/* 1. SINOPSIS DEL EPISODIO (EDITABLE IN-PLACE) */}
              <div className="bg-rdc-card/70 border-2 border-slate-900/15 dark:border-slate-700/60 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-rdc-muted text-xs uppercase font-bold font-titulo tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-rdc-accent" />
                    Sinopsis del Episodio
                  </p>
                  <button
                    type="button"
                    onClick={() => setEditandoSinopsisEpisodio(!editandoSinopsisEpisodio)}
                    className="px-2.5 py-1 text-xs font-titulo font-semibold rounded-lg bg-rdc-secondary hover:bg-rdc-card text-rdc-text border border-rdc-border flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {editandoSinopsisEpisodio ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Listo</span>
                      </>
                    ) : (
                      <>
                        <Pencil className="w-3.5 h-3.5 text-rdc-accent" />
                        <span>Editar</span>
                      </>
                    )}
                  </button>
                </div>

                {editandoSinopsisEpisodio ? (
                  <textarea
                    value={guionActivo.sinopsis || ''}
                    onChange={e => {
                      const val = e.target.value
                      actualizarGuionCapitulo(capituloActivoNum, prev => ({ ...prev, sinopsis: val }))
                    }}
                    rows={3}
                    className="w-full bg-rdc-secondary/90 border-2 border-slate-900 dark:border-slate-700 rounded-xl p-3 text-rdc-text text-sm leading-relaxed focus:outline-none focus:border-rdc-accent resize-none mt-1"
                    placeholder="Escribe o ajusta la sinopsis de este episodio..."
                  />
                ) : (
                  <p className="text-rdc-text text-sm leading-relaxed whitespace-pre-line">
                    {guionActivo.sinopsis || 'Sin sinopsis de episodio definida.'}
                  </p>
                )}
              </div>

              {/* 2. DESGLOSE DE PÁGINAS Y VIÑETAS GUIADO */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-rdc-muted text-xs uppercase font-bold font-titulo tracking-wider flex items-center gap-1.5">
                    <Film className="w-4 h-4 text-rdc-accent" />
                    Páginas y Viñetas ({guionActivo.escenas?.length || 0} Páginas)
                  </p>
                  <span className="text-[11px] text-rdc-muted">
                    Edita planos, prompts y diálogos de cada viñeta
                  </span>
                </div>

                <div className="space-y-5 max-h-[650px] overflow-y-auto pr-1">
                  {guionActivo.escenas?.map((escena, i) => (
                    <div
                      key={i}
                      className="bg-rdc-card/90 border-2 border-slate-900/20 dark:border-slate-700/60 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4"
                    >
                      {/* Encabezado de Página */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rdc-border/60 pb-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-rdc-accent font-manga text-lg font-bold min-w-[1.75rem] flex items-center gap-1.5">
                            <Layers className="w-4 h-4" />
                            <span>Página {escena.numero_pagina || i + 1}</span>
                          </span>

                          {/* Selector de Ritmo / Layout */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] uppercase font-bold text-rdc-muted">Ritmo:</span>
                            <select
                              value={escena.tipo_layout || 'standard'}
                              onChange={e => {
                                const val = e.target.value
                                actualizarGuionCapitulo(capituloActivoNum, prev => {
                                  const nuevas = [...(prev.escenas || [])]
                                  nuevas[i] = { ...nuevas[i], tipo_layout: val }
                                  return { ...prev, escenas: nuevas }
                                })
                              }}
                              className="bg-rdc-secondary border border-rdc-border rounded-lg px-2.5 py-1 text-xs text-rdc-text focus:outline-none focus:border-rdc-accent font-mono cursor-pointer"
                            >
                              {TIPOS_LAYOUT.map(l => (
                                <option key={l.id} value={l.id}>{l.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              actualizarGuionCapitulo(capituloActivoNum, prev => {
                                const nuevas = [...(prev.escenas || [])]
                                const vinetasNuevas = [...(nuevas[i].vinetas || [])]
                                const nextNum = vinetasNuevas.length + 1
                                vinetasNuevas.push({
                                  numero: nextNum,
                                  angulo_camara: 'Plano medio',
                                  descripcion_visual: '',
                                  dialogo: ''
                                })
                                nuevas[i] = { ...nuevas[i], vinetas: vinetasNuevas }
                                return { ...prev, escenas: nuevas }
                              })
                            }}
                            className="px-2.5 py-1 text-xs font-titulo font-semibold text-rdc-accent hover:text-rdc-accent-hover bg-rdc-secondary hover:bg-rdc-card rounded-lg border border-rdc-border flex items-center gap-1 transition-colors cursor-pointer"
                            title="Añadir viñeta a esta página"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Añadir Viñeta</span>
                          </button>

                          {guionActivo.escenas.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleEliminarPagina(i)}
                              className="p-1.5 text-rdc-muted hover:text-rdc-error bg-rdc-secondary hover:bg-rdc-card rounded-lg text-xs transition-colors cursor-pointer border border-rdc-border/40"
                              title={`Eliminar Página ${escena.numero_pagina || i + 1}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Resumen / Atmósfera de la Página */}
                      <div>
                        <input
                          type="text"
                          value={escena.descripcion_pagina || ''}
                          onChange={e => {
                            const val = e.target.value
                            actualizarGuionCapitulo(capituloActivoNum, prev => {
                              const nuevas = [...(prev.escenas || [])]
                              nuevas[i] = { ...nuevas[i], descripcion_pagina: val }
                              return { ...prev, escenas: nuevas }
                            })
                          }}
                          placeholder="Resumen narrativo o atmósfera de la página..."
                          className="w-full bg-rdc-secondary/70 border border-rdc-border rounded-xl px-3 py-1.5 text-xs text-rdc-text focus:outline-none focus:border-rdc-accent placeholder-rdc-muted/70"
                        />
                      </div>

                      {/* Viñetas de la Página (Formularios Guiados de 3 Campos) */}
                      <div className="space-y-3 pl-2 sm:pl-3 border-l-2 border-rdc-accent/40">
                        {escena.vinetas?.map((vineta, j) => (
                          <div
                            key={j}
                            className="bg-rdc-secondary/70 dark:bg-slate-900/40 border-2 border-slate-900/15 dark:border-slate-700/50 rounded-xl p-3.5 space-y-3 hover:border-rdc-accent/50 transition-all shadow-xs"
                          >
                            {/* 1. Cabecera de Viñeta */}
                            <div className="flex items-center justify-between gap-2 border-b border-rdc-border/40 pb-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-titulo font-bold text-xs text-rdc-accent bg-rdc-card px-2.5 py-1 rounded-lg border border-rdc-border shadow-xs flex items-center gap-1.5">
                                  <Film className="w-3.5 h-3.5" />
                                  <span>Viñeta {vineta.numero || j + 1}</span>
                                </span>

                                {/* Selector de Plano de Cámara */}
                                <div className="flex items-center gap-1.5">
                                  <Camera className="w-3.5 h-3.5 text-rdc-muted" />
                                  <select
                                    value={vineta.angulo_camara || 'Plano medio'}
                                    onChange={e => {
                                      const val = e.target.value
                                      actualizarGuionCapitulo(capituloActivoNum, prev => {
                                        const nuevas = [...(prev.escenas || [])]
                                        const vinetasNuevas = [...(nuevas[i].vinetas || [])]
                                        vinetasNuevas[j] = { ...vinetasNuevas[j], angulo_camara: val }
                                        nuevas[i] = { ...nuevas[i], vinetas: vinetasNuevas }
                                        return { ...prev, escenas: nuevas }
                                      })
                                    }}
                                    className="bg-rdc-card border border-rdc-border rounded-lg px-2.5 py-1 text-xs text-rdc-text focus:outline-none focus:border-rdc-accent font-mono cursor-pointer"
                                  >
                                    {ANGULOS_CAMARA.map(ang => (
                                      <option key={ang} value={ang}>{ang}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {/* Acciones de Viñeta */}
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    actualizarGuionCapitulo(capituloActivoNum, prev => {
                                      const nuevas = [...(prev.escenas || [])]
                                      const vinetasNuevas = [...(nuevas[i].vinetas || [])]
                                      vinetasNuevas.splice(j + 1, 0, {
                                        numero: j + 2,
                                        angulo_camara: 'Plano medio',
                                        descripcion_visual: '',
                                        dialogo: ''
                                      })
                                      const reindexadas = vinetasNuevas.map((v, idx) => ({ ...v, numero: idx + 1 }))
                                      nuevas[i] = { ...nuevas[i], vinetas: reindexadas }
                                      return { ...prev, escenas: nuevas }
                                    })
                                  }}
                                  className="p-1.5 text-rdc-muted hover:text-rdc-accent bg-rdc-card rounded-lg text-xs transition-colors cursor-pointer border border-rdc-border/40"
                                  title="Añadir viñeta después de esta"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                                
                                {escena.vinetas.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      actualizarGuionCapitulo(capituloActivoNum, prev => {
                                        const nuevas = [...(prev.escenas || [])]
                                        const vinetasNuevas = (nuevas[i].vinetas || []).filter((_, vIdx) => vIdx !== j)
                                        const reindexadas = vinetasNuevas.map((v, idx) => ({ ...v, numero: idx + 1 }))
                                        nuevas[i] = { ...nuevas[i], vinetas: reindexadas }
                                        return { ...prev, escenas: nuevas }
                                      })
                                    }}
                                    className="p-1.5 text-rdc-muted hover:text-rdc-error bg-rdc-card rounded-lg text-xs transition-colors cursor-pointer border border-rdc-border/40"
                                    title="Eliminar viñeta"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* 2. Campo Descripción de la Escena (Prompt Visual) */}
                            <div>
                              <label className="text-[10px] uppercase font-bold text-rdc-muted tracking-wider block mb-1">
                                Descripción de la Escena (Prompt Visual)
                              </label>
                              <textarea
                                value={vineta.descripcion_visual || ''}
                                onChange={e => {
                                  const val = e.target.value
                                  actualizarGuionCapitulo(capituloActivoNum, prev => {
                                    const nuevas = [...(prev.escenas || [])]
                                    const vinetasNuevas = [...(nuevas[i].vinetas || [])]
                                    vinetasNuevas[j] = { ...vinetasNuevas[j], descripcion_visual: val }
                                    nuevas[i] = { ...nuevas[i], vinetas: vinetasNuevas }
                                    return { ...prev, escenas: nuevas }
                                  })
                                }}
                                rows={2}
                                placeholder="Describe el entorno, acción principal, iluminación y estilo del personaje (servirá como base para generar la imagen)..."
                                className="w-full bg-rdc-card border border-rdc-border rounded-xl p-2.5 text-xs text-rdc-text focus:outline-none focus:border-rdc-accent resize-none placeholder-rdc-muted/70 leading-relaxed"
                              />
                            </div>

                            {/* 3. Campo Diálogo / Narración / Pensamiento */}
                            <div>
                              <label className="text-[10px] uppercase font-bold text-rdc-muted tracking-wider block mb-1 flex items-center gap-1">
                                <MessageSquare className="w-3 h-3 text-rdc-accent" />
                                <span>Diálogo / Narración / Pensamiento</span>
                              </label>
                              <input
                                type="text"
                                value={vineta.dialogo || ''}
                                onChange={e => {
                                  const val = e.target.value
                                  actualizarGuionCapitulo(capituloActivoNum, prev => {
                                    const nuevas = [...(prev.escenas || [])]
                                    const vinetasNuevas = [...(nuevas[i].vinetas || [])]
                                    vinetasNuevas[j] = { ...vinetasNuevas[j], dialogo: val }
                                    nuevas[i] = { ...nuevas[i], vinetas: vinetasNuevas }
                                    return { ...prev, escenas: nuevas }
                                  })
                                }}
                                placeholder="Diálogo del personaje o texto de la cartela narrativa..."
                                className="w-full bg-rdc-card border border-rdc-border rounded-xl px-3 py-2 text-xs text-rdc-text focus:outline-none focus:border-rdc-accent placeholder-rdc-muted/70"
                              />
                            </div>
                          </div>
                        ))}

                        {/* Botón Añadir Viñeta a esta página */}
                        <button
                          type="button"
                          onClick={() => {
                            actualizarGuionCapitulo(capituloActivoNum, prev => {
                              const nuevas = [...(prev.escenas || [])]
                              const vinetasNuevas = [...(nuevas[i].vinetas || [])]
                              const nextNum = vinetasNuevas.length + 1
                              vinetasNuevas.push({
                                numero: nextNum,
                                angulo_camara: 'Plano medio',
                                descripcion_visual: '',
                                dialogo: ''
                              })
                              nuevas[i] = { ...nuevas[i], vinetas: vinetasNuevas }
                              return { ...prev, escenas: nuevas }
                            })
                          }}
                          className="text-[11px] font-titulo font-semibold text-rdc-accent hover:text-rdc-accent-hover flex items-center gap-1 mt-1 cursor-pointer py-1.5 px-3 rounded-lg hover:bg-rdc-secondary transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Añadir Viñeta a Página {escena.numero_pagina || i + 1}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botón Añadir Nueva Página al Capítulo */}
              <button
                type="button"
                onClick={handleAnadirNuevaPagina}
                className="w-full py-3 px-4 bg-rdc-secondary hover:bg-rdc-card text-rdc-text font-titulo font-semibold text-xs sm:text-sm rounded-xl border-2 border-dashed border-rdc-border hover:border-rdc-accent flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4 text-rdc-accent" />
                <span>➕ Añadir Nueva Página al Capítulo {capituloActivoNum} (Página {guionActivo.escenas.length + 1})</span>
              </button>

              {/* 3. BOTÓN GLOBAL AL PIE: GUARDAR CAMBIOS DEL DESGLOSE EN BD */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleGuardarDesgloseBD}
                  disabled={guardandoDesgloseBD}
                  className={`w-full py-3.5 px-4 rounded-xl font-titulo font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                    desgloseGuardadoExito
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  }`}
                >
                  {guardandoDesgloseBD ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Guardando Cambios del Desglose en BD...</span>
                    </>
                  ) : desgloseGuardadoExito ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>✅ Cambios del Desglose Guardados en BD</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>💾 Guardar Cambios del Desglose en BD</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  )
}
