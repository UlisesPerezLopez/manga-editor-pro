// ProjectStudio.jsx
// Workspace principal del proyecto en MEP — Manga Editor Pro.

import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useProjectStore from '../store/projectStore'
import useAuthStore from '../store/authStore'
import { generateAPI, chaptersAPI } from '../services/api'
import ScriptGenerator from '../components/ScriptGenerator'
import Modal from '../components/UI/Modal'
import Spinner from '../components/UI/Spinner'
import ErrorBoundary from '../components/UI/ErrorBoundary'
import StyleWizard from '../components/StyleWizard'
import CharacterList from '../components/Characters/CharacterList'
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

  // Secciones del workspace con i18n reactivo
  const SECCIONES = useMemo(() => [
    { id: 'guiones',     emoji: '📝', label: t('projectStudio.scriptWriter'),    proximamente: false },
    { id: 'firma-visual',emoji: '🎨', label: t('projectStudio.visualSignature'), proximamente: false },
    { id: 'personajes',  emoji: '👤', label: t('projectStudio.characters'),      proximamente: false },
    { id: 'editor',      emoji: '🖼️', label: t('projectStudio.pageEditor'),      proximamente: false }, 
    { id: 'analitica',   emoji: '📊', label: t('analytics.title'),              proximamente: false },
    { id: 'exportar',    emoji: '📤', label: t('projectStudio.export'),        proximamente: false },
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
          <p className="text-rdc-error text-lg mb-2 font-bold font-titulo">⚠️ {errorCarga || 'Proyecto no encontrado'}</p>
          <p className="text-rdc-muted text-xs mb-6 font-titulo">No se pudo cargar la información del proyecto solicitado.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-rdc-accent hover:bg-rdc-accent-hover text-white font-titulo font-bold px-6 py-2.5 rounded-xl transition-all shadow-md"
          >
            ← {t('nav.dashboard') || 'Panel'}
          </button>
        </div>
      </div>
    )
  }

  const ICONOS_MODO = { propio: '🎨', legendario: '⚡', aleatorio: '🎲' }
  const modoActual = proyectoActivo?.modo_creacion || 'propio'
  const nombreProyecto = proyectoActivo?.nombre || 'Proyecto sin nombre'
  const projectIdNumber = proyectoActivo?.id ? parseInt(proyectoActivo.id, 10) : (id ? parseInt(id, 10) : 0)

  return (
    <div className="min-h-screen bg-rdc-primary flex flex-col justify-between transition-colors duration-300">
      <AiEngineFallbackBanner />

      {/* ── Navbar superior ── */}
      <nav className="bg-rdc-secondary/90 border-b border-rdc-border px-6 py-3
                      flex items-center justify-between flex-shrink-0 z-30 sticky top-0 backdrop-blur-md transition-colors duration-300">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="flex items-center gap-2 group cursor-pointer select-none" title="Ir al Dashboard">
            <h1 className="font-manga text-2xl text-rdc-accent group-hover:scale-105 transition-transform">MEP</h1>
          </Link>
          <div className="h-4 w-px bg-rdc-border" />
          <button
            onClick={() => navigate('/dashboard')}
            className="text-rdc-muted hover:text-rdc-text transition-colors text-sm font-titulo cursor-pointer"
          >
            ← {t('dashboard.projects') || 'Proyectos'}
          </button>
          <div className="h-4 w-px bg-rdc-border" />
          <div className="flex items-center gap-2">
            <span className="text-xl">
              {ICONOS_MODO[modoActual] || '📖'}
            </span>
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
            className="bg-rdc-card hover:bg-rdc-secondary border border-rdc-border hover:border-rdc-accent text-rdc-text text-xs font-titulo font-semibold px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            title={t('backup.title')}
          >
            <span>💾</span> <span className="hidden md:inline">Backup</span>
          </button>
          <button
            onClick={() => setPublishModalAbierto(true)}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-titulo font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            title={t('publishing.title')}
          >
            <span>🚀</span> <span className="hidden md:inline">{t('publishing.title')}</span>
          </button>
          <button
            onClick={() => setLectorAbierto(true)}
            className="bg-rdc-accent hover:bg-rdc-accent-hover text-white text-xs font-titulo font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            title={t('reader.openReader')}
          >
            <span>📖</span> {t('reader.readProject') || 'Leer Manga'}
          </button>
          <AiEngineToggle />
          <ThemeToggle />
          <LanguageSelector />
          <button
            onClick={verificarGemini}
            className="text-rdc-muted hover:text-rdc-accent text-xs
                       border border-rdc-border hover:border-rdc-accent
                       px-3 py-1.5 rounded-lg transition-all duration-200
                       flex items-center gap-1.5 font-titulo cursor-pointer"
          >
            {t('projectStudio.geminiStatus') || 'Estado IA'}
          </button>
          <span className="text-rdc-muted text-sm hidden md:block font-titulo">
            {usuario?.nombre_artistico || usuario?.username}
          </span>
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
          {SECCIONES.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setSeccionActiva(sec.id)}
              disabled={sec.proximamente}
              className={`flex items-center gap-3 px-4 py-3 text-sm
                          transition-all duration-200 text-left cursor-pointer
                          ${seccionActiva === sec.id
                            ? 'bg-rdc-accent bg-opacity-15 text-rdc-accent border-r-2 border-rdc-accent'
                            : 'text-rdc-muted hover:text-rdc-text hover:bg-rdc-card'
                          }
                          ${sec.proximamente
                            ? 'opacity-40 cursor-not-allowed'
                            : ''
                          }`}
            >
              <span className="text-lg">{sec.emoji}</span>
              <div>
                <span className="font-titulo font-medium">{sec.label}</span>
                {sec.proximamente && (
                  <p className="text-xs opacity-60">Próximamente</p>
                )}
              </div>
            </button>
          ))}

          {/* Info del proyecto en el sidebar */}
          <div className="mt-auto px-4 pt-4 border-t border-rdc-border">
            <p className="text-rdc-muted text-xs mb-2 font-titulo">{t('projectStudio.visualSignature') || 'Firma Visual'}</p>
            {proyectoActivo?.style_locked ? (
              <div className="bg-rdc-accent bg-opacity-10 border border-rdc-accent
                              border-opacity-30 rounded-lg p-2">
                <p className="text-rdc-accent text-xs font-titulo">{t('projectStudio.styleLocked') || 'Firma Bloqueada'}</p>
                {proyectoActivo?.estilo_legendario && (
                  <p className="text-rdc-muted text-xs mt-1 capitalize font-titulo">
                    {proyectoActivo.estilo_legendario.replace(/_/g, ' ')}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-yellow-500 bg-opacity-10 border border-yellow-500
                              border-opacity-30 rounded-lg p-2">
                <p className="text-yellow-400 text-xs font-titulo">{t('projectStudio.stylePending') || 'Pendiente'}</p>
                <p className="text-rdc-muted text-xs mt-1">
                  {t('projectStudio.pendingSetup') || 'Configura la firma visual'}
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
                <h2 className="font-titulo text-2xl text-rdc-text font-semibold">
                  {t('projectStudio.scriptSectionTitle')}
                </h2>
                <p className="text-rdc-muted text-sm mt-1">
                  {t('projectStudio.scriptSectionDesc')}
                </p>
              </div>
              {modoActual === 'propio' && !proyectoActivo?.style_locked && (
                <div className="bg-yellow-500 bg-opacity-10 border border-yellow-500
                                border-opacity-30 rounded-xl p-4 mb-4">
                  <p className="text-yellow-400 text-sm font-semibold font-titulo">
                    {t('projectStudio.stylePending')}
                  </p>
                  <p className="text-rdc-muted text-xs mt-1">
                    {t('newProject.customNote')}
                  </p>
                </div>
              )}
              <div className="bg-rdc-secondary border border-rdc-border rounded-xl p-6 shadow-xl">
                <ScriptGenerator proyecto={proyectoActivo} />
              </div>
            </div>
          )}

          {/* Sección: Firma Visual */}
          {seccionActiva === 'firma-visual' && (
            <div className="max-w-3xl mx-auto">
              <div className="mb-6">
                <h2 className="font-titulo text-2xl text-rdc-text font-semibold">
                  {t('projectStudio.styleSectionTitle')}
                </h2>
                <p className="text-rdc-muted text-sm mt-1">
                  {modoActual === 'propio'
                    ? t('projectStudio.styleSectionDescOwn')
                    : t('projectStudio.styleSectionDescLegendary')
                  }
                </p>
              </div>

              {modoActual === 'propio' ? (
                <div className="bg-rdc-secondary border border-rdc-border rounded-xl p-6 shadow-xl">
                  <StyleWizard
                    proyecto={proyectoActivo}
                    onEstiloBloqueado={() => {
                      if (projectIdNumber) cargarProyecto(projectIdNumber)
                    }}
                  />
                </div>
              ) : (
                <div className="bg-rdc-secondary border border-rdc-border rounded-xl p-6 shadow-xl">
                  <div className="text-center py-6">
                    <p className="text-5xl mb-4">⚡</p>
                    <h3 className="font-titulo text-xl text-rdc-text font-semibold mb-2">
                      {t('projectStudio.legendaryActiveTitle')}
                    </h3>
                    <p className="text-rdc-muted text-sm mb-4">
                      {t('projectStudio.legendaryActiveDesc')}
                    </p>
                    <span className="bg-rdc-accent bg-opacity-20 text-rdc-accent
                                     border border-rdc-accent border-opacity-40
                                     px-4 py-2 rounded-lg font-titulo capitalize inline-block">
                      {proyectoActivo?.estilo_legendario?.replace(/_/g, ' ') || 'Estilo legendario'}
                    </span>
                    <div className="mt-6 bg-rdc-card rounded-lg p-4 text-left">
                      <p className="text-rdc-muted text-xs uppercase mb-2 font-titulo">
                        {t('projectStudio.masterPromptActive')}
                      </p>
                      <p className="text-rdc-text text-xs font-mono leading-relaxed">
                        {proyectoActivo?.system_prompt_maestro?.slice(0, 250) || 'Prompt maestro configurado.'}...
                      </p>
                    </div>
                    <p className="text-rdc-muted text-xs mt-4">
                      {t('projectStudio.signatureActive')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sección: Personajes */}
          {seccionActiva === 'personajes' && (
            <div className="max-w-5xl mx-auto">
              <div className="mb-6">
                <h2 className="font-titulo text-2xl text-rdc-text font-semibold">
                  {t('projectStudio.charactersSectionTitle')}
                </h2>
                <p className="text-rdc-muted text-sm mt-1">
                  {t('projectStudio.charactersSectionDesc')}
                </p>
              </div>
              <CharacterList proyecto={proyectoActivo} />
            </div>
          )}

          {/* Sección: Editor de Páginas */}
          {seccionActiva === 'editor' && (
            <div className="max-w-3xl mx-auto">
              <div className="mb-6">
                <h2 className="font-titulo text-2xl text-rdc-text font-semibold">
                  {t('projectStudio.editorSectionTitle')}
                </h2>
                <p className="text-rdc-muted text-sm mt-1">
                  {t('projectStudio.editorSectionDesc')}
                </p>
              </div>
              <div className="bg-rdc-secondary border border-rdc-border
                              rounded-xl p-8 text-center space-y-4 shadow-xl">
                <p className="text-6xl">🎨</p>
                <h3 className="font-titulo text-xl text-rdc-text font-semibold">
                  MEP Manga Editor
                </h3>
                <p className="text-rdc-muted text-sm max-w-md mx-auto">
                  {t('projectStudio.editorDesc')}
                </p>
                <button
                  onClick={() => navigate(`/editor/${id}`)}
                  className="bg-rdc-accent hover:bg-rdc-accent-hover text-white
                             font-titulo font-semibold px-8 py-4 rounded-xl
                             transition-colors duration-200 text-lg
                             flex items-center gap-3 mx-auto shadow-lg cursor-pointer hover:scale-105"
                >
                  {t('projectStudio.openPageEditor')}
                </button>
              </div>
            </div>
          )}

          {/* Sección: Analítica y Engagement */}
          {seccionActiva === 'analitica' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="mb-4">
                <h2 className="font-titulo text-2xl text-rdc-text font-semibold flex items-center gap-2">
                  <span>📊</span> {t('analytics.title')}
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
        titulo="🤖 Estado de Gemini API"
        ancho="max-w-md"
      >
        {!estadoGemini ? (
          <div className="py-8">
            <Spinner texto="Verificando conexión con Gemini..." />
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`rounded-lg p-4 ${
              estadoGemini.estado === 'OPERATIVO'
                ? 'bg-green-500 bg-opacity-10 border border-green-500 border-opacity-30'
                : 'bg-rdc-error bg-opacity-10 border border-rdc-error border-opacity-30'
            }`}>
              <p className={`font-titulo font-semibold text-lg ${
                estadoGemini.estado === 'OPERATIVO'
                  ? 'text-green-400'
                  : 'text-rdc-error'
              }`}>
                {estadoGemini.estado === 'OPERATIVO' ? '✅ OPERATIVO' : '❌ ERROR'}
              </p>
              <p className="text-rdc-muted text-sm mt-2">{estadoGemini.mensaje}</p>
              {estadoGemini.error && (
                <p className="text-rdc-error text-xs mt-2 font-mono">
                  {estadoGemini.error}
                </p>
              )}
            </div>
            <div className="bg-rdc-card rounded-lg p-4">
              <p className="text-rdc-muted text-xs uppercase mb-2 font-titulo">Rate limiting activo</p>
              <p className="text-rdc-text text-sm">Máximo 14 peticiones/minuto</p>
              <p className="text-rdc-muted text-xs mt-1">
                Con caché y retry automático ante error 429
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