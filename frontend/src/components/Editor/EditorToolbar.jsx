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
  Download,
  Save,
  Layers,
  Sparkles,
  FileImage
} from 'lucide-react'

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
  proyectoActivo,
}) {
  const { t } = useTranslation()
  const [exportando, setExportando] = useState(false)

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

  // Exportar Página PNG a resolución nativa 2x
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

      const numPagina = paginaActiva?.numero || 1
      const prefijo = proyectoActivo?.nombre
        ? proyectoActivo.nombre.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_')
        : 'manga'
      const nombreArchivo = `${prefijo}_pagina_${numPagina}_hd.png`

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
    <div className="h-11 bg-rdc-secondary/95 border-b border-rdc-border px-3 flex items-center justify-between flex-shrink-0 z-20 backdrop-blur-md transition-colors select-none">
      {/* ── Grupo Izquierdo: Zoom y Visualización ── */}
      <div className="flex items-center gap-1.5">
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
          title="Restablecer al 100%"
        >
          <Maximize2 className="w-3 h-3" />
          <span>Ajustar 1:1</span>
        </button>
      </div>

      {/* ── Grupo Central: Apilamiento de Capas y Edición ── */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Historial Deshacer/Rehacer */}
        <div className="flex items-center bg-rdc-primary border border-rdc-border rounded-lg p-0.5">
          <button
            type="button"
            onClick={onDeshacer}
            disabled={!puedeDeshacer}
            className="w-7 h-7 flex items-center justify-center text-rdc-muted hover:text-rdc-text hover:bg-rdc-card rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Deshacer (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRehacer}
            disabled={!puedeRehacer}
            className="w-7 h-7 flex items-center justify-center text-rdc-muted hover:text-rdc-text hover:bg-rdc-card rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Rehacer (Ctrl+Y)"
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
          title="Traer elemento seleccionado al frente"
        >
          <BringToFront className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">Traer al Frente</span>
        </button>

        {/* Enviar al Fondo */}
        <button
          type="button"
          onClick={handleEnviarAlFondo}
          className="h-7 px-2.5 rounded-lg bg-rdc-card hover:bg-rdc-primary border border-rdc-border hover:border-rdc-accent text-rdc-text text-[11px] font-titulo font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Enviar elemento seleccionado al fondo"
        >
          <SendToBack className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden md:inline">Enviar al Fondo</span>
        </button>

        {/* Eliminar Selección */}
        <button
          type="button"
          onClick={handleEliminar}
          className="h-7 px-2.5 rounded-lg bg-rdc-card hover:bg-red-500/20 hover:text-red-400 border border-rdc-border hover:border-red-500 text-rdc-muted text-[11px] font-titulo font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Eliminar Selección (Supr)"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Eliminar (Del)</span>
        </button>
      </div>

      {/* ── Grupo Derecho: Exportar Página PNG 2x ── */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleExportarPNG}
          disabled={exportando}
          className="h-7 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-titulo font-bold flex items-center gap-1.5 shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
          title="Descarga la página maquetada en PNG a doble resolución (2x)"
        >
          {exportando ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Exportando...</span>
            </>
          ) : (
            <>
              <FileImage className="w-3.5 h-3.5" />
              <span>💾 Exportar Página PNG</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
