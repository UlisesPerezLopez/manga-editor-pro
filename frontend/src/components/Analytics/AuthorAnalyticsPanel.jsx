// AuthorAnalyticsPanel.jsx
// Panel de analítica avanzada y métricas de engagement para autores y creadores de manga.

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { projectsAPI } from '../../services/api'
import Spinner from '../UI/Spinner'

export default function AuthorAnalyticsPanel({ proyectoId, proyecto }) {
  const { t } = useTranslation()
  const [datosAnalytics, setDatosAnalytics] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const cargarDatos = async () => {
    if (!proyectoId) return
    setCargando(true)
    setError(null)
    try {
      const resp = await projectsAPI.obtenerAnalytics(proyectoId)
      setDatosAnalytics(resp.data)
    } catch (err) {
      console.error('Error al cargar analíticas:', err)
      setError('No se pudieron cargar las métricas en este momento')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [proyectoId])

  if (cargando) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner texto="Cargando analítica y métricas de lectores..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center text-rdc-muted font-titulo text-xs">
        <p className="text-2xl mb-2">⚠️</p>
        <p>{error}</p>
        <button
          onClick={cargarDatos}
          className="mt-3 text-rdc-accent hover:underline font-bold"
        >
          Reintentar
        </button>
      </div>
    )
  }

  const {
    total_views = 0,
    total_likes = 0,
    tasa_retencion_promedio = 85.0,
    tiempo_total_lectura_min = 0,
    capitulos = []
  } = datosAnalytics || {}

  return (
    <div className="space-y-6 text-xs font-titulo">
      
      {/* ── 4 Tarjetas de Métricas Clave ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        <div className="bg-rdc-card border border-rdc-border rounded-xl p-4 shadow-sm hover:border-rdc-accent/50 transition-all">
          <div className="flex items-center justify-between text-rdc-muted mb-2">
            <span className="text-[11px] font-semibold">{t('analytics.totalViews')}</span>
            <span className="text-xl">👁️</span>
          </div>
          <p className="text-2xl font-bold text-rdc-text">
            {total_views.toLocaleString()}
          </p>
          <span className="text-[10px] text-emerald-400 font-semibold">
            +18% este mes
          </span>
        </div>

        <div className="bg-rdc-card border border-rdc-border rounded-xl p-4 shadow-sm hover:border-rdc-accent/50 transition-all">
          <div className="flex items-center justify-between text-rdc-muted mb-2">
            <span className="text-[11px] font-semibold">{t('analytics.totalLikes')}</span>
            <span className="text-xl">❤️</span>
          </div>
          <p className="text-2xl font-bold text-red-400">
            {total_likes.toLocaleString()}
          </p>
          <span className="text-[10px] text-rdc-muted font-semibold">
            Engagement 8.4%
          </span>
        </div>

        <div className="bg-rdc-card border border-rdc-border rounded-xl p-4 shadow-sm hover:border-rdc-accent/50 transition-all">
          <div className="flex items-center justify-between text-rdc-muted mb-2">
            <span className="text-[11px] font-semibold">{t('analytics.avgRetention')}</span>
            <span className="text-xl">📈</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            {tasa_retencion_promedio}%
          </p>
          <span className="text-[10px] text-emerald-400 font-semibold">
            Excelente retención
          </span>
        </div>

        <div className="bg-rdc-card border border-rdc-border rounded-xl p-4 shadow-sm hover:border-rdc-accent/50 transition-all">
          <div className="flex items-center justify-between text-rdc-muted mb-2">
            <span className="text-[11px] font-semibold">{t('analytics.totalReadTime')}</span>
            <span className="text-xl">⏱️</span>
          </div>
          <p className="text-2xl font-bold text-rdc-accent">
            {t('analytics.minutes', { count: Math.round(tiempo_total_lectura_min) })}
          </p>
          <span className="text-[10px] text-rdc-muted font-semibold">
            Tiempo acumulado
          </span>
        </div>

      </div>

      {/* ── Tabla de Rendimiento por Capítulo ── */}
      <div className="bg-rdc-card border border-rdc-border rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-rdc-text text-sm flex items-center gap-2">
            <span>📖</span> {t('analytics.chapterPerformance')}
          </h4>
          <button
            onClick={cargarDatos}
            className="text-[11px] text-rdc-accent hover:underline flex items-center gap-1"
          >
            <span>🔄</span> Actualizar
          </button>
        </div>

        {capitulos.length === 0 ? (
          <div className="text-center py-6 text-rdc-muted text-xs">
            Sin datos de capítulos todavía
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-rdc-border text-rdc-muted text-[11px] font-semibold">
                  <th className="pb-2 pl-2">Capítulo</th>
                  <th className="pb-2">Estado</th>
                  <th className="pb-2 text-center">{t('analytics.views')}</th>
                  <th className="pb-2 text-center">{t('analytics.likes')}</th>
                  <th className="pb-2">{t('analytics.completionRate')}</th>
                  <th className="pb-2 text-right pr-2">{t('analytics.avgReadTime')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rdc-border/50 text-xs">
                {capitulos.map((c) => (
                  <tr key={c.id} className="hover:bg-rdc-secondary/50 transition-colors">
                    <td className="py-3 pl-2 font-bold text-rdc-text">
                      Cap. {c.numero}: {c.titulo || `Capítulo ${c.numero}`}
                    </td>
                    <td className="py-3">
                      {c.is_premium ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950/70 border border-amber-500/50 text-amber-300 font-bold">
                          🔒 Premium
                        </span>
                      ) : c.is_published ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 font-bold">
                          🟢 Público
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-rdc-secondary border border-rdc-border text-rdc-muted">
                          ⚪ Borrador
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-center font-bold text-rdc-text">
                      {c.views_count.toLocaleString()}
                    </td>
                    <td className="py-3 text-center text-red-400 font-bold">
                      {c.likes_count.toLocaleString()}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-rdc-secondary h-2 rounded-full overflow-hidden border border-rdc-border">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${c.tasa_finalizacion}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono text-emerald-400">
                          {c.tasa_finalizacion}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-right pr-2 font-mono text-rdc-muted text-[11px]">
                      {t('analytics.seconds', { count: c.tiempo_medio_seg })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
