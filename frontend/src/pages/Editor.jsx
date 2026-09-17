// Editor.jsx
// Página completa del editor de manga en MEP — Manga Editor Pro.
// Layout: toolbar izquierdo | canvas central | panel derecho

import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
    { id: 'estructura', emoji: '📚', label: t('editor.tabs.structure') },
    { id: 'plantillas', emoji: '📐', label: t('editor.tabs.templates') },
    { id: 'capas',      emoji: '📑', label: t('editor.tabs.layers') },
    { id: 'filtros',    emoji: '🎭', label: t('editor.tabs.filters') },
    { id: 'snapping',   emoji: '🧲', label: t('editor.tabs.snapping') },
  ]

  useEffect(() => {
    cargarProyecto(parseInt(id))
    cargarCapitulos(parseInt(id))
    return () => limpiarEditor()
  }, [id])

  // Auto-guardado local en IndexedDB cada 30 segundos
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (canvasRef.current && paginaActiva) {
        const canvasJSON = canvasRef.current.getCanvasJSON?.()
        if (canvasJSON) {
          guardarCanvas(parseInt(id), paginaActiva.id, canvasJSON)
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

  // Manejar inserción de bocadillos
  const handleInsertarBocadillo = (tipo) => {
    if (!canvasRef.current) return
    canvasRef.current.insertarBocadillo(tipo)
  }

  // Formatear último guardado
  const formatearUltimoGuardado = () => {
    if (!ultimoGuardado) return t('editor.unsavedChanges')
    const segs = Math.round((Date.now() - ultimoGuardado) / 1000)
    if (segs < 5) return t('editor.savedJustNow')
    if (segs < 60) return t('editor.savedSecsAgo', { seconds: segs })
    return t('editor.savedMinsAgo', { minutes: Math.round(segs / 60) })
  }

  return (
    <div className="h-screen bg-rdc-primary flex flex-col overflow-hidden transition-colors duration-300">
      <AiEngineFallbackBanner />

      {/* ── Navbar superior ── */}
      <nav className="h-12 bg-rdc-secondary/95 border-b border-rdc-border
                      flex items-center justify-between px-4 flex-shrink-0 z-30 backdrop-blur-md transition-colors duration-300">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-2 group cursor-pointer select-none" title="Ir al Dashboard">
            <h1 className="font-manga text-xl text-rdc-accent group-hover:scale-105 transition-transform">MEP</h1>
          </Link>
          <div className="h-4 w-px bg-rdc-border" />
          <button
            onClick={() => navigate(`/proyecto/${id}`)}
            className="text-rdc-muted hover:text-rdc-text transition-colors text-sm font-titulo"
          >
            ← {t('nav.studio')}
          </button>
          <div className="h-4 w-px bg-rdc-border" />
          <div>
            <p className="font-titulo text-sm text-rdc-text font-semibold leading-none">
              {proyectoActivo?.nombre || 'MEP Editor'}
            </p>
            {paginaActiva && (
              <p className="text-rdc-muted text-xs font-titulo">
                {t('editor.pageNumber', { num: paginaActiva.numero })}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <OnlineBadge />
          <button
            onClick={() => setLectorAbierto(true)}
            className="bg-rdc-card hover:bg-rdc-secondary border border-rdc-border hover:border-rdc-accent text-rdc-text text-xs font-titulo font-semibold px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            title={t('reader.openReader')}
          >
            <span>📖</span> <span className="hidden sm:inline">{t('reader.openReader')}</span>
          </button>
          <AiEngineToggle />
          <ThemeToggle />
          <LanguageSelector />

          {/* Estado de guardado */}
          {guardando ? (
            <span className="text-rdc-muted text-xs flex items-center gap-1 font-titulo">
              <div className="w-3 h-3 border border-rdc-muted border-t-transparent
                              rounded-full animate-spin" />
              {t('editor.saving')}
            </span>
          ) : (
            <span className="text-rdc-muted text-xs font-titulo hidden md:inline">
              {formatearUltimoGuardado()}
            </span>
          )}

          <button
            onClick={handleGuardarManual}
            disabled={!paginaActiva || guardando}
            className="bg-rdc-accent hover:bg-rdc-accent-hover text-white
                       text-xs font-titulo px-3 py-1.5 rounded-lg
                       transition-colors duration-200 disabled:opacity-50 shadow-md"
          >
            {t('editor.save')}
          </button>
        </div>
      </nav>

      {/* ── Layout principal ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Panel izquierdo: herramientas */}
        <CanvasToolbar
          herramientaActiva={herramientaActiva}
          onCambiarHerramienta={setHerramientaActiva}
          onDeshacer={() => canvasRef.current?.deshacer()}
          onRehacer={() => canvasRef.current?.rehacer()}
          onEliminarSeleccion={() => canvasRef.current?.eliminarSeleccion()}
          puedeDeshacer={historial.puedeDeshacer}
          puedeRehacer={historial.puedeRehacer}
        />

        {/* Canvas central */}
        <div className="flex-1 overflow-hidden relative">
          {!paginaActiva ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-5xl mb-4">📄</p>
                <p className="font-titulo text-xl text-rdc-text font-semibold mb-2">
                  {t('editor.selectPage')}
                </p>
                <p className="text-rdc-muted text-sm max-w-sm mx-auto">
                  {t('editor.selectPageDesc')}
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
                <div className="absolute right-4 top-4 w-80 bg-rdc-secondary
                                border border-rdc-border rounded-xl shadow-2xl
                                overflow-y-auto max-h-[80vh] z-50">
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
        <div className="w-64 sm:w-72 bg-rdc-secondary border-l border-rdc-border
                        flex flex-col flex-shrink-0">

          {/* Tabs del panel derecho */}
          <div className="flex border-b border-rdc-border overflow-x-auto no-scrollbar">
            {TABS_DERECHA.map(tab => (
              <button
                key={tab.id}
                onClick={() => setTabDerecha(tab.id)}
                title={tab.label}
                className={`flex-1 py-2 px-1 text-[11px] font-titulo transition-colors whitespace-nowrap text-center ${
                  tabDerecha === tab.id
                    ? 'text-rdc-accent border-b-2 border-rdc-accent font-bold bg-rdc-card/40'
                    : 'text-rdc-muted hover:text-rdc-text'
                }`}
              >
                <span>{tab.emoji}</span>
                <span className="hidden sm:inline ml-1">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Contenido del tab */}
          <div className="flex-1 overflow-hidden">
            {tabDerecha === 'estructura' && proyectoActivo && (
              <ChapterNavigator proyecto={proyectoActivo} />
            )}
            {tabDerecha === 'plantillas' && (
              <div className="overflow-y-auto h-full">
                <p className="text-rdc-muted text-xs px-3 pt-3 pb-1 uppercase font-titulo">
                  {t('editor.applyTemplate')}
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