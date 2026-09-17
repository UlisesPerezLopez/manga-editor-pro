// StyleResult.jsx
// Muestra el resultado del análisis de Firma Visual con soporte multilingüe.
// Permite validar y bloquear el estilo o descartar y repetir.

import { useTranslation } from 'react-i18next'

export default function StyleResult({
  perfil,
  systemPrompt,
  onBloquear,
  onRepetir,
  bloqueando
}) {
  const { t } = useTranslation()

  return (
    <div className="space-y-5">

      {/* Cabecera */}
      <div className="text-center">
        <p className="text-4xl mb-2">🎨</p>
        <h3 className="font-titulo text-xl text-rdc-text font-semibold">
          {t('styleWizard.resultTitle')}
        </h3>
        <p className="text-rdc-muted text-sm mt-1">
          {t('styleWizard.resultSubtitle')}
        </p>
      </div>

      {/* Paleta de colores */}
      {perfil?.paleta_colores?.length > 0 && (
        <div>
          <p className="text-rdc-muted text-xs uppercase mb-2 font-titulo">
            {t('styleWizard.palette')}
          </p>
          <div className="flex gap-2 flex-wrap">
            {perfil.paleta_colores.map((color, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div
                  className="w-8 h-8 rounded-lg border border-rdc-border shadow"
                  style={{ backgroundColor: color }}
                />
                <span className="text-rdc-muted text-xs font-mono">{color}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Características del estilo */}
      <div className="grid grid-cols-1 gap-3">
        {[
          { label: t('styleWizard.lineTechnique'), valor: perfil?.tecnica_linea },
          { label: t('styleWizard.shading'), valor: perfil?.estilo_sombreado },
          { label: t('styleWizard.proportions'), valor: perfil?.proporciones_personaje },
          { label: t('styleWizard.atmosphere'), valor: perfil?.atmosfera },
        ].map(({ label, valor }) => valor && (
          <div key={label} className="bg-rdc-card rounded-lg p-3">
            <p className="text-rdc-muted text-xs uppercase mb-1 font-titulo">{label}</p>
            <p className="text-rdc-text text-sm">{valor}</p>
          </div>
        ))}
      </div>

      {/* Elementos característicos */}
      {perfil?.elementos_caracteristicos?.length > 0 && (
        <div>
          <p className="text-rdc-muted text-xs uppercase mb-2 font-titulo">
            {t('styleWizard.distinctElements')}
          </p>
          <div className="flex flex-wrap gap-2">
            {perfil.elementos_caracteristicos.map((el, i) => (
              <span key={i} className="text-xs bg-rdc-card border border-rdc-border
                                       text-rdc-text px-3 py-1 rounded-full font-titulo">
                {el}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* System Prompt Maestro (preview) */}
      {systemPrompt && (
        <div className="bg-rdc-card rounded-lg p-4 border border-rdc-accent
                        border-opacity-30">
          <p className="text-rdc-accent text-xs uppercase mb-2 font-titulo">
            {t('styleWizard.masterPrompt')}
          </p>
          <p className="text-rdc-text text-xs leading-relaxed font-mono">
            {systemPrompt.length > 300
              ? systemPrompt.slice(0, 300) + '...'
              : systemPrompt
            }
          </p>
        </div>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { valor: perfil?.num_imagenes_analizadas || 0, label: t('styleWizard.analyzedImages') },
          { valor: perfil?.paleta_colores?.length || 0, label: t('styleWizard.paletteColors') },
          { valor: perfil?.nivel_detalle || '-', label: t('styleWizard.detailLevel') },
        ].map(({ valor, label }) => (
          <div key={label} className="bg-rdc-card rounded-lg p-3">
            <p className="font-manga text-2xl text-rdc-accent">{valor}</p>
            <p className="text-rdc-muted text-xs mt-1 font-titulo">{label}</p>
          </div>
        ))}
      </div>

      {/* Botones de acción */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          onClick={onRepetir}
          disabled={bloqueando}
          className="border border-rdc-border text-rdc-muted hover:text-rdc-text
                     hover:border-rdc-muted py-3 rounded-lg font-titulo
                     transition-all duration-200 disabled:opacity-50 text-sm"
        >
          {t('styleWizard.repeatAnalysis')}
        </button>
        <button
          onClick={onBloquear}
          disabled={bloqueando}
          className="bg-rdc-accent hover:bg-rdc-accent-hover text-white
                     font-titulo font-semibold py-3 rounded-lg
                     transition-colors duration-200 disabled:opacity-50
                     flex items-center justify-center gap-2 shadow-lg"
        >
          {bloqueando ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent
                              rounded-full animate-spin" />
              Bloqueando...
            </>
          ) : (
            t('styleWizard.lockStyle')
          )}
        </button>
      </div>

      <p className="text-rdc-muted text-xs text-center">
        ⚠️ Una vez bloqueado, el estilo no puede modificarse en este proyecto.
      </p>
    </div>
  )
}