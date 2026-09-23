// PanelArtStudio.jsx
// Estudio dividido para "Generador de Viñetas" en MEP — Manga Editor Pro.
// Permite seleccionar Capítulo > Página > Viñeta, asociar avatares de personajes como anclajes anti-alucinación,
// y generar/persistir las ilustraciones de viñetas con FLUX.1 Dev y Firma Visual activa.

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Sparkles,
  Layers,
  Film,
  Camera,
  Users,
  Image as ImageIcon,
  Download,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Maximize2,
  Paperclip,
  X,
  FileText,
  Sliders,
  ChevronRight,
  ZoomIn
} from 'lucide-react'
import { chaptersAPI, vinetasAPI, charactersAPI, obtenerUrlImagen } from '../services/api'
import useCharacterStore from '../store/characterStore'
import useProjectStore from '../store/projectStore'
import { getDefaultAvatar } from '../assets/avatars'
import Spinner from './UI/Spinner'
import MangaIcon from './common/MangaIcon'
import { LEGENDARY_STYLES } from '../data/stylePresets'
import ChapterFilmstrip from './ChapterFilmstrip'

// Función Segura de Extracción Numérica (Anti-NaN)
const parsearNumeroSeguro = (valor, porDefecto = 1) => {
  if (typeof valor === 'number' && !isNaN(valor)) return valor
  const match = String(valor || '').match(/\d+/)
  return match ? parseInt(match[0], 10) : porDefecto
}

// Extractor Robusto y Polimórfico de Datos de Viñeta
const extraerDatosVineta = (capIdOrNum, pNum, vNum, listaCapitulos, storeGuiones) => {
  if (!listaCapitulos || listaCapitulos.length === 0) return null

  // 1. Localizar el capítulo por id numérico, por campo numero o por índice
  const cap = listaCapitulos.find(c => 
    String(c.id) === String(capIdOrNum) || 
    String(c.numero) === String(capIdOrNum) ||
    String(c.numero_capitulo) === String(capIdOrNum)
  ) || listaCapitulos[Number(capIdOrNum) - 1] || listaCapitulos[0]

  if (!cap) return null

  // 2. Extraer el guion (desde el store de Zustand o desde cap.guion_json)
  let guion = storeGuiones?.[cap.id] || storeGuiones?.[cap.numero]
  if (!guion && cap.guion_json) {
    try {
      guion = typeof cap.guion_json === 'string' ? JSON.parse(cap.guion_json) : cap.guion_json
    } catch (e) {
      console.error("[PanelArtStudio] Error parseando guion_json:", e)
    }
  }

  if (!guion) return null

  // 3. Normalizar array de páginas (soporta array directo u objeto con paginas/pages/escenas)
  const paginas = Array.isArray(guion) 
    ? guion 
    : (guion.paginas || guion.pages || guion.escenas || [])

  const pagina = paginas.find(p => Number(p.numero || p.pagina || p.num) === Number(pNum)) 
    || paginas[Number(pNum) - 1]

  if (!pagina) return null

  // 4. Normalizar array de viñetas (vinetas/panels/cuadros)
  const vinetas = Array.isArray(pagina.vinetas) 
    ? pagina.vinetas 
    : (pagina.panels || pagina.cuadros || [])

  const vineta = vinetas.find(v => Number(v.numero || v.vineta || v.num) === Number(vNum)) 
    || vinetas[Number(vNum) - 1]

  if (!vineta) return null

  return {
    descripcion: vineta.descripcion_escena || vineta.prompt_visual || vineta.descripcion_visual || vineta.descripcion || vineta.prompt || vineta.texto || "",
    plano: vineta.plano || vineta.angulo_camara || vineta.encuadre || "Plano General (Wide Shot)",
    dialogo: vineta.dialogo || vineta.texto_dialogo || vineta.narracion || "",
    imagen_url: vineta.imagen_url || vineta.url || null,
    personajes: vineta.personajes || [],
    prompt_usado: vineta.prompt_usado || ""
  }
}

const PLANOS_CAMARA = [
  { id: 'Plano general',    label: 'Plano General (Wide Shot)',         desc: 'Entorno amplio, paisaje o establecimiento' },
  { id: 'Plano entero',     label: 'Plano Entero (Full Body)',          desc: 'Cuerpo completo de los personajes' },
  { id: 'Plano medio',      label: 'Plano Medio (Medium Shot)',         desc: 'De cintura para arriba, ideal para diálogo y acción' },
  { id: 'Primer plano',     label: 'Primer Plano (Close-Up)',           desc: 'Rostro y expresión emocional intensa' },
  { id: 'Plano detalle',    label: 'Plano Detalle (Extreme Close-Up)',   desc: 'Ojos, manos, arma o artefacto clave' },
  { id: 'Vista cenital',    label: 'Vista Cenital (Bird\'s Eye View)',   desc: 'Vista aérea desde arriba hacia abajo' },
  { id: 'Contrapicado',     label: 'Contrapicado (Low Angle)',          desc: 'Desde abajo hacia arriba, postura dominante/heroica' },
  { id: 'Plano holandés',   label: 'Plano Holandés (Dutch Angle)',       desc: 'Ángulo inclinado dinámico de tensión/desequilibrio' },
]

const ASPECT_RATIOS = [
  { id: '16:9', label: '16:9 Panorámica',      aspectClass: 'aspect-video',  resolucion: '1024x576' },
  { id: '4:3',  label: '4:3 Estándar Horiz.',  aspectClass: 'aspect-[4/3]',  resolucion: '1024x768' },
  { id: '3:4',  label: '3:4 Vertical Cómic',   aspectClass: 'aspect-[3/4]',  resolucion: '768x1024' },
  { id: '9:16', label: '9:16 Altura / Splash', aspectClass: 'aspect-[9/16]', resolucion: '576x1024' },
  { id: '1:1',  label: '1:1 Cuadrada',         aspectClass: 'aspect-square', resolucion: '1024x1024' },
]

const LienzoVacio = () => (
  <div className="flex flex-col items-center justify-center text-center p-8 space-y-3 min-h-[420px]">
    <div className="w-16 h-16 rounded-2xl border-2 border-slate-700 bg-slate-800 flex items-center justify-center text-slate-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)]">
      <ImageIcon className="w-8 h-8 opacity-60" />
    </div>
    <div className="space-y-1">
      <h4 className="font-titulo font-black text-sm text-slate-200">
        Lienzo de Viñeta Vacío
      </h4>
      <p className="text-xs text-slate-400 max-w-sm">
        Escribe la descripción de la escena en el panel izquierdo y pulsa 'Generar Ilustración con FLUX.1'.
      </p>
    </div>
  </div>
)

export default function PanelArtStudio({ proyecto, onActualizar }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { personajes, cargarPersonajes } = useCharacterStore()
  const { vinetasEstudio, setVinetaEstudio, removerImagenVineta, capitulosGuiones } = useProjectStore()

  const projectId = proyecto?.id
  const modo = proyecto?.modo_creacion || 'propio'

  // Estados de navegación encadenada: Capítulo > Página > Viñeta
  const [capitulos, setCapitulos] = useState([])
  const [cargandoCapitulos, setCargandoCapitulos] = useState(true)
  const [capituloSeleccionadoNum, setCapituloSeleccionadoNum] = useState(1)
  const [paginaSeleccionadaNum, setPaginaSeleccionadaNum] = useState(1)
  const [vinetaSeleccionadaNum, setVinetaSeleccionadaNum] = useState(1)

  // Extracción Numérica Segura (Anti-NaN)
  const capNum = parsearNumeroSeguro(capituloSeleccionadoNum, 1)
  const pagNum = parsearNumeroSeguro(paginaSeleccionadaNum, 1)
  const vinNum = parsearNumeroSeguro(vinetaSeleccionadaNum, 1)

  // Clave canónica e indexada en el store global de Zustand
  const claveActual = `${proyecto?.id || 1}_${capNum}_${pagNum}_${vinNum}`
  const vinetaActiva = vinetasEstudio[claveActual] || {}

  // Datos reactivos derivados de la viñeta activa en Zustand (persistentes a través de re-renders)
  const descripcionVisual = vinetaActiva.descripcion ?? ''
  const planoSeleccionado = vinetaActiva.plano ?? 'Plano medio'
  const dialogoTexto = vinetaActiva.dialogo ?? ''
  const personajesSeleccionados = vinetaActiva.personajes_ids || []
  const aspectRatioSeleccionado = vinetaActiva.aspect_ratio || '1:1'
  const imagenGenerada = vinetaActiva.imagen_url || null
  const promptUsado = vinetaActiva.prompt_usado || ''
  const renderKey = vinetaActiva.timestamp || 1

  // Estados locales transitorios
  const [generando, setGenerando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [notificacionExito, setNotificacionExito] = useState(null)
  const [errorMensaje, setErrorMensaje] = useState(null)
  const [lightboxAbierto, setLightboxAbierto] = useState(false)
  const [motorOnline, setMotorOnline] = useState(null)
  const [verificandoMotor, setVerificandoMotor] = useState(false)

  // Comprobar estado de conectividad con FreeLLMAPI en puerto 31415
  const verificarEstadoMotor = async () => {
    setVerificandoMotor(true)
    try {
      const res = await vinetasAPI.checkFreeLLMAPI()
      setMotorOnline(Boolean(res?.data?.online))
    } catch (e) {
      setMotorOnline(false)
    } finally {
      setVerificandoMotor(false)
    }
  }

  useEffect(() => {
    verificarEstadoMotor()
  }, [])

  // Cargar personajes y capítulos del proyecto al iniciar
  useEffect(() => {
    if (projectId) {
      cargarPersonajes(projectId)
      cargarCapitulosProyecto(false)
    }
  }, [projectId])

  const cargarCapitulosProyecto = async (mantenerSeleccion = true) => {
    if (!projectId) return
    setCargandoCapitulos(true)
    try {
      const res = await chaptersAPI.listar(projectId)
      const list = res?.data || []
      setCapitulos(list)
      if (list.length > 0 && !mantenerSeleccion) {
        const primerCap = list[0]
        setCapituloSeleccionadoNum(primerCap.numero)
      }
    } catch (e) {
      console.warn('Error al cargar capítulos en PanelArtStudio:', e)
    } finally {
      setCargandoCapitulos(false)
    }
  }

  // Obtener el objeto del capítulo activo
  const capituloActivo = useMemo(() => {
    return capitulos.find(c => parsearNumeroSeguro(c.numero) === capNum) || null
  }, [capitulos, capNum])

  // Desglose de páginas del capítulo activo
  const paginasDisponibles = useMemo(() => {
    if (!capitulos || capitulos.length === 0) return [1]
    const cap = capitulos.find(c => 
      String(c.id) === String(capNum) || 
      String(c.numero) === String(capNum) ||
      String(c.numero_capitulo) === String(capNum)
    ) || capitulos[Number(capNum) - 1] || capitulos[0]

    let guion = capitulosGuiones?.[cap?.id] || capitulosGuiones?.[cap?.numero]
    if (!guion && cap?.guion_json) {
      try {
        guion = typeof cap.guion_json === 'string' ? JSON.parse(cap.guion_json) : cap.guion_json
      } catch (e) {
        guion = null
      }
    }
    const paginas = Array.isArray(guion) ? guion : (guion?.paginas || guion?.pages || guion?.escenas || [])
    if (paginas.length > 0) {
      return paginas.map((p, idx) => Number(p.numero || p.pagina || p.num || idx + 1))
    }
    if (cap?.paginas && cap.paginas.length > 0) {
      return cap.paginas.map(p => p.numero)
    }
    return [1, 2, 3, 4]
  }, [capitulos, capNum, capitulosGuiones])

  // Desglose de viñetas de la página activa
  const vinetasDisponibles = useMemo(() => {
    if (!capitulos || capitulos.length === 0) return [1, 2, 3, 4]
    const cap = capitulos.find(c => 
      String(c.id) === String(capNum) || 
      String(c.numero) === String(capNum) ||
      String(c.numero_capitulo) === String(capNum)
    ) || capitulos[Number(capNum) - 1] || capitulos[0]

    let guion = capitulosGuiones?.[cap?.id] || capitulosGuiones?.[cap?.numero]
    if (!guion && cap?.guion_json) {
      try {
        guion = typeof cap.guion_json === 'string' ? JSON.parse(cap.guion_json) : cap.guion_json
      } catch (e) {
        guion = null
      }
    }
    const paginas = Array.isArray(guion) ? guion : (guion?.paginas || guion?.pages || guion?.escenas || [])
    const pagina = paginas.find(p => Number(p.numero || p.pagina || p.num) === Number(pagNum)) 
      || paginas[Number(pagNum) - 1]
    const vinetas = Array.isArray(pagina?.vinetas) ? pagina.vinetas : (pagina?.panels || pagina?.cuadros || [])
    if (vinetas.length > 0) {
      return vinetas.map((v, i) => Number(v.numero || v.vineta || v.num || i + 1))
    }
    return [1, 2, 3, 4]
  }, [capitulos, capNum, pagNum, capitulosGuiones])

  // Hidratación reactiva desde guion_json al seleccionar viñeta o al cargar capítulos
  useEffect(() => {
    if (!capitulos || capitulos.length === 0) return

    const vinetaGuardada = vinetasEstudio[claveActual]

    // Si ya tiene contenido manual o imagen en el store global, no sobreescribir
    if (vinetaGuardada?.descripcion || vinetaGuardada?.imagen_url) {
      return
    }

    const datosGuion = extraerDatosVineta(capNum, pagNum, vinNum, capitulos, capitulosGuiones)
    if (datosGuion) {
      let idsPersonajes = datosGuion.personajes_ids || []
      if (idsPersonajes.length === 0 && datosGuion.personajes && Array.isArray(datosGuion.personajes) && personajes.length > 0) {
        idsPersonajes = personajes
          .filter(p => datosGuion.personajes.some(nom => typeof nom === 'string' && nom.toLowerCase() === p.nombre.toLowerCase()))
          .map(p => p.id)
      }

      setVinetaEstudio(claveActual, {
        descripcion: datosGuion.descripcion || "",
        plano: datosGuion.plano || "Plano General (Wide Shot)",
        dialogo: datosGuion.dialogo || "",
        imagen_url: datosGuion.imagen_url || null,
        personajes_ids: idsPersonajes,
        prompt_usado: datosGuion.prompt_usado || ""
      })
    }
  }, [claveActual, capitulos?.length]) // Dependencias seguras sin bucle reactivo

  // Sincronizadores de inputs con el store global de Zustand
  const handleDescripcionChange = (e) => {
    setVinetaEstudio(claveActual, { descripcion: e.target.value })
  }

  const handlePlanoChange = (e) => {
    setVinetaEstudio(claveActual, { plano: e.target.value })
  }

  const handleDialogoChange = (e) => {
    setVinetaEstudio(claveActual, { dialogo: e.target.value })
  }

  const handleAspectRatioChange = (arId) => {
    setVinetaEstudio(claveActual, { aspect_ratio: arId })
  }

  // Preset legendario si aplica
  const presetActual = useMemo(() => {
    if (!proyecto?.estilo_legendario) return null
    const cleanId = proyecto.estilo_legendario.replace('aleatorio_', '').replace('legendario_', '')
    return LEGENDARY_STYLES.find(s => s.id === cleanId || s.id === proyecto.estilo_legendario)
  }, [proyecto?.estilo_legendario])

  // Toggle de personaje en escena en el store de Zustand
  const togglePersonaje = (personajeId) => {
    const actuales = vinetaActiva.personajes_ids || []
    const nuevos = actuales.includes(personajeId)
      ? actuales.filter(id => id !== personajeId)
      : [...actuales, personajeId]
    setVinetaEstudio(claveActual, { personajes_ids: nuevos })
  }
  const handleTogglePersonaje = togglePersonaje

  // Enlace y Depuración de handleGenerarVineta
  const handleGenerarVineta = async (e) => {
    if (e) e.preventDefault()
    console.log(">>> [PanelArtStudio] Click en Generar Viñeta detectado.")

    const promptLimpio = (descripcionVisual || "").trim()
    if (!promptLimpio) {
      setErrorMensaje("Debes escribir una descripción para la viñeta antes de generar.")
      return
    }

    setGenerando(true)
    setErrorMensaje(null)
    setNotificacionExito(null)

    const nuevaSeed = Math.floor(Math.random() * 2147483647)

    const payload = {
      capitulo_num: capNum,
      pagina_num: pagNum,
      vineta_num: vinNum,
      prompt: promptLimpio,
      plano: planoSeleccionado || "Plano medio",
      dialogo: dialogoTexto || "",
      personajes_ids: vinetaActiva.personajes_ids || [],
      aspect_ratio: aspectRatioSeleccionado || "1:1",
      seed: nuevaSeed,
      referencia_extra_url: null
    }

    console.log(">>> [PanelArtStudio] Despachando payload al backend:", payload)

    try {
      const res = await vinetasAPI.generarImagen(proyecto.id, payload)
      console.log(">>> [PanelArtStudio] Respuesta recibida:", res.data)
      const resData = res.data || res
      const nuevaUrl = resData.imagen_url || resData.vineta?.imagen_url || resData.url

      console.log(">>> [PanelArtStudio] Nueva URL de viñeta recibida:", nuevaUrl)

      if (nuevaUrl) {
        console.log(">>> [PanelArtStudio] Fijando nueva imagen en Zustand:", nuevaUrl)
        const timestamp = Date.now()

        // Actualización directa e inmediata en el store global de Zustand
        setVinetaEstudio(claveActual, {
          imagen_url: nuevaUrl,
          descripcion: promptLimpio,
          plano: planoSeleccionado,
          prompt_usado: resData.prompt_usado || "",
          timestamp: timestamp
        })

        setNotificacionExito("¡Nueva variación generada y cargada en el lienzo!")
        setTimeout(() => setNotificacionExito(null), 3000)
        
        // PROHIBIDO llamar a onActualizar() aquí: provoca refetch destructivo en el padre.
      } else {
        console.warn(">>> [PanelArtStudio] No se encontró URL en la respuesta:", resData)
        throw new Error(resData?.detail || "No se recibió la URL de la imagen generada.")
      }
    } catch (err) {
      console.error(">>> [PanelArtStudio] Error al generar viñeta:", err)
      const data = err.response?.data
      const detalle = data?.detail || err.message || "Error al conectar con el motor de imagen."
      
      // Si el backend devolvió el prompt compilado a pesar del error (ej. 502), persistirlo en el visor para auditoría
      const promptEnviado = typeof detalle === 'object' ? detalle.prompt_usado : (data?.prompt_usado || "")
      if (promptEnviado) {
        setVinetaEstudio(claveActual, { prompt_usado: promptEnviado })
      }

      const msg = typeof detalle === 'object' ? (detalle.mensaje || detalle.detail || detalle.message || JSON.stringify(detalle)) : detalle
      setErrorMensaje(typeof msg === 'string' ? msg : JSON.stringify(msg))
      verificarEstadoMotor()
    } finally {
      setGenerando(false)
    }
  }

  // Guardar datos / vincular manualmente a la base de datos
  const handleGuardarVinetaBD = async () => {
    if (!projectId) return
    const promptLimpio = (descripcionVisual || "").trim()

    setGuardando(true)
    setErrorMensaje(null)

    try {
      const payload = {
        capitulo_num: capNum,
        pagina_num: pagNum,
        vineta_num: vinNum,
        imagen_url: imagenGenerada || undefined,
        prompt: promptLimpio || undefined,
        plano: planoSeleccionado || 'Plano medio',
        dialogo: (dialogoTexto || '').trim() || undefined
      }

      const res = await vinetasAPI.guardarVineta(projectId, payload)
      if (res.data?.exito) {
        setVinetaEstudio(claveActual, {
          imagen_url: imagenGenerada,
          descripcion: promptLimpio,
          plano: planoSeleccionado,
          dialogo: dialogoTexto
        })

        setNotificacionExito(`💾 Viñeta ${vinNum} (Pág. ${pagNum}) sincronizada en SQLite.`)
        setTimeout(() => setNotificacionExito(null), 3500)
        if (onActualizar) onActualizar()
      }
    } catch (err) {
      setErrorMensaje(err.response?.data?.detail || err.message || 'Error al guardar datos de la viñeta.')
    } finally {
      setGuardando(false)
    }
  }

  // Descargar imagen generada
  const handleDescargarImagen = () => {
    if (!imagenGenerada) return
    const a = document.createElement('a')
    a.href = obtenerUrlImagen(imagenGenerada)
    a.download = `${proyecto?.nombre || 'manga'}_cap${capNum}_pag${pagNum}_v${vinNum}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Borrar ilustración de la viñeta actual en BD, disco y estado global
  const handleBorrarIlustracionActual = async () => {
    if (!projectId || !capNum || !pagNum || !vinNum) return
    const confirmar = window.confirm(`¿Seguro que deseas eliminar la ilustración de la Viñeta ${vinNum} (Página ${pagNum}, Capítulo ${capNum})?`)
    if (!confirmar) return

    try {
      await vinetasAPI.borrarImagenVineta(projectId, capNum, pagNum, vinNum)
      removerImagenVineta(claveActual)
      setNotificacionExito(`🗑️ Ilustración de la Viñeta ${vinNum} eliminada correctamente.`)
      setTimeout(() => setNotificacionExito(null), 3500)
      if (onActualizar) onActualizar()
    } catch (err) {
      console.error('[PanelArtStudio] Error al borrar ilustración:', err)
      setErrorMensaje(err.response?.data?.detail || err.message || 'Error al eliminar la ilustración de la viñeta.')
    }
  }

  // Ratio config actual
  const ratioConfig = ASPECT_RATIOS.find(r => r.id === aspectRatioSeleccionado) || ASPECT_RATIOS[4]

  return (
    <div className="space-y-6">

      {/* ── Cabecera de la Herramienta Entintada ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.85)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)]">
        
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-amber-50 dark:bg-slate-800 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] flex-shrink-0">
            <MangaIcon name="imagenes_ia_generadas" size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-titulo text-lg font-black text-slate-900 dark:text-white leading-tight">
                Generador de Viñetas (Panel Art Studio)
              </h3>
              {presetActual ? (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full border border-purple-500 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold uppercase tracking-wider font-titulo flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>{presetActual.nombre}</span>
                </span>
              ) : (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full border border-slate-900 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-titulo">
                  Firma {modo}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
              Genera ilustraciones de viñetas encadenadas por capítulo y página con anclajes de personajes anti-alucinación (FLUX.1 Dev).
            </p>
          </div>
        </div>

        {/* Badges de Estado Rápido y Motor FLUX */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
          <button
            type="button"
            onClick={verificarEstadoMotor}
            disabled={verificandoMotor}
            className={`px-2.5 py-1 rounded-lg border-2 flex items-center gap-1.5 transition-colors cursor-pointer text-[11px] shadow-[1px_1px_0px_0px_rgba(0,0,0,0.85)] ${
              motorOnline === true
                ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                : motorOnline === false
                ? 'border-red-600 bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                : 'border-slate-400 bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}
            title="Haz clic para comprobar el estado de FreeLLMAPI en el puerto 31415"
          >
            <span className={`w-2 h-2 rounded-full ${
              motorOnline === true
                ? 'bg-emerald-500 animate-pulse'
                : motorOnline === false
                ? 'bg-red-500'
                : 'bg-slate-400'
            }`} />
            <span>
              {verificandoMotor
                ? 'Comprobando...'
                : motorOnline === true
                ? 'Motor Local: Conectado'
                : motorOnline === false
                ? 'Motor Local: Desconectado'
                : 'Comprobando Motor...'}
            </span>
          </button>

          <span className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            Cap. {capNum}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            Pág. {pagNum}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="px-2.5 py-1 rounded-lg border-2 border-slate-900 dark:border-purple-500 bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-200">
            Viñeta {vinNum}
          </span>
        </div>

      </div>

      {/* Alertas de Notificación de Éxito */}
      {notificacionExito && (
        <div className="p-3.5 rounded-xl border-2 text-xs font-bold flex items-center justify-between shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] animate-fade-in border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>{notificacionExito}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotificacionExito(null)}
            className="text-[11px] underline font-bold cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* ── ESTRUCTURA EN PANTALLA DIVIDIDA (3 COLUMNAS: PARÁMETROS 33% | LIENZO 42% | FILMSTRIP 25%) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* ── COLUMNA 1: PARÁMETROS Y PERSONAJES (33% -> 4 cols en grid de 12) ── */}
        <div className="col-span-12 lg:col-span-4 space-y-4">

          {/* 1. Selectores Encadenados (Capítulo -> Página -> Viñeta) */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border-2 border-slate-900 dark:border-slate-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.85)] space-y-3">
            
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="font-titulo text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-purple-600" />
                <span>Navegador de Escena</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {capitulos.length} Capítulos
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Selector de Capítulo */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 font-titulo">
                  Capítulo
                </label>
                <select
                  value={capNum}
                  onChange={(e) => {
                    const num = parsearNumeroSeguro(e.target.value, 1)
                    setCapituloSeleccionadoNum(num)
                    setPaginaSeleccionadaNum(1)
                    setVinetaSeleccionadaNum(1)
                  }}
                  className="w-full text-xs font-bold p-2 rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer font-mono"
                >
                  {capitulos.length > 0 ? (
                    capitulos.map(c => (
                      <option key={c.id || c.numero} value={c.numero}>
                        Cap. {c.numero}: {c.titulo || 'Sin título'}
                      </option>
                    ))
                  ) : (
                    <option value={1}>Capítulo 1</option>
                  )}
                </select>
              </div>

              {/* Selector de Página */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 font-titulo">
                  Página
                </label>
                <select
                  value={pagNum}
                  onChange={(e) => {
                    const num = parsearNumeroSeguro(e.target.value, 1)
                    setPaginaSeleccionadaNum(num)
                    setVinetaSeleccionadaNum(1)
                  }}
                  className="w-full text-xs font-bold p-2 rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer font-mono"
                >
                  {paginasDisponibles.map(pNum => (
                    <option key={pNum} value={pNum}>
                      Página {pNum}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selector de Viñetas tipo Chips */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 font-titulo flex items-center justify-between">
                <span>Viñeta de la Página {pagNum}</span>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                  Selecciona una viñeta
                </span>
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {vinetasDisponibles.map(vNum => {
                  const activa = vinNum === vNum
                  return (
                    <button
                      key={vNum}
                      type="button"
                      onClick={() => setVinetaSeleccionadaNum(vNum)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        activa
                          ? 'border-2 border-slate-900 dark:border-slate-500 bg-purple-600 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] scale-105'
                          : 'border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      Viñeta {vNum}
                    </button>
                  )
                })}
              </div>
            </div>

          </div>

          {/* 2. Ficha de la Viñeta Seleccionada */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border-2 border-slate-900 dark:border-slate-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.85)] space-y-3.5">
            
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="font-titulo text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-indigo-600" />
                <span>Parámetros de la Viñeta {vinNum}</span>
              </span>
            </div>

            {/* Plano de Cámara */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 font-titulo flex items-center gap-1">
                <span>Plano de Cámara / Encuadre</span>
              </label>
              <select
                value={planoSeleccionado}
                onChange={handlePlanoChange}
                className="w-full text-xs font-medium p-2 rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer font-titulo font-semibold"
              >
                {PLANOS_CAMARA.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Formato / Aspect Ratio */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 font-titulo flex items-center justify-between">
                <span>Relación de Aspecto de la Viñeta</span>
                <span className="text-[10px] font-mono text-slate-500">{ratioConfig.resolucion}</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {ASPECT_RATIOS.map(ar => (
                  <button
                    key={ar.id}
                    type="button"
                    onClick={() => handleAspectRatioChange(ar.id)}
                    className={`py-1.5 px-2 rounded-lg border text-center font-mono text-[11px] transition-all cursor-pointer ${
                      aspectRatioSeleccionado === ar.id
                        ? 'border-2 border-slate-900 bg-purple-600 text-white font-black shadow-[1px_1px_0px_0px_rgba(0,0,0,0.85)]'
                        : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium'
                    }`}
                  >
                    {ar.id}
                  </button>
                ))}
              </div>
            </div>

            {/* Descripción de Escena (Prompt Visual) */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 font-titulo flex items-center justify-between">
                <span>Descripción Visual de la Escena</span>
                <span className="text-[10px] text-red-500">* Obligatorio</span>
              </label>
              <textarea
                rows={3}
                value={descripcionVisual}
                onChange={handleDescripcionChange}
                placeholder="Ej: Kaelen desenvaina su espada mientras una ráfaga de fuego ilumina las ruinas ancestrales..."
                className="w-full text-xs font-medium p-2.5 rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500 leading-relaxed"
              />
            </div>

            {/* Diálogo / Narración (Referencia) */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 font-titulo flex items-center justify-between">
                <span>Diálogo / Texto de Narración (Referencia)</span>
                <span className="text-[10px] text-slate-400">Opcional</span>
              </label>
              <input
                type="text"
                value={dialogoTexto}
                onChange={handleDialogoChange}
                placeholder="Ej: '¡No permitiré que destruyas este lugar!'"
                className="w-full text-xs font-medium p-2 rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

          </div>

          {/* 3. Módulo de Coherencia de Personajes (Anti-Alucinación) */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border-2 border-slate-900 dark:border-slate-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.85)] space-y-3">
            
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-600" />
                <span className="font-titulo text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Personajes en Escena (Anti-Alucinación)
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold font-mono">
                {personajesSeleccionados.length} activos
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              Marca los personajes presentes en esta viñeta para anclar automáticamente sus rasgos físicos y vestimenta en el prompt.
            </p>

            {personajes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                {personajes.map(p => {
                  const seleccionado = personajesSeleccionados.includes(p.id)
                  const avatarSrc = p.avatar_url ? obtenerUrlImagen(p.avatar_url) : getDefaultAvatar(p.rol)

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleTogglePersonaje(p.id)}
                      className={`p-2 rounded-xl border-2 flex items-center gap-2 text-left transition-all cursor-pointer ${
                        seleccionado
                          ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/50 shadow-[2px_2px_0px_0px_rgba(147,51,234,0.85)]'
                          : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 opacity-75'
                      }`}
                    >
                      <img
                        src={avatarSrc}
                        alt={p.nombre}
                        className="w-8 h-8 rounded-lg object-cover border border-slate-900 flex-shrink-0"
                        onError={(e) => {
                          e.target.onerror = null
                          e.target.src = getDefaultAvatar(p.rol)
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-titulo font-black text-slate-900 dark:text-white truncate">
                          {p.nombre}
                        </p>
                        <p className="text-[10px] text-slate-500 capitalize truncate">
                          {p.rol}
                        </p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        seleccionado
                          ? 'border-purple-600 bg-purple-600 text-white'
                          : 'border-slate-400'
                      }`}>
                        {seleccionado && <span className="text-[9px] font-bold">✓</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="p-3 text-center rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500">
                Aún no hay personajes creados. Ve a la herramienta 'Personajes' para dar de alta al elenco.
              </div>
            )}

          </div>

        </div>

        {/* ── COLUMNA 2: VISOR CENTRAL DE LA VIÑETA ACTIVA (42% -> 5 cols en grid de 12) ── */}
        <div className="col-span-12 lg:col-span-5 space-y-4">

          {/* Lienzo Contenedor de la Viñeta */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border-2 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.85)] space-y-4">
            
            {/* Cabecera del Lienzo */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-manga text-xl text-purple-600 dark:text-purple-400">
                  Viñeta #{vinNum}
                </span>
                <span className="text-xs text-slate-500 font-titulo">
                  (Cap. {capNum} · Pág. {pagNum})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold font-titulo text-slate-700 dark:text-slate-300">
                  {planoSeleccionado}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-slate-700 dark:text-slate-300">
                  {aspectRatioSeleccionado}
                </span>
                {imagenGenerada && (
                  <button
                    type="button"
                    onClick={() => setLightboxAbierto(true)}
                    className="p-1.5 rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] cursor-pointer"
                    title="Ver en pantalla completa"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Visor de Imagen / Canvas en Aspect Ratio Exacto */}
            <div className="w-full flex items-center justify-center p-2 bg-slate-100 dark:bg-slate-950 rounded-xl border-2 border-slate-900/40">
              <div className={`w-full max-w-[620px] ${ratioConfig.aspectClass} rounded-xl overflow-hidden border-2 border-slate-900 bg-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.85)] relative flex items-center justify-center`}>
                
                {generando ? (
                  <div className="w-full h-full min-h-[420px] flex flex-col items-center justify-center bg-slate-900/60 border-2 border-dashed border-purple-500/50 rounded-xl p-6 text-center">
                    <span className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></span>
                    <p className="text-white font-bold text-base">Sintetizando escena con FLUX.1 Dev...</p>
                    <p className="text-slate-400 text-xs mt-1">Inyectando Firma Visual y coherencia de personajes</p>
                  </div>
                ) : imagenGenerada ? (
                  <div 
                    key={`container_${renderKey}`}
                    className="relative w-full h-full min-h-[460px] flex items-center justify-center bg-slate-950 rounded-xl overflow-hidden border-2 border-slate-800 shadow-2xl"
                  >
                    <img 
                      key={`img_${imagenGenerada}_${renderKey}`}
                      src={`${obtenerUrlImagen(imagenGenerada)}?t=${renderKey}`} 
                      alt={`Ilustración Viñeta ${vinNum}`}
                      className="max-h-[560px] w-auto object-contain rounded-lg shadow-md animate-fadeIn"
                    />
                    <div className="absolute bottom-3 right-3 flex gap-2">
                      <button
                        type="button"
                        onClick={handleBorrarIlustracionActual}
                        className="px-3 py-1.5 rounded bg-red-950/90 hover:bg-red-800 text-red-200 text-xs border border-red-700/80 flex items-center gap-1 shadow-lg transition cursor-pointer"
                        title="Borrar ilustración de esta viñeta"
                      >
                        🗑️ Limpiar
                      </button>
                      <a 
                        href={obtenerUrlImagen(imagenGenerada)} 
                        download={`cap${capNum}_p${pagNum}_v${vinNum}.png`} 
                        className="px-3 py-1.5 rounded bg-slate-900/90 hover:bg-slate-800 text-white text-xs border border-slate-700 flex items-center gap-1 shadow-lg"
                      >
                        📥 Descargar PNG
                      </a>
                    </div>
                  </div>
                ) : (
                  <LienzoVacio/>
                )}

              </div>
            </div>

            {/* Visor de Auditoría: PROMPT MAESTRO INYECTADO EN FLUX.1 DEV */}
            {promptUsado && (
              <div className="p-3.5 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-slate-950 text-slate-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] space-y-2">
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                  <span className="font-bold font-titulo uppercase text-[10px] sm:text-xs text-purple-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                    <span>PROMPT MAESTRO INYECTADO EN FLUX.1 DEV:</span>
                  </span>
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded border font-bold ${
                    promptUsado.length <= 1800
                      ? 'border-emerald-500/50 bg-emerald-950/60 text-emerald-400'
                      : 'border-red-500/50 bg-red-950/60 text-red-400'
                  }`}>
                    {promptUsado.length} / 1800 chars
                  </span>
                </div>
                <p className="text-xs font-mono leading-relaxed text-slate-300 break-words max-h-32 overflow-y-auto pr-1">
                  {promptUsado}
                </p>
              </div>
            )}

            {/* Renderizado Visible de Alertas de Error */}
            {errorMensaje && (
              <div className="mb-3 p-3 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-xs flex justify-between items-center animate-fade-in shadow-[2px_2px_0px_0px_rgba(220,38,38,0.85)]">
                <span>⚠️ {errorMensaje}</span>
                <button
                  type="button"
                  onClick={() => setErrorMensaje(null)}
                  className="font-bold underline ml-2 cursor-pointer hover:text-white"
                >
                  Cerrar
                </button>
              </div>
            )}

            {/* Aviso de Motor FLUX Desconectado */}
            {motorOnline === false && (
              <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-300 text-xs flex items-center justify-between shadow-[2px_2px_0px_0px_rgba(245,158,11,0.5)]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                  <span><strong>Motor FLUX.1 no detectado:</strong> El servicio FreeLLMAPI en el puerto 31415 no responde. Asegúrate de iniciarlo antes de solicitar la síntesis.</span>
                </div>
                <button
                  type="button"
                  onClick={verificarEstadoMotor}
                  className="ml-3 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[10px] cursor-pointer whitespace-nowrap"
                >
                  Reintentar
                </button>
              </div>
            )}

            {/* Botonera de Acción Principal */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerarVineta}
                  disabled={generando}
                  className="py-3 px-5 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-titulo font-black text-xs shadow-[3px_3px_0px_0px_rgba(15,23,42,0.9)] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {generando ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sintetizando viñeta con FLUX.1...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>{imagenGenerada ? '[🔄 Regenerar Variación con FLUX.1]' : '[✨ Generar Ilustración de Viñeta con FLUX.1]'}</span>
                    </>
                  )}
                </button>

                {imagenGenerada && (
                  <button
                    type="button"
                    onClick={handleGuardarVinetaBD}
                    disabled={guardando}
                    className="py-3 px-4 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-emerald-600 hover:bg-emerald-500 text-white font-titulo font-black text-xs shadow-[3px_3px_0px_0px_rgba(15,23,42,0.9)] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Sincronizar y vincular los metadatos en la tabla vinetas y guion_json"
                  >
                    <Save className="w-4 h-4" />
                    <span>{guardando ? 'Guardando...' : '[💾 Guardar en BD]'}</span>
                  </button>
                )}
              </div>

              {imagenGenerada && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleBorrarIlustracionActual}
                    className="px-3 py-2 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-bold flex items-center gap-1.5 transition shadow"
                    title="Borrar ilustración de esta viñeta"
                  >
                    🗑️ Limpiar Viñeta
                  </button>
                  <button
                    type="button"
                    onClick={handleDescargarImagen}
                    className="py-3 px-4 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 font-titulo font-bold text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>[📥 Descargar PNG]</span>
                  </button>
                </div>
              )}

            </div>

          </div>

        </div>

        {/* ── COLUMNA 3: DOCK DE PRODUCCIÓN / TIRA DE VIÑETAS (25% -> 3 cols en lg:grid-cols-12) ── */}
        <div className="col-span-12 lg:col-span-3 space-y-4 lg:sticky lg:top-4">
          <ChapterFilmstrip
            proyecto={proyecto}
            capituloNum={capNum}
            paginaActivaNum={pagNum}
            vinetaActivaNum={vinNum}
            capitulos={capitulos}
            onSeleccionarVineta={(pNum, vNum) => {
              setPaginaSeleccionadaNum(pNum)
              setVinetaSeleccionadaNum(vNum)
            }}
            onMaquetarPagina={(pNum) => {
              if (proyecto?.id) {
                navigate(`/editor/${proyecto.id}?tab=vinetas&cap=${capNum}&pag=${pNum}`)
              }
            }}
          />
        </div>

      </div>

      {/* ── Modal Lightbox Pantalla Completa ── */}
      {lightboxAbierto && imagenGenerada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in"
          onClick={() => setLightboxAbierto(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-2 bg-slate-900 border-2 border-slate-700 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightboxAbierto(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-slate-950/80 border border-slate-700 text-white hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              key={`lightbox_${imagenGenerada}_${renderKey}`}
              src={`${obtenerUrlImagen(imagenGenerada)}?t=${renderKey}`}
              alt="Viñeta HD"
              className="max-h-[85vh] w-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}

    </div>
  )
}
