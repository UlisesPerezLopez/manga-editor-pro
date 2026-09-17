// Dashboard.jsx
// Panel principal del usuario en MEP — Manga Editor Pro con soporte multilingüe,
// iconografía Lucide React, avatares de creador, portadas y cambio de tema (Ghibli / Seiya).

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FolderKanban,
  Users,
  Layers,
  Sparkles,
  Plus,
  Save,
  Search,
  BookOpen,
  FolderPlus,
  Library
} from 'lucide-react'
import useAuthStore from '../store/authStore'
import { projectsAPI, statsAPI } from '../services/api'
import LanguageSelector from '../components/common/LanguageSelector'
import ThemeToggle from '../components/common/ThemeToggle'
import AiEngineToggle from '../components/common/AiEngineToggle'
import AiEngineFallbackBanner from '../components/common/AiEngineFallbackBanner'
import ComicReaderModal from '../components/Reader/ComicReaderModal'
import BackupModal from '../components/Backup/BackupModal'
import OnlineBadge from '../components/common/OnlineBadge'
import ThemeBackgroundAnimation from '../components/common/ThemeBackgroundAnimation'
import ProyectoCard from '../components/Dashboard/ProyectoCard'
import UserAvatar from '../components/common/UserAvatar'

export default function Dashboard() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { usuario } = useAuthStore()

  const [proyectos, setProyectos]     = useState([])
  const [statsMap, setStatsMap]       = useState({})
  const [resumen, setResumen]         = useState(null)
  const [cargando, setCargando]       = useState(true)
  const [filtro, setFiltro]           = useState('todos')
  const [busqueda, setBusqueda]       = useState('')
  const [lectorAbierto, setLectorAbierto] = useState(false)
  const [proyectoLector, setProyectoLector] = useState(null)
  const [backupModalAbierto, setBackupModalAbierto] = useState(false)

  useEffect(() => {
    cargarDashboard()
  }, [])

  const cargarDashboard = async () => {
    setCargando(true)
    try {
      const [respProyectos, respResumen] = await Promise.all([
        projectsAPI.listar(),
        statsAPI.resumenUsuario(),
      ])

      setProyectos(respProyectos.data)
      setResumen(respResumen.data)

      // Cargar estadísticas reales de cada proyecto en paralelo
      const promesasStats = respProyectos.data.map(p =>
        statsAPI.estadisticasProyecto(p.id)
          .then(r => ({ id: p.id, data: r.data }))
          .catch(() => ({ id: p.id, data: null }))
      )
      const resultadosStats = await Promise.all(promesasStats)
      const mapa = {}
      resultadosStats.forEach(({ id, data }) => {
        if (data) mapa[id] = data
      })
      setStatsMap(mapa)

    } catch (error) {
      console.error('Error al cargar dashboard:', error)
    } finally {
      setCargando(false)
    }
  }

  const handleEliminarProyecto = async (proyecto) => {
    const confirmar = window.confirm(
      t('dashboard.deleteConfirm', { name: proyecto.nombre }) || `¿Eliminar "${proyecto.nombre}"? Esta acción no se puede deshacer.`
    )
    if (!confirmar) return

    try {
      await projectsAPI.eliminar(proyecto.id)
      setProyectos(prev => prev.filter(p => p.id !== proyecto.id))
      setStatsMap(prev => {
        const nuevo = { ...prev }
        delete nuevo[proyecto.id]
        return nuevo
      })
    } catch (error) {
      alert(t('dashboard.deleteError') || 'Error al eliminar el proyecto')
    }
  }

  const handleAbrirLector = (proyecto) => {
    setProyectoLector(proyecto)
    setLectorAbierto(true)
  }

  const handlePortadaActualizada = (proyectoId, nuevaPortada) => {
    setProyectos(prev => prev.map(p => p.id === proyectoId ? { ...p, portada_url: nuevaPortada } : p))
    setStatsMap(prev => prev[proyectoId] ? { ...prev, [proyectoId]: { ...prev[proyectoId], portada_url: nuevaPortada } } : prev)
  }

  const proyectosFiltrados = proyectos
    .filter(p => {
      if (filtro === 'todos') return true
      if (filtro === 'propio') {
        return p.modo_creacion === 'propio' || !p.modo_creacion || p.modo_creacion === 'libre'
      }
      return p.modo_creacion === filtro
    })
    .filter(p =>
      busqueda === '' ||
      p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    )

  return (
    <div className="min-h-screen bg-rdc-primary text-rdc-text flex flex-col justify-between transition-colors duration-300 relative">
      <ThemeBackgroundAnimation />
      <AiEngineFallbackBanner />

      {/* ── Navbar ── */}
      <nav className="bg-rdc-secondary/90 border-b border-rdc-border
                      px-6 py-3.5 flex items-center justify-between
                      flex-shrink-0 sticky top-0 z-40 backdrop-blur-md transition-colors duration-300">
        <Link to="/" className="flex items-center gap-3 group cursor-pointer select-none" title="MEP — Manga Editor Pro">
          <h1 className="font-manga text-3xl text-rdc-accent drop-shadow-sm group-hover:scale-105 transition-transform">MEP</h1>
          <div>
            <p className="font-titulo text-sm text-rdc-text tracking-widest uppercase leading-none group-hover:text-rdc-accent transition-colors font-bold">
              Manga Editor Pro
            </p>
            <p className="text-rdc-muted text-[11px] mt-0.5">{t('brand.tagline')}</p>
          </div>
        </Link>

        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <OnlineBadge />
          <button
            onClick={() => setBackupModalAbierto(true)}
            className="bg-rdc-card hover:bg-rdc-secondary border border-rdc-border hover:border-rdc-accent text-rdc-text text-xs font-titulo font-semibold px-2.5 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            title={t('backup.title') || 'Backup'}
          >
            <Save className="w-3.5 h-3.5 text-rdc-accent" />
            <span className="hidden md:inline">Backup</span>
          </button>
          <AiEngineToggle />
          <ThemeToggle />
          <LanguageSelector />
          <button
            onClick={() => navigate('/nuevo-proyecto')}
            className="bg-rdc-accent hover:bg-rdc-accent-hover text-white
                       font-titulo font-semibold px-3.5 py-1.5 rounded-xl
                       transition-colors duration-200 text-xs sm:text-sm
                       flex items-center gap-1.5 shadow-md hover:shadow-theme-glow cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('nav.newProject') || 'Nuevo Proyecto'}</span>
          </button>
          
          {/* User Avatar Dropdown */}
          <div className="h-5 w-px bg-rdc-border mx-0.5 hidden sm:block" />
          <UserAvatar showName={true} />
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 relative z-10">

        {/* ── Estadísticas globales del usuario con Lucide Icons ── */}
        {resumen && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { val: resumen.num_proyectos,        label: t('dashboard.projects') || 'Proyectos',   icon: FolderKanban, color: 'text-indigo-400' },
              { val: resumen.num_personajes_total,  label: t('dashboard.characters') || 'Personajes', icon: Users,        color: 'text-emerald-400' },
              { val: resumen.num_capitulos_total,   label: t('dashboard.chapters') || 'Capítulos',   icon: Layers,       color: 'text-amber-400' },
              { val: resumen.num_imagenes_total,    label: t('dashboard.aiImages') || 'Imágenes IA',  icon: Sparkles,     color: 'text-purple-400' },
            ].map(({ val, label, icon: Icon, color }) => (
              <div key={label}
                   className="bg-rdc-secondary/90 border border-rdc-border
                              rounded-2xl p-4 flex items-center gap-4 shadow-sm backdrop-blur-md
                              transition-colors duration-300 hover:border-rdc-accent group">
                <div className="p-3 rounded-xl bg-rdc-card group-hover:scale-105 transition-transform">
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <div>
                  <p className="font-manga text-3xl text-rdc-accent leading-none">{val}</p>
                  <p className="text-rdc-muted text-xs mt-1 font-titulo">{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Controles: búsqueda y filtros ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-rdc-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder={t('dashboard.searchPlaceholder') || 'Buscar proyectos por título...'}
              className="w-full bg-rdc-secondary/90 border border-rdc-border
                         rounded-xl pl-10 pr-4 py-2.5 text-rdc-text
                         placeholder-rdc-muted text-sm backdrop-blur-md
                         focus:outline-none focus:border-rdc-accent
                         transition-colors duration-300"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            {[
              { id: 'todos',     label: t('dashboard.filterAll') || 'Todos' },
              { id: 'propio',    label: t('dashboard.filterCustom') || 'Propio' },
              { id: 'legendario',label: t('dashboard.filterLegendary') || 'Legendario' },
              { id: 'aleatorio', label: t('dashboard.filterRandom') || 'Aleatorio' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-titulo cursor-pointer
                            transition-all duration-200 whitespace-nowrap ${
                              filtro === f.id
                                ? 'bg-rdc-accent text-white font-semibold shadow-md'
                                : 'bg-rdc-secondary/80 border border-rdc-border text-rdc-muted hover:text-rdc-text hover:bg-rdc-card'
                            }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Estado de carga ── */}
        {cargando && (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-3 border-rdc-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-rdc-muted font-titulo text-sm">{t('dashboard.loading') || 'Cargando proyectos...'}</p>
          </div>
        )}

        {/* ── Sin proyectos ── */}
        {!cargando && proyectosFiltrados.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed
                          border-rdc-border rounded-2xl transition-colors duration-300 bg-rdc-secondary/40 backdrop-blur-sm">
            <div className="w-16 h-16 rounded-2xl bg-rdc-card flex items-center justify-center mx-auto mb-4 text-rdc-muted">
              {busqueda || filtro !== 'todos' ? <Search className="w-8 h-8" /> : <Library className="w-8 h-8" />}
            </div>
            <h3 className="font-titulo text-xl text-rdc-text mb-2 font-bold">
              {busqueda || filtro !== 'todos'
                ? (t('dashboard.noResultsTitle') || 'No se encontraron proyectos')
                : (t('dashboard.emptyTitle') || 'Aún no tienes ningún proyecto')
              }
            </h3>
            <p className="text-rdc-muted mb-6 text-sm max-w-sm mx-auto">
              {busqueda || filtro !== 'todos'
                ? (t('dashboard.noResultsDesc') || 'Prueba ajustando los términos de búsqueda o filtros.')
                : (t('dashboard.emptyDesc') || 'Comienza tu primera obra manga con IA seleccionando tu estilo visual.')
              }
            </p>
            {(!busqueda && filtro === 'todos') && (
              <button
                onClick={() => navigate('/nuevo-proyecto')}
                className="bg-rdc-accent hover:bg-rdc-accent-hover text-white
                           font-titulo font-semibold px-6 py-2.5 rounded-xl
                           transition-all duration-200 text-sm shadow-md hover:scale-105 inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t('dashboard.createFirst') || 'Crear Mi Primer Proyecto'}</span>
              </button>
            )}
          </div>
        )}

        {/* ── Grid de proyectos ── */}
        {!cargando && proyectosFiltrados.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {proyectosFiltrados.map((proyecto) => (
              <ProyectoCard
                key={proyecto.id}
                proyecto={proyecto}
                stats={statsMap[proyecto.id]}
                onAbrir={(id) => navigate(`/proyecto/${id}`)}
                onEliminar={handleEliminarProyecto}
                onLeer={handleAbrirLector}
                onPortadaActualizada={handlePortadaActualizada}
              />
            ))}
          </div>
        )}

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-rdc-border px-6 py-6 mt-12 bg-rdc-secondary/50 transition-colors duration-300 text-center relative z-10">
        <p className="text-rdc-muted text-xs font-titulo">
          MEP — Manga Editor Pro v2.0 · {t('landing.footerNote') || 'Suite Profesional de Cómic y Manga con IA'}
        </p>
      </footer>

      {/* ── Lector Interactivo Modal ── */}
      {lectorAbierto && proyectoLector && (
        <ComicReaderModal
          abierto={lectorAbierto}
          onCerrar={() => {
            setLectorAbierto(false)
            setProyectoLector(null)
          }}
          proyecto={proyectoLector}
        />
      )}

      {/* ── Modal de Copias de Seguridad (Backup & Restore) ── */}
      {backupModalAbierto && (
        <BackupModal
          abierto={backupModalAbierto}
          onCerrar={() => setBackupModalAbierto(false)}
          onRestauracionExitosa={() => cargarDashboard()}
        />
      )}
    </div>
  )
}
