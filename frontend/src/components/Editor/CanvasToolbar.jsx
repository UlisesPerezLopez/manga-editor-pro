// CanvasToolbar.jsx
// Barra de herramientas lateral del canvas con iconografía profesional Lucide React,
// atajos de teclado y soporte completo de dibujo, viñetas, bocadillos y texto.

import { useTranslation } from 'react-i18next'
import {
  MousePointer,
  Square,
  Paintbrush,
  MessageSquare,
  Cloud,
  FileText,
  Type,
  Undo2,
  Redo2,
  Trash2,
  Eraser
} from 'lucide-react'

export default function CanvasToolbar({
  herramientaActiva,
  onCambiarHerramienta,
  onDeshacer,
  onRehacer,
  onEliminarSeleccion,
  onLimpiarCanvas,
  puedeDeshacer,
  puedeRehacer,
}) {
  const { t } = useTranslation()

  const HERRAMIENTAS = [
    {
      id: 'seleccionar',
      icon: MousePointer,
      label: t('editor.tools.select') || 'Seleccionar',
      tecla: 'V',
    },
    {
      id: 'vineta',
      icon: Square,
      label: t('editor.tools.panel') || 'Viñeta',
      tecla: 'R',
    },
    {
      id: 'pincel',
      icon: Paintbrush,
      label: t('editor.tools.brush') || 'Pincel de tinta',
      tecla: 'B',
    },
    {
      id: 'bocadillo_dialogo',
      icon: MessageSquare,
      label: t('editor.tools.dialogue') || 'Bocadillo de Diálogo',
      tecla: 'D',
    },
    {
      id: 'bocadillo_pensamiento',
      icon: Cloud,
      label: t('editor.tools.thought') || 'Bocadillo de Pensamiento',
      tecla: 'P',
    },
    {
      id: 'bocadillo_narracion',
      icon: FileText,
      label: t('editor.tools.narration') || 'Caja de Narración',
      tecla: 'N',
    },
    {
      id: 'texto',
      icon: Type,
      label: t('editor.tools.text') || 'Texto Libre',
      tecla: 'T',
    },
  ]

  return (
    <div className="flex flex-col items-center justify-between p-2 bg-rdc-secondary/95
                    border-r border-rdc-border h-full w-14 z-20 backdrop-blur-md">

      {/* Herramientas principales */}
      <div className="space-y-1.5 w-full flex flex-col items-center">
        {HERRAMIENTAS.map(h => {
          const Icon = h.icon
          const activo = herramientaActiva === h.id
          return (
            <button
              key={h.id}
              onClick={() => onCambiarHerramienta(h.id)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center
                          transition-all duration-150 relative group cursor-pointer
                          ${activo
                            ? 'bg-rdc-accent text-white shadow-md scale-105'
                            : 'text-rdc-muted hover:bg-rdc-card hover:text-rdc-text'
                          }`}
            >
              <Icon className="w-5 h-5 stroke-[1.75]" />

              {/* Tooltip flotante */}
              <div className="absolute left-14 top-1/2 -translate-y-1/2 z-50
                              bg-rdc-card border border-rdc-border rounded-xl
                              px-3 py-2 text-xs text-rdc-text whitespace-nowrap
                              opacity-0 group-hover:opacity-100 pointer-events-none
                              transition-opacity duration-150 shadow-2xl font-titulo">
                <p className="font-bold">{h.label}</p>
                <p className="text-rdc-accent text-[11px] mt-0.5 font-mono">Atajo: [{h.tecla}]</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Separador y acciones de historial */}
      <div className="w-full flex flex-col items-center space-y-1.5 pt-2 border-t border-rdc-border">
        {/* Deshacer */}
        <button
          onClick={onDeshacer}
          disabled={!puedeDeshacer}
          className="w-10 h-10 rounded-xl flex items-center justify-center
                     text-rdc-muted hover:bg-rdc-card hover:text-rdc-text
                     transition-all duration-150 disabled:opacity-30
                     disabled:cursor-not-allowed cursor-pointer relative group"
        >
          <Undo2 className="w-5 h-5 stroke-[1.75]" />
          <div className="absolute left-14 top-1/2 -translate-y-1/2 z-50
                          bg-rdc-card border border-rdc-border rounded-xl
                          px-3 py-1.5 text-xs text-rdc-text whitespace-nowrap
                          opacity-0 group-hover:opacity-100 pointer-events-none
                          transition-opacity duration-150 shadow-xl font-titulo">
            {t('editor.tools.undo') || 'Deshacer'} (Ctrl+Z)
          </div>
        </button>

        {/* Rehacer */}
        <button
          onClick={onRehacer}
          disabled={!puedeRehacer}
          className="w-10 h-10 rounded-xl flex items-center justify-center
                     text-rdc-muted hover:bg-rdc-card hover:text-rdc-text
                     transition-all duration-150 disabled:opacity-30
                     disabled:cursor-not-allowed cursor-pointer relative group"
        >
          <Redo2 className="w-5 h-5 stroke-[1.75]" />
          <div className="absolute left-14 top-1/2 -translate-y-1/2 z-50
                          bg-rdc-card border border-rdc-border rounded-xl
                          px-3 py-1.5 text-xs text-rdc-text whitespace-nowrap
                          opacity-0 group-hover:opacity-100 pointer-events-none
                          transition-opacity duration-150 shadow-xl font-titulo">
            {t('editor.tools.redo') || 'Rehacer'} (Ctrl+Y)
          </div>
        </button>

        {/* Eliminar Selección */}
        <button
          onClick={onEliminarSeleccion}
          className="w-10 h-10 rounded-xl flex items-center justify-center
                     text-rdc-muted hover:bg-rdc-error/20 hover:text-rdc-error
                     transition-all duration-150 cursor-pointer relative group"
        >
          <Trash2 className="w-5 h-5 stroke-[1.75]" />
          <div className="absolute left-14 top-1/2 -translate-y-1/2 z-50
                          bg-rdc-card border border-rdc-border rounded-xl
                          px-3 py-1.5 text-xs text-rdc-text whitespace-nowrap
                          opacity-0 group-hover:opacity-100 pointer-events-none
                          transition-opacity duration-150 shadow-xl font-titulo">
            {t('editor.tools.delete') || 'Eliminar Selección'} (Supr)
          </div>
        </button>

        {/* Limpiar Canvas */}
        {onLimpiarCanvas && (
          <button
            onClick={onLimpiarCanvas}
            className="w-10 h-10 rounded-xl flex items-center justify-center
                       text-rdc-muted hover:bg-amber-500/20 hover:text-amber-400
                       transition-all duration-150 cursor-pointer relative group"
          >
            <Eraser className="w-5 h-5 stroke-[1.75]" />
            <div className="absolute left-14 top-1/2 -translate-y-1/2 z-50
                            bg-rdc-card border border-rdc-border rounded-xl
                            px-3 py-1.5 text-xs text-rdc-text whitespace-nowrap
                            opacity-0 group-hover:opacity-100 pointer-events-none
                            transition-opacity duration-150 shadow-xl font-titulo">
              {t('editor.tools.clear') || 'Limpiar Lienzo'}
            </div>
          </button>
        )}
      </div>
    </div>
  )
}
