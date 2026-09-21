// FirmaVisual.jsx
// Herramienta completa de Firma Visual de MEP — Manga Editor Pro.
// Gestiona los 3 modos de creación: Creación Propia, Legendario y Aleatorio,
// e incluye el Generador de Portada Oficial del Cómic con inyección visual.

import { useState, useEffect, useRef } from 'react'
import {
  Sparkles,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Upload,
  RefreshCw,
  Dices,
  Eye,
  Sliders,
  Palette,
  Feather,
  Layers,
  FileCode,
  ShieldCheck,
  Plus,
  Image,
  Download,
  Star,
  RotateCcw,
  BookOpen
} from 'lucide-react'
import useProjectStore from '../store/projectStore'
import { projectsAPI, obtenerUrlImagen } from '../services/api'
import { LEGENDARY_STYLES } from '../data/stylePresets'
import MangaIcon from './common/MangaIcon'
import Spinner from './UI/Spinner'
import MoodboardModal from './MoodboardModal'

export default function FirmaVisual({ proyecto, onActualizar }) {
  const { cargarProyecto, actualizarPortada, actualizarProyecto } = useProjectStore()
  const projectId = proyecto?.id

  const modo = proyecto?.modo_creacion || 'propio'
  const isLocked = Boolean(proyecto?.style_locked)

  // Estado para el modal de Moodboard de Referencias Canónicas
  const [mostrarMoodboard, setMostrarMoodboard] = useState(false)

  // Estados locales de Firma Visual
  const [cargando, setCargando] = useState(false)
  const [analizando, setAnalizando] = useState(false)
  const [bloqueando, setBloqueando] = useState(false)
  const [sorteando, setSorteando] = useState(false)
  const [error, setError] = useState(null)
  const [mensajeExito, setMensajeExito] = useState(null)

  // Datos de firma visual del proyecto
  const [imagenesReferencia, setImagenesReferencia] = useState([])
  const [diagnostico, setDiagnostico] = useState({
    tipo_trazo: '',
    tratamiento_sombras: '',
    paleta_cromatica: [],
    style_prompt: ''
  })
  const [presetInfo, setPresetInfo] = useState(null)

  // Drag & drop
  const [arrastrando, setArrastrando] = useState(false)
  const [subiendoArchivos, setSubiendoArchivos] = useState(false)
  const fileInputRef = useRef(null)
  const [colorHexNuevo, setColorHexNuevo] = useState('#6366F1')

  // Estados para Generador de Portada Oficial
  const [aspectRatio, setAspectRatio] = useState('3:4')
  const [promptPortada, setPromptPortada] = useState('')
  const [portadaGenerada, setPortadaGenerada] = useState(proyecto?.portada_url || null)
  const [generandoPortada, setGenerandoPortada] = useState(false)
  const [guardandoPortada, setGuardandoPortada] = useState(false)
  const [errorPortada, setErrorPortada] = useState(null)
  const [notificacionExito, setNotificacionExito] = useState(null)

  // Sincronizar portadaGenerada cuando el proyecto externo cambie o se hidrate
  useEffect(() => {
    if (proyecto?.portada_url) {
      setPortadaGenerada(proyecto.portada_url)
    }
  }, [proyecto?.portada_url])

  // Preset legendario actual según ID
  const presetActual = presetInfo || LEGENDARY_STYLES.find(s => s.id === proyecto?.estilo_legendario?.replace('aleatorio_', ''))

  // Construir prompt de portada sugerido basado en sinopsis y firma visual
  const construirPromptSugerido = () => {
    const sinopsisTexto = proyecto?.sinopsis || proyecto?.premisa || `Historia épica de ${proyecto?.nombre || 'manga'}`
    const estiloTexto = diagnostico.style_prompt || proyecto?.system_prompt_maestro || presetActual?.prompt_imagen || 'manga style, masterpiece ink lines, screentone shading, high contrast'
    return `Portada de impacto para cómic: ${sinopsisTexto}. ${estiloTexto}, masterpiece cover art, dynamic composition, title text space`
  }


  // Cargar estado de la firma visual
  const cargarEstadoFirma = async () => {
    if (!projectId) return
    setCargando(true)
    setError(null)
    try {
      const res = await projectsAPI.obtenerFirmaVisual(projectId)
      const data = res?.data
      if (data) {
        setImagenesReferencia(data.imagenes_referencia || [])
        
        const rawDiag = data.firma_visual_extraida || {}
        const estiloCompilado = rawDiag.style_prompt || data.style_prompt || data.system_prompt_maestro || ''
        setDiagnostico({
          tipo_trazo: rawDiag.tipo_trazo || data.tecnica_linea || '',
          tratamiento_sombras: rawDiag.tratamiento_sombras || data.estilo_sombreado || '',
          paleta_cromatica: rawDiag.paleta_cromatica || data.paleta_colores || [],
          style_prompt: estiloCompilado
        })

        if (data.preset_info) {
          setPresetInfo(data.preset_info)
        } else if (data.estilo_legendario) {
          const cleanId = data.estilo_legendario.replace('aleatorio_', '')
          const found = LEGENDARY_STYLES.find(s => s.id === cleanId)
          if (found) setPresetInfo(found)
        }

        if (proyecto?.portada_url) {
          setPortadaGenerada(proyecto.portada_url)
        }
      }
    } catch (err) {
      console.error('Error al cargar firma visual:', err)
      setError(err.response?.data?.detail || 'No se pudo cargar la firma visual del proyecto')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarEstadoFirma()
  }, [projectId])

  // Inicializar prompt de portada si está vacío
  useEffect(() => {
    if (!promptPortada) {
      setPromptPortada(construirPromptSugerido())
    }
  }, [proyecto?.sinopsis, proyecto?.premisa, diagnostico.style_prompt, presetActual])

  // Subir archivos de referencia (Drag & Drop o input file)
  const handleProcesarArchivos = async (archivos) => {
    if (isLocked) {
      setError('El estilo está bloqueado. No se pueden añadir más referencias.')
      return
    }

    const validos = Array.from(archivos).filter(f =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
    )

    if (validos.length === 0) {
      setError('Solo se admiten formatos de imagen válidos: JPG, PNG o WebP.')
      return
    }

    if (imagenesReferencia.length + validos.length > 10) {
      setError(`Máximo 10 imágenes permitidas. Actualmente tienes ${imagenesReferencia.length}.`)
      return
    }

    setError(null)
    setSubiendoArchivos(true)

    try {
      const formData = new FormData()
      validos.forEach(file => {
        formData.append('imagenes', file)
      })

      const res = await projectsAPI.subirReferenciasFirma(projectId, formData)
      if (res?.data?.exito) {
        setImagenesReferencia(res.data.imagenes_referencia || [])
        setMensajeExito(`${validos.length} imagen(es) subida(s) correctamente.`)
        setTimeout(() => setMensajeExito(null), 4000)
        if (onActualizar) onActualizar()
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al subir las imágenes de referencia.'
      setError(msg)
    } finally {
      setSubiendoArchivos(false)
    }
  }

  // Analizar y extraer firma visual con IA
  const handleAnalizarFirma = async () => {
    if (!projectId) return
    if (imagenesReferencia.length === 0) {
      setError('Sube al menos 1 imagen de referencia para analizar el estilo.')
      return
    }

    setAnalizando(true)
    setError(null)
    setMensajeExito(null)

    try {
      const res = await projectsAPI.analizarFirmaVisual(projectId)
      if (res?.data?.exito && res.data.diagnostico) {
        const diag = res.data.diagnostico
        setDiagnostico({
          tipo_trazo: diag.tipo_trazo || '',
          tratamiento_sombras: diag.tratamiento_sombras || '',
          paleta_cromatica: diag.paleta_cromatica || [],
          style_prompt: diag.style_prompt || ''
        })
        setMensajeExito('¡Firma visual analizada y extraída con éxito! Revisa los parámetros y fíjala cuando estés listo.')
        setTimeout(() => setMensajeExito(null), 6000)
        await cargarProyecto(projectId)
        if (onActualizar) onActualizar()
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al analizar la firma visual con IA.'
      setError(msg)
    } finally {
      setAnalizando(false)
    }
  }

  // Guardar y Bloquear Firma Visual
  const handleFijarYBloquear = async () => {
    if (!projectId) return
    if (!diagnostico.style_prompt) {
      setError('Debes tener un prompt de estilo antes de fijar y bloquear la firma visual.')
      return
    }

    setBloqueando(true)
    setError(null)

    try {
      const payload = {
        tipo_trazo: diagnostico.tipo_trazo,
        tratamiento_sombras: diagnostico.tratamiento_sombras,
        paleta_cromatica: diagnostico.paleta_cromatica,
        style_prompt: diagnostico.style_prompt,
        firma_visual_extraida: diagnostico,
        style_locked: true
      }

      const res = await projectsAPI.actualizarFirmaVisual(projectId, payload)
      if (res?.data?.exito) {
        setMensajeExito('🔒 ¡Firma Visual fijada y bloqueada como definitiva para este proyecto!')
        await cargarProyecto(projectId)
        await cargarEstadoFirma()
        if (onActualizar) onActualizar()
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al fijar y bloquear la firma visual.'
      setError(msg)
    } finally {
      setBloqueando(false)
    }
  }

  // Re-sortear estilo aleatorio (Modo Aleatorio)
  const handleSortearOtroEstilo = async () => {
    if (!projectId) return
    if (isLocked) {
      setError('El estilo ya está bloqueado y no puede modificarse.')
      return
    }

    setSorteando(true)
    setError(null)

    try {
      const res = await projectsAPI.sortearEstiloAleatorio(projectId)
      if (res?.data?.exito) {
        setPresetInfo(res.data.preset_info)
        const diag = res.data.diagnostico || {}
        setDiagnostico({
          tipo_trazo: diag.tipo_trazo || '',
          tratamiento_sombras: diag.tratamiento_sombras || '',
          paleta_cromatica: diag.paleta_cromatica || [],
          style_prompt: res.data.style_prompt || ''
        })
        setMensajeExito(`🎲 Nuevo universo gráfico sorteado: ${res.data.preset_info?.nombre || 'Estilo'}`)
        setTimeout(() => setMensajeExito(null), 4000)
        await cargarProyecto(projectId)
        if (onActualizar) onActualizar()
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al sortear estilo aleatorio.'
      setError(msg)
    } finally {
      setSorteando(false)
    }
  }

  // Limpiar todas las referencias
  const handleEliminarReferencias = async () => {
    if (isLocked) {
      setError('El estilo está bloqueado. No se pueden eliminar las referencias.')
      return
    }
    if (!window.confirm('¿Seguro que deseas eliminar todas las imágenes de referencia y reiniciar el análisis?')) {
      return
    }

    try {
      await projectsAPI.eliminarReferenciasFirma(projectId)
      setImagenesReferencia([])
      setDiagnostico({
        tipo_trazo: '',
        tratamiento_sombras: '',
        paleta_cromatica: [],
        style_prompt: ''
      })
      setMensajeExito('Referencias eliminadas correctamente.')
      setTimeout(() => setMensajeExito(null), 3000)
      await cargarProyecto(projectId)
      if (onActualizar) onActualizar()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al eliminar referencias.')
    }
  }

  // Añadir color a paleta
  const handleAgregarColor = () => {
    if (!colorHexNuevo || diagnostico.paleta_cromatica.includes(colorHexNuevo)) return
    setDiagnostico(prev => ({
      ...prev,
      paleta_cromatica: [...prev.paleta_cromatica, colorHexNuevo]
    }))
  }

  // Eliminar color de paleta
  const handleRemoverColor = (colorHex) => {
    if (isLocked) return
    setDiagnostico(prev => ({
      ...prev,
      paleta_cromatica: prev.paleta_cromatica.filter(c => c !== colorHex)
    }))
  }

  // ── GENERADOR DE PORTADA OFICIAL ──
  const handleGenerarPortada = async () => {
    if (!projectId) return
    const promptFinal = promptPortada.trim() || construirPromptSugerido()
    setGenerandoPortada(true)
    setErrorPortada(null)
    setError(null)
    setMensajeExito(null)

    try {
      const res = await projectsAPI.generarPortada(projectId, {
        prompt: promptFinal,
        aspect_ratio: aspectRatio
      })
      const data = res?.data || res
      if (data?.exito && (data.portada_url || data.imagen_url)) {
        const urlNueva = data.portada_url || data.imagen_url
        setPortadaGenerada(urlNueva)
        setMensajeExito('✨ ¡Portada oficial generada con alta resolución aplicando tu Firma Visual!')
        setTimeout(() => setMensajeExito(null), 5000)
      }
    } catch (err) {
      console.error('Error al generar portada:', err)
      const msg = err.response?.data?.detail || err.message || 'Error de conexión con el motor de imagen.'
      setErrorPortada(msg)
      setError(msg)
    } finally {
      setGenerandoPortada(false)
    }
  }


  const handleAdoptarPortada = async (e) => {
    if (e) e.preventDefault()
    if (!projectId || !portadaGenerada) return
    try {
      setGuardandoPortada(true)
      setErrorPortada(null)
      const res = await projectsAPI.actualizar(proyecto.id, {
        portada_url: portadaGenerada
      })
      const proyectoActualizado = res?.data || res
      actualizarProyecto(proyectoActualizado) // Actualiza el store global de Zustand
      await actualizarPortada(proyecto.id, portadaGenerada)
      setNotificacionExito('¡Portada oficial adoptada y fijada en el proyecto!')
      setTimeout(() => setNotificacionExito(null), 4000)
      if (onActualizar) onActualizar(proyectoActualizado)
    } catch (err) {
      console.error('Error al adoptar portada:', err)
      setErrorPortada('No se pudo guardar la portada en la base de datos.')
    } finally {
      setGuardandoPortada(false)
    }
  }

  const handleDescargarPortada = () => {
    if (!portadaGenerada) return
    const srcUrl = obtenerUrlImagen(portadaGenerada)
    const a = document.createElement('a')
    a.href = srcUrl
    a.download = `${proyecto?.nombre?.replace(/\s+/g, '_') || 'manga'}_portada.png`
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }


  if (cargando) {
    return (
      <div className="py-12 text-center">
        <Spinner texto="Cargando configuración de Firma Visual..." size="md" />
      </div>
    )
  }

  // Aspect ratio helper classes
  const aspectClasses = {
    '3:4': 'aspect-[3/4] max-w-[280px]',
    '2:3': 'aspect-[2/3] max-w-[260px]',
    '9:16': 'aspect-[9/16] max-w-[230px]',
    '1:1': 'aspect-square max-w-[280px]'
  }

  return (
    <div className="space-y-6">

      {/* ── Cabecera de Estado y Badges ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.85)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-amber-50 dark:bg-slate-800 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)]">
            <MangaIcon name="firma_visual" size={28} />
          </div>
          <div>
            <h3 className="font-titulo text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>Firma Visual del Cómic</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full border border-slate-900 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Modo {modo}
              </span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              {modo === 'propio' && 'Calibra y extrae el estilo de tus muestras artísticas con visión por IA.'}
              {modo === 'legendario' && 'Estilo legendario maestro calibrado y listo para generación.'}
              {modo === 'aleatorio' && 'Universo visual sorteado con parámetros y directrices gráficas únicas.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMostrarMoodboard(true)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-indigo-600 hover:bg-indigo-500 text-white font-titulo font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            title="Abrir Moodboard con fichas canónicas y referencias de estilo"
          >
            <Image className="w-4 h-4 text-indigo-200" />
            <span>[🖼️ Ver Referencias Visuales del Estilo]</span>
          </button>

          {isLocked ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border-2 border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-titulo font-bold text-xs shadow-[2px_2px_0px_0px_rgba(16,185,129,0.85)]">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>✔ Firma Visual Calibrada y Bloqueada</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-titulo font-bold text-xs shadow-[2px_2px_0px_0px_rgba(245,158,11,0.85)]">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Pendiente de Calibración / Edición</span>
            </div>
          )}
        </div>
      </div>

      {/* Alertas de Error y Éxito */}
      {error && (
        <div className="p-4 rounded-xl border-2 border-red-600 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm font-semibold flex items-center justify-between shadow-[2px_2px_0px_0px_rgba(220,38,38,0.85)]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs underline font-bold cursor-pointer">Cerrar</button>
        </div>
      )}

      {mensajeExito && (
        <div className="p-4 rounded-xl border-2 border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-sm font-semibold flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(16,185,129,0.85)]">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {/* ── MODO 1: CREACIÓN PROPIA ── */}
      {modo === 'propio' && (
        <div className="space-y-6">

          {/* 1. Zona Drag & Drop Multi-Imagen */}
          <div className="p-5 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.85)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="font-titulo text-base font-black text-slate-900 dark:text-white">
                  Muestras de Referencia Artística
                </h4>
              </div>
              <span className="font-mono text-xs font-bold px-3 py-1 rounded-full border-2 border-slate-900 dark:border-slate-700 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)]">
                {imagenesReferencia.length} / 10 imágenes subidas
              </span>
            </div>

            {/* Dropzone interactiva */}
            {!isLocked && (
              <div
                onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }}
                onDragLeave={() => setArrastrando(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setArrastrando(false)
                  handleProcesarArchivos(e.dataTransfer.files)
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  arrastrando
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 scale-[1.01]'
                    : 'border-slate-400 hover:border-slate-900 dark:border-slate-600 dark:hover:border-slate-300 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={(e) => handleProcesarArchivos(e.target.files)}
                  className="hidden"
                  disabled={subiendoArchivos}
                />
                <div className="w-12 h-12 mx-auto mb-2 rounded-xl border-2 border-slate-900 bg-indigo-100 dark:bg-slate-700 flex items-center justify-center text-indigo-700 dark:text-indigo-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)]">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="font-titulo text-sm font-bold text-slate-900 dark:text-white">
                  Arrastra aquí tus imágenes o haz clic para seleccionarlas
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Formatos admitidos: JPG, PNG, WebP (hasta 10 MB por archivo)
                </p>
                {subiendoArchivos && (
                  <div className="mt-3 flex items-center justify-center gap-2 text-indigo-600 font-bold text-xs">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Subiendo y procesando imágenes...</span>
                  </div>
                )}
              </div>
            )}

            {/* Grid de Miniaturas */}
            {imagenesReferencia.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider font-titulo">
                    Muestras en el Servidor
                  </span>
                  {!isLocked && (
                    <button
                      onClick={handleEliminarReferencias}
                      className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Limpiar todas</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {imagenesReferencia.map((ruta, idx) => {
                    const srcUrl = obtenerUrlImagen(ruta)
                    return (
                      <div
                        key={idx}
                        className="group relative aspect-square rounded-xl overflow-hidden border-2 border-slate-900 dark:border-slate-700 bg-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)]"
                      >
                        <img
                          src={srcUrl}
                          alt={`Referencia ${idx + 1}`}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          onError={(e) => {
                            e.target.src = '/assets/subir_portada.png'
                          }}
                        />

                        <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-[10px] font-mono font-bold text-white bg-slate-900/80 px-2 py-1 rounded-md">
                            Muestra #{idx + 1}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Botón de Acción Principal: Analizar con IA */}
            {!isLocked && (
              <div className="pt-2">
                <button
                  onClick={handleAnalizarFirma}
                  disabled={analizando || imagenesReferencia.length === 0}
                  className="w-full py-3.5 px-4 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-titulo font-black text-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,0.85)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {analizando ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Analizando y Extrayendo Firma con Gemini Vision...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-amber-300" />
                      <span>🎨 Analizar y Extraer Firma Visual con IA ({imagenesReferencia.length} muestras)</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* 2. Ficha de Diagnóstico de Estilo Generada */}
          {(diagnostico.style_prompt || diagnostico.tipo_trazo || isLocked) && (
            <div className="p-5 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.85)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)] space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h4 className="font-titulo text-base font-black text-slate-900 dark:text-white">
                    Diagnóstico Técnico y Calibración de Firma
                  </h4>
                </div>
                {isLocked ? (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-titulo">
                    <Lock className="w-3.5 h-3.5" /> Bloqueado Definitivo
                  </span>
                ) : (
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 font-titulo">
                    <Unlock className="w-3.5 h-3.5" /> Edición Habilitada
                  </span>
                )}
              </div>

              {/* Parámetro 1: Tipo de trazo y plumilla */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-titulo flex items-center gap-1.5">
                  <Feather className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span>1. Tipo de Trazo y Plumilla (Grosor, Firmeza y Acabado)</span>
                </label>
                <input
                  type="text"
                  value={diagnostico.tipo_trazo}
                  onChange={(e) => setDiagnostico({ ...diagnostico, tipo_trazo: e.target.value })}
                  disabled={isLocked}
                  placeholder="Ej: Trazo entintado con plumilla G-Pen de grosor dinámico y líneas cinéticas"
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-75"
                />
              </div>

              {/* Parámetro 2: Tratamiento de sombras y tramas */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-titulo flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span>2. Tratamiento de Sombras y Tramas (Screentone, Cross-hatching o Pleno)</span>
                </label>
                <input
                  type="text"
                  value={diagnostico.tratamiento_sombras}
                  onChange={(e) => setDiagnostico({ ...diagnostico, tratamiento_sombras: e.target.value })}
                  disabled={isLocked}
                  placeholder="Ej: Tramado punteado screentone de 60 líneas con sombreado cruzado manual"
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-75"
                />
              </div>

              {/* Parámetro 3: Paleta cromática dominante */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-titulo flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span>3. Paleta Cromática Dominante</span>
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {diagnostico.paleta_cromatica.map((color, cIdx) => (
                    <div
                      key={cIdx}
                      className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)]"
                    >
                      <div
                        className="w-4 h-4 rounded-full border border-slate-900 flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {color}
                      </span>
                      {!isLocked && (
                        <button
                          onClick={() => handleRemoverColor(color)}
                          className="text-slate-400 hover:text-red-500 ml-1 text-xs font-bold cursor-pointer"
                          title="Eliminar color"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}

                  {!isLocked && (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={colorHexNuevo}
                        onChange={(e) => setColorHexNuevo(e.target.value)}
                        className="w-8 h-8 rounded-lg border-2 border-slate-900 cursor-pointer p-0 bg-transparent"
                      />
                      <button
                        onClick={handleAgregarColor}
                        className="px-2.5 py-1 rounded-lg border-2 border-slate-900 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-titulo font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Añadir
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Parámetro 4: Prompt maestro de inyección visual (style_prompt) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-titulo flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>4. Prompt Maestro de Inyección Visual (Compilado para Viñetas)</span>
                </label>
                <textarea
                  value={diagnostico.style_prompt}
                  onChange={(e) => setDiagnostico({ ...diagnostico, style_prompt: e.target.value })}
                  disabled={isLocked}
                  rows={4}
                  placeholder="System prompt de estilo visual en inglés para el motor de generación..."
                  className="w-full text-xs font-mono font-medium p-3 rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed disabled:opacity-75"
                />
              </div>

              {/* Botón de Fijar y Bloquear */}
              {!isLocked && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
                  <button
                    onClick={handleFijarYBloquear}
                    disabled={bloqueando || !diagnostico.style_prompt}
                    className="py-3 px-6 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-emerald-600 hover:bg-emerald-500 text-white font-titulo font-black text-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,0.85)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bloqueando ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Fijando y Bloqueando...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>[🔒 Fijar y Bloquear Firma Visual]</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ── MODO 2: LEGENDARIO ── */}
      {modo === 'legendario' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.85)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)] space-y-6">
            
            {/* Ficha Principal del Estilo Oficial */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-amber-50/60 dark:bg-slate-800/60 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)]">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-900 bg-white flex-shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] flex items-center justify-center p-2">
                <img
                  src={presetActual?.icon || `/assets/legendary_styles/${proyecto?.estilo_legendario}.png`}
                  alt={presetActual?.name || 'Estilo'}
                  className="w-full h-full object-contain"
                  onError={(e) => { e.target.src = '/assets/legendary_styles/shonen_legendario.png' }}
                />
              </div>

              <div className="flex-1 text-center sm:text-left space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="text-xs px-2.5 py-0.5 rounded-full border border-slate-900 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 font-bold uppercase tracking-wider font-titulo">
                    Escuela {presetActual?.school || 'Manga'}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full border border-emerald-700 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 font-bold font-titulo flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Calibrado de Fábrica
                  </span>
                </div>

                <h3 className="text-2xl font-black font-titulo text-slate-900 dark:text-white">
                  {presetActual?.name || proyecto?.estilo_legendario?.replace(/_/g, ' ')}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-snug">
                  {presetActual?.subtitle || 'Estilo legendario maestro con calibración de tinta, tramas y prompts optimizados.'}
                </p>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMostrarMoodboard(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-titulo font-bold text-xs text-slate-900 dark:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                  >
                    <Image className="w-3.5 h-3.5 text-indigo-500" />
                    <span>🖼️ Explorar Láminas y Fichas Canónicas</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Desglose Técnico de la Firma */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Técnica de tinta */}
              <div className="p-4 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] space-y-1">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-titulo font-bold text-xs uppercase tracking-wider">
                  <Feather className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Técnica de Tinta y Plumilla</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                  {presetActual?.tecnica_linea || 'Líneas dinámicas de alta energía entintadas con plumilla G-Pen.'}
                </p>
              </div>

              {/* Tramado y sombras */}
              <div className="p-4 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] space-y-1">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-titulo font-bold text-xs uppercase tracking-wider">
                  <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Tramado y Tratamiento de Sombras</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                  {presetActual?.estilo_sombreado || 'Tramado screentone contrastado con negro pleno y cross-hatching.'}
                </p>
              </div>

            </div>

            {/* Paleta sugerida */}
            {presetActual?.paleta_colores && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-titulo flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span>Paleta Cromática Calibrada</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {presetActual.paleta_colores.map((color, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)]"
                    >
                      <div
                        className="w-4 h-4 rounded-full border border-slate-900 flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {color}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prompt Maestro de Inyección en FLUX */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-titulo flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Prompt Maestro Inyectado en Viñetas (FLUX.1)</span>
              </label>
              <div className="p-3.5 rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-slate-950 text-emerald-400 font-mono text-xs leading-relaxed shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)]">
                {proyecto?.system_prompt_maestro || presetActual?.prompt_imagen || 'Prompt maestro calibrado.'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border-2 border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>Este estilo oficial está bloqueado y garantizado para asegurar la consistencia artística en todas las páginas de tu cómic.</span>
            </div>

          </div>
        </div>
      )}

      {/* ── MODO 3: ALEATORIO ── */}
      {modo === 'aleatorio' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.85)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)] space-y-6">
            
            {/* Ficha del Estilo Sorteado */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-purple-50/60 dark:bg-slate-800/60 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)]">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-900 bg-white flex-shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] flex items-center justify-center p-2">
                <img
                  src={presetActual?.icon || `/assets/legendary_styles/${proyecto?.estilo_legendario?.replace('aleatorio_', '')}.png`}
                  alt={presetActual?.name || 'Estilo Sorteado'}
                  className="w-full h-full object-contain"
                  onError={(e) => { e.target.src = '/assets/legendary_styles/shonen_legendario.png' }}
                />
              </div>

              <div className="flex-1 text-center sm:text-left space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="text-xs px-2.5 py-0.5 rounded-full border border-slate-900 bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 font-bold uppercase tracking-wider font-titulo flex items-center gap-1">
                    <Dices className="w-3.5 h-3.5" /> Universo Sorteado
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full border border-slate-900 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold font-titulo">
                    Escuela {presetActual?.school || 'Manga'}
                  </span>
                </div>

                <h3 className="text-2xl font-black font-titulo text-slate-900 dark:text-white">
                  {presetActual?.name || proyecto?.estilo_legendario?.replace('aleatorio_', '').replace(/_/g, ' ')}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-snug">
                  {presetActual?.subtitle || 'Combinación artística sorteada para un cómic sorprendente y único.'}
                </p>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMostrarMoodboard(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-titulo font-bold text-xs text-slate-900 dark:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                  >
                    <Image className="w-3.5 h-3.5 text-purple-500" />
                    <span>🖼️ Explorar Láminas y Fichas Canónicas</span>
                  </button>
                </div>
              </div>

              {/* Botón de Sortear Otro Estilo */}
              {!isLocked && (
                <div className="sm:self-center">
                  <button
                    onClick={handleSortearOtroEstilo}
                    disabled={sorteando}
                    className="py-3 px-4 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-titulo font-black text-xs shadow-[3px_3px_0px_0px_rgba(0,0,0,0.85)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Dices className={`w-4 h-4 ${sorteando ? 'animate-spin' : ''}`} />
                    <span>{sorteando ? 'Sorteando...' : '🎲 Sortear Otro Estilo'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Desglose Técnico */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] space-y-1">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-titulo font-bold text-xs uppercase tracking-wider">
                  <Feather className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Trazo Sorteado</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                  {diagnostico.tipo_trazo || presetActual?.tecnica_linea || 'Trazo dinámico característico del estilo base seleccionado.'}
                </p>
              </div>

              <div className="p-4 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] space-y-1">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-titulo font-bold text-xs uppercase tracking-wider">
                  <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Tramas y Sombras</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                  {diagnostico.tratamiento_sombras || presetActual?.estilo_sombreado || 'Sombreado calibrado con atmósfera inesperada.'}
                </p>
              </div>
            </div>

            {/* Prompt Maestro Sorteado */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-titulo flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Prompt Maestro Combinatorio del Universo Gráfico</span>
              </label>
              <div className="p-3.5 rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-slate-950 text-emerald-400 font-mono text-xs leading-relaxed shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)]">
                {diagnostico.style_prompt || proyecto?.system_prompt_maestro || presetActual?.prompt_imagen}
              </div>
            </div>

            {/* Botón de Fijar y Bloquear para Aleatorio */}
            {!isLocked ? (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  ¿Te gusta este estilo? Fíjalo y bloquéalo para que no cambie.
                </p>
                <button
                  onClick={handleFijarYBloquear}
                  disabled={bloqueando}
                  className="py-3 px-6 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-emerald-600 hover:bg-emerald-500 text-white font-titulo font-black text-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,0.85)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>[🔒 Fijar y Bloquear Universo Gráfico]</span>
                </button>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border-2 border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>Universo gráfico sorteado y bloqueado con éxito. Las viñetas mantendrán esta estética coherente.</span>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── 4. GENERADOR DE PORTADA OFICIAL DEL CÓMIC (SECCIÓN FINAL) ── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="border-2 border-slate-900 dark:border-slate-700 rounded-xl p-5 bg-white/95 dark:bg-[#131b2e]/90 shadow-[3px_3px_0px_0px_rgba(15,23,42,0.9)] mt-6 space-y-6">
        
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl border-2 border-slate-900 bg-purple-100 dark:bg-slate-800 flex items-center justify-center text-purple-700 dark:text-purple-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-titulo text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Portada Oficial del Cómic</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full border border-purple-600 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold uppercase tracking-wider font-titulo">
                  Generación con Firma Visual
                </span>
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Crea una portada de alto impacto visual aplicando automáticamente las directrices de tu Firma Visual sobre la sinopsis del proyecto.
              </p>
            </div>
          </div>
        </div>

        {/* Formulario de Controles y Prompt */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Columna Izquierda: Configuración de Aspect Ratio y Prompt (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Selector de Formato / Relación de Aspecto (Aspect Ratio) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-titulo flex items-center gap-1.5">
                <Image className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Formato de Portada / Relación de Aspecto</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: '3:4', label: '3:4', desc: 'Manga / Tankōbon' },
                  { id: '2:3', label: '2:3', desc: 'Comic Book' },
                  { id: '9:16', label: '9:16', desc: 'Webtoon' },
                  { id: '1:1', label: '1:1', desc: 'Artbook Cuadrado' },
                ].map((ar) => {
                  const sel = aspectRatio === ar.id
                  return (
                    <button
                      key={ar.id}
                      type="button"
                      onClick={() => setAspectRatio(ar.id)}
                      className={`p-2.5 rounded-xl border-2 text-center transition-all cursor-pointer ${
                        sel
                          ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 shadow-[2px_2px_0px_0px_rgba(147,51,234,0.85)] font-bold'
                          : 'border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] font-medium'
                      }`}
                    >
                      <span className="block font-mono text-sm leading-tight">{ar.label}</span>
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{ar.desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Campo de Prompt de Portada */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-titulo flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Prompt de Generación de Portada</span>
                </label>
                <button
                  type="button"
                  onClick={() => setPromptPortada(construirPromptSugerido())}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  title="Restaurar plantilla automática"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>[🔄 Restaurar Prompt desde Sinopsis]</span>
                </button>
              </div>
              <textarea
                rows={4}
                value={promptPortada}
                onChange={(e) => setPromptPortada(e.target.value)}
                placeholder="Escribe o ajusta las directrices visuales para la portada oficial..."
                className="w-full text-xs font-mono font-medium p-3 rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Inyecta automáticamente la sinopsis argumental y las pautas técnicas de entintado calibradas en tu Firma Visual.
              </p>
            </div>

            {/* Alerta de Error de Portada */}
            {errorPortada && (
              <div className="p-3.5 rounded-xl border-2 border-red-600 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center justify-between shadow-[2px_2px_0px_0px_rgba(220,38,38,0.85)]">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorPortada}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorPortada(null)}
                  className="text-[11px] underline font-bold cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            )}

            {/* Notificación de Éxito al Adoptar */}
            {notificacionExito && (
              <div className="p-3.5 rounded-xl border-2 border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-between shadow-[2px_2px_0px_0px_rgba(16,185,129,0.85)]">
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

            {/* Botón Principal: Generar Portada */}
            <div>
              <button
                type="button"
                onClick={handleGenerarPortada}
                disabled={generandoPortada || !promptPortada.trim()}
                className="w-full py-3.5 px-4 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-titulo font-black text-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,0.85)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generandoPortada ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Generando portada de alta resolución...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    <span>[✨ Generar Portada con Firma Visual]</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Columna Derecha: Visor de Portada Generada y Acciones (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border-2 border-slate-900 dark:border-slate-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)]">
            
            {portadaGenerada ? (
              <div className="w-full flex flex-col items-center space-y-4">
                
                {/* Contenedor de Imagen de Portada con Aspect Ratio Dinámico */}
                <div className={`w-full ${aspectClasses[aspectRatio] || 'aspect-[3/4] max-w-[280px]'} rounded-xl overflow-hidden border-2 border-slate-900 bg-slate-950 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.85)] relative group`}>
                  <img
                    src={obtenerUrlImagen(portadaGenerada)}
                    alt="Portada Oficial"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = '/assets/subir_portada.png'
                    }}
                  />
                  <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-xs text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-slate-700">
                    {aspectRatio}
                  </div>
                </div>

                {/* Botonera de Acciones sobre la Portada */}
                <div className="w-full space-y-2">
                  <button
                    type="button"
                    onClick={handleAdoptarPortada}
                    disabled={guardandoPortada || !portadaGenerada}
                    className="w-full py-2.5 px-3 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-emerald-600 hover:bg-emerald-500 text-white font-titulo font-bold text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Star className="w-4 h-4 text-amber-300" />
                    <span>{guardandoPortada ? "Guardando..." : "🌟 Adoptar como Portada del Proyecto"}</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleDescargarPortada}
                      className="py-2 px-3 rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-700 hover:bg-slate-100 text-slate-800 dark:text-slate-100 font-titulo font-bold text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleGenerarPortada}
                      disabled={generandoPortada}
                      className="py-2 px-3 rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-700 hover:bg-slate-100 text-slate-800 dark:text-slate-100 font-titulo font-bold text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Regenerar</span>
                    </button>
                  </div>
                </div>

              </div>

            ) : (
              <div className="w-full h-full min-h-[300px] border-2 border-dashed border-slate-400 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center p-6 text-center text-slate-500 dark:text-slate-400 space-y-3">
                <div className="w-14 h-14 rounded-2xl border-2 border-slate-400 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                  <Image className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <p className="font-titulo font-bold text-xs text-slate-700 dark:text-slate-300">
                    Lienzo de Portada en Espera
                  </p>
                  <p className="text-[11px] max-w-[200px] leading-relaxed">
                    Pulsa 'Generar Portada' para crear la primera ilustración oficial con tu estilo.
                  </p>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Modal / Moodboard de Referencias Canónicas */}
      <MoodboardModal
        isOpen={mostrarMoodboard}
        onClose={() => setMostrarMoodboard(false)}
        styleId={proyecto?.estilo_legendario || proyecto?.estilo_visual || 'mortadela_y_salchichon'}
      />

    </div>
  )
}
