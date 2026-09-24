// EditorToolbar.jsx
// Barra superior horizontal del editor con controles de visualización,
// apilamiento de capas, historial, atajos y exportación de página PNG de alta resolución (2x).

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  BringToFront,
  SendToBack,
  Trash2,
  Undo2,
  Redo2,
  FileImage,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  RotateCcw,
  Sparkles,
  Type,
  ChevronDown,
  X
} from 'lucide-react'
import FontPickerModal from './FontPickerModal'
import useEditorStore from '../../store/editorStore'

const NIVELES_ZOOM = [
  { valor: 0.5,  label: '50%' },
  { valor: 0.75, label: '75%' },
  { valor: 1.0,  label: '100%' },
  { valor: 1.5,  label: '150%' },
]

export default function EditorToolbar({
  canvasRef,
  zoom = 1,
  onZoomChange,
  onDeshacer,
  onRehacer,
  onEliminarSeleccion,
  puedeDeshacer = false,
  puedeRehacer = false,
  paginaActiva,
  capituloActivo,
  proyectoActivo,
  textoSeleccionado = null,
}) {
  const { t } = useTranslation()
  const purgarBorradores = useEditorStore(state => state.purgarBorradores)
  const [exportando, setExportando] = useState(false)
  const [fontPickerAbierto, setFontPickerAbierto] = useState(false)

  // Cambiar zoom mediante presets o pasos
  const aplicarZoom = (nuevoZoom) => {
    const clamped = Math.max(0.25, Math.min(2.5, Math.round(nuevoZoom * 100) / 100))
    if (onZoomChange) {
      onZoomChange(clamped)
    } else if (canvasRef?.current?.setZoom) {
      canvasRef.current.setZoom(clamped)
    }
  }

  // Traer elemento seleccionado al frente
  const handleTraerAlFrente = () => {
    if (canvasRef?.current?.traerAlFrente) {
      canvasRef.current.traerAlFrente()
    }
  }

  // Enviar elemento seleccionado al fondo
  const handleEnviarAlFondo = () => {
    if (canvasRef?.current?.enviarAlFondo) {
      canvasRef.current.enviarAlFondo()
    }
  }

  // Eliminar selección
  const handleEliminar = () => {
    if (onEliminarSeleccion) {
      onEliminarSeleccion()
    } else if (canvasRef?.current?.eliminarSeleccion) {
      canvasRef.current.eliminarSeleccion()
    }
  }

  // Restablecer el lienzo a plantilla limpia y purgar borradores
  const handleResetearPlantilla = async () => {
    if (!canvasRef?.current) return
    const confirmar = window.confirm(
      t('editor.toolbar.resetConfirm') ||
      '¿Restablecer el lienzo a la plantilla actual? Se limpiarán las viñetas y elementos del lienzo.'
    )
    if (confirmar) {
      const targetPlantilla = paginaActiva?.layout_template || 'grid_4_regular'
      canvasRef.current.reconstruirPlantilla?.(targetPlantilla)
      try {
        await purgarBorradores(proyectoActivo?.id, paginaActiva?.id)
      } catch (err) {
        console.warn('Error purgando borradores:', err)
      }
    }
  }

  // Exportar Página PNG a resolución nativa 2x (1190 x 1684 px)
  const handleExportarPNG = () => {
    if (!canvasRef?.current) return
    try {
      setExportando(true)
      const dataUrl = canvasRef.current.exportCanvas
        ? canvasRef.current.exportCanvas(2)
        : null

      if (!dataUrl) {
        console.error('No se pudo obtener el dataURL del canvas')
        return
      }

      const capNum = paginaActiva?.capitulo_numero || capituloActivo?.numero || 1
      const pagNum = paginaActiva?.numero || 1
      const nombreArchivo = `Capitulo_${capNum}_Pagina_${pagNum}_Maquetada.png`

      const enlace = document.createElement('a')
      enlace.download = nombreArchivo
      enlace.href = dataUrl
      document.body.appendChild(enlace)
      enlace.click()
      document.body.removeChild(enlace)
    } catch (err) {
      console.error('Error al exportar página en PNG:', err)
    } finally {
      setTimeout(() => setExportando(false), 600)
    }
  }

  return (
    <>
      <div className="h-11 bg-rdc-secondary/95 border-b border-rdc-border px-3 flex items-center justify-between flex-shrink-0 z-20 backdrop-blur-md transition-colors select-none gap-2 overflow-x-auto">
        {/* ── Grupo Izquierdo: Zoom y Visualización ── */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="flex items-center bg-rdc-primary border border-rdc-border rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => aplicarZoom(zoom - 0.25)}
              disabled={zoom <= 0.5}
              className="w-7 h-7 flex items-center justify-center text-rdc-muted hover:text-rdc-text hover:bg-rdc-card rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Reducir Zoom (-25%)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-0.5 px-1">
              {NIVELES_ZOOM.map((nivel) => {
                const esActivo = Math.abs(zoom - nivel.valor) < 0.05
                return (
                  <button
                    key={nivel.label}
                    type="button"
                    onClick={() => aplicarZoom(nivel.valor)}
                    className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded transition-all cursor-pointer ${
                      esActivo
                        ? 'bg-rdc-accent text-white shadow-xs'
                        : 'text-rdc-muted hover:text-rdc-text hover:bg-rdc-card'
                    }`}
                  >
                    {nivel.label}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => aplicarZoom(zoom + 0.25)}
              disabled={zoom >= 2.0}
              className="w-7 h-7 flex items-center justify-center text-rdc-muted hover:text-rdc-text hover:bg-rdc-card rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Aumentar Zoom (+25%)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => aplicarZoom(1.0)}
            className="h-7 px-2 text-[11px] font-titulo font-semibold text-rdc-muted hover:text-rdc-text hover:bg-rdc-card rounded-lg border border-rdc-border transition-colors hidden sm:flex items-center gap-1 cursor-pointer"
            title={t('editor.toolbar.fit11') || 'Ajustar 1:1'}
          >
            <Maximize2 className="w-3 h-3" />
            <span>{t('editor.toolbar.fit11') || 'Ajustar 1:1'}</span>
          </button>
        </div>

        {/* ── Grupo Central: Inspector Superior de Tipografía y Formato (Canva-like) ── */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-0.5">
          {textoSeleccionado ? (
            /* Inspector Activo cuando hay un texto/bocadillo/onomatopeya seleccionado */
            <div className="flex items-center gap-1.5 bg-rdc-primary border border-amber-500/60 rounded-xl p-1 px-2 shadow-sm animate-in fade-in duration-150">
              {/* Botón Selector de Tipografía (Google Fonts & Custom) */}
              <button
                type="button"
                onClick={() => setFontPickerAbierto(true)}
                className="flex items-center gap-1.5 px-2 py-1 bg-rdc-card hover:bg-slate-800 border border-rdc-border hover:border-amber-400 rounded-lg text-xs font-semibold text-rdc-text transition-all cursor-pointer shadow-xs max-w-[140px]"
                title="Explorar y cambiar tipografía (Google Fonts y personalizadas)"
              >
                <Type className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span className="truncate text-[11px]" style={{ fontFamily: textoSeleccionado.fontFamily }}>
                  {textoSeleccionado.fontFamily || 'Comic Relief'}
                </span>
                <ChevronDown className="w-3 h-3 text-rdc-muted flex-shrink-0" />
              </button>

              {/* Tamaño de Fuente */}
              <div className="flex items-center bg-rdc-card border border-rdc-border rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => canvasRef.current?.cambiarTamanoTexto?.(-2)}
                  className="w-5 h-5 flex items-center justify-center text-rdc-muted hover:text-rdc-text font-bold text-xs rounded hover:bg-rdc-secondary cursor-pointer"
                  title="Reducir tamaño (-2px)"
                >
                  -
                </button>
                <input
                  type="number"
                  min="8"
                  max="140"
                  value={textoSeleccionado.fontSize || 18}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    if (!isNaN(val) && val >= 8 && val <= 160) {
                      canvasRef.current?.setFontSize?.(val)
                    }
                  }}
                  className="w-9 text-center bg-transparent text-[11px] font-mono font-bold text-amber-400 focus:outline-none"
                  title="Tamaño de fuente (px)"
                />
                <button
                  type="button"
                  onClick={() => canvasRef.current?.cambiarTamanoTexto?.(2)}
                  className="w-5 h-5 flex items-center justify-center text-rdc-muted hover:text-rdc-text font-bold text-xs rounded hover:bg-rdc-secondary cursor-pointer"
                  title="Aumentar tamaño (+2px)"
                >
                  +
                </button>
              </div>

              {/* Negrita / Cursiva */}
              <div className="flex items-center bg-rdc-card border border-rdc-border rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => canvasRef.current?.toggleNegrita?.()}
                  className={`w-6 h-6 flex items-center justify-center rounded transition-colors cursor-pointer ${
                    textoSeleccionado.isBold
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-rdc-muted hover:text-rdc-text hover:bg-rdc-secondary'
                  }`}
                  title={t('editor.toolbar.bold')}
                >
                  <Bold className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => canvasRef.current?.toggleCursiva?.()}
                  className={`w-6 h-6 flex items-center justify-center rounded transition-colors cursor-pointer ${
                    textoSeleccionado.isItalic
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-rdc-muted hover:text-rdc-text hover:bg-rdc-secondary'
                  }`}
                  title={t('editor.toolbar.italic')}
                >
                  <Italic className="w-3 h-3" />
                </button>
              </div>

              {/* Alineación */}
              <div className="flex items-center bg-rdc-card border border-rdc-border rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => canvasRef.current?.setAlineacion?.('left')}
                  className={`p-1 rounded cursor-pointer ${
                    textoSeleccionado.textAlign === 'left' ? 'bg-amber-500 text-slate-950' : 'text-rdc-muted hover:text-rdc-text hover:bg-rdc-secondary'
                  }`}
                  title={t('editor.toolbar.alignLeft')}
                >
                  <AlignLeft className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => canvasRef.current?.setAlineacion?.('center')}
                  className={`p-1 rounded cursor-pointer ${
                    textoSeleccionado.textAlign === 'center' ? 'bg-amber-500 text-slate-950' : 'text-rdc-muted hover:text-rdc-text hover:bg-rdc-secondary'
                  }`}
                  title={t('editor.toolbar.alignCenter')}
                >
                  <AlignCenter className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => canvasRef.current?.setAlineacion?.('right')}
                  className={`p-1 rounded cursor-pointer ${
                    textoSeleccionado.textAlign === 'right' ? 'bg-amber-500 text-slate-950' : 'text-rdc-muted hover:text-rdc-text hover:bg-rdc-secondary'
                  }`}
                  title={t('editor.toolbar.alignRight')}
                >
                  <AlignRight className="w-3 h-3" />
                </button>
              </div>

              {/* Color de Relleno del Texto */}
              <div className="flex items-center gap-1 bg-rdc-card border border-rdc-border rounded-lg px-1.5 py-0.5">
                <span className="text-[10px] text-rdc-muted font-bold">{t('editor.toolbar.color')}:</span>
                <label
                  className="relative w-4 h-4 rounded-full border border-slate-500 overflow-hidden cursor-pointer flex items-center justify-center hover:scale-110 transition-transform"
                  style={{ backgroundColor: textoSeleccionado.color || '#000000' }}
                  title={t('editor.toolbar.textColor')}
                >
                  <input
                    type="color"
                    value={textoSeleccionado.color?.startsWith('#') && textoSeleccionado.color.length === 7 ? textoSeleccionado.color : '#000000'}
                    onChange={(e) => canvasRef.current?.setColor?.(e.target.value)}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                  />
                </label>
              </div>

              {/* Contorno / Stroke del Texto (paintFirst: stroke) */}
              <div className="flex items-center gap-1 bg-rdc-card border border-rdc-border rounded-lg px-1.5 py-0.5">
                <span className="text-[10px] text-rdc-muted font-bold">{t('editor.toolbar.stroke')}:</span>
                {[0, 2, 4, 6].map((w) => {
                  const esActivo = (textoSeleccionado.strokeWidth || 0) === w
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => canvasRef.current?.setTextStroke?.(textoSeleccionado.stroke || '#000000', w)}
                      className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded cursor-pointer transition-colors ${
                        esActivo
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'text-rdc-muted hover:text-rdc-text hover:bg-rdc-secondary'
                      }`}
                      title={t('editor.toolbar.strokeWidth', { width: w })}
                    >
                      {w === 0 ? '0' : `${w}p`}
                    </button>
                  )
                })}
                <label
                  className="relative w-4 h-4 rounded-full border border-slate-500 overflow-hidden cursor-pointer flex items-center justify-center hover:scale-110 transition-transform ml-0.5"
                  style={{ backgroundColor: textoSeleccionado.stroke || '#000000' }}
                  title={t('editor.toolbar.strokeColor')}
                >
                  <input
                    type="color"
                    value={textoSeleccionado.stroke?.startsWith('#') && textoSeleccionado.stroke.length === 7 ? textoSeleccionado.stroke : '#000000'}
                    onChange={(e) => canvasRef.current?.setTextStroke?.(e.target.value, textoSeleccionado.strokeWidth || 2)}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                  />
                </label>
              </div>

              {/* Sombra de Texto */}
              <div className="flex items-center gap-1 bg-rdc-card border border-rdc-border rounded-lg px-1.5 py-0.5">
                <span className="text-[10px] text-rdc-muted font-bold">{t('editor.toolbar.shadow')}:</span>
                <button
                  type="button"
                  onClick={() => canvasRef.current?.setTextShadow?.('none')}
                  className={`px-1.5 py-0.5 text-[10px] font-semibold rounded cursor-pointer transition-colors ${
                    !textoSeleccionado.hasShadow
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-rdc-muted hover:text-rdc-text hover:bg-rdc-secondary'
                  }`}
                  title={t('editor.toolbar.noShadow')}
                >
                  {t('editor.toolbar.noShadow')}
                </button>
                <button
                  type="button"
                  onClick={() => canvasRef.current?.setTextShadow?.('subtle')}
                  className="px-1.5 py-0.5 text-[10px] font-semibold rounded text-rdc-muted hover:text-rdc-text hover:bg-rdc-secondary cursor-pointer transition-colors"
                  title={t('editor.toolbar.softShadow')}
                >
                  {t('editor.toolbar.softShadow')}
                </button>
                <button
                  type="button"
                  onClick={() => canvasRef.current?.setTextShadow?.('comic')}
                  className="px-1.5 py-0.5 text-[10px] font-semibold rounded text-rdc-muted hover:text-rdc-text hover:bg-rdc-secondary cursor-pointer transition-colors"
                  title={t('editor.toolbar.comicShadow')}
                >
                  {t('editor.toolbar.comicShadow')}
                </button>
              </div>

              {/* Opciones adicionales para Bocadillos (Fondo y Borde del Globo) */}
              {textoSeleccionado.isBalloon && (
                <div className="flex items-center gap-1.5 bg-rdc-card border border-sky-500/50 rounded-lg px-2 py-0.5">
                  <span className="text-[10px] text-sky-400 font-bold">{t('editor.toolbar.balloon')}:</span>
                  <label
                    className="relative w-4 h-4 rounded-full border border-slate-500 overflow-hidden cursor-pointer"
                    style={{ backgroundColor: textoSeleccionado.shapeFill || '#FFFFFF' }}
                    title={t('editor.toolbar.balloonBg')}
                  >
                    <input
                      type="color"
                      value={textoSeleccionado.shapeFill?.startsWith('#') && textoSeleccionado.shapeFill.length === 7 ? textoSeleccionado.shapeFill : '#FFFFFF'}
                      onChange={(e) => canvasRef.current?.setShapeFill?.(e.target.value)}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    />
                  </label>
                  <label
                    className="relative w-4 h-4 rounded-full border border-slate-500 overflow-hidden cursor-pointer"
                    style={{ backgroundColor: textoSeleccionado.shapeStroke || '#000000' }}
                    title={t('editor.toolbar.balloonStroke')}
                  >
                    <input
                      type="color"
                      value={textoSeleccionado.shapeStroke?.startsWith('#') && textoSeleccionado.shapeStroke.length === 7 ? textoSeleccionado.shapeStroke : '#000000'}
                      onChange={(e) => canvasRef.current?.setShapeStroke?.(e.target.value, textoSeleccionado.shapeStrokeWidth || 2)}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    />
                  </label>
                </div>
              )}
            </div>
          ) : (
            /* Botones Estándar de Maquetación cuando no hay texto activo */
            <>
              {/* Historial Deshacer/Rehacer */}
              <div className="flex items-center bg-rdc-primary border border-rdc-border rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={onDeshacer}
                  disabled={!puedeDeshacer}
                  className="w-7 h-7 flex items-center justify-center text-rdc-muted hover:text-rdc-text hover:bg-rdc-card rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title={`${t('editor.tools.undo')} (Ctrl+Z)`}
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onRehacer}
                  disabled={!puedeRehacer}
                  className="w-7 h-7 flex items-center justify-center text-rdc-muted hover:text-rdc-text hover:bg-rdc-card rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title={`${t('editor.tools.redo')} (Ctrl+Y)`}
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="h-4 w-px bg-rdc-border hidden xs:block" />

              {/* Traer al Frente */}
              <button
                type="button"
                onClick={handleTraerAlFrente}
                className="h-7 px-2.5 rounded-lg bg-rdc-card hover:bg-rdc-primary border border-rdc-border hover:border-rdc-accent text-rdc-text text-[11px] font-titulo font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title={t('editor.toolbar.bringToFront')}
              >
                <BringToFront className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">{t('editor.toolbar.bringToFront')}</span>
              </button>

              {/* Enviar al Fondo */}
              <button
                type="button"
                onClick={handleEnviarAlFondo}
                className="h-7 px-2.5 rounded-lg bg-rdc-card hover:bg-rdc-primary border border-rdc-border hover:border-rdc-accent text-rdc-text text-[11px] font-titulo font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title={t('editor.toolbar.sendToBack')}
              >
                <SendToBack className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden md:inline">{t('editor.toolbar.sendToBack')}</span>
              </button>

              {/* Eliminar Selección */}
              <button
                type="button"
                onClick={handleEliminar}
                className="h-7 px-2.5 rounded-lg bg-rdc-card hover:bg-red-500/20 hover:text-red-400 border border-rdc-border hover:border-red-500 text-rdc-muted text-[11px] font-titulo font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title={t('editor.toolbar.delete')}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">{t('editor.toolbar.delete')}</span>
              </button>
            </>
          )}
        </div>

        {/* ── Grupo Derecho: Resetear a Plantilla y Exportar Página PNG 2x ── */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleResetearPlantilla}
            className="h-7 px-2.5 rounded-lg bg-rdc-card hover:bg-amber-500/20 text-rdc-muted hover:text-amber-400 border border-rdc-border hover:border-amber-500 text-[11px] font-titulo font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title={t('editor.toolbar.resetTemplate')}
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">🔄 {t('editor.toolbar.resetTemplate')}</span>
          </button>

          <button
            type="button"
            onClick={handleExportarPNG}
            disabled={exportando}
            className="h-7 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-titulo font-bold flex items-center gap-1.5 shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
            title={t('editor.toolbar.exportPng')}
          >
            {exportando ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t('editor.saving') || 'Exportando...'}</span>
              </>
            ) : (
              <>
                <FileImage className="w-3.5 h-3.5" />
                <span>💾 {t('editor.toolbar.exportPng')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal / Selector de Tipografías Canva-Style */}
      <FontPickerModal
        isOpen={fontPickerAbierto}
        onClose={() => setFontPickerAbierto(false)}
        fuenteActual={textoSeleccionado?.fontFamily || 'Comic Relief'}
        onSeleccionarFuente={(fuente) => {
          canvasRef.current?.setFontFamily?.(fuente)
        }}
      />
    </>
  )
}
