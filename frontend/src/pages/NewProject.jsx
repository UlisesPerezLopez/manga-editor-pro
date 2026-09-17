// NewProject.jsx
// Wizard de creación de nuevo proyecto con los 3 modos, slideshow de fondo animado y soporte i18n

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { projectsAPI } from '../services/api'
import useProjectStore from '../store/projectStore'
import useThemeStore, { TEMAS } from '../store/themeStore'
import LanguageSelector from '../components/common/LanguageSelector'
import ThemeToggle from '../components/common/ThemeToggle'
import AiEngineToggle from '../components/common/AiEngineToggle'
import BackgroundSlideshow from '../components/common/BackgroundSlideshow'
import ErrorBoundary from '../components/UI/ErrorBoundary'

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
      emoji: '🎨',
      titulo: t('landing.modes.custom.title') || 'Tu Propio Estilo',
      descripcion: t('landing.modes.custom.desc') || 'Sube 3 a 5 páginas de tu arte para clonar tu firma visual con IA.',
      color: 'border-purple-500 bg-purple-500',
    },
    {
      id: 'legendario',
      emoji: '⚡',
      titulo: t('landing.modes.legendary.title') || 'Estilos Legendarios',
      descripcion: t('landing.modes.legendary.desc') || 'Crea en el estilo visual de los grandes mangakas de la historia.',
      color: 'border-rdc-accent bg-rdc-accent',
    },
    {
      id: 'aleatorio',
      emoji: '🎲',
      titulo: t('landing.modes.random.title') || 'Estilo Sorpresa',
      descripcion: t('landing.modes.random.desc') || 'Deja que la IA combine técnicas y cree un estilo único para ti.',
      color: 'border-green-500 bg-green-500',
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
        modo_creacion: modoSeleccionado,
        formato_lectura: form.formato_lectura,
        estilo_legendario: estiloSeleccionado || null,
      }
      const res = await projectsAPI.crear(datos)
      const nuevoProyecto = res?.data
      if (nuevoProyecto && nuevoProyecto.id) {
        setProyectoActivo(nuevoProyecto)
        navigate(`/proyecto/${nuevoProyecto.id}`)
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al crear el proyecto'
      setError(msg)
      setPaso(2)
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-rdc-primary flex flex-col justify-between transition-colors duration-300 relative overflow-x-hidden">
      {/* Slideshow animado de fondo con transición cada 5000ms */}
      <BackgroundSlideshow
        imagenes={fondosDisponibles}
        intervalo={5000}
        overlayClassName={esGhibli ? 'bg-white/20 backdrop-blur-[0.5px]' : 'bg-black/55 backdrop-blur-[0.5px]'}
      />

      {/* Header */}
      <nav className="bg-rdc-secondary/90 border-b border-rdc-border px-6 py-4
                      flex items-center justify-between sticky top-0 z-40 backdrop-blur-md transition-colors duration-300">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="flex items-center gap-2 group cursor-pointer mr-2 select-none">
            <h1 className="font-manga text-2xl text-rdc-accent group-hover:scale-105 transition-transform">MEP</h1>
          </Link>
          <button
            onClick={() => paso > 1 ? setPaso(p => p - 1) : navigate('/dashboard')}
            className="text-rdc-muted hover:text-rdc-text transition-colors font-titulo text-sm flex items-center gap-1 cursor-pointer"
          >
            ← {t('newProject.back') || 'Volver'}
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
                {MODOS.map((modo) => (
                  <button
                    key={modo.id}
                    onClick={() => {
                      setModoSeleccionado(modo.id)
                      setPaso(2)
                    }}
                    className="bg-rdc-secondary/90 border-2 border-rdc-border
                               hover:border-rdc-accent rounded-xl p-6 text-left
                               transition-all duration-200 hover:shadow-2xl hover:scale-105
                               hover:shadow-rdc-accent/20 group cursor-pointer backdrop-blur-md"
                  >
                    <span className="text-5xl block mb-4 group-hover:scale-110 transition-transform">{modo.emoji}</span>
                    <h3 className="font-titulo text-xl text-rdc-text font-semibold mb-2
                                   group-hover:text-rdc-accent transition-colors">
                      {modo.titulo}
                    </h3>
                    <p className="text-rdc-muted text-sm leading-relaxed">
                      {modo.descripcion}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── PASO 2: Detalles del proyecto ── */}
          {paso === 2 && (
            <div className="bg-rdc-secondary/95 border border-rdc-border rounded-2xl p-8 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">
                  {MODOS.find(m => m.id === modoSeleccionado)?.emoji}
                </span>
                <div>
                  <h2 className="font-titulo text-2xl text-rdc-text font-semibold">
                    {MODOS.find(m => m.id === modoSeleccionado)?.titulo}
                  </h2>
                  <p className="text-rdc-muted text-sm font-titulo">
                    {t('newProject.configTitle') || 'Configuración inicial'}
                  </p>
                </div>
              </div>

              {error && (
                <div className="bg-rdc-error bg-opacity-20 border border-rdc-error
                                text-rdc-error rounded-lg p-3 mb-5 text-sm font-titulo">
                  {error}
                </div>
              )}

              <div className="space-y-5">
                {/* Nombre del proyecto */}
                <div>
                  <label className="block text-rdc-muted text-sm mb-2 font-titulo">
                    {t('newProject.projectName') || 'Nombre de la obra'}
                  </label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                    placeholder={t('newProject.projectNamePlaceholder') || 'Ej: El Guardián del Cosmos'}
                    className="w-full bg-rdc-card border border-rdc-border rounded-lg
                               px-4 py-3 text-rdc-text placeholder-rdc-muted
                               focus:outline-none focus:border-rdc-accent
                               transition-colors duration-200 font-titulo"
                  />
                </div>

                {/* Formato de lectura */}
                <div>
                  <label className="block text-rdc-muted text-sm mb-3 font-titulo">
                    {t('newProject.readingFormat') || 'Formato de lectura'}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'manga', label: t('newProject.manga') || 'Manga Tradicional', sub: t('newProject.mangaDesc') || 'Lectura de derecha a izquierda (Japón)' },
                      { id: 'occidental', label: t('newProject.western') || 'Cómic Occidental', sub: t('newProject.westernDesc') || 'Lectura de izquierda a derecha' },
                    ].map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, formato_lectura: fmt.id }))}
                        className={`border-2 rounded-lg p-4 text-left transition-all duration-200 cursor-pointer
                          ${form.formato_lectura === fmt.id
                            ? 'border-rdc-accent bg-rdc-accent bg-opacity-10 shadow-sm'
                            : 'border-rdc-border hover:border-rdc-muted bg-rdc-card/50'
                          }`}
                      >
                        <p className="text-rdc-text font-semibold text-sm font-titulo">{fmt.label}</p>
                        <p className="text-rdc-muted text-xs mt-1">{fmt.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selector de estilo legendario */}
                {modoSeleccionado === 'legendario' && (
                  <div>
                    <label className="block text-rdc-muted text-sm mb-3 font-titulo">
                      {t('newProject.legendaryStyle') || 'Estilo legendario'}
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                      {estilosLegendarios.map((estilo) => (
                        <button
                          key={estilo.id}
                          type="button"
                          onClick={() => setEstiloSeleccionado(estilo.id)}
                          className={`border rounded-lg p-3 text-left transition-all duration-200 cursor-pointer
                            ${estiloSeleccionado === estilo.id
                              ? 'border-rdc-accent bg-rdc-accent bg-opacity-15 shadow-sm'
                              : 'border-rdc-border hover:border-rdc-muted bg-rdc-card/40'
                            }`}
                        >
                          <span className="text-xl">{estilo.emoji}</span>
                          <p className="text-rdc-text text-sm font-semibold mt-1 font-titulo">
                            {estilo.nombre}
                          </p>
                          <p className="text-rdc-muted text-xs leading-tight mt-1">
                            {estilo.descripcion}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nota modo propio */}
                {modoSeleccionado === 'propio' && (
                  <div className="bg-purple-500 bg-opacity-10 border border-purple-500
                                  border-opacity-30 rounded-lg p-4">
                    <p className="text-purple-300 text-sm font-titulo">
                      {t('newProject.customNote') || 'Podrás subir tus páginas de referencia en el siguiente paso para calibrar tu firma visual.'}
                    </p>
                  </div>
                )}

                {/* Nota modo aleatorio */}
                {modoSeleccionado === 'aleatorio' && (
                  <div className="bg-green-500 bg-opacity-10 border border-green-500
                                  border-opacity-30 rounded-lg p-4">
                    <p className="text-green-300 text-sm font-titulo">
                      {t('newProject.randomNote') || 'La IA generará un conjunto de directivas visuales balanceadas para tu proyecto.'}
                    </p>
                  </div>
                )}

                {/* Botón crear */}
                <button
                  onClick={handleCrear}
                  disabled={cargando}
                  className="w-full bg-rdc-accent hover:bg-rdc-accent-hover
                             text-white font-titulo font-semibold text-lg
                             py-3.5 rounded-xl transition-all duration-200
                             disabled:opacity-50 mt-4 tracking-wide shadow-lg cursor-pointer hover:scale-[1.02]"
                >
                  {t('newProject.createBtn') || 'Crear Proyecto'}
                </button>
              </div>
            </div>
          )}

          {/* ── PASO 3: Creando... ── */}
          {paso === 3 && (
            <div className="text-center py-20 bg-rdc-secondary/90 border border-rdc-border rounded-2xl p-8 backdrop-blur-md shadow-2xl animate-in fade-in duration-300">
              <div className="text-6xl mb-6 animate-bounce">🎌</div>
              <h2 className="font-titulo text-2xl text-rdc-text font-semibold mb-2">
                {t('newProject.creatingTitle') || 'Preparando tu Workspace...'}
              </h2>
              <p className="text-rdc-muted font-titulo">{t('newProject.creatingDesc') || 'Configurando lienzo, guiones y firma de IA...'}</p>
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
