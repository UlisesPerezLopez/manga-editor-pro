// ProjectStudio.jsx
// Workspace principal del proyecto en MEP — Manga Editor Pro con Lucide React.

import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react'
import useProjectStore from '../store/projectStore'
import useAuthStore from '../store/authStore'
import { generateAPI, chaptersAPI } from '../services/api'
import ScriptGenerator from '../components/ScriptGenerator'
import FirmaVisual from '../components/FirmaVisual'
import Modal from '../components/UI/Modal'
import Spinner from '../components/UI/Spinner'
import ErrorBoundary from '../components/UI/ErrorBoundary'
import StyleWizard from '../components/StyleWizard'
import Personajes from '../components/Personajes'
import PanelArtStudio from '../components/PanelArtStudio'
import ExportPanel from '../components/Export/ExportPanel'
import LanguageSelector from '../components/common/LanguageSelector'
import ThemeToggle from '../components/common/ThemeToggle'
import AiEngineToggle from '../components/common/AiEngineToggle'
import AiEngineFallbackBanner from '../components/common/AiEngineFallbackBanner'
import ComicReaderModal from '../components/Reader/ComicReaderModal'
import BackupModal from '../components/Backup/BackupModal'
import OnlineBadge from '../components/common/OnlineBadge'
import AuthorAnalyticsPanel from '../components/Analytics/AuthorAnalyticsPanel'
import PublishModal from '../components/Publishing/PublishModal'
import ThemeBackgroundAnimation from '../components/common/ThemeBackgroundAnimation'
import UserAvatar from '../components/common/UserAvatar'
import MangaIcon from '../components/common/MangaIcon'

function ProjectStudioContent() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { usuario } = useAuthStore()
  const { proyectoActivo, cargarProyecto, cargandoProyecto } = useProjectStore()

  const [seccionActiva, setSeccionActiva] = useState('guiones')
  const [modalGemini, setModalGemini] = useState(false)
  const [estadoGemini, setEstadoGemini] = useState(null)
  const [lectorAbierto, setLectorAbierto] = useState(false)
  const [backupModalAbierto, setBackupModalAbierto] = useState(false)
  const [publishModalAbierto, setPublishModalAbierto] = useState(false)
  const [capitulosProyecto, setCapitulosProyecto] = useState([])
  const [cargandoInicial, setCargandoInicial] = useState(true)
  const [errorCarga, setErrorCarga] = useState(null)

  // Secciones del workspace con i18n reactivo e iconos Manga oficiales
  const SECCIONES = useMemo(() => [
    { id: 'guiones',      iconName: 'guionista_ia',         label: t('projectStudio.scriptWriter') || 'Guionista IA', proximamente: false },
    { id: 'firma-visual', iconName: 'firma_visual',         label: t('projectStudio.visualSignature') || 'Firma Visual', proximamente: false },
    { id: 'personajes',   iconName: 'personajes',           label: t('projectStudio.characters') || 'Personajes', proximamente: false },
    { id: 'vinetas',      iconName: 'imagenes_ia_generadas', label: t('projectStudio.panelGenerator') || 'Generador de Viñetas', proximamente: false },
    { id: 'editor',       iconName: 'editor_paginas',       label: t('projectStudio.pageEditor') || 'Editor de Páginas', proximamente: false }, 
    { id: 'analitica',    iconName: 'analitica_engagement', label: t('analytics.title') || 'Analítica y Engagement', proximamente: false },
    { id: 'exportar',     iconName: 'exportar',             label: t('projectStudio.export') || 'Exportar', proximamente: false },
  ], [t])

  const cargarCapitulos = async (pId = (id ? parseInt(id, 10) : null)) => {
    if (!pId || isNaN(pId)) return
    try {
      const res = await chaptersAPI.listar(pId)
      setCapitulosProyecto(res?.data || [])
    } catch {
      // fallback silencioso
    }
  }

  // Cargar el proyecto y capítulos al montar el componente
  useEffect(() => {
    let activo = true

    const cargarTodo = async () => {
      if (!id) {
        if (activo) {
          setErrorCarga('ID de proyecto no proporcionado')
          setCargandoInicial(false)
        }
        return
      }

      const pId = parseInt(id, 10)
      if (isNaN(pId) || pId <= 0) {
        if (activo) {
          setErrorCarga('ID de proyecto inválido')
          setCargandoInicial(false)
        }
        return
      }

      // Si el proyecto activo en el store ya coincide con el ID, solo recargamos capítulos si es necesario
      if (proyectoActivo && String(proyectoActivo?.id) === String(id)) {
        setCargandoInicial(false)
        try {
          const resCaps = await chaptersAPI.listar(pId)
          if (activo) setCapitulosProyecto(resCaps?.data || [])
        } catch {}
        return
      }

      setCargandoInicial(true)
      setErrorCarga(null)
      try {
        const [proj, caps] = await Promise.all([
          cargarProyecto(pId),
          chaptersAPI.listar(pId).then(r => r?.data).catch(() => [])
        ])
        if (activo) {
          if (caps) setCapitulosProyecto(caps)
          if (!proj && !proyectoActivo) {
            setErrorCarga('Proyecto no encontrado')
          }
        }
      } catch (err) {
        if (activo) {
          setErrorCarga(err.response?.data?.detail || err.message || 'Error al cargar el proyecto')
        }
      } finally {
        if (activo) setCargandoInicial(false)
      }
    }

    cargarTodo()

    return () => {
      activo = false
    }
  }, [id])

  const verificarGemini = async () => {
    setModalGemini(true)
    setEstadoGemini(null)
    try {
      const respuesta = await generateAPI.estadoGemini()
      setEstadoGemini(respuesta?.data)
    } catch (error) {
      setEstadoGemini({ estado: 'ERROR', error: error?.message || 'Error desconocido' })
    }
  }

  if (cargandoInicial || cargandoProyecto || (!proyectoActivo && !errorCarga)) {
    return (
      <div className="min-h-screen bg-rdc-primary flex flex-col items-center justify-center">
        <Spinner texto={t('dashboard.loading') || 'Cargando proyecto...'} size="lg" />
      </div>
    )
  }

  if (errorCarga || !proyectoActivo) {
    return (
      <div className="min-h-screen bg-rdc-primary flex items-center justify-center p-4">
        <div className="text-center bg-rdc-secondary/90 border border-rdc-border p-8 rounded-2xl shadow-xl max-w-md backdrop-blur-md">
          <div className="flex items-center justify-center gap-2 text-rdc-error text-lg mb-2 font-bold font-titulo">
            <AlertTriangle className="w-6 h-6" />
            <span>{errorCarga || 'Proyecto no encontrado'}</span>
          </div>
          <p className="text-rdc-muted text-xs mb-6 font-titulo">No se pudo cargar la información del proyecto solicitado.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-rdc-accent hover:bg-rdc-accent-hover text-white font-titulo font-bold px-6 py-2.5 rounded-xl transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> {t('nav.dashboard') || 'Panel'}
          </button>
        </div>
      </div>
    )
  }

  const modoActual = proyectoActivo?.modo_creacion || 'propio'
  const nombreProyecto = proyectoActivo?.nombre || 'Proyecto sin nombre'
  const projectIdNumber = proyectoActivo?.id ? parseInt(proyectoActivo.id, 10) : (id ? parseInt(id, 10) : 0)

  const renderModoIcono = () => {
    if (modoActual === 'legendario') return <MangaIcon name="modo_legendario" size={20} />
    if (modoActual === 'aleatorio') return <MangaIcon name="modo_aleatorio" size={20} />
    return <MangaIcon name="creacion_propia" size={20} />
  }

  return (
    <div className="min-h-screen bg-rdc-primary flex flex-col justify-between transition-colors duration-300 relative">
      <ThemeBackgroundAnimation />
      <AiEngineFallbackBanner />

      {/* ── Navbar superior ── */}
      <nav className="bg-rdc-secondary/90 border-b border-rdc-border px-6 py-3
                      flex items-center justify-between flex-shrink-0 z-30 sticky top-0 backdrop-blur-md transition-colors duration-300">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 group cursor-pointer select-none" title="MEP — Manga Editor Pro">
            <h1 className="font-manga text-2xl text-rdc-accent group-hover:scale-105 transition-transform">MEP</h1>
          </Link>
          <div className="h-4 w-px bg-rdc-border" />
          <button
            onClick={() => navigate('/dashboard')}
            className="text-rdc-muted hover:text-rdc-text transition-colors text-sm font-titulo cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> {t('dashboard.projects') || 'Proyectos'}
          </button>
          <div className="h-4 w-px bg-rdc-border" />
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-rdc-card border border-rdc-border">
              {renderModoIcono()}
            </div>
            <div>
              <h2 className="font-titulo text-lg text-rdc-text font-semibold leading-none">
                {nombreProyecto}
              </h2>
              <p className="text-rdc-muted text-xs capitalize font-titulo">
                {t('dashboard.inMode', { mode: modoActual })}
                {proyectoActivo?.style_locked && ` · ${t('projectStudio.styleLocked') || 'Firma Bloqueada'}`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <OnlineBadge />
          <button
            onClick={() => setBackupModalAbierto(true)}
            className="bg-rdc-card hover:bg-rdc-secondary border border-rdc-border hover:border-rdc-accent text-rdc-text text-xs font-titulo font-semibold px-2.5 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            title={t('backup.title') || 'Copia de Seguridad'}
          >
            <MangaIcon name="backup" size={18} className="mr-2 inline-block" /> <span className="hidden md:inline">Backup</span>
          </button>
          <button
            onClick={() => setPublishModalAbierto(true)}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-titulo font-semibold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            title={t('publishing.title') || 'Publicación Digital y SEO Editorial'}
          >
            <MangaIcon name="formato_occidental" size={18} className="mr-2 inline-block" /> <span className="hidden md:inline">{t('publishing.title') || 'Publicar'}</span>
          </button>
          <button
            onClick={() => setLectorAbierto(true)}
            className="bg-rdc-accent hover:bg-rdc-accent-hover text-white text-xs font-titulo font-semibold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            title={t('reader.openReader') || 'Leer Manga'}
          >
            <MangaIcon name="leer_comic_visor" size={18} className="mr-2 inline-block" /> <span className="hidden sm:inline">{t('reader.readProject') || 'Leer Manga'}</span>
          </button>
          <AiEngineToggle />
          <ThemeToggle />
          <LanguageSelector />
          <button
            onClick={verificarGemini}
            className="text-rdc-muted hover:text-rdc-accent text-xs
                       border border-rdc-border hover:border-rdc-accent
                       px-3 py-1.5 rounded-xl transition-all duration-200
                       flex items-center gap-1.5 font-titulo cursor-pointer"
            title="Diagnóstico de IA"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden lg:inline">{t('projectStudio.geminiStatus') || 'Estado IA'}</span>
          </button>
          <UserAvatar />
        </div>
      </nav>

      {/* ── Layout principal ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar izquierdo ── */}
        <aside className="w-56 bg-rdc-secondary border-r border-rdc-border
                          flex flex-col flex-shrink-0 py-4">
          <p className="text-rdc-muted text-xs uppercase px-4 mb-3 tracking-wider font-titulo">
            {t('projectStudio.tools') || 'Herramientas'}
          </p>
          <div className="space-y-1 px-2">
            {SECCIONES.map((sec) => {
              const esActiva = seccionActiva === sec.id
              return (
                <button
                  key={sec.id}
                  onClick={() => setSeccionActiva(sec.id)}
                  disabled={sec.proximamente}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                              transition-all duration-200 text-left cursor-pointer
                              ${esActiva
                                ? 'bg-rdc-accent/15 text-rdc-accent font-semibold shadow-xs'
                                : 'text-rdc-muted hover:text-rdc-text hover:bg-rdc-card'
                              }
                              ${sec.proximamente
                                ? 'opacity-40 cursor-not-allowed'
                                : ''
                              }`}
                >
                  <MangaIcon
                    name={sec.iconName}
                    size={24}
                    className={`flex-shrink-0 transition-transform duration-200 ${
                      esActiva ? 'scale-105 drop-shadow-xs' : 'opacity-85'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="font-titulo text-xs block truncate">{sec.label}</span>
                    {sec.proximamente && (
                      <p className="text-[10px] opacity-60">Próximamente</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Info del proyecto en el sidebar */}
          <div className="mt-auto px-4 pt-4 border-t border-rdc-border">
            <p className="text-rdc-muted text-xs mb-2 font-titulo uppercase tracking-wider font-semibold">
              {t('projectStudio.visualSignature') || 'Firma Visual'}
            </p>
            {proyectoActivo?.style_locked ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 shadow-xs">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-titulo font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Firma Calibrada</span>
                </div>
                {proyectoActivo?.estilo_legendario && (
                  <p className="text-rdc-muted text-xs mt-1 capitalize font-titulo truncate">
                    {proyectoActivo.estilo_legendario.replace('aleatorio_', '').replace(/_/g, ' ')}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 shadow-xs">
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs font-titulo font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Sin Firma Visual</span>
                </div>
                <p className="text-rdc-muted text-[11px] mt-1">
                  Pendiente de calibración
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* ── Área de contenido principal ── */}
        <main className="flex-1 overflow-y-auto p-6">

          {/* Sección: Guionista IA */}
          {seccionActiva === 'guiones' && (
            <div className="max-w-3xl mx-auto">
              <div className="mb-6">
                <h2 className="font-titulo text-2xl text-rdc-text font-semibold flex items-center">
                  <MangaIcon name="guionista_ia" size={28} className="mr-3 inline-block" />
                  <span>{t('projectStudio.scriptSectionTitle') || 'Guionista IA'}</span>
                </h2>
                <p className="text-rdc-muted text-sm mt-1">
                  {t('projectStudio.scriptSectionDesc') || 'Genera y estructura sinopsis, arcos argumentales y guiones técnicos para tus capítulos.'}
                </p>
              </div>
              <div className="bg-rdc-secondary border border-rdc-border rounded-2xl p-6 shadow-xl">
                <ScriptGenerator
                  proyecto={proyectoActivo}
                  onIrAFirmaVisual={() => setSeccionActiva('firma-visual')}
                  onCapitulosCreados={() => cargarCapitulos(projectIdNumber)}
                />
              </div>
            </div>
          )}

          {/* Sección: Firma Visual */}
          {seccionActiva === 'firma-visual' && (
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-2xl font-black flex items-center gap-3 font-titulo text-slate-900 dark:text-white">
                  <MangaIcon name="firma_visual" size={28} />
                  <span>Firma Visual</span>
                </h2>
                <p className="text-rdc-muted text-sm mt-1">
                  {modoActual === 'propio'
                    ? (t('projectStudio.styleSectionDescOwn') || 'Define y calibra la paleta de tinta, tramas y parámetros visuales de tu obra.')
                    : (t('projectStudio.styleSectionDescLegendary') || 'Estilo y parámetros maestros asignados a tu obra.')
                  }
                </p>
              </div>

              <div className="bg-rdc-secondary border border-rdc-border rounded-2xl p-6 shadow-xl">
                <FirmaVisual
                  proyecto={proyectoActivo}
                  onActualizar={() => {
                    if (projectIdNumber) cargarProyecto(projectIdNumber)
                  }}
                />
              </div>
            </div>
          )}

          {/* Sección: Personajes */}
          {seccionActiva === 'personajes' && (
            <div className="max-w-5xl mx-auto">
              <Personajes
                proyecto={proyectoActivo}
                onActualizar={() => {
                  if (projectIdNumber) cargarProyecto(projectIdNumber)
                }}
              />
            </div>
          )}

          {/* Sección: Generador de Viñetas (Panel Art Studio) */}
          {seccionActiva === 'vinetas' && (
            <div className="max-w-6xl mx-auto">
              <PanelArtStudio
                proyecto={proyectoActivo}
                onActualizar={() => {
                  if (projectIdNumber) {
                    cargarProyecto(projectIdNumber)
                    cargarCapitulos(projectIdNumber)
                  }
                }}
              />
            </div>
          )}

          {/* Sección: Editor de Páginas */}
          {seccionActiva === 'editor' && (
            <div className="max-w-3xl mx-auto">
              <div className="mb-6">
                <h2 className="font-titulo text-2xl text-rdc-text font-semibold flex items-center">
                  <MangaIcon name="editor_paginas" size={28} className="mr-3 inline-block" />
                  <span>{t('projectStudio.editorSectionTitle') || 'Editor de Páginas'}</span>
                </h2>
                <p className="text-rdc-muted text-sm mt-1">
                  {t('projectStudio.editorSectionDesc') || 'Maqueta viñetas, globos de diálogo, tramas y efectos sobre el canvas.'}
                </p>
              </div>
              <div className="bg-rdc-secondary border border-rdc-border
                              rounded-2xl p-8 text-center space-y-4 shadow-xl">
                <div className="w-20 h-20 rounded-2xl bg-rdc-accent/15 border border-rdc-accent/30 flex items-center justify-center mx-auto text-rdc-accent">
                  <MangaIcon name="editor_paginas" size={40} />
                </div>
                <h3 className="font-titulo text-xl text-rdc-text font-semibold">
                  MEP Manga Studio Canvas
                </h3>
                <p className="text-rdc-muted text-sm max-w-md mx-auto">
                  {t('projectStudio.editorDesc') || 'Accede al editor multipágina con soporte para capas, plantillas de viñetas manga y renderizado acelerado.'}
                </p>
                <button
                  onClick={() => navigate(`/editor/${id}`)}
                  className="bg-rdc-accent hover:bg-rdc-accent-hover text-white
                             font-titulo font-semibold px-8 py-4 rounded-xl
                             transition-all duration-200 text-base
                             flex items-center gap-3 mx-auto shadow-lg cursor-pointer hover:scale-105"
                >
                  <MangaIcon name="editor_paginas" size={20} />
                  <span>{t('projectStudio.openPageEditor') || 'Abrir Editor de Páginas'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Sección: Analítica y Engagement */}
          {seccionActiva === 'analitica' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="mb-4">
                <h2 className="font-titulo text-2xl text-rdc-text font-semibold flex items-center">
                  <MangaIcon name="analitica_engagement" size={28} className="mr-3 inline-block" />
                  <span>{t('analytics.title') || 'Analítica y Engagement del Autor'}</span>
                </h2>
                <p className="text-rdc-muted text-sm mt-1">
                  Métricas de lectores, lecturas en tiempo real, retención y estadísticas de soporte para creadores.
                </p>
              </div>
              <AuthorAnalyticsPanel proyectoId={projectIdNumber} proyecto={proyectoActivo} />
            </div>
          )}

          {/* Sección: Exportar */}
          {seccionActiva === 'exportar' && (
            <div className="max-w-3xl mx-auto">
              <ExportPanel
                proyecto={proyectoActivo}
                canvasRef={null}
                capituloActual={null}
                onAbrirLector={() => setLectorAbierto(true)}
              />
            </div>
          )}

        </main>
      </div>

      {/* ── Modal: Estado de Gemini ── */}
      <Modal
        abierto={modalGemini}
        onCerrar={() => setModalGemini(false)}
        titulo="Estado del Servicio IA"
        ancho="max-w-md"
      >
        {!estadoGemini ? (
          <div className="py-8">
            <Spinner texto="Verificando conexión con el motor de IA..." />
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`rounded-xl p-4 ${
              estadoGemini.estado === 'OPERATIVO'
                ? 'bg-emerald-500/10 border border-emerald-500/30'
                : 'bg-rdc-error/10 border border-rdc-error/30'
            }`}>
              <p className={`font-titulo font-semibold text-base flex items-center gap-2 ${
                estadoGemini.estado === 'OPERATIVO'
                  ? 'text-emerald-400'
                  : 'text-rdc-error'
              }`}>
                {estadoGemini.estado === 'OPERATIVO' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" /> OPERATIVO
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5" /> ERROR
                  </>
                )}
              </p>
              <p className="text-rdc-muted text-sm mt-2">{estadoGemini.mensaje || 'Conexión activa y lista.'}</p>
              {estadoGemini.error && (
                <p className="text-rdc-error text-xs mt-2 font-mono">
                  {estadoGemini.error}
                </p>
              )}
            </div>
            <div className="bg-rdc-card rounded-xl p-4 border border-rdc-border">
              <p className="text-rdc-muted text-xs uppercase mb-1 font-titulo font-semibold">Rate Limiting & Caché</p>
              <p className="text-rdc-text text-sm font-titulo">Máximo 15 peticiones/minuto por usuario</p>
              <p className="text-rdc-muted text-xs mt-1">
                Con gestión automática de tokens y reintentos ante cuellos de botella.
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal de Publicación Digital & SEO ── */}
      {publishModalAbierto && (
        <PublishModal
          abierto={publishModalAbierto}
          onCerrar={() => setPublishModalAbierto(false)}
          proyecto={proyectoActivo}
          capitulos={capitulosProyecto}
          onActualizar={() => {
            if (projectIdNumber) cargarProyecto(projectIdNumber)
            cargarCapitulos()
          }}
        />
      )}

      {/* ── Lector Interactivo Modal ── */}
      {lectorAbierto && proyectoActivo && (
        <ComicReaderModal
          abierto={lectorAbierto}
          onCerrar={() => setLectorAbierto(false)}
          proyecto={proyectoActivo}
        />
      )}

      {/* ── Modal de Copias de Seguridad (Backup & Restore) ── */}
      {backupModalAbierto && (
        <BackupModal
          abierto={backupModalAbierto}
          onCerrar={() => setBackupModalAbierto(false)}
          proyectoInicial={proyectoActivo}
          onRestauracionExitosa={() => {
            if (projectIdNumber) cargarProyecto(projectIdNumber)
            cargarCapitulos()
          }}
        />
      )}
    </div>
  )
}

export default function ProjectStudio() {
  return (
    <ErrorBoundary>
      <ProjectStudioContent />
    </ErrorBoundary>
  )
}
