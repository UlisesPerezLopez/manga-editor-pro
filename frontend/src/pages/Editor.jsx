// Editor.jsx
// Página completa del editor de manga en MEP — Manga Editor Pro con iconografía Lucide React.
// Layout: toolbar izquierdo | canvas central | panel derecho

import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Save,
  BookOpen,
  ArrowLeft,
  Layers,
  LayoutTemplate,
  Files,
  Sliders,
  Magnet
} from 'lucide-react'
import useEditorStore from '../store/editorStore'
import useProjectStore from '../store/projectStore'
import MangaCanvas from '../components/Editor/MangaCanvas'
import CanvasToolbar from '../components/Editor/CanvasToolbar'
import ChapterNavigator from '../components/Editor/ChapterNavigator'
import PageTemplates from '../components/Editor/PageTemplates'
import GenerateArtPanel from '../components/Editor/GenerateArtPanel'
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
  const { t } = useTranslation()
  const canvasRef = useRef(null)

  const { proyectoActivo, cargarProyecto } = useProjectStore()
  const {
    paginaActiva, herramientaActiva,
    guardando, ultimoGuardado,
    cargarCapitulos, guardarCanvas,
    setHerramientaActiva, limpiarEditor
  } = useEditorStore()

  const [tabDerecha, setTabDerecha] = useState('estructura')
  const [historial, setHistorial] = useState({ puedeDeshacer: false, puedeRehacer: false })
  const [lectorAbierto, setLectorAbierto] = useState(false)
  const [snappingConfig, setSnappingConfig] = useState(CONFIG_SNAPPING_DEFAULT)
  
  // Estados para generación de imágenes en viñetas
  const [vinetaActiva, setVinetaActiva] = useState(null)
  const [mostrarGenerador, setMostrarGenerador] = useState(false)

  const TABS_DERECHA = [
    { id: 'estructura', icon: Layers,         label: t('editor.tabs.structure') || 'Estructura' },
    { id: 'plantillas', icon: LayoutTemplate,   label: t('editor.tabs.templates') || 'Plantillas' },
    { id: 'capas',      icon: Files,            label: t('editor.tabs.layers') || 'Capas' },
    { id: 'filtros',    icon: Sliders,          label: t('editor.tabs.filters') || 'Filtros' },
    { id: 'snapping',   icon: Magnet,           label: t('editor.tabs.snapping') || 'Guías' },
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
          onLimpiarCanvas={() => canvasRef.current?.limpiar?.()}
          puedeDeshacer={historial.puedeDeshacer}
          puedeRehacer={historial.puedeRehacer}
        />

        {/* Canvas central */}
        <div className="flex-1 overflow-hidden relative bg-rdc-primary">
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
            <>
              <MangaCanvas
                ref={canvasRef}
                paginaActiva={paginaActiva}
                herramientaActiva={herramientaActiva}
                onGuardar={handleGuardar}
                onHistorialCambio={setHistorial}
                snappingConfig={snappingConfig}
                onVinetaSeleccionada={(vineta) => {
                  setVinetaActiva(vineta)
                  if (vineta) setMostrarGenerador(true)
                }}
              />

              {/* Panel de generación flotante */}
              {mostrarGenerador && vinetaActiva && (
                <div className="absolute right-4 top-4 w-80 bg-rdc-secondary/95
                                border border-rdc-border rounded-2xl shadow-2xl backdrop-blur-md
                                overflow-y-auto max-h-[80vh] z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-4">
                    <GenerateArtPanel
                      proyecto={proyectoActivo}
                      vinetaSeleccionada={vinetaActiva}
                      onImagenGenerada={async (imagen, tipo) => {
                        if (canvasRef.current?.insertarImagenEnVineta) {
                          await canvasRef.current.insertarImagenEnVineta(
                            imagen, tipo
                          )
                          setMostrarGenerador(false)
                        }
                      }}
                      onCerrar={() => setMostrarGenerador(false)}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Panel derecho: navegador, plantillas, capas, filtros y guías */}
        <div className="w-64 sm:w-72 bg-rdc-secondary/95 border-l border-rdc-border flex flex-col flex-shrink-0 backdrop-blur-md">

          {/* Tabs del panel derecho */}
          <div className="flex border-b border-rdc-border overflow-x-auto whitespace-nowrap no-scrollbar p-1 gap-1">
            {TABS_DERECHA.map(tab => {
              const Icon = tab.icon
              const activo = tabDerecha === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setTabDerecha(tab.id)}
                  title={tab.label}
                  className={`flex-1 py-1.5 px-2 text-[11px] font-titulo rounded-lg transition-colors whitespace-nowrap flex items-center justify-center gap-1 cursor-pointer ${
                    activo
                      ? 'bg-rdc-accent text-white font-bold shadow-xs'
                      : 'text-rdc-muted hover:text-rdc-text hover:bg-rdc-card'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Contenido del tab */}
          <div className="flex-1 overflow-hidden">
            {tabDerecha === 'estructura' && proyectoActivo && (
              <ChapterNavigator proyecto={proyectoActivo} />
            )}
            {tabDerecha === 'plantillas' && (
              <div className="overflow-y-auto h-full">
                <p className="text-rdc-muted text-xs px-3 pt-3 pb-1 uppercase font-titulo">
                  {t('editor.applyTemplate') || 'Plantillas de viñetas'}
                </p>
                <PageTemplates
                  onSeleccionar={handleAplicarPlantilla}
                  plantillaActual={paginaActiva?.layout_template}
                />
              </div>
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
