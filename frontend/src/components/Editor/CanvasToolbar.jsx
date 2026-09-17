// CanvasToolbar.jsx
// Barra de herramientas del canvas del editor de manga con soporte multilingüe.

import { useTranslation } from 'react-i18next'

export default function CanvasToolbar({
  herramientaActiva,
  onCambiarHerramienta,
  onDeshacer,
  onRehacer,
  onEliminarSeleccion,
  puedeDeshacer,
  puedeRehacer,
}) {
  const { t } = useTranslation()

  const HERRAMIENTAS = [
    {
      id: 'seleccionar',
      emoji: '↖️',
      label: t('editor.tools.select'),
      tecla: 'V',
    },
    {
      id: 'vineta',
      emoji: '⬛',
      label: t('editor.tools.panel'),
      tecla: 'R',
    },
    {
      id: 'bocadillo_dialogo',
      emoji: '💬',
      label: t('editor.tools.dialogue'),
      tecla: 'D',
    },
    {
      id: 'bocadillo_pensamiento',
      emoji: '💭',
      label: t('editor.tools.thought'),
      tecla: 'P',
    },
    {
      id: 'bocadillo_narracion',
      emoji: '📋',
      label: t('editor.tools.narration'),
      tecla: 'N',
    },
    {
      id: 'texto',
      emoji: '✏️',
      label: t('editor.tools.text'),
      tecla: 'T',
    },
  ]

  return (
    <div className="flex flex-col gap-1 p-2 bg-rdc-secondary
                    border-r border-rdc-border h-full w-14">

      {/* Herramientas principales */}
      <div className="space-y-1">
        {HERRAMIENTAS.map(h => (
          <button
            key={h.id}
            onClick={() => onCambiarHerramienta(h.id)}
            title={`${h.label} (${h.tecla})`}
            className={`w-10 h-10 rounded-lg flex items-center justify-center
                        text-lg transition-all duration-150 relative group
                        ${herramientaActiva === h.id
                          ? 'bg-rdc-accent text-white shadow-lg'
                          : 'text-rdc-muted hover:bg-rdc-card hover:text-rdc-text'
                        }`}
          >
            {h.emoji}
            {/* Tooltip */}
            <div className="absolute left-12 top-1/2 -translate-y-1/2 z-50
                            bg-rdc-card border border-rdc-border rounded-lg
                            px-3 py-2 text-xs text-rdc-text whitespace-nowrap
                            opacity-0 group-hover:opacity-100 pointer-events-none
                            transition-opacity duration-150 shadow-xl font-titulo">
              <p className="font-semibold">{h.label}</p>
              <p className="text-rdc-accent mt-0.5">Tecla: {h.tecla}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Separador */}
      <div className="h-px bg-rdc-border my-2" />

      {/* Acciones de historial */}
      <div className="space-y-1">
        <button
          onClick={onDeshacer}
          disabled={!puedeDeshacer}
          title={`${t('editor.tools.undo')} (Ctrl+Z)`}
          className="w-10 h-10 rounded-lg flex items-center justify-center
                     text-lg text-rdc-muted hover:bg-rdc-card hover:text-rdc-text
                     transition-all duration-150 disabled:opacity-30
                     disabled:cursor-not-allowed"
        >
          ↩️
        </button>
        <button
          onClick={onRehacer}
          disabled={!puedeRehacer}
          title={`${t('editor.tools.redo')} (Ctrl+Y)`}
          className="w-10 h-10 rounded-lg flex items-center justify-center
                     text-lg text-rdc-muted hover:bg-rdc-card hover:text-rdc-text
                     transition-all duration-150 disabled:opacity-30
                     disabled:cursor-not-allowed"
        >
          ↪️
        </button>
      </div>

      {/* Separador */}
      <div className="h-px bg-rdc-border my-2" />

      {/* Eliminar selección */}
      <button
        onClick={onEliminarSeleccion}
        title={`${t('editor.tools.delete')} (Supr)`}
        className="w-10 h-10 rounded-lg flex items-center justify-center
                   text-lg text-rdc-muted hover:bg-rdc-error hover:bg-opacity-20
                   hover:text-rdc-error transition-all duration-150"
      >
        🗑️
      </button>
    </div>
  )
}