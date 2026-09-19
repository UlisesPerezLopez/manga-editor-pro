// NewProject.jsx
// Wizard de creación de nuevo proyecto con los 3 modos, paleta pastel Ghibli vs Cosmos,
// slideshow de fondo animado continuo, selector de formato con bandera oficial y cuadrícula de 25 Estilos Legendarios.

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Sparkles,
  ArrowLeft,
  AlertTriangle
} from 'lucide-react'
import { projectsAPI } from '../services/api'
import useProjectStore from '../store/projectStore'
import useThemeStore, { TEMAS } from '../store/themeStore'
import LanguageSelector from '../components/common/LanguageSelector'
import ThemeToggle from '../components/common/ThemeToggle'
import AiEngineToggle from '../components/common/AiEngineToggle'
import BackgroundSlideshow from '../components/common/BackgroundSlideshow'
import ThemeBackgroundAnimation from '../components/common/ThemeBackgroundAnimation'
import ErrorBoundary from '../components/UI/ErrorBoundary'
import MangaIcon from '../components/common/MangaIcon'
import ReadingFormatSelector from '../components/common/ReadingFormatSelector'
import StyleSelectorGrid from '../components/common/StyleSelectorGrid'

// Carga dinámica de todas las ilustraciones de fondo
const modulosFondos = import.meta.glob('../assets/fondo_login_*.png', { eager: true, query: '?url', import: 'default' })
const fondosDisponibles = Object.values(modulosFondos)

function NewProjectContent() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { tema } = useThemeStore()
  const esGhibli = tema === TEMAS.GHIBLI

  const [paso, setPaso] = useState(1) // 1: modo, 2: detalles, 3: creando
  const [modoSeleccionado, setModoSeleccionado] = useState(null)
  const [estiloSeleccionado, setEstiloSeleccionado] = useState(null)
  const [form, setForm] = useState({
    nombre: '',
    formato_lectura: 'manga',
  })
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)

  const MODOS = [
    {
      id: 'propio',
      iconName: 'creacion_propia',
      titulo: t('landing.modes.custom.title') || 'Tu Propio Estilo',
      descripcion: t('landing.modes.custom.desc') || 'Sube 3 a 5 páginas de tu arte para clonar tu firma visual con IA.',
      ghibliClasses: 'bg-[#FCFAF6] border-2 border-slate-900 text-slate-900 shadow-[4px_4px_0px_0px_rgba(30,41,59,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(30,41,59,1)] hover:-translate-y-0.5',
      cosmosClasses: 'bg-[#0e1322] border-2 border-purple-500/40 text-white shadow-lg shadow-purple-950/20 hover:border-purple-400 hover:-translate-y-0.5',
      badgeGhibli: 'bg-[#F3E8FF] border border-purple-300 text-purple-900',
      badgeCosmos: 'bg-purple-950/60 text-purple-400 border border-purple-500/30',
      accentGhibli: 'group-hover:text-purple-700',
      accentCosmos: 'group-hover:text-purple-400',
    },
    {
      id: 'legendario',
      iconName: 'modo_legendario',
      titulo: t('landing.modes.legendary.title') || 'Estilos Legendarios',
      descripcion: t('landing.modes.legendary.desc') || 'Crea en el estilo visual de los grandes mangakas de la historia.',
      ghibliClasses: 'bg-[#FCFAF6] border-2 border-slate-900 text-slate-900 shadow-[4px_4px_0px_0px_rgba(30,41,59,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(30,41,59,1)] hover:-translate-y-0.5',
      cosmosClasses: 'bg-[#0e1322] border-2 border-amber-500/40 text-white shadow-lg shadow-amber-950/20 hover:border-amber-400 hover:-translate-y-0.5',
      badgeGhibli: 'bg-[#FEF3C7] border border-amber-300 text-amber-900',
      badgeCosmos: 'bg-amber-950/60 text-amber-400 border border-amber-500/30',
      accentGhibli: 'group-hover:text-amber-700',
      accentCosmos: 'group-hover:text-amber-400',
    },
    {
      id: 'aleatorio',
      iconName: 'modo_aleatorio',
      titulo: t('landing.modes.random.title') || 'Estilo Sorpresa',
      descripcion: t('landing.modes.random.desc') || 'Deja que la IA combine técnicas y cree un estilo único para ti.',
      ghibliClasses: 'bg-[#FCFAF6] border-2 border-slate-900 text-slate-900 shadow-[4px_4px_0px_0px_rgba(30,41,59,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(30,41,59,1)] hover:-translate-y-0.5',
      cosmosClasses: 'bg-[#0e1322] border-2 border-emerald-500/40 text-white shadow-lg shadow-emerald-950/20 hover:border-emerald-400 hover:-translate-y-0.5',
      badgeGhibli: 'bg-[#D1FAE5] border border-emerald-300 text-emerald-900',
      badgeCosmos: 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30',
      accentGhibli: 'group-hover:text-emerald-700',
      accentCosmos: 'group-hover:text-emerald-400',
    },
  ]

  const { setProyectoActivo } = useProjectStore()

  const handleCrear = async () => {
    if (!form.nombre.trim()) {
      setError(t('newProject.errorRequiredName') || 'El nombre del proyecto es obligatorio')
      return
    }
    if (modoSeleccionado === 'legendario' && !estiloSeleccionado) {
      setError(t('newProject.errorSelectLegendary') || 'Debes seleccionar un estilo legendario')
      return
    }

    setCargando(true)
    setError(null)
    setPaso(3)

    try {
      const datos = {
        nombre: form.nombre.trim(),
        modo_creacion: modoSeleccionado || 'propio',
        formato_lectura: form.formato_lectura || 'manga',
        estilo_legendario: modoSeleccionado === 'legendario' ? estiloSeleccionado : null,
      }
      const res = await projectsAPI.crear(datos)
      const nuevoProyecto = res?.data
      if (nuevoProyecto && nuevoProyecto.id) {
        setProyectoActivo(nuevoProyecto)
        navigate(`/project/${nuevoProyecto.id}`)
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      console.error('Error al crear proyecto:', err?.response?.data || err)
      const msg = err.response?.data?.detail || (typeof err.response?.data === 'string' ? err.response?.data : 'Error al crear el proyecto')
      setError(typeof msg === 'object' ? JSON.stringify(msg) : msg)
      setPaso(2)
      setCargando(false)
    }
  }

  const renderModoIconoPaso2 = () => {
    if (modoSeleccionado === 'legendario') return <MangaIcon name="modo_legendario" size={28} />
    if (modoSeleccionado === 'aleatorio') return <MangaIcon name="modo_aleatorio" size={28} />
    return <MangaIcon name="creacion_propia" size={28} />
  }

  return (
    <div className="min-h-screen bg-rdc-primary flex flex-col justify-between transition-colors duration-300 relative overflow-x-hidden">
      {/* Slideshow animado continuo aleatorio de fondo con transición cross-fade (17s) y overlay cinematográfico */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <BackgroundSlideshow
          imagenes={fondosDisponibles}
          intervalo={17000}
        />
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px]" />
      </div>

      {/* Animación de partículas detrás del contenido */}
      <ThemeBackgroundAnimation />

      {/* Header */}
      <nav className="bg-rdc-secondary/90 border-b border-rdc-border px-6 py-4
                      flex items-center justify-between sticky top-0 z-40 backdrop-blur-md transition-colors duration-300">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 group cursor-pointer mr-2 select-none" title="MEP — Manga Editor Pro">
            <h1 className="font-manga text-2xl text-rdc-accent group-hover:scale-105 transition-transform">MEP</h1>
          </Link>
          <button
            onClick={() => paso > 1 ? setPaso(p => p - 1) : navigate('/dashboard')}
            className="text-rdc-muted hover:text-rdc-text transition-colors font-titulo text-sm flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('newProject.back') || 'Volver'}</span>
          </button>
          <h2 className="font-titulo text-lg text-rdc-text font-semibold hidden sm:inline">
            {t('newProject.title') || 'Nuevo Proyecto'}
          </h2>
        </div>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <AiEngineToggle />
          <ThemeToggle />
          <LanguageSelector />
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10">
        <div className={`w-full transition-all duration-300 ${
          paso === 2 && modoSeleccionado === 'legendario' ? 'max-w-5xl' : 'max-w-3xl'
        }`}>

          {/* ── PASO 1: Selección de modo ── */}
          {paso === 1 && (
            <div className="animate-in fade-in zoom-in-95 duration-200">
              <div className={`relative z-10 max-w-lg mx-auto my-4 px-6 py-3 rounded-2xl text-center shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] border-2 border-black mb-8 ${
                esGhibli ? 'bg-white' : 'bg-[#0B0F19]'
              }`}>
                <h2 className="font-titulo text-2xl font-black text-slate-900 dark:text-white leading-tight">
                  {t('newProject.howToCreate') || '¿Cómo deseas crear tu manga?'}
                </h2>
                <p className="font-titulo text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-1">
                  {t('newProject.subtitle') || 'Selecciona el método de creación que mejor se adapte a tu flujo creativo.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {MODOS.map((modo) => (
                  <button
                    key={modo.id}
                    onClick={() => {
                      setModoSeleccionado(modo.id)
                      setPaso(2)
                    }}
                    className={`rounded-2xl p-6 text-left transition-all duration-300 group cursor-pointer flex flex-col justify-between ${
                      esGhibli ? modo.ghibliClasses : modo.cosmosClasses
                    }`}
                  >
                    <div>
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-105 transition-transform ${
                        esGhibli ? modo.badgeGhibli : modo.badgeCosmos
                      }`}>
                        <MangaIcon name={modo.iconName} size={32} />
                      </div>
                      <h3 className={`font-titulo text-xl font-bold mb-2 transition-colors ${
                        esGhibli ? modo.accentGhibli : modo.accentCosmos
                      }`}>
                        {modo.titulo}
                      </h3>
                      <p className={`text-sm leading-relaxed font-titulo ${
                        esGhibli ? 'text-slate-600' : 'text-slate-300'
                      }`}>
                        {modo.descripcion}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── PASO 2: Detalles del proyecto ── */}
          {paso === 2 && (
            <div className={`border-2 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200 ${
              esGhibli
                ? 'bg-[#FCFAF6] border-slate-900 text-slate-900 shadow-[4px_4px_0px_0px_rgba(30,41,59,0.9)]'
                : 'bg-rdc-secondary/95 border-rdc-border text-rdc-text'
            }`}>
              <div className="flex items-center gap-3.5 mb-6">
                <div className="p-2.5 rounded-xl bg-rdc-card border border-rdc-border">
                  {renderModoIconoPaso2()}
                </div>
                <div>
                  <h2 className="font-titulo text-2xl font-bold">
                    {MODOS.find(m => m.id === modoSeleccionado)?.titulo}
                  </h2>
                  <p className="text-rdc-muted text-sm font-titulo">
                    {t('newProject.configTitle') || 'Configuración inicial de la obra'}
                  </p>
                </div>
              </div>

              {error && (
                <div className="bg-rdc-error/20 border border-rdc-error
                                text-rdc-error rounded-xl p-3.5 mb-5 text-sm font-titulo flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-5">
                {/* Nombre del proyecto */}
                <div>
                  <label className="block text-rdc-muted text-sm mb-2 font-titulo font-semibold">
                    {t('newProject.projectName') || 'Nombre de la obra'}
                  </label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                    placeholder={t('newProject.projectNamePlaceholder') || 'Ej: El Guardián del Cosmos'}
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors duration-200 font-titulo ${
                      esGhibli
                        ? 'bg-white border-[#DFE7DB] text-[#1B2D23] focus:border-emerald-600 placeholder-gray-400'
                        : 'bg-rdc-card border-rdc-border text-rdc-text focus:border-rdc-accent placeholder-rdc-muted'
                    }`}
                  />
                </div>

                {/* Formato de lectura con iconografía oficial */}
                <div>
                  <label className="block text-rdc-muted text-sm mb-3 font-titulo font-semibold">
                    {t('newProject.readingFormat') || 'Formato de lectura'}
                  </label>
                  <ReadingFormatSelector
                    value={form.formato_lectura}
                    onChange={(fmtId) => setForm(p => ({ ...p, formato_lectura: fmtId }))}
                    isGhibli={esGhibli}
                  />
                </div>

                {/* Selector de 25 Estilos Legendarios */}
                {modoSeleccionado === 'legendario' && (
                  <div>
                    <label className="block text-rdc-muted text-sm mb-3 font-titulo font-semibold">
                      {t('newProject.legendaryStyle') || 'Selecciona el estilo artístico maestro'} (25 disponibles)
                    </label>
                    <StyleSelectorGrid
                      estiloSeleccionado={estiloSeleccionado}
                      onSeleccionar={setEstiloSeleccionado}
                    />
                  </div>
                )}

                {/* Nota modo propio */}
                {modoSeleccionado === 'propio' && (
                  <div className={esGhibli
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-900 rounded-xl p-4 flex items-start gap-2.5'
                    : 'bg-purple-500/15 border border-purple-500/30 text-purple-200 rounded-xl p-4 flex items-start gap-2.5'
                  }>
                    <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-rdc-accent" />
                    <p className="text-xs font-titulo font-medium leading-relaxed">
                      {t('newProject.customNote') || 'Podrás subir tus páginas de referencia en el siguiente paso para calibrar tu firma visual con IA.'}
                    </p>
                  </div>
                )}

                {/* Nota modo aleatorio */}
                {modoSeleccionado === 'aleatorio' && (
                  <div className={esGhibli
                    ? 'bg-amber-500/15 border border-amber-500/30 text-amber-900 rounded-xl p-4 flex items-start gap-2.5'
                    : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 rounded-xl p-4 flex items-start gap-2.5'
                  }>
                    <MangaIcon name="modo_aleatorio" size={18} className="flex-shrink-0 mt-0.5" />
                    <p className="text-xs font-titulo font-medium leading-relaxed">
                      {t('newProject.randomNote') || 'La IA generará un conjunto de directivas visuales y pesos de arte equilibrados para tu proyecto.'}
                    </p>
                  </div>
                )}

                {/* Botón crear */}
                <button
                  onClick={handleCrear}
                  disabled={cargando}
                  className={`w-full font-titulo font-semibold text-base py-3.5 rounded-xl transition-all duration-200 disabled:opacity-50 mt-4 tracking-wide shadow-lg cursor-pointer hover:scale-[1.01] flex items-center justify-center gap-2 ${
                    esGhibli
                      ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-900/20'
                      : 'bg-rdc-accent hover:bg-rdc-accent-hover text-white shadow-rdc-accent/30'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{t('newProject.createBtn') || 'Crear Proyecto'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ── PASO 3: Creando... ── */}
          {paso === 3 && (
            <div className={`text-center py-16 border rounded-2xl p-8 backdrop-blur-md shadow-2xl animate-in fade-in duration-300 ${
              esGhibli
                ? 'bg-[#FDFBF7]/95 border-[#DFE7DB] text-[#1B2D23]'
                : 'bg-rdc-secondary/90 border-rdc-border text-rdc-text'
            }`}>
              <div className="w-16 h-16 rounded-2xl bg-rdc-accent/15 border border-rdc-accent/30 flex items-center justify-center mx-auto mb-5 text-rdc-accent animate-pulse">
                <Sparkles className="w-8 h-8 animate-spin" />
              </div>
              <h2 className="font-titulo text-2xl font-bold mb-2">
                {t('newProject.creatingTitle') || 'Preparando tu Workspace...'}
              </h2>
              <p className="text-rdc-muted font-titulo text-sm">{t('newProject.creatingDesc') || 'Configurando lienzo, guiones y firma de IA...'}</p>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}

export default function NewProject() {
  return (
    <ErrorBoundary>
      <NewProjectContent />
    </ErrorBoundary>
  )
}
