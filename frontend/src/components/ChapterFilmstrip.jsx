// ChapterFilmstrip.jsx
// Dock lateral de producción y tira de viñetas para PanelArtStudio en MEP — Manga Editor Pro.
// Muestra el progreso visual del capítulo activo agrupado por páginas, miniaturas en tiempo real
// e interactividad para saltar entre viñetas o transferir al Editor de Páginas (Fabric.js).

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Film,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  Palette,
  Sparkles,
  ExternalLink,
  Layers,
  Image as ImageIcon
} from 'lucide-react'
import useProjectStore from '../store/projectStore'
import { obtenerUrlImagen, vinetasAPI } from '../services/api'

export default function ChapterFilmstrip({
  proyecto,
  capituloNum = 1,
  paginaActivaNum = 1,
  vinetaActivaNum = 1,
  capitulos = [],
  onSeleccionarVineta,
  onMaquetarPagina
}) {
  const navigate = useNavigate()
  const {
    vinetasEstudio,
    vinetasCatalogo,
    capitulosGuiones,
    removerImagenVineta,
    limpiarTodasVinetasCapitulo
  } = useProjectStore()

  const [purgando, setPurgando] = useState(false)

  // Purgar todas las ilustraciones del capítulo actual
  const handlePurgarTodoCapitulo = async () => {
    const projId = proyecto?.id
    if (!projId || !capituloNum) return
    const confirmar = window.confirm("¿Seguro que deseas eliminar todas las ilustraciones generadas de este capítulo?")
    if (!confirmar) return

    try {
      setPurgando(true)
      await vinetasAPI.purgarImagenesCapitulo(projId, capituloNum)
      limpiarTodasVinetasCapitulo(projId, capituloNum)
      onSeleccionarVineta?.(paginaActivaNum, vinetaActivaNum)
    } catch (err) {
      console.error('[ChapterFilmstrip] Error purgando ilustraciones:', err)
      alert(err.response?.data?.detail || 'Error purgando ilustraciones del capítulo')
    } finally {
      setPurgando(false)
    }
  }

  // Borrar ilustración individual directamente desde la miniatura
  const handleBorrarVinetaDirecta = async (e, pagNum, vNum, clave) => {
    e.stopPropagation()
    const projId = proyecto?.id
    if (!projId || !capituloNum) return
    const confirmar = window.confirm(`¿Seguro que deseas eliminar la ilustración de la Viñeta ${vNum} (Página ${pagNum})?`)
    if (!confirmar) return

    try {
      await vinetasAPI.borrarImagenVineta(projId, capituloNum, pagNum, vNum)
      removerImagenVineta(clave)
      if (Number(paginaActivaNum) === Number(pagNum) && Number(vinetaActivaNum) === Number(vNum)) {
        onSeleccionarVineta?.(pagNum, vNum)
      }
    } catch (err) {
      console.error('[ChapterFilmstrip] Error al borrar viñeta:', err)
      alert(err.response?.data?.detail || 'Error al eliminar la ilustración')
    }
  }

  // Estado de acordeones de páginas desplegadas (por defecto todas abiertas)
  const [paginasAbiertas, setPaginasAbiertas] = useState({})

  const togglePagina = (pagNum) => {
    setPaginasAbiertas(prev => ({
      ...prev,
      [pagNum]: prev[pagNum] === undefined ? false : !prev[pagNum]
    }))
  }

  // 1. Obtener datos del capítulo activo y estructurar todas sus páginas y viñetas
  const estructuraCapitulo = useMemo(() => {
    if (!capitulos || capitulos.length === 0) {
      // Fallback básico si no hay capítulos cargados
      return [
        { numero: 1, vinetas: [1, 2, 3, 4] },
        { numero: 2, vinetas: [1, 2, 3, 4] }
      ]
    }

    const cap = capitulos.find(c =>
      Number(c.numero) === Number(capituloNum) ||
      Number(c.id) === Number(capituloNum) ||
      Number(c.numero_capitulo) === Number(capituloNum)
    ) || capitulos[Number(capituloNum) - 1] || capitulos[0]

    let guion = capitulosGuiones?.[cap?.id] || capitulosGuiones?.[cap?.numero]
    if (!guion && cap?.guion_json) {
      try {
        guion = typeof cap.guion_json === 'string' ? JSON.parse(cap.guion_json) : cap.guion_json
      } catch (e) {
        guion = null
      }
    }

    const paginasRaw = Array.isArray(guion) ? guion : (guion?.paginas || guion?.pages || guion?.escenas || [])

    if (paginasRaw.length > 0) {
      return paginasRaw.map((p, pIdx) => {
        const pNum = Number(p.numero || p.pagina || p.num || pIdx + 1)
        const vinetasRaw = Array.isArray(p.vinetas) ? p.vinetas : (p.panels || p.cuadros || [])
        const vNums = vinetasRaw.length > 0
          ? vinetasRaw.map((v, vIdx) => Number(v.numero || v.vineta || v.num || vIdx + 1))
          : [1, 2, 3, 4]
        return { numero: pNum, vinetas: vNums }
      })
    }

    if (cap?.paginas && cap.paginas.length > 0) {
      return cap.paginas.map(p => ({
        numero: Number(p.numero),
        vinetas: [1, 2, 3, 4]
      }))
    }

    return [
      { numero: 1, vinetas: [1, 2, 3, 4] },
      { numero: 2, vinetas: [1, 2, 3, 4] },
      { numero: 3, vinetas: [1, 2, 3, 4] },
      { numero: 4, vinetas: [1, 2, 3, 4] }
    ]
  }, [capitulos, capituloNum, capitulosGuiones])

  // 2. Resolver mapa de imágenes por viñeta (combinando Zustand en memoria + catálogo BD)
  const infoVinetas = useMemo(() => {
    const mapa = {}
    const projId = proyecto?.id || 1

    estructuraCapitulo.forEach(pag => {
      pag.vinetas.forEach(vNum => {
        const clave = `${projId}_${capituloNum}_${pag.numero}_${vNum}`
        const enMemoria = vinetasEstudio?.[clave]
        const enCatalogo = (vinetasCatalogo || []).find(v =>
          Number(v.capitulo_num) === Number(capituloNum) &&
          Number(v.pagina_num) === Number(pag.numero) &&
          Number(v.vineta_num) === Number(vNum)
        )

        const imagenUrl = enMemoria?.imagen_url || enCatalogo?.imagen_url || null
        const plano = enMemoria?.plano || enCatalogo?.plano || 'Plano medio'

        mapa[clave] = {
          imagenUrl,
          plano,
          generada: Boolean(imagenUrl),
          key: clave
        }
      })
    })

    return mapa
  }, [estructuraCapitulo, capituloNum, proyecto?.id, vinetasEstudio, vinetasCatalogo])

  // 3. Métricas de Progreso del Capítulo
  const { totalVinetas, vinetasGeneradas, porcentajeProgreso } = useMemo(() => {
    let total = 0
    let generadas = 0

    estructuraCapitulo.forEach(pag => {
      pag.vinetas.forEach(vNum => {
        total++
        const clave = `${proyecto?.id || 1}_${capituloNum}_${pag.numero}_${vNum}`
        if (infoVinetas[clave]?.generada) {
          generadas++
        }
      })
    })

    const pct = total > 0 ? Math.round((generadas / total) * 100) : 0
    return {
      totalVinetas: total,
      vinetasGeneradas: generadas,
      porcentajeProgreso: pct
    }
  }, [estructuraCapitulo, infoVinetas, capituloNum, proyecto?.id])

  // 4. Manejador para transferir al Editor de Páginas
  const handleMaquetarPagina = (e, pagNum) => {
    e.stopPropagation()
    if (onMaquetarPagina) {
      onMaquetarPagina(pagNum)
    } else if (proyecto?.id) {
      navigate(`/editor/${proyecto.id}?tab=vinetas&cap=${capituloNum}&pag=${pagNum}`)
    }
  }

  return (
    <aside className="w-full bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.85)] flex flex-col h-full max-h-[860px] overflow-hidden">
      
      {/* ── CABECERA DEL FILMSTRIP & PROGRESO DEL CAPÍTULO ── */}
      <div className="p-3.5 border-b-2 border-slate-900 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg border-2 border-slate-900 bg-purple-600 text-white flex items-center justify-center shadow-[1px_1px_0px_0px_rgba(0,0,0,0.85)]">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-titulo text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white leading-tight">
                Dock de Producción
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                Capítulo {capituloNum}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
              porcentajeProgreso === 100
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'border-purple-500/40 bg-purple-500/10 text-purple-600 dark:text-purple-300'
            }`}>
              {vinetasGeneradas}/{totalVinetas} ({porcentajeProgreso}%)
            </span>
            {vinetasGeneradas > 0 && (
              <button
                type="button"
                onClick={handlePurgarTodoCapitulo}
                disabled={purgando}
                className="px-2 py-0.5 rounded-lg border border-red-800 bg-red-950/80 hover:bg-red-900 text-red-200 text-[10px] font-bold flex items-center gap-1 transition shadow cursor-pointer disabled:opacity-50"
                title="Eliminar todas las ilustraciones generadas de este capítulo"
              >
                🧹 {purgando ? 'Purgando...' : 'Purgar Todo'}
              </button>
            )}
          </div>
        </div>

        {/* Barra de progreso de síntesis */}
        <div className="w-full space-y-1">
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden border border-slate-300 dark:border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${porcentajeProgreso}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[9px] text-slate-500 dark:text-slate-400 font-mono">
            <span>Viñetas generadas</span>
            <span>{totalVinetas - vinetasGeneradas} pendientes</span>
          </div>
        </div>
      </div>

      {/* ── LISTADO CON SCROLL AGRUPADO POR PÁGINAS ── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 divide-y divide-slate-100 dark:divide-slate-800/60">
        {estructuraCapitulo.map(pag => {
          const estaAbierta = paginasAbiertas[pag.numero] !== false
          const projId = proyecto?.id || 1

          // Métricas de viñetas de esta página
          const vinetasDePagina = pag.vinetas.map(vNum => {
            const clave = `${projId}_${capituloNum}_${pag.numero}_${vNum}`
            return {
              num: vNum,
              clave,
              info: infoVinetas[clave] || {}
            }
          })

          const generadasEnPag = vinetasDePagina.filter(v => v.info.generada).length
          const esPaginaActiva = Number(paginaActivaNum) === Number(pag.numero)

          return (
            <div key={pag.numero} className="pt-2 first:pt-0 space-y-2">
              
              {/* Encabezado de Página con Botón [🎨 Maquetar] */}
              <div
                onClick={() => togglePagina(pag.numero)}
                className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer border ${
                  esPaginaActiva
                    ? 'border-purple-600/60 bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {estaAbierta ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  )}
                  <span className="font-titulo text-xs font-black tracking-wide truncate">
                    Página {pag.numero}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">
                    ({generadasEnPag}/{pag.vinetas.length})
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleMaquetarPagina(e, pag.numero)}
                    className="px-2 py-1 rounded-lg border border-indigo-600/60 bg-indigo-600 hover:bg-indigo-500 text-white font-titulo font-bold text-[10px] flex items-center gap-1 shadow-[1px_1px_0px_0px_rgba(0,0,0,0.85)] cursor-pointer active:scale-95 transition-all"
                    title={`Abrir página ${pag.numero} en el Editor de Páginas`}
                  >
                    <Palette className="w-3 h-3" />
                    <span>Maquetar</span>
                  </button>
                </div>
              </div>

              {/* Cuadrícula de Miniaturas de Viñetas (2 Columnas) */}
              {estaAbierta && (
                <div className="grid grid-cols-2 gap-2 pl-1 pr-1">
                  {vinetasDePagina.map(({ num: vNum, clave, info }) => {
                    const esActiva = esPaginaActiva && Number(vinetaActivaNum) === Number(vNum)
                    const tieneImagen = Boolean(info.imagenUrl)

                    return (
                      <div
                        key={vNum}
                        onClick={() => onSeleccionarVineta?.(pag.numero, vNum)}
                        className={`group relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer select-none flex flex-col items-center justify-center min-h-[95px] ${
                          esActiva
                            ? 'border-purple-500 ring-2 ring-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.7)] scale-[1.03] z-10 bg-purple-950/20'
                            : 'border-slate-800 hover:border-purple-400/80 bg-slate-950/50 hover:bg-slate-900/60'
                        }`}
                      >
                        {/* Badge de Viñeta (V1, V2...) */}
                        <div className="absolute top-1 left-1 z-10 flex items-center gap-1">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-black border shadow ${
                            esActiva
                              ? 'bg-purple-600 text-white border-purple-400'
                              : 'bg-slate-900/90 text-slate-200 border-slate-700'
                          }`}>
                            V{vNum}
                          </span>
                          {tieneImagen && (
                            <button
                              type="button"
                              onClick={(e) => handleBorrarVinetaDirecta(e, pag.numero, vNum, clave)}
                              className="w-4 h-4 rounded bg-red-950/90 hover:bg-red-800 text-red-200 border border-red-700/80 flex items-center justify-center text-[9px] shadow transition cursor-pointer"
                              title={`Borrar ilustración de Viñeta ${vNum}`}
                            >
                              🗑️
                            </button>
                          )}
                        </div>

                        {/* Indicador de Estado (Check verde o pendiente) */}
                        <div className="absolute top-1 right-1 z-10">
                          {tieneImagen ? (
                            <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] shadow-sm">
                              ✓
                            </span>
                          ) : (
                            <span className="w-4 h-4 rounded-full bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center text-[8px]" title="Pendiente de generar">
                              ⏳
                            </span>
                          )}
                        </div>

                        {/* Renderizado de Miniatura */}
                        {tieneImagen ? (
                          <div className="w-full h-full min-h-[95px] relative overflow-hidden flex items-center justify-center bg-slate-950">
                            <img
                              src={obtenerUrlImagen(info.imagenUrl)}
                              alt={`Viñeta ${vNum}`}
                              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                e.target.onerror = null
                                e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="%23888" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>'
                              }}
                            />
                            {/* Overlay sutil al pasar el mouse */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1">
                              <span className="text-[8px] font-mono text-purple-300 truncate">
                                {info.plano || 'Viñeta'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full min-h-[95px] p-2 border border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center text-center gap-1">
                            <ImageIcon className="w-5 h-5 text-slate-600 group-hover:text-purple-400 transition-colors" />
                            <span className="text-[9px] font-mono text-slate-500 group-hover:text-slate-400">
                              Sin sintetizar
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

            </div>
          )
        })}
      </div>

      {/* ── ACCIÓN RÁPIDA INFERIOR: ACCESO AL EDITOR DE PÁGINAS ── */}
      <div className="p-3 border-t-2 border-slate-900 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80">
        <button
          type="button"
          onClick={() => {
            if (proyecto?.id) {
              navigate(`/editor/${proyecto.id}?tab=vinetas&cap=${capituloNum}&pag=${paginaActivaNum}`)
            }
          }}
          className="w-full py-2 px-3 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-titulo font-bold text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] flex items-center justify-center gap-2 cursor-pointer transition-all active:translate-x-[1px] active:translate-y-[1px]"
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Abrir en Editor de Páginas</span>
        </button>
      </div>

    </aside>
  )
}
