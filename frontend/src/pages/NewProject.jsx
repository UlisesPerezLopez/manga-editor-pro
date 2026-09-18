// NewProject.jsx
// Wizard de creación de nuevo proyecto con los 3 modos, paleta pastel Ghibli vs Cosmos, slideshow de fondo animado y Lucide React.

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Palette,
  Zap,
  Dices,
  BookOpen,
  Globe,
  Flame,
  Heart,
  Sword,
  Bot,
  Sparkles,
  Smile,
  Shield,
  Coffee,
  ArrowLeft,
  CheckCircle2,
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

// Carga dinámica de todas las ilustraciones de fondo
const modulosFondos = import.meta.glob('../assets/fondo_login_*.png', { eager: true, query: '?url', import: 'default' })
const fondosDisponibles = Object.values(modulosFondos)

const ICONOS_ESTILOS = {
  shonen_action:     { icon: Flame,    color: 'text-amber-500' },
  shojo_romance:     { icon: Heart,    color: 'text-pink-400' },
  seinen_dark:       { icon: Sword,    color: 'text-slate-300' },
  cyberpunk_manga:   { icon: Bot,      color: 'text-cyan-400' },
  isekai_fantasy:    { icon: Sparkles, color: 'text-purple-400' },
  kodomomuke:        { icon: Smile,    color: 'text-yellow-400' },
  franco_belge:      { icon: Palette,  color: 'text-blue-400' },
  marvel_western:    { icon: Shield,   color: 'text-red-500' },
  indie_underground: { icon: Coffee,   color: 'text-amber-700' },
}

function NewProjectContent() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { tema } = useThemeStore()
  const esGhibli = tema === TEMAS.GHIBLI

  const [paso, setPaso] = useState(1) // 1: modo, 2: detalles, 3: creando
  const [modoSeleccionado, setModoSeleccionado] = useState(null)
  const [estilosLegendarios, setEstilosLegendarios] = useState([])
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
      icon: Palette,
      iconColor: 'text-purple-400',
      titulo: t('landing.modes.custom.title') || 'Tu Propio Estilo',
      descripcion: t('landing.modes.custom.desc') || 'Sube 3 a 5 páginas de tu arte para clonar tu firma visual con IA.',
      ghibliClasses: 'bg-[#FDFBF7]/95 border-emerald-200/80 text-[#1B2D23] shadow-md hover:border-emerald-300 hover:shadow-lg',
      cosmosClasses: 'bg-purple-950/40 border-purple-500/80 text-white shadow-purple-900/20 hover:border-purple-400',
      accentGhibli: 'group-hover:text-emerald-700',
      accentCosmos: 'group-hover:text-purple-400',
    },
    {
      id: 'legendario',
      icon: Zap,
      iconColor: 'text-amber-400',
      titulo: t('landing.modes.legendary.title') || 'Estilos Legendarios',
      descripcion: t('landing.modes.legendary.desc') || 'Crea en el estilo visual de los grandes mangakas de la historia.',
      ghibliClasses: 'bg-[#FDFBF7]/95 border-amber-200/80 text-[#1B2D23] shadow-md hover:border-amber-300 hover:shadow-lg',
      cosmosClasses: 'bg-blue-950/40 border-rdc-accent/80 text-white shadow-blue-900/20 hover:border-blue-400',
      accentGhibli: 'group-hover:text-amber-700',
      accentCosmos: 'group-hover:text-blue-400',
    },
    {
      id: 'aleatorio',
      icon: Dices,
      iconColor: 'text-emerald-400',
      titulo: t('landing.modes.random.title') || 'Estilo Sorpresa',
      descripcion: t('landing.modes.random.desc') || 'Deja que la IA combine técnicas y cree un estilo único para ti.',
      ghibliClasses: 'bg-[#FDFBF7]/95 border-rose-200/80 text-[#1B2D23] shadow-md hover:border-rose-300 hover:shadow-lg',
      cosmosClasses: 'bg-green-950/40 border-green-500/80 text-white shadow-green-900/20 hover:border-green-400',
      accentGhibli: 'group-hover:text-[#D97736]',
      accentCosmos: 'group-hover:text-green-400',
    },
  ]

  // Cargar estilos legendarios al montar
  useEffect(() => {
    projectsAPI.estilosLegendarios()
      .then(r => setEstilosLegendarios(r?.data?.estilos || []))
      .catch(console.error)
  }, [])

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
    if (modoSeleccionado === 'legendario') return <Zap className="w-7 h-7 text-amber-400" />
    if (modoSeleccionado === 'aleatorio') return <Dices className="w-7 h-7 text-emerald-400" />
    return <Palette className="w-7 h-7 text-purple-400" />
  }

  return (
    <div className="min-h-screen bg-rdc-primary flex flex-col justify-between transition-colors duration-300 relative overflow-x-hidden">
      {/* Slideshow animado de fondo con transición cada 5000ms */}
      <BackgroundSlideshow
        imagenes={fondosDisponibles}
        intervalo={5000}
        overlayClassName={esGhibli ? 'bg-black/20' : 'bg-black/40 backdrop-blur-[0.5px]'}
      />

      {/* Animación de partículas detrás del contenido (Cosmos vs Ghibli) */}
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

      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-3xl">

          {/* ── PASO 1: Selección de modo ── */}
          {paso === 1 && (
            <div className="animate-in fade-in zoom-in-95 duration-200">
              <h2 className="font-titulo text-3xl text-rdc-text font-semibold
                             text-center mb-2 drop-shadow-md">
                {t('newProject.howToCreate') || '¿Cómo deseas crear tu manga?'}
              </h2>
              <p className="text-rdc-muted text-center mb-10 drop-shadow-sm font-titulo">
                {t('newProject.subtitle') || 'Selecciona el método de creación que mejor se adapte a tu flujo creativo.'}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {MODOS.map((modo) => {
                  const ModoIcon = modo.icon
                  return (
                    <button
                      key={modo.id}
                      onClick={() => {
                        setModoSeleccionado(modo.id)
                        setPaso(2)
                      }}
                      className={`border-2 rounded-2xl p-6 text-left transition-all duration-300 hover:scale-105 group cursor-pointer backdrop-blur-md flex flex-col justify-between ${
                        esGhibli ? modo.ghibliClasses : modo.cosmosClasses
                      }`}
                    >
                      <div>
                        <div className="w-14 h-14 rounded-2xl bg-black/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                          <ModoIcon className={`w-8 h-8 ${modo.iconColor}`} />
                        </div>
                        <h3 className={`font-titulo text-xl font-bold mb-2 transition-colors ${
                          esGhibli ? modo.accentGhibli : modo.accentCosmos
                        }`}>
                          {modo.titulo}
                        </h3>
                        <p className="text-sm leading-relaxed opacity-85 font-titulo">
                          {modo.descripcion}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── PASO 2: Detalles del proyecto ── */}
          {paso === 2 && (
            <div className={`border rounded-2xl p-8 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200 ${
              esGhibli
                ? 'bg-[#FDFBF7]/95 border-[#DFE7DB] text-[#1B2D23]'
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

                {/* Formato de lectura */}
                <div>
                  <label className="block text-rdc-muted text-sm mb-3 font-titulo font-semibold">
                    {t('newProject.readingFormat') || 'Formato de lectura'}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'manga', label: t('newProject.manga') || 'Manga Tradicional', sub: t('newProject.mangaDesc') || 'Lectura de derecha a izquierda (Japón)', icon: BookOpen },
                      { id: 'occidental', label: t('newProject.western') || 'Cómic Occidental', sub: t('newProject.westernDesc') || 'Lectura de izquierda a derecha', icon: Globe },
                    ].map((fmt) => {
                      const FmtIcon = fmt.icon
                      const activo = form.formato_lectura === fmt.id
                      return (
                        <button
                          key={fmt.id}
                          type="button"
                          onClick={() => setForm(p => ({ ...p, formato_lectura: fmt.id }))}
                          className={`border-2 rounded-xl p-4 text-left transition-all duration-200 cursor-pointer ${
                            activo
                              ? esGhibli
                                ? 'border-emerald-600 bg-emerald-50 shadow-sm'
                                : 'border-rdc-accent bg-rdc-accent/15 shadow-sm'
                              : esGhibli
                                ? 'border-[#DFE7DB] hover:border-emerald-300 bg-white/70'
                                : 'border-rdc-border hover:border-rdc-muted bg-rdc-card/50'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <FmtIcon className={`w-4 h-4 ${activo ? 'text-rdc-accent' : 'text-rdc-muted'}`} />
                            <p className="font-semibold text-sm font-titulo">{fmt.label}</p>
                          </div>
                          <p className="text-rdc-muted text-xs font-titulo">{fmt.sub}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Selector de estilo legendario */}
                {modoSeleccionado === 'legendario' && (
                  <div>
                    <label className="block text-rdc-muted text-sm mb-3 font-titulo font-semibold">
                      {t('newProject.legendaryStyle') || 'Selecciona el estilo artístico maestro'}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                      {estilosLegendarios.map((estilo) => {
                        const config = ICONOS_ESTILOS[estilo.id] || { icon: Sparkles, color: 'text-amber-400' }
                        const StyleIcon = config.icon
                        const seleccionado = estiloSeleccionado === estilo.id

                        return (
                          <button
                            key={estilo.id}
                            type="button"
                            onClick={() => setEstiloSeleccionado(estilo.id)}
                            className={`border rounded-xl p-3 text-left transition-all duration-200 cursor-pointer flex items-start gap-2.5 ${
                              seleccionado
                                ? esGhibli
                                  ? 'border-amber-600 bg-amber-50 shadow-sm'
                                  : 'border-rdc-accent bg-rdc-accent/15 shadow-sm'
                                : esGhibli
                                  ? 'border-[#DFE7DB] hover:border-amber-300 bg-white/70'
                                  : 'border-rdc-border hover:border-rdc-muted bg-rdc-card/40'
                            }`}
                          >
                            <div className="p-1.5 rounded-lg bg-rdc-secondary border border-rdc-border mt-0.5 flex-shrink-0">
                              <StyleIcon className={`w-4 h-4 ${config.color}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold font-titulo leading-tight">
                                {estilo.nombre}
                              </p>
                              <p className="text-rdc-muted text-xs leading-snug mt-0.5 line-clamp-2">
                                {estilo.descripcion}
                              </p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
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
                    <Dices className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
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
