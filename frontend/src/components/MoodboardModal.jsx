// MoodboardModal.jsx
// Modal / Drawer para explorar el Moodboard de Referencias Canónicas del estilo activo.
// Conecta con GET /projects/styles/{style_id} y ofrece visor de fichas técnicas y lightbox interactivo.

import React, { useState, useEffect, useCallback } from 'react'
import {
  X,
  Palette,
  Feather,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  BookOpen,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Compass
} from 'lucide-react'
import { projectsAPI, obtenerUrlImagen } from '../services/api'
import Spinner from './UI/Spinner'

export default function MoodboardModal({ isOpen, onClose, styleId }) {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [datosEstilo, setDatosEstilo] = useState(null)
  const [imagenActivaIndex, setImagenActivaIndex] = useState(null)
  const [seccionExpandida, setSeccionExpandida] = useState('todas') // 'todas' o id de ficha

  // Cargar datos de la Biblia de Estilo al abrir el modal
  useEffect(() => {
    if (!isOpen || !styleId) return

    let isMounted = true
    const cargarDetalles = async () => {
      setCargando(true)
      setError(null)
      try {
        const res = await projectsAPI.obtenerDetalleEstilo(styleId)
        if (isMounted) {
          setDatosEstilo(res?.data || null)
        }
      } catch (err) {
        console.error('Error al cargar moodboard del estilo:', err)
        if (isMounted) {
          setError('No se pudieron cargar las referencias visuales de este estilo.')
        }
      } finally {
        if (isMounted) {
          setCargando(false)
        }
      }
    }

    cargarDetalles()

    return () => {
      isMounted = false
    }
  }, [isOpen, styleId])

  // Manejo de teclado (Escape para cerrar lightbox o modal, flechas para navegar)
  const handleKeyDown = useCallback(
    (e) => {
      if (imagenActivaIndex !== null) {
        if (e.key === 'Escape') {
          setImagenActivaIndex(null)
        } else if (e.key === 'ArrowRight' && datosEstilo?.referencias?.length) {
          setImagenActivaIndex((prev) => (prev + 1) % datosEstilo.referencias.length)
        } else if (e.key === 'ArrowLeft' && datosEstilo?.referencias?.length) {
          setImagenActivaIndex((prev) =>
            prev === 0 ? datosEstilo.referencias.length - 1 : prev - 1
          )
        }
      } else if (isOpen && e.key === 'Escape') {
        onClose()
      }
    },
    [imagenActivaIndex, isOpen, onClose, datosEstilo]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!isOpen) return null

  const detalles = datosEstilo?.detalles || {}
  const referencias = datosEstilo?.referencias || []

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-5xl bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,0.85)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.1)] max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Cabecera del Moodboard ── */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b-2 border-slate-900 dark:border-slate-700 bg-amber-50/70 dark:bg-slate-800/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)]">
              <BookOpen className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-titulo text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  {detalles.nombre_oficial || 'Moodboard de Referencias Canónicas'}
                </h3>
                <span className="hidden sm:inline-block text-[11px] px-2.5 py-0.5 rounded-full border border-slate-900 dark:border-slate-700 bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-bold uppercase tracking-wider font-titulo">
                  Biblia Canónica
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                {detalles.referencia_cultural ? (
                  <span>Referencia Cultural: <strong className="text-slate-900 dark:text-slate-100">{detalles.referencia_cultural}</strong></span>
                ) : (
                  'Explora las claves gráficas maestras y la galería de referencia oficial.'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden md:flex items-center gap-1.5 font-mono text-xs font-bold px-3 py-1 rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)]">
              <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
              {referencias.length} Muestras
            </span>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-red-500 hover:text-white dark:hover:bg-red-600 text-slate-800 dark:text-slate-200 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Contenido Scrollable ── */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {cargando ? (
            <div className="py-16 text-center">
              <Spinner texto="Cargando fichas técnicas y láminas canónicas..." size="md" />
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl border-2 border-red-600 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm font-semibold flex items-center gap-3 shadow-[2px_2px_0px_0px_rgba(220,38,38,0.85)]">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* 1. Fichas Técnicas de la Biblia de Estilo */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-titulo text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Compass className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Fichas Técnicas de Ejecución Gráfica</span>
                  </h4>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Reglas canónicas inyectadas en el motor FLUX.1
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Ficha 1: Linework */}
                  <div className="p-3.5 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] space-y-1">
                    <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-titulo font-bold text-xs uppercase tracking-wider">
                      <Feather className="w-4 h-4" />
                      <span>1. Linework & Inking (Trazo y Línea)</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                      {detalles.linework || 'Trazo calibrado característico de la escuela artística.'}
                    </p>
                  </div>

                  {/* Ficha 2: Shading & Sombras */}
                  <div className="p-3.5 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] space-y-1">
                    <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-titulo font-bold text-xs uppercase tracking-wider">
                      <Layers className="w-4 h-4" />
                      <span>2. Shading & Tramas (Sombras y Textura)</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                      {detalles.shading_technique || 'Tramado screentone contrastado con negro pleno.'}
                    </p>
                  </div>

                  {/* Ficha 3: Color Palette */}
                  <div className="p-3.5 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] space-y-1">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-titulo font-bold text-xs uppercase tracking-wider">
                      <Palette className="w-4 h-4" />
                      <span>3. Color Palette (Paleta Cromática)</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                      {detalles.color_palette || 'Gama cromática equilibrada de saturación y contraste.'}
                    </p>
                  </div>

                  {/* Ficha 4: Anatomy & Acting */}
                  <div className="p-3.5 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] space-y-1">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-titulo font-bold text-xs uppercase tracking-wider">
                      <Sparkles className="w-4 h-4" />
                      <span>4. Anatomy & Acting (Anatomía y Expresión)</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                      {detalles.anatomy_acting || 'Deformación expresiva y lenguaje corporal definidos.'}
                    </p>
                  </div>
                </div>

                {/* Ficha 5: Atmosphere & Backgrounds */}
                {detalles.atmosphere_backgrounds && (
                  <div className="p-3.5 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-blue-50/60 dark:bg-slate-800/70 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] space-y-1">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-titulo font-bold text-xs uppercase tracking-wider">
                      <BookOpen className="w-4 h-4" />
                      <span>5. Atmosphere & Backgrounds (Entornos y Fondos)</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                      {detalles.atmosphere_backgrounds}
                    </p>
                  </div>
                )}

                {/* Prompt Tokens Inyectados */}
                {detalles.prompt_tokens && (
                  <div className="p-3 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-slate-950 text-emerald-400 font-mono text-[11px] leading-relaxed shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)]">
                    <div className="text-slate-400 font-sans font-bold text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1">
                      <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Tokens Canónicos Compilados (FLUX.1):</span>
                    </div>
                    {detalles.prompt_tokens}
                  </div>
                )}
              </div>

              {/* 2. Galería de Muestras Canónicas Locales */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-titulo text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>Láminas de Referencia Visual ({referencias.length})</span>
                  </h4>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Haz clic en una lámina para ampliarla con Lightbox
                  </span>
                </div>

                {referencias.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs">
                    No hay imágenes de muestra registradas para este identificador de estilo.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {referencias.map((url, idx) => (
                      <div
                        key={idx}
                        onClick={() => setImagenActivaIndex(idx)}
                        className="group relative aspect-[3/4] rounded-xl overflow-hidden border-2 border-slate-900 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] cursor-pointer hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.85)] transition-all"
                      >
                        <img
                          src={obtenerUrlImagen(url)}
                          alt={`Referencia ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        {/* Overlay al pasar el ratón */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white">
                          <ZoomIn className="w-6 h-6 drop-shadow-md" />
                          <span className="text-[10px] font-titulo font-bold tracking-wider uppercase">
                            Ampliar
                          </span>
                        </div>
                        {/* Badge de número */}
                        <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-slate-900/80 text-white font-mono text-[9px] font-bold">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="p-3 sm:p-4 border-t-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Firma visual activa y garantizada para las viñetas del cómic.</span>
          </div>
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 font-titulo font-bold text-xs text-slate-900 dark:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
          >
            Cerrar Moodboard
          </button>
        </div>
      </div>

      {/* ── LIGHTBOX / ZOOM OVERLAY ── */}
      {imagenActivaIndex !== null && referencias[imagenActivaIndex] && (
        <div
          className="fixed inset-0 z-[10000] bg-black/92 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setImagenActivaIndex(null)}
        >
          {/* Barra superior de Lightbox */}
          <div
            className="w-full max-w-5xl flex items-center justify-between text-white z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="font-titulo font-bold text-sm sm:text-base">
                {detalles.nombre_oficial || 'Referencia Canónica'}
              </span>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-white/20">
                {imagenActivaIndex + 1} / {referencias.length}
              </span>
            </div>
            <button
              onClick={() => setImagenActivaIndex(null)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-red-500 flex items-center justify-center text-white transition-colors cursor-pointer"
              title="Cerrar (Esc)"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Imagen central ampliada con controles prev/next */}
          <div
            className="relative flex-1 w-full max-w-5xl flex items-center justify-center p-2"
            onClick={(e) => e.stopPropagation()}
          >
            {referencias.length > 1 && (
              <button
                onClick={() =>
                  setImagenActivaIndex((prev) =>
                    prev === 0 ? referencias.length - 1 : prev - 1
                  )
                }
                className="absolute left-2 sm:left-4 z-10 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 border border-white/30 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer"
                title="Anterior (Flecha izquierda)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <img
              src={obtenerUrlImagen(referencias[imagenActivaIndex])}
              alt={`Referencia ${imagenActivaIndex + 1}`}
              className="max-h-[82vh] max-w-full object-contain rounded-xl border-2 border-white/20 shadow-2xl"
            />

            {referencias.length > 1 && (
              <button
                onClick={() =>
                  setImagenActivaIndex((prev) => (prev + 1) % referencias.length)
                }
                className="absolute right-2 sm:right-4 z-10 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 border border-white/30 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer"
                title="Siguiente (Flecha derecha)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Barra inferior */}
          <div
            className="text-center text-xs text-white/70 font-medium py-1"
            onClick={(e) => e.stopPropagation()}
          >
            Navega con las flechas ← y → del teclado | Pulsa Esc para salir
          </div>
        </div>
      )}
    </div>
  )
}
