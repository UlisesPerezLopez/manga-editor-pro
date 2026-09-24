// FontPickerModal.jsx
// Panel / Modal de catálogo de fuentes inspirado en Canva para MEP (Manga Editor Pro).
// Permite buscar fuentes de Google Fonts por categorías temáticas y subir archivos locales (.ttf, .otf, .woff2).

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Search,
  Upload,
  X,
  Check,
  Sparkles,
  BookOpen,
  MessageSquare,
  Scroll,
  FolderOpen
} from 'lucide-react'
import {
  CATALOGO_FUENTES,
  CATEGORIAS_FUENTES,
  cargarGoogleFont,
  cargarFuenteArchivo
} from '../../utils/fontLoader'

export default function FontPickerModal({
  fuenteActual = 'Comic Relief',
  onSeleccionarFuente,
  onClose,
  isOpen = false,
}) {
  const { t } = useTranslation()
  const [busqueda, setBusqueda] = useState('')
  const [categoriaActiva, setCategoriaActiva] = useState('todas')
  const [fuentesLocales, setFuentesLocales] = useState(() => {
    try {
      const guardadas = localStorage.getItem('mep_fuentes_subidas')
      return guardadas ? JSON.parse(guardadas) : []
    } catch {
      return []
    }
  })
  const [cargandoFuente, setCargandoFuente] = useState(null)
  const fileInputRef = useRef(null)

  // Pre-cargar Google Fonts visibles para vista previa
  useEffect(() => {
    if (!isOpen) return
    const primeras = CATALOGO_FUENTES.slice(0, 15)
    primeras.forEach(f => {
      if (f.origen === 'google') cargarGoogleFont(f.name)
    })
  }, [isOpen])

  // Lista unificada de fuentes
  const todasLasFuentes = useMemo(() => {
    return [...fuentesLocales, ...CATALOGO_FUENTES]
  }, [fuentesLocales])

  // Filtrado de fuentes
  const fuentesFiltradas = useMemo(() => {
    return todasLasFuentes.filter(f => {
      const coincideBusqueda = f.name.toLowerCase().includes(busqueda.toLowerCase())
      const coincideCategoria =
        categoriaActiva === 'todas' ||
        f.categoria === categoriaActiva ||
        (categoriaActiva === 'subidas' && f.origen === 'local-upload')
      return coincideBusqueda && coincideCategoria
    })
  }, [todasLasFuentes, busqueda, categoriaActiva])

  // Manejar selección de fuente
  const handleSeleccionar = async (fuente) => {
    setCargandoFuente(fuente.name)
    try {
      if (fuente.origen === 'google') {
        await cargarGoogleFont(fuente.name)
      }
      onSeleccionarFuente(fuente.name)
      onClose?.()
    } finally {
      setCargandoFuente(null)
    }
  }

  // Manejar subida de archivo local
  const handleSubirArchivo = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setCargandoFuente(file.name)
      const nueva = await cargarFuenteArchivo(file)
      const actualizadas = [nueva, ...fuentesLocales.filter(f => f.id !== nueva.id)]
      setFuentesLocales(actualizadas)
      localStorage.setItem('mep_fuentes_subidas', JSON.stringify(actualizadas))
      onSeleccionarFuente(nueva.name)
      onClose?.()
    } catch (err) {
      alert(`Error al cargar el archivo de tipografía: ${err.message}`)
    } finally {
      setCargandoFuente(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div
        className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera estilo Canva */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div>
            <h3 className="font-titulo text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{t('editor.fontPicker.title')}</span>
            </h3>
            <p className="text-xs text-slate-400">
              {t('editor.fontPicker.subtitle')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Buscador y Botón de Subida */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={t('editor.fontPicker.searchPlaceholder')}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 transition-colors"
                autoFocus
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Botón Subir Fuente */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold font-titulo flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
              title={t('editor.fontPicker.uploadTitle')}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{t('editor.fontPicker.uploadFont')}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".ttf,.otf,.woff2"
              className="hidden"
              onChange={handleSubirArchivo}
            />
          </div>

          {/* Filtros por Categoría */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIAS_FUENTES.map(cat => {
              const activa = categoriaActiva === cat.id
              const labelTraducida = t(`editor.fontPicker.categories.${cat.id}`) || cat.label
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoriaActiva(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    activa
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                      : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {labelTraducida}
                </button>
              )
            })}
          </div>
        </div>

        {/* Lista de Fuentes con Vista Previa Visual */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 divide-y divide-slate-800/40">
          {fuentesFiltradas.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <FolderOpen className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-xs">{t('editor.fontPicker.noFontsFound')}</p>
            </div>
          ) : (
            fuentesFiltradas.map(fuente => {
              const esSeleccionada = fuenteActual === fuente.name
              const cargandoEsta = cargandoFuente === fuente.name

              return (
                <button
                  key={fuente.id}
                  type="button"
                  onClick={() => handleSeleccionar(fuente)}
                  className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer group ${
                    esSeleccionada
                      ? 'bg-amber-500/15 border border-amber-500/40 text-amber-200'
                      : 'hover:bg-slate-800/70 text-slate-200 border border-transparent'
                  }`}
                >
                  <div className="space-y-0.5 min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-200 transition-colors">
                        {fuente.name}
                      </span>
                      {fuente.origen === 'local-upload' && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-sky-900/60 text-sky-300 border border-sky-700/50">
                          Personalizada
                        </span>
                      )}
                    </div>
                    {/* Texto de muestra con la tipografía aplicada */}
                    <div
                      style={{ fontFamily: `"${fuente.name}", ${fuente.fallback || 'sans-serif'}` }}
                      className="text-base text-white truncate group-hover:text-amber-300 transition-colors"
                    >
                      Raíces de Ceniza: ¡BOOM!
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {cargandoEsta ? (
                      <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    ) : esSeleccionada ? (
                      <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                    ) : null}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Pie con indicador */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-500">
          <span>{fuentesFiltradas.length} tipografías disponibles</span>
          <span>Google Fonts & Local Storage</span>
        </div>
      </div>
    </div>
  )
}
