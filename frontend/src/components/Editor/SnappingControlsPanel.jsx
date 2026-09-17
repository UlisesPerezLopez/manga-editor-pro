// SnappingControlsPanel.jsx
// Panel de configuración para ajuste magnético a cuadrícula y guías inteligentes de alineación.

import { useTranslation } from 'react-i18next'

export default function SnappingControlsPanel({ config, onChangeConfig }) {
  const { t } = useTranslation()

  const handleToggleGrid = () => {
    onChangeConfig({ ...config, gridActiva: !config.gridActiva })
  }

  const handleToggleGuides = () => {
    onChangeConfig({ ...config, guiasInteligentes: !config.guiasInteligentes })
  }

  const handleSetGridSize = (tamano) => {
    onChangeConfig({ ...config, gridTamano: tamano, gridActiva: true })
  }

  return (
    <div className="flex flex-col h-full bg-rdc-secondary text-xs">
      <div className="p-3 border-b border-rdc-border">
        <p className="font-titulo font-bold text-rdc-text uppercase tracking-wider text-[11px]">
          🧲 {t('editor.snapping.title')}
        </p>
      </div>

      <div className="p-3 space-y-4 overflow-y-auto">
        {/* Toggle Guías Inteligentes */}
        <div className="bg-rdc-card p-3 rounded-xl border border-rdc-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-titulo font-semibold text-rdc-text">
              📐 {t('editor.snapping.enableGuides')}
            </span>
            <button
              onClick={handleToggleGuides}
              className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                config.guiasInteligentes ? 'bg-rdc-accent' : 'bg-rdc-border'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ease-in-out ${
                  config.guiasInteligentes ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <p className="text-[11px] text-rdc-muted leading-tight">
            Muestra líneas magnéticas al alinear bordes con viñetas adyacentes y centro de página.
          </p>
        </div>

        {/* Toggle Cuadrícula Magnética */}
        <div className="bg-rdc-card p-3 rounded-xl border border-rdc-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-titulo font-semibold text-rdc-text">
              🧲 {t('editor.snapping.enableGrid')}
            </span>
            <button
              onClick={handleToggleGrid}
              className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                config.gridActiva ? 'bg-rdc-accent' : 'bg-rdc-border'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ease-in-out ${
                  config.gridActiva ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Selector de tamaño de cuadrícula */}
          {config.gridActiva && (
            <div className="space-y-1.5 pt-1">
              <label className="text-rdc-muted text-[11px] font-titulo">
                {t('editor.snapping.gridSize')}:
              </label>
              <div className="grid grid-cols-3 gap-1.5 font-titulo">
                {[8, 16, 32].map((sz) => (
                  <button
                    key={sz}
                    onClick={() => handleSetGridSize(sz)}
                    className={`py-1.5 rounded-lg border text-xs transition-all ${
                      config.gridTamano === sz
                        ? 'bg-rdc-accent text-white border-rdc-accent font-bold'
                        : 'bg-rdc-secondary text-rdc-muted border-rdc-border hover:text-rdc-text'
                    }`}
                  >
                    {sz} px
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Estado activo info */}
        <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 text-[11px] text-emerald-300 font-titulo flex items-center gap-2">
          <span className="text-base">⚡</span>
          <span>
            {config.guiasInteligentes || config.gridActiva
              ? t('editor.snapping.active')
              : 'Ajuste magnético desactivado'}
          </span>
        </div>
      </div>
    </div>
  )
}
