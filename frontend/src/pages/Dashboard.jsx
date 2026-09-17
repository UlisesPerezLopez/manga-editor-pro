// Dashboard.jsx
// Panel principal del usuario en MEP — Manga Editor Pro con soporte multilingüe y cambio de tema (Ghibli / Seiya).

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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

const ICONOS_MODO = {
  propio:     '🎨',
  legendario: '⚡',
  aleatorio:  '🎲',
}

const COLORES_MODO = {
  propio:     'from-purple-900 to-purple-700',
  legendario: 'from-blue-900 to-rdc-accent',
  aleatorio:  'from-green-900 to-green-700',
}

function ProyectoCard({ proyecto, stats, onAbrir, onEliminar, onLeer }) {
  const { t, i18n } = useTranslation()
  const modo = proyecto.modo_creacion || 'propio'
  const gradiente = COLORES_MODO[modo] || COLORES_MODO.propio

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return '—'
    try {
      return new Date(fechaStr).toLocaleDateString(i18n.language || 'es', {
        day: '2-digit', month: 'short', year: 'numeric'
      })
    } catch {
      return fechaStr.split('T')[0]
    }
  }

  return (
    <div
      className="bg-rdc-secondary border border-rdc-border rounded-xl
                 overflow-hidden hover:border-rdc-accent cursor-pointer
                 transition-all duration-300 group flex flex-col shadow-lg hover:shadow-theme-subtle-glow"
      onClick={() => onAbrir(proyecto.id)}
    >
      {/* Miniatura / cabecera visual */}
      <div className={`h-36 bg-gradient-to-br ${gradiente}
                       flex items-center justify-center relative
                       overflow-hidden`}>
        <span className="text-5xl opacity-60 group-hover:opacity-100
                         group-hover:scale-110 transition-all duration-300">
          {ICONOS_MODO[modo]}
        </span>

        {/* Badge de estilo */}
        <div className="absolute top-3 right-3">
          {proyecto.style_locked
            ? <span className="text-xs bg-black/60 text-white
                               px-2 py-1 rounded-full backdrop-blur-sm font-titulo">
                {t('dashboard.fixedStyle')}
              </span>
            : <span className="text-xs bg-yellow-500/40 text-yellow-300
                               px-2 py-1 rounded-full font-titulo">
                {t('dashboard.noStyle')}
              </span>
          }
        </div>

        {/* Badge de formato */}
        <div className="absolute top-3 left-3">
          <span className="text-xs bg-black/60 text-white
                           px-2 py-1 rounded-full backdrop-blur-sm font-titulo">
            {proyecto.formato_lectura === 'manga' ? t('dashboard.mangaFormat') : t('dashboard.westernFormat')}
          </span>
        </div>
      </div>

      {/* Info del proyecto */}
      <div className="p-4 flex-1 flex flex-col transition-colors duration-300">
        <h3 className="font-titulo text-lg text-rdc-text font-semibold
                       leading-tight mb-3 group-hover:text-rdc-accent
                       transition-colors duration-200 line-clamp-1">
          {proyecto.nombre}
        </h3>

        {/* Estadísticas reales */}
        {stats ? (
          <div className="grid grid-cols-4 gap-1 mb-3">
            {[
              { val: stats.num_personajes,        label: t('dashboard.card.characters') },
              { val: stats.num_capitulos,         label: t('dashboard.card.chapters')  },
              { val: stats.num_paginas,           label: t('dashboard.card.pages')  },
              { val: stats.num_imagenes_generadas, label: t('dashboard.card.images') },
            ].map(({ val, label }) => (
              <div key={label} className="text-center bg-rdc-card
                                          rounded-lg py-2 transition-colors duration-300">
                <p className="font-manga text-lg text-rdc-accent leading-none">
                  {val ?? 0}
                </p>
                <p className="text-rdc-muted text-[10px] mt-0.5 uppercase tracking-wider font-titulo">{label}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1 mb-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-rdc-card rounded-lg
                                      animate-pulse-soft" />
            ))}
          </div>
        )}

        {/* Fecha y acciones */}
        <div className="flex items-center justify-between mt-auto pt-2
                        border-t border-rdc-border transition-colors duration-300">
          <span className="text-rdc-muted text-xs font-titulo">
            {formatearFecha(proyecto.created_at)}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); onLeer(proyecto) }}
              className="text-rdc-accent hover:text-rdc-accent-hover text-xs font-titulo font-semibold
                         transition-colors duration-200 px-2.5 py-1 rounded bg-rdc-card hover:bg-rdc-border border border-rdc-border"
              title={t('reader.readProject')}
            >
              📖 {t('reader.readProject')}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onEliminar(proyecto) }}
              className="text-rdc-muted hover:text-rdc-error text-sm
                         transition-colors duration-200 px-2 py-1 rounded
                         hover:bg-rdc-error/10"
              title="Eliminar proyecto"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { usuario, logout } = useAuthStore()

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

      // Cargar estadísticas de cada proyecto en paralelo
      const statsPromises = respProyectos.data.map(p =>
        statsAPI.estadisticasProyecto(p.id)
          .then(r => ({ id: p.id, stats: r.data }))
          .catch(() => ({ id: p.id, stats: null }))
      )
      const statsResultados = await Promise.all(statsPromises)
      const nuevoStatsMap = {}
      statsResultados.forEach(({ id, stats }) => {
        nuevoStatsMap[id] = stats
      })
      setStatsMap(nuevoStatsMap)

    } catch (error) {
      console.error('Error al cargar dashboard:', error)
    } finally {
      setCargando(false)
    }
  }

  const handleEliminar = async (proyecto) => {
    if (!confirm(
      t('dashboard.deleteConfirm', { name: proyecto.nombre })
    )) return

    try {
      await projectsAPI.eliminar(proyecto.id)
      setProyectos(prev => prev.filter(p => p.id !== proyecto.id))
      setStatsMap(prev => {
        const nuevo = { ...prev }
        delete nuevo[proyecto.id]
        return nuevo
      })
      // Actualizar resumen
      const r = await statsAPI.resumenUsuario()
      setResumen(r.data)
    } catch {
      alert(t('dashboard.deleteError'))
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Filtrar y buscar proyectos
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
    <div className="min-h-screen bg-rdc-primary flex flex-col justify-between transition-colors duration-300 relative overflow-x-hidden">
      <ThemeBackgroundAnimation />
      <AiEngineFallbackBanner />

      {/* ── Navbar ── */}
      <nav className="bg-rdc-secondary/90 border-b border-rdc-border
                      px-6 py-4 flex items-center justify-between
                      flex-shrink-0 sticky top-0 z-40 backdrop-blur-md transition-colors duration-300">
        <Link to="/dashboard" className="flex items-center gap-3 group cursor-pointer select-none">
          <h1 className="font-manga text-3xl text-rdc-accent drop-shadow-sm group-hover:scale-105 transition-transform">MEP</h1>
          <div>
            <p className="font-titulo text-sm text-rdc-text tracking-widest uppercase leading-none group-hover:text-rdc-accent transition-colors">
              Manga Editor Pro
            </p>
            <p className="text-rdc-muted text-xs">{t('brand.tagline')}</p>
          </div>
        </Link>

        <div className="flex items-center gap-2.5 sm:gap-4">
          <span className="text-rdc-muted text-sm hidden lg:block font-titulo">
            🎨 {resumen?.nombre_artistico || usuario?.username}
          </span>
          <OnlineBadge />
          <button
            onClick={() => setBackupModalAbierto(true)}
            className="bg-rdc-card hover:bg-rdc-secondary border border-rdc-border hover:border-rdc-accent text-rdc-text text-xs font-titulo font-semibold px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            title={t('backup.title')}
          >
            <span>💾</span> <span className="hidden md:inline">Backup</span>
          </button>
          <AiEngineToggle />
          <ThemeToggle />
          <LanguageSelector />
          <button
            onClick={() => navigate('/nuevo-proyecto')}
            className="bg-rdc-accent hover:bg-rdc-accent-hover text-white
                       font-titulo font-semibold px-4 py-2 rounded-lg
                       transition-colors duration-200 text-sm
                       flex items-center gap-1.5 shadow-md hover:shadow-theme-glow"
          >
            <span>+</span> {t('nav.newProject')}
          </button>
          <button
            onClick={handleLogout}
            className="text-rdc-muted hover:text-rdc-text text-sm font-titulo
                       transition-colors duration-200"
          >
            {t('nav.logout')}
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">

        {/* ── Estadísticas globales del usuario ── */}
        {resumen && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { val: resumen.num_proyectos,        label: t('dashboard.projects'),  emoji: '📁' },
              { val: resumen.num_personajes_total,  label: t('dashboard.characters'), emoji: '👤' },
              { val: resumen.num_capitulos_total,   label: t('dashboard.chapters'),  emoji: '📖' },
              { val: resumen.num_imagenes_total,    label: t('dashboard.aiImages'),  emoji: '🎨' },
            ].map(({ val, label, emoji }) => (
              <div key={label}
                   className="bg-rdc-secondary border border-rdc-border
                              rounded-xl p-4 flex items-center gap-4 shadow-sm
                              transition-colors duration-300 hover:border-rdc-accent">
                <span className="text-3xl">{emoji}</span>
                <div>
                  <p className="font-manga text-3xl text-rdc-accent leading-none">{val}</p>
                  <p className="text-rdc-muted text-sm mt-0.5 font-titulo">{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Controles: búsqueda y filtros ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder={t('dashboard.searchPlaceholder')}
            className="flex-1 bg-rdc-secondary border border-rdc-border
                       rounded-lg px-4 py-2.5 text-rdc-text
                       placeholder-rdc-muted text-sm
                       focus:outline-none focus:border-rdc-accent
                       transition-colors duration-300"
          />
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'todos',     label: t('dashboard.filterAll') },
              { id: 'propio',    label: t('dashboard.filterCustom') },
              { id: 'legendario',label: t('dashboard.filterLegendary') },
              { id: 'aleatorio', label: t('dashboard.filterRandom') },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                className={`px-3 py-2 rounded-lg text-sm font-titulo
                            transition-all duration-200 whitespace-nowrap
                            ${filtro === f.id
                              ? 'bg-rdc-accent text-white font-semibold shadow-md'
                              : 'bg-rdc-secondary border border-rdc-border text-rdc-muted hover:text-rdc-text'
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
            <div className="text-rdc-accent text-4xl mb-4 animate-pulse-soft">
              🎌
            </div>
            <p className="text-rdc-muted font-titulo">{t('dashboard.loading')}</p>
          </div>
        )}

        {/* ── Sin proyectos ── */}
        {!cargando && proyectosFiltrados.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed
                          border-rdc-border rounded-2xl transition-colors duration-300">
            <p className="text-6xl mb-4">
              {busqueda || filtro !== 'todos' ? '🔍' : '📚'}
            </p>
            <h3 className="font-titulo text-xl text-rdc-text mb-2">
              {busqueda || filtro !== 'todos'
                ? t('dashboard.noResultsTitle')
                : t('dashboard.emptyTitle')
              }
            </h3>
            <p className="text-rdc-muted mb-6 text-sm">
              {busqueda || filtro !== 'todos'
                ? t('dashboard.noResultsDesc')
                : t('dashboard.emptyDesc')
              }
            </p>
            {!busqueda && filtro === 'todos' && (
              <button
                onClick={() => navigate('/nuevo-proyecto')}
                className="bg-rdc-accent hover:bg-rdc-accent-hover text-white
                           font-titulo font-semibold px-8 py-3 rounded-lg
                           transition-colors duration-200 shadow-lg hover:shadow-theme-glow"
              >
                {t('dashboard.createFirstProject')}
              </button>
            )}
          </div>
        )}

        {/* ── Grid de proyectos ── */}
        {!cargando && proyectosFiltrados.length > 0 && (
          <>
            <p className="text-rdc-muted text-sm mb-4 font-titulo">
              {t('dashboard.projectCount', { count: proyectosFiltrados.length })}
              {filtro !== 'todos' && ` ${t('dashboard.inMode', { mode: filtro })}`}
              {busqueda && ` · "${busqueda}"`}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2
                            lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {proyectosFiltrados.map(proyecto => (
                <ProyectoCard
                  key={proyecto.id}
                  proyecto={proyecto}
                  stats={statsMap[proyecto.id]}
                  onAbrir={(id) => navigate(`/proyecto/${id}`)}
                  onEliminar={handleEliminar}
                  onLeer={(p) => {
                    setProyectoLector(p)
                    setLectorAbierto(true)
                  }}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-rdc-border py-4 px-6
                         flex items-center justify-between transition-colors duration-300">
        <p className="text-rdc-muted text-xs">
          MEP — Manga Editor Pro · v2.0.0
        </p>
        <a
          href="/"
          className="text-rdc-muted text-xs hover:text-rdc-accent
                     transition-colors duration-200 font-titulo"
        >
          {t('landing.footer')}
        </a>
      </footer>

      {/* ── Lector Interactivo Modal ── */}
      {lectorAbierto && proyectoLector && (
        <ComicReaderModal
          abierto={lectorAbierto}
          onCerrar={() => setLectorAbierto(false)}
          proyecto={proyectoLector}
        />
      )}

      {/* ── Modal de Copias de Seguridad (Backup & Restore) ── */}
      {backupModalAbierto && (
        <BackupModal
          abierto={backupModalAbierto}
          onCerrar={() => setBackupModalAbierto(false)}
          onRestauracionExitosa={cargarDashboard}
        />
      )}
    </div>
  )
}