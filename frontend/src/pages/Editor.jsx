// Editor.jsx
// Página completa del editor de manga en MEP — Manga Editor Pro con iconografía Lucide React.
// Layout: toolbar izquierdo | canvas central | panel derecho

import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Save,
  BookOpen,
  ArrowLeft,
  Layers,
  LayoutGrid,
  Files,
  Sliders,
  Magnet,
  Film,
  MessageSquare,
  Sparkles,
  Zap,
  Settings2,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import useEditorStore from '../store/editorStore'
import useProjectStore from '../store/projectStore'
import MangaCanvas from '../components/Editor/MangaCanvas'
import CanvasToolbar from '../components/Editor/CanvasToolbar'
import EditorToolbar from '../components/Editor/EditorToolbar'
import ChapterNavigator from '../components/Editor/ChapterNavigator'
import TemplatesSidebar from '../components/Editor/TemplatesSidebar'
import BalloonsSidebar from '../components/Editor/BalloonsSidebar'
import EfectosYSFXPanel from '../components/Editor/EfectosYSFXPanel'
import VinetasCapituloPanel from '../components/Editor/VinetasCapituloPanel'
import LanguageSelector from '../components/common/LanguageSelector'
import ThemeToggle from '../components/common/ThemeToggle'
import AiEngineToggle from '../components/common/AiEngineToggle'
import AiEngineFallbackBanner from '../components/common/AiEngineFallbackBanner'
import ComicReaderModal from '../components/Reader/ComicReaderModal'
import OnlineBadge from '../components/common/OnlineBadge'
import UserAvatar from '../components/common/UserAvatar'
import LayersPanel from '../components/Editor/LayersPanel'
import MangaFilterPanel from '../components/Editor/MangaFilterPanel'
import SnappingControlsPanel from '../components/Editor/SnappingControlsPanel'
import { CONFIG_SNAPPING_DEFAULT } from '../components/Editor/canvasSnapping'
import ErrorBoundary from '../components/UI/ErrorBoundary'

function EditorContent() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const canvasRef = useRef(null)

  const { proyectoActivo, cargarProyecto } = useProjectStore()
  const {
    paginaActiva, capituloActivo, herramientaActiva,
    guardando, ultimoGuardado,
    cargarCapitulos, guardarCanvas,
    setHerramientaActiva, limpiarEditor
  } = useEditorStore()

  const tabQuery = searchParams.get('tab')
  const [tabDerecha, setTabDerecha] = useState(() => {
    if (!tabQuery) return 'plantillas'
    if (tabQuery === 'sfx' || tabQuery === 'efectos') return 'efectos_sfx'
    const valid = ['plantillas', 'vinetas', 'bocadillos', 'efectos_sfx', 'estructura', 'capas', 'filtros', 'snapping']
    return valid.includes(tabQuery) ? tabQuery : 'plantillas'
  })
  const [ajustesAvanzadosAbierto, setAjustesAvanzadosAbierto] = useState(() =>
    ['estructura', 'capas', 'filtros', 'snapping'].includes(tabQuery)
  )
  const [historial, setHistorial] = useState({ puedeDeshacer: false, puedeRehacer: false })
  const [zoom, setZoom] = useState(1)
  const [lectorAbierto, setLectorAbierto] = useState(false)
  const [snappingConfig, setSnappingConfig] = useState(CONFIG_SNAPPING_DEFAULT)
  const [textoSeleccionado, setTextoSeleccionado] = useState(null)

  const TABS_PRINCIPALES = [
    { id: 'plantillas',  icon: LayoutGrid,    label: t('editor.tabs.templates') || 'Plantillas' },
    { id: 'vinetas',     icon: Film,          label: t('editor.tabs.panels') || 'Viñetas' },
    { id: 'bocadillos',  icon: MessageSquare, label: t('editor.tabs.balloons') || 'Bocadillos' },
    { id: 'efectos_sfx', icon: Sparkles,      label: t('editor.tabs.fx') || 'Efectos & SFX' },
  ]

  const TABS_AVANZADOS = [
    { id: 'estructura',  icon: BookOpen,      label: t('editor.tabs.structure') || 'Estructura' },
    { id: 'capas',       icon: Layers,        label: t('editor.tabs.layers') || 'Capas' },
    { id: 'filtros',     icon: Sliders,       label: t('editor.tabs.filters') || 'Filtros' },
    { id: 'snapping',    icon: Magnet,        label: t('editor.tabs.snapping') || 'Guías' },
  ]

  useEffect(() => {
    if (id) {
      cargarProyecto(parseInt(id, 10))
      cargarCapitulos(parseInt(id, 10))
    }
    return () => limpiarEditor()
  }, [id])

  // Auto-guardado local en IndexedDB cada 30 segundos
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (canvasRef.current && paginaActiva && id) {
        const canvasJSON = canvasRef.current.getCanvasJSON?.()
        if (canvasJSON) {
          guardarCanvas(parseInt(id, 10), paginaActiva.id, canvasJSON)
        }
      }
    }, 30000)

    return () => clearInterval(autoSaveInterval)
  }, [id, paginaActiva, guardarCanvas])

  // Manejar guardado manual
  const handleGuardarManual = async () => {
    if (!canvasRef.current || !paginaActiva || !id) return
    const canvasJSON = canvasRef.current.getCanvasJSON()
    await guardarCanvas(parseInt(id, 10), paginaActiva.id, canvasJSON)
  }

  const handleGuardar = handleGuardarManual

  // Manejar aplicación de plantilla
  const handleAplicarPlantilla = (plantillaId) => {
    if (!canvasRef.current) return
    canvasRef.current.aplicarPlantilla(plantillaId)
  }

  // Formatear último guardado con traducciones i18n
  const formatearUltimoGuardado = () => {
    if (!ultimoGuardado) return t('editor.unsavedChanges') || 'Cambios sin guardar'
    const segs = Math.round((Date.now() - ultimoGuardado) / 1000)
    if (segs < 5) return t('editor.savedJustNow') || 'Guardado ahora mismo'
    if (segs < 60) return t('editor.savedSecsAgo', { seconds: segs }) || `Guardado hace ${segs}s`
    return t('editor.savedMinsAgo', { minutes: Math.round(segs / 60) }) || `Guardado hace ${Math.round(segs / 60)}m`
  }

  return (
    <div className="h-screen bg-rdc-primary flex flex-col overflow-hidden transition-colors duration-300">
      <AiEngineFallbackBanner />

      {/* ── Navbar superior ── */}
      <nav className="h-14 bg-rdc-secondary/95 border-b border-rdc-border
                      flex items-center justify-between px-4 flex-shrink-0 z-30 backdrop-blur-md transition-colors duration-300">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 group cursor-pointer select-none" title="MEP — Manga Editor Pro">
            <h1 className="font-manga text-2xl text-rdc-accent group-hover:scale-105 transition-transform">MEP</h1>
          </Link>
          <div className="h-4 w-px bg-rdc-border" />
          <button
            onClick={() => navigate(`/proyecto/${id}`)}
            className="text-rdc-muted hover:text-rdc-text transition-colors text-xs sm:text-sm font-titulo flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t('nav.studio') || 'Studio'}</span>
          </button>
          <div className="h-4 w-px bg-rdc-border hidden sm:block" />
          <div className="hidden sm:block">
            <p className="font-titulo text-sm text-rdc-text font-bold leading-none truncate max-w-[200px]">
              {proyectoActivo?.nombre || 'MEP Editor'}
            </p>
            {paginaActiva && (
              <p className="text-rdc-muted text-[11px] font-titulo mt-0.5">
                {t('editor.pageNumber', { num: paginaActiva.numero }) || `Página ${paginaActiva.numero}`}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <OnlineBadge />
          <button
            onClick={() => setLectorAbierto(true)}
            className="bg-rdc-card hover:bg-rdc-secondary border border-rdc-border hover:border-rdc-accent text-rdc-text text-xs font-titulo font-semibold px-2.5 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            title={t('reader.openReader') || 'Lector'}
          >
            <BookOpen className="w-3.5 h-3.5 text-rdc-accent" />
            <span className="hidden md:inline">{t('reader.openReader') || 'Lector'}</span>
          </button>
          <AiEngineToggle />
          <ThemeToggle />
          <LanguageSelector />

          {/* Estado de guardado */}
          {guardando ? (
            <span className="text-rdc-muted text-xs flex items-center gap-1 font-titulo">
              <div className="w-3 h-3 border border-rdc-muted border-t-transparent rounded-full animate-spin" />
              <span className="hidden md:inline">{t('editor.saving') || 'Guardando...'}</span>
            </span>
          ) : (
            <span className="text-rdc-muted text-xs font-titulo hidden lg:inline">
              {formatearUltimoGuardado()}
            </span>
          )}

          <button
            onClick={handleGuardarManual}
            disabled={!paginaActiva || guardando}
            className="bg-rdc-accent hover:bg-rdc-accent-hover text-white
                       text-xs font-titulo font-semibold px-3 py-1.5 rounded-xl
                       transition-colors duration-200 disabled:opacity-50 shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{t('editor.save') || 'Guardar'}</span>
          </button>

          <div className="h-5 w-px bg-rdc-border hidden sm:block" />
          <UserAvatar showName={false} />
        </div>
      </nav>

      {/* ── Layout principal ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Panel izquierdo: herramientas con iconografía Lucide */}
        <CanvasToolbar
          herramientaActiva={herramientaActiva}
          onCambiarHerramienta={setHerramientaActiva}
          onDeshacer={() => canvasRef.current?.deshacer()}
          onRehacer={() => canvasRef.current?.rehacer()}
          onEliminarSeleccion={() => canvasRef.current?.eliminarSeleccion()}
          onLimpiarCanvas={() => canvasRef.current?.limpiarMarcoSeleccionado?.()}
          puedeDeshacer={historial.puedeDeshacer}
          puedeRehacer={historial.puedeRehacer}
        />

        {/* Canvas central */}
        <div className="flex-1 overflow-hidden relative bg-rdc-primary flex flex-col">
          {/* Barra superior de herramientas: Zoom, Capas, Historial, Tipografía y Exportación PNG */}
          <EditorToolbar
            canvasRef={canvasRef}
            zoom={zoom}
            onZoomChange={setZoom}
            onDeshacer={() => canvasRef.current?.deshacer()}
            onRehacer={() => canvasRef.current?.rehacer()}
            onEliminarSeleccion={() => canvasRef.current?.eliminarSeleccion()}
            puedeDeshacer={historial.puedeDeshacer}
            puedeRehacer={historial.puedeRehacer}
            paginaActiva={paginaActiva}
            capituloActivo={capituloActivo}
            proyectoActivo={proyectoActivo}
            textoSeleccionado={textoSeleccionado}
          />

          <div className="flex-1 overflow-hidden relative">
            {!paginaActiva ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-6">
                  <div className="w-14 h-14 rounded-2xl bg-rdc-card flex items-center justify-center mx-auto mb-3 text-rdc-muted">
                    <BookOpen className="w-8 h-8 text-rdc-accent" />
                  </div>
                  <p className="font-titulo text-lg text-rdc-text font-bold mb-1">
                    {t('editor.selectPage') || 'Cargando lienzo de página...'}
                  </p>
                  <p className="text-rdc-muted text-xs max-w-sm mx-auto">
                    {t('editor.selectPageDesc') || 'El lienzo se inicializará de inmediato con la estructura de tu proyecto.'}
                  </p>
                </div>
              </div>
            ) : (
              <MangaCanvas
                ref={canvasRef}
                paginaActiva={paginaActiva}
                plantillaActiva={paginaActiva?.layout_template || 'grid_4_regular'}
                herramientaActiva={herramientaActiva}
                zoom={zoom}
                onZoomChange={setZoom}
                onGuardar={handleGuardar}
                onHistorialCambio={setHistorial}
                snappingConfig={snappingConfig}
                onTextoSeleccionadoChange={setTextoSeleccionado}
                onHerramientaChange={setHerramientaActiva}
              />
            )}
          </div>
        </div>

        {/* Panel derecho: navegador, plantillas, viñetas, bocadillos, efectos & sfx, y ajustes avanzados */}
        <div className="w-64 sm:w-72 bg-rdc-secondary/95 border-l border-rdc-border flex flex-col flex-shrink-0 backdrop-blur-md">

          {/* Botonera superior: 4 pestañas esenciales en una sola fila */}
          <div className="grid grid-cols-4 gap-1 p-2 bg-slate-900 border-b border-slate-800 flex-shrink-0 select-none">
            {TABS_PRINCIPALES.map(tab => {
              const Icon = tab.icon
              const activo = tabDerecha === tab.id || (tab.id === 'efectos_sfx' && (tabDerecha === 'efectos' || tabDerecha === 'sfx'))
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTabDerecha(tab.id)}
                  title={tab.label}
                  className={`text-xs py-2 px-1 rounded flex flex-col items-center justify-center transition-colors cursor-pointer ${
                    activo
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4 mb-0.5" />
                  <span className="text-[10px] leading-tight truncate">{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Contenido del tab principal */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {tabDerecha === 'plantillas' && (
              <TemplatesSidebar
                canvasRef={canvasRef}
                plantillaActivaId={paginaActiva?.layout_template}
                onAplicarPlantilla={(plantilla) => {
                  if (canvasRef.current?.aplicarPlantillaDesdeJson) {
                    canvasRef.current.aplicarPlantillaDesdeJson(plantilla)
                  }
                }}
              />
            )}
            {tabDerecha === 'vinetas' && (
              <VinetasCapituloPanel
                onInsertarImagen={async (url, vineta) => {
                  if (canvasRef.current?.insertarImagenEnVineta) {
                    await canvasRef.current.insertarImagenEnVineta(url, vineta)
                  }
                }}
                onCrearBocadillo={(dialogo) => {
                  if (canvasRef.current?.insertarBocadilloDialogo) {
                    canvasRef.current.insertarBocadilloDialogo(dialogo)
                  }
                }}
              />
            )}
            {tabDerecha === 'bocadillos' && (
              <BalloonsSidebar
                canvasRef={canvasRef}
                onInsertarBocadillo={(preset, texto) => {
                  if (canvasRef.current?.insertarBocadilloPreset) {
                    canvasRef.current.insertarBocadilloPreset(preset, null, null, texto)
                  }
                }}
              />
            )}
            {(tabDerecha === 'efectos_sfx' || tabDerecha === 'efectos' || tabDerecha === 'sfx') && (
              <EfectosYSFXPanel
                canvasRef={canvasRef}
                onActualizar={handleGuardarManual}
                onInsertarSFX={(sfx) => {
                  if (canvasRef.current?.insertarSFX) {
                    canvasRef.current.insertarSFX(sfx)
                  }
                }}
              />
            )}
            {tabDerecha === 'estructura' && proyectoActivo && (
              <ChapterNavigator proyecto={proyectoActivo} />
            )}
            {tabDerecha === 'capas' && (
              <LayersPanel
                canvas={canvasRef.current?.getFabricCanvas?.()}
                onActualizar={handleGuardarManual}
              />
            )}
            {tabDerecha === 'filtros' && (
              <MangaFilterPanel
                canvas={canvasRef.current?.getFabricCanvas?.()}
                onActualizar={handleGuardarManual}
              />
            )}
            {tabDerecha === 'snapping' && (
              <SnappingControlsPanel
                config={snappingConfig}
                onChangeConfig={setSnappingConfig}
              />
            )}
          </div>

          {/* Cajón inferior colapsable: Ajustes Avanzados */}
          <div className="border-t border-slate-800 bg-slate-950 flex-shrink-0">
            <button
              type="button"
              onClick={() => setAjustesAvanzadosAbierto(!ajustesAvanzadosAbierto)}
              className="w-full px-3 py-2 flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors select-none cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-amber-500" />
                <span>{t('editor.tabs.advanced') || 'Ajustes Avanzados'}</span>
              </span>
              {ajustesAvanzadosAbierto ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {ajustesAvanzadosAbierto && (
              <div className="grid grid-cols-4 gap-1 p-2 bg-slate-900/90 border-t border-slate-800/60 select-none">
                {TABS_AVANZADOS.map(tab => {
                  const Icon = tab.icon
                  const activo = tabDerecha === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setTabDerecha(tab.id)}
                      title={tab.label}
                      className={`text-[10px] py-1.5 px-1 rounded flex flex-col items-center justify-center transition-colors cursor-pointer ${
                        activo
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 mb-0.5" />
                      <span className="leading-tight truncate">{tab.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Lector Interactivo Modal ── */}
      {lectorAbierto && proyectoActivo && (
        <ComicReaderModal
          abierto={lectorAbierto}
          onCerrar={() => setLectorAbierto(false)}
          proyecto={proyectoActivo}
          paginaInicialNumero={paginaActiva?.numero || 1}
        />
      )}
    </div>
  )
}

export default function Editor() {
  return (
    <ErrorBoundary>
      <EditorContent />
    </ErrorBoundary>
  )
}
