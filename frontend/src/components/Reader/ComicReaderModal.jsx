// ComicReaderModal.jsx
// Lector interactivo de cómics y manga con soporte para Scroll Webtoon, Manga (D→I), Cómic (I→D),
// Doble Página (Spread), zoom inteligente, navegación táctil/teclado y barra de control auto-ocultable.

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { chaptersAPI } from '../../services/api'
import Spinner from '../UI/Spinner'
import useMonetizationStore from '../../store/monetizationStore'
import PaywallOverlay from '../Monetization/PaywallOverlay'

export default function ComicReaderModal({
  abierto,
  onCerrar,
  proyecto,
  capituloInicialId = null,
  paginaInicialNumero = 1
}) {
  const { t } = useTranslation()
  const { estaDesbloqueado } = useMonetizationStore()

  // Estados del Lector
  const [capitulos, setCapitulos] = useState([])
  const [capituloActivo, setCapituloActivo] = useState(null)
  const [paginas, setPaginas] = useState([])
  const [indicePagina, setIndicePagina] = useState(0) // 0-indexed
  const [cargando, setCargando] = useState(true)
  const [likesContador, setLikesContador] = useState(0)
  const [haDadoLike, setHaDadoLike] = useState(false)
  const [desbloqueadoLocal, setDesbloqueadoLocal] = useState(false)

  // Modos de lectura: 'webtoon' | 'manga' (D->I) | 'western' (I->D) | 'double'
  const formatoProyecto = proyecto?.formato_lectura === 'manga' ? 'manga' : 'western'
  const [modoLectura, setModoLectura] = useState(formatoProyecto)

  // Zoom: 'fit_width' | 'fit_height' | 'original'
  const [zoomNivel, setZoomNivel] = useState('fit_height')
  const [esPantallaCompleta, setEsPantallaCompleta] = useState(false)
  const [mostrarControles, setMostrarControles] = useState(true)

  // Referencias para observador de scroll y auto-hide
  const timerControlesRef = useRef(null)
  const contenedorWebtoonRef = useRef(null)
  const touchInicioRef = useRef({ x: 0, y: 0 })
  const contenedorModalRef = useRef(null)

  // ─── 1. CARGA DE CAPÍTULOS Y PÁGINAS ──────────────────────────────────────

  useEffect(() => {
    if (!abierto || !proyecto?.id) return

    const cargarDatos = async () => {
      setCargando(true)
      try {
        const res = await chaptersAPI.listar(proyecto.id)
        const listaCapitulos = (res.data || []).sort((a, b) => a.numero - b.numero)
        setCapitulos(listaCapitulos)

        if (listaCapitulos.length > 0) {
          const cap = capituloInicialId
            ? listaCapitulos.find(c => c.id === capituloInicialId) || listaCapitulos[0]
            : listaCapitulos[0]

          setCapituloActivo(cap)
          setLikesContador(cap.likes_count || 0)
          setHaDadoLike(false)
          setDesbloqueadoLocal(false)

          // Registrar lectura en backend
          chaptersAPI.registrarLectura(proyecto.id, cap.id).catch(() => {})

          const pags = (cap.paginas || []).sort((a, b) => a.numero - b.numero)
          setPaginas(pags)

          const idx = paginaInicialNumero > 1 && paginaInicialNumero <= pags.length
            ? paginaInicialNumero - 1
            : 0
          setIndicePagina(idx)
        }
      } catch (err) {
        console.error('Error al cargar datos del lector:', err)
      } finally {
        setCargando(false)
      }
    }

    cargarDatos()
  }, [abierto, proyecto?.id, capituloInicialId, paginaInicialNumero])

  // Cambiar capítulo activo
  const handleCambiarCapitulo = (idCapitulo) => {
    const cap = capitulos.find(c => c.id === parseInt(idCapitulo))
    if (cap) {
      setCapituloActivo(cap)
      setLikesContador(cap.likes_count || 0)
      setHaDadoLike(false)
      setDesbloqueadoLocal(false)
      chaptersAPI.registrarLectura(proyecto.id, cap.id).catch(() => {})
      const pags = (cap.paginas || []).sort((a, b) => a.numero - b.numero)
      setPaginas(pags)
      setIndicePagina(0)
    }
  }

  const handleDarLike = async () => {
    if (!proyecto || !capituloActivo || haDadoLike) return
    setHaDadoLike(true)
    setLikesContador(prev => prev + 1)
    try {
      await chaptersAPI.darLike(proyecto.id, capituloActivo.id)
    } catch {
      // mantener estado optimista
    }
  }

  // ─── 2. GESTIÓN DE AUTO-HIDE DE CONTROLES ─────────────────────────────────

  const resetearTimerControles = useCallback(() => {
    setMostrarControles(true)
    if (timerControlesRef.current) clearTimeout(timerControlesRef.current)
    timerControlesRef.current = setTimeout(() => {
      setMostrarControles(false)
    }, 3500)
  }, [])

  useEffect(() => {
    if (!abierto) return
    resetearTimerControles()
    return () => {
      if (timerControlesRef.current) clearTimeout(timerControlesRef.current)
    }
  }, [abierto, resetearTimerControles])

  // ─── 3. NAVEGACIÓN ENTRE PÁGINAS ──────────────────────────────────────────

  const irSiguientePagina = useCallback(() => {
    if (modoLectura === 'double') {
      setIndicePagina(prev => Math.min(prev + 2, Math.max(0, paginas.length - 1)))
    } else {
      setIndicePagina(prev => Math.min(prev + 1, paginas.length - 1))
    }
  }, [modoLectura, paginas.length])

  const irAnteriorPagina = useCallback(() => {
    if (modoLectura === 'double') {
      setIndicePagina(prev => Math.max(prev - 2, 0))
    } else {
      setIndicePagina(prev => Math.max(prev - 1, 0))
    }
  }, [modoLectura])

  // ─── 4. CONTROL POR TECLADO & FULLSCREEN ──────────────────────────────────

  const togglePantallaCompleta = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => console.warn(err))
      setEsPantallaCompleta(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => console.warn(err))
      }
      setEsPantallaCompleta(false)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setEsPantallaCompleta(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    if (!abierto) return

    const handleKeyDown = (e) => {
      resetearTimerControles()

      // Atajos
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          if (document.exitFullscreen) document.exitFullscreen().catch(() => {})
          setEsPantallaCompleta(false)
        } else {
          onCerrar()
        }
      } else if (e.key.toLowerCase() === 'f') {
        togglePantallaCompleta()
      } else if (e.key.toLowerCase() === 'w') {
        setModoLectura('webtoon')
      } else if (e.key.toLowerCase() === 'm') {
        setModoLectura('manga')
      }

      // Navegación en modo página
      if (modoLectura !== 'webtoon') {
        if (modoLectura === 'manga') {
          // Manga Oriental: Flecha Izquierda AVANZA, Flecha Derecha RETROCEDE
          if (e.key === 'ArrowLeft' || e.key === ' ') {
            e.preventDefault()
            irSiguientePagina()
          } else if (e.key === 'ArrowRight') {
            e.preventDefault()
            irAnteriorPagina()
          }
        } else {
          // Cómic Occidental / Double: Flecha Derecha AVANZA, Flecha Izquierda RETROCEDE
          if (e.key === 'ArrowRight' || e.key === ' ') {
            e.preventDefault()
            irSiguientePagina()
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            irAnteriorPagina()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [abierto, modoLectura, irSiguientePagina, irAnteriorPagina, onCerrar, resetearTimerControles])

  // ─── 5. GESTOS TÁCTILES (SWIPE EN MÓVILES) ────────────────────────────────

  const handleTouchStart = (e) => {
    resetearTimerControles()
    touchInicioRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    }
  }

  const handleTouchEnd = (e) => {
    const deltaX = e.changedTouches[0].clientX - touchInicioRef.current.x
    const deltaY = e.changedTouches[0].clientY - touchInicioRef.current.y

    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (modoLectura === 'manga') {
        if (deltaX < 0) irSiguientePagina() // Swipe hacia la izquierda -> avanzar
        else irAnteriorPagina()             // Swipe hacia la derecha -> retroceder
      } else if (modoLectura !== 'webtoon') {
        if (deltaX < 0) irSiguientePagina()
        else irAnteriorPagina()
      }
    }
  }

  // ─── 6. INTERSECTION OBSERVER EN MODO WEBTOON ─────────────────────────────

  useEffect(() => {
    if (modoLectura !== 'webtoon' || !contenedorWebtoonRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const num = parseInt(entry.target.getAttribute('data-pagina-num'), 10)
            if (!isNaN(num)) setIndicePagina(num - 1)
          }
        })
      },
      { threshold: 0.5 }
    )

    const elementosPagina = contenedorWebtoonRef.current.querySelectorAll('[data-pagina-num]')
    elementosPagina.forEach(el => observer.observe(el))

    return () => observer.disconnect()
  }, [modoLectura, paginas])

  if (!abierto) return null

  // Renderizar una página individual
  const renderizarImagenPagina = (pagina, index, extraClass = '') => {
    if (!pagina) return null

    const imagenUrl = pagina.thumbnail_url || pagina.imagen_url

    // Estilos de zoom
    let zoomClass = 'w-auto max-h-[84vh] object-contain'
    if (zoomNivel === 'fit_width') zoomClass = 'w-full max-w-4xl h-auto object-contain'
    if (zoomNivel === 'original') zoomClass = 'w-auto max-w-none h-auto'

    if (imagenUrl) {
      return (
        <img
          key={pagina.id || index}
          data-pagina-num={pagina.numero}
          src={imagenUrl}
          alt={`Página ${pagina.numero}`}
          className={`shadow-2xl rounded-sm transition-transform duration-200 select-none ${zoomClass} ${extraClass}`}
          loading="lazy"
        />
      )
    }

    // Fallback: Si no tiene imagen renderizada todavía, mostrar canvas manga estilizado
    return (
      <div
        key={pagina.id || index}
        data-pagina-num={pagina.numero}
        className={`bg-white text-gray-800 flex flex-col items-center justify-center p-8 border-2 border-gray-300 shadow-2xl rounded-sm aspect-[1/1.414] select-none ${zoomClass} ${extraClass}`}
        style={{ minWidth: '320px', minHeight: '450px' }}
      >
        <div className="border border-dashed border-gray-400 w-full h-full flex flex-col items-center justify-center p-6 text-center">
          <span className="font-manga text-5xl text-rdc-accent mb-2">MEP</span>
          <h4 className="font-titulo text-xl font-bold mb-1">
            {t('reader.page')} {pagina.numero}
          </h4>
          <p className="text-gray-500 text-xs font-titulo">
            {capituloActivo?.titulo || `Capítulo ${capituloActivo?.numero}`}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={contenedorModalRef}
      onMouseMove={resetearTimerControles}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-50 bg-black/95 text-white flex flex-col overflow-hidden select-none font-sans"
    >
      {/* ─── BARRA SUPERIOR FLOTANTE (AUTO-OCULTABLE) ────────────────────── */}
      <header
        className={`absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/90 via-black/70 to-transparent p-4 transition-all duration-300 ${
          mostrarControles ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Info del Proyecto y Capítulo */}
          <div className="flex items-center gap-3">
            <button
              onClick={onCerrar}
              className="bg-white/10 hover:bg-white/20 text-white font-titulo px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5"
              title={t('reader.close')}
            >
              <span>←</span> {t('nav.back')}
            </button>

            <div className="hidden sm:block">
              <h2 className="font-titulo text-sm font-bold text-rdc-accent leading-none">
                {proyecto?.nombre}
              </h2>
              <p className="text-gray-300 text-xs font-titulo">
                {capituloActivo?.titulo || `Capítulo ${capituloActivo?.numero}`}
              </p>
            </div>
          </div>

          {/* Selector de Capítulo Rápido */}
          <div className="flex items-center gap-2">
            {capitulos.length > 1 && (
              <select
                value={capituloActivo?.id || ''}
                onChange={(e) => handleCambiarCapitulo(e.target.value)}
                className="bg-gray-900/90 border border-gray-700 text-white text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-rdc-accent font-titulo"
              >
                {capitulos.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.numero}. {c.titulo || `Capítulo ${c.numero}`} ({c.paginas?.length || 0} pág)
                  </option>
                ))}
              </select>
            )}

            {/* Selector de Modo de Lectura */}
            <div className="flex items-center bg-gray-900/90 border border-gray-700 rounded-lg p-0.5 text-xs font-titulo">
              <button
                onClick={() => setModoLectura('webtoon')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  modoLectura === 'webtoon' ? 'bg-rdc-accent text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
                title="Scroll Vertical Webtoon (W)"
              >
                📜 Webtoon
              </button>
              <button
                onClick={() => setModoLectura('manga')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  modoLectura === 'manga' ? 'bg-rdc-accent text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
                title="Manga Oriental D→I (M)"
              >
                📖 Manga D→I
              </button>
              <button
                onClick={() => setModoLectura('western')}
                className={`px-2.5 py-1 rounded transition-colors hidden sm:block ${
                  modoLectura === 'western' ? 'bg-rdc-accent text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
                title="Cómic Occidental I→D"
              >
                📑 Cómic I→D
              </button>
              <button
                onClick={() => setModoLectura('double')}
                className={`px-2.5 py-1 rounded transition-colors hidden md:block ${
                  modoLectura === 'double' ? 'bg-rdc-accent text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
                title="Doble Página Spread"
              >
                📖📖 Spread
              </button>
            </div>

            {/* Botón de Like */}
            <button
              onClick={handleDarLike}
              className={`px-3 py-1.5 rounded-lg border text-xs font-titulo transition-all flex items-center gap-1.5 shadow-sm ${
                haDadoLike
                  ? 'bg-red-500/20 border-red-500 text-red-300 font-bold'
                  : 'bg-gray-900/90 border-gray-700 text-gray-300 hover:text-white hover:border-red-500/60'
              }`}
              title={haDadoLike ? t('analytics.liked') : t('analytics.likeBtn')}
            >
              <span className={haDadoLike ? 'animate-bounce-gentle' : ''}>❤️</span>
              <span>{likesContador}</span>
            </button>

            {/* Botón Pantalla Completa */}
            <button
              onClick={togglePantallaCompleta}
              className="p-1.5 bg-gray-900/90 border border-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors text-xs"
              title="Pantalla Completa (F)"
            >
              {esPantallaCompleta ? '🗗' : '⛶'}
            </button>
            <button
              onClick={onCerrar}
              className="bg-rdc-error/80 hover:bg-rdc-error text-white px-2.5 py-1 rounded-lg text-base font-bold transition-colors"
              title={t('reader.close')}
            >
              ×
            </button>
          </div>

        </div>
      </header>

      {/* ─── CONTENEDOR PRINCIPAL DEL LECTOR ─────────────────────────────── */}
      <main className="flex-1 w-full h-full flex items-center justify-center overflow-hidden relative">
        
        {/* Muro de Pago (Paywall) si el capítulo es premium y está bloqueado */}
        {capituloActivo?.is_premium && !estaDesbloqueado(capituloActivo) && !desbloqueadoLocal && (
          <PaywallOverlay
            capitulo={capituloActivo}
            onDesbloqueado={() => setDesbloqueadoLocal(true)}
          />
        )}
        
        {/* Loading Spinner */}
        {cargando && (
          <div className="text-center py-20">
            <Spinner />
            <p className="text-gray-400 text-xs mt-3 font-titulo">{t('reader.loadingPages')}</p>
          </div>
        )}

        {/* Sin páginas */}
        {!cargando && paginas.length === 0 && (
          <div className="text-center p-8 bg-gray-900/80 rounded-2xl border border-gray-800 max-w-md">
            <p className="text-4xl mb-3">📚</p>
            <h3 className="font-titulo text-lg font-bold text-white mb-1">
              {t('reader.noPages')}
            </h3>
            <p className="text-gray-400 text-xs mb-4">
              Edita este capítulo para añadir viñetas y arte generado.
            </p>
            <button
              onClick={onCerrar}
              className="bg-rdc-accent hover:bg-rdc-accent-hover text-white font-titulo px-4 py-2 rounded-lg text-xs"
            >
              {t('nav.back')}
            </button>
          </div>
        )}

        {/* ── MODO 1: WEBTOON (SCROLL VERTICAL CONTINUO) ────────────────── */}
        {!cargando && paginas.length > 0 && modoLectura === 'webtoon' && (
          <div
            ref={contenedorWebtoonRef}
            className="w-full h-full overflow-y-auto overflow-x-hidden flex flex-col items-center py-12 px-2 scroll-smooth"
          >
            <div className="max-w-2xl w-full flex flex-col items-center gap-0">
              {paginas.map((pag, idx) => (
                <div key={pag.id || idx} className="w-full flex justify-center">
                  {renderizarImagenPagina(pag, idx, 'w-full h-auto')}
                </div>
              ))}

              <div className="text-center py-12 text-gray-500 text-xs font-titulo">
                🏁 {t('reader.endOfChapter')}
              </div>
            </div>
          </div>
        )}

        {/* ── MODO 2: PÁGINA SIMPLE (MANGA D→I / CÓMIC I→D) ─────────────── */}
        {!cargando && paginas.length > 0 && (modoLectura === 'manga' || modoLectura === 'western') && (
          <div className="w-full h-full flex items-center justify-center p-4 relative">
            
            {/* Botón Lateral Izquierdo (Siguiente en Manga, Anterior en Western) */}
            <button
              onClick={modoLectura === 'manga' ? irSiguientePagina : irAnteriorPagina}
              disabled={modoLectura === 'manga' ? indicePagina >= paginas.length - 1 : indicePagina <= 0}
              className="absolute left-4 z-30 p-4 bg-black/40 hover:bg-black/80 text-white rounded-full transition-all duration-200 disabled:opacity-0 disabled:pointer-events-none backdrop-blur-sm"
              title={modoLectura === 'manga' ? t('reader.nextPage') : t('reader.prevPage')}
            >
              ❮
            </button>

            {/* Página Renderizada */}
            <div className="flex items-center justify-center max-w-full max-h-full">
              {renderizarImagenPagina(paginas[indicePagina], indicePagina)}
            </div>

            {/* Botón Lateral Derecho (Anterior en Manga, Siguiente en Western) */}
            <button
              onClick={modoLectura === 'manga' ? irAnteriorPagina : irSiguientePagina}
              disabled={modoLectura === 'manga' ? indicePagina <= 0 : indicePagina >= paginas.length - 1}
              className="absolute right-4 z-30 p-4 bg-black/40 hover:bg-black/80 text-white rounded-full transition-all duration-200 disabled:opacity-0 disabled:pointer-events-none backdrop-blur-sm"
              title={modoLectura === 'manga' ? t('reader.prevPage') : t('reader.nextPage')}
            >
              ❯
            </button>
          </div>
        )}

        {/* ── MODO 3: DOBLE PÁGINA SPREAD (2 PÁGINAS LADO A LADO) ─────────── */}
        {!cargando && paginas.length > 0 && modoLectura === 'double' && (
          <div className="w-full h-full flex items-center justify-center p-4 gap-2 relative">
            <button
              onClick={irAnteriorPagina}
              disabled={indicePagina <= 0}
              className="absolute left-4 z-30 p-4 bg-black/40 hover:bg-black/80 text-white rounded-full transition-all duration-200 disabled:opacity-0 disabled:pointer-events-none backdrop-blur-sm"
            >
              ❮
            </button>

            <div className="flex items-center justify-center gap-2 max-w-full max-h-[85vh]">
              {/* En Manga Oriental: Página N+1 a la izquierda, Página N a la derecha */}
              {formatoProyecto === 'manga' ? (
                <>
                  {indicePagina + 1 < paginas.length && renderizarImagenPagina(paginas[indicePagina + 1], indicePagina + 1, 'max-h-[82vh]')}
                  {renderizarImagenPagina(paginas[indicePagina], indicePagina, 'max-h-[82vh]')}
                </>
              ) : (
                <>
                  {renderizarImagenPagina(paginas[indicePagina], indicePagina, 'max-h-[82vh]')}
                  {indicePagina + 1 < paginas.length && renderizarImagenPagina(paginas[indicePagina + 1], indicePagina + 1, 'max-h-[82vh]')}
                </>
              )}
            </div>

            <button
              onClick={irSiguientePagina}
              disabled={indicePagina >= paginas.length - 1}
              className="absolute right-4 z-30 p-4 bg-black/40 hover:bg-black/80 text-white rounded-full transition-all duration-200 disabled:opacity-0 disabled:pointer-events-none backdrop-blur-sm"
            >
              ❯
            </button>
          </div>
        )}

      </main>

      {/* ─── BARRA INFERIOR FLOTANTE CON SCRUBBER Y ZOOM ─────────────────── */}
      <footer
        className={`absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 transition-all duration-300 ${
          mostrarControles ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
          
          {/* Scrubber / Barra deslizante de páginas */}
          {paginas.length > 1 && (
            <div className="flex items-center gap-3 px-2">
              <span className="text-xs font-titulo text-gray-300 font-semibold w-16 text-right">
                {indicePagina + 1} / {paginas.length}
              </span>
              <input
                type="range"
                min={0}
                max={paginas.length - 1}
                value={indicePagina}
                onChange={(e) => setIndicePagina(parseInt(e.target.value))}
                className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-rdc-accent"
              />
            </div>
          )}

          {/* Controles de Zoom y Guía de Teclas */}
          <div className="flex items-center justify-between text-xs text-gray-400 font-titulo px-2">
            <span className="hidden sm:inline">
              💡 {t('reader.controlsHint')}
            </span>

            {/* Selector de Zoom */}
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                onClick={() => setZoomNivel('fit_height')}
                className={`px-2.5 py-1 rounded border border-gray-700 transition-colors ${
                  zoomNivel === 'fit_height' ? 'bg-rdc-accent text-white font-bold' : 'bg-gray-900/90 text-gray-300 hover:text-white'
                }`}
                title="Ajustar al Alto de la Ventana"
              >
                {t('reader.fitHeight')}
              </button>
              <button
                onClick={() => setZoomNivel('fit_width')}
                className={`px-2.5 py-1 rounded border border-gray-700 transition-colors ${
                  zoomNivel === 'fit_width' ? 'bg-rdc-accent text-white font-bold' : 'bg-gray-900/90 text-gray-300 hover:text-white'
                }`}
                title="Ajustar al Ancho"
              >
                {t('reader.fitWidth')}
              </button>
              <button
                onClick={() => setZoomNivel('original')}
                className={`px-2.5 py-1 rounded border border-gray-700 transition-colors ${
                  zoomNivel === 'original' ? 'bg-rdc-accent text-white font-bold' : 'bg-gray-900/90 text-gray-300 hover:text-white'
                }`}
                title="100% Tamaño Original"
              >
                {t('reader.fitOriginal')}
              </button>
            </div>
          </div>

        </div>
      </footer>
    </div>
  )
}
