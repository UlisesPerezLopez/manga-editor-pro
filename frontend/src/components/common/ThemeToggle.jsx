// ThemeToggle.jsx
// Conmutador elegante Día (Studio Ghibli) / Noche (Saint Seiya) con microanimaciones.

import { useTranslation } from 'react-i18next'
import useThemeStore, { TEMAS } from '../../store/themeStore'

export default function ThemeToggle({ className = '', variant = 'default' }) {
  const { t } = useTranslation()
  const { tema, toggleTema } = useThemeStore()

  const esGhibli = tema === TEMAS.GHIBLI

  // Estilos según variante (default para navbar o floating para auth)
  const baseClasses = variant === 'floating'
    ? 'bg-rdc-secondary/80 backdrop-blur-md border border-rdc-border shadow-lg p-2 rounded-xl'
    : 'bg-rdc-card/80 hover:bg-rdc-card border border-rdc-border px-3 py-1.5 rounded-lg shadow-sm'

  return (
    <button
      onClick={toggleTema}
      type="button"
      title={esGhibli ? t('theme.switchToSeiya') : t('theme.switchToGhibli')}
      aria-label={esGhibli ? t('theme.switchToSeiya') : t('theme.switchToGhibli')}
      className={`relative inline-flex items-center gap-2 transition-all duration-300
                  hover:border-rdc-accent hover:shadow-theme-subtle-glow group cursor-pointer
                  text-rdc-text select-none ${baseClasses} ${className}`}
    >
      {/* Contenedor del icono con animación de giro y escala */}
      <div className="relative w-5 h-5 flex items-center justify-center overflow-hidden">
        {/* Icono Ghibli (Día) */}
        <span
          className={`absolute text-base transition-all duration-500 transform
                      ${esGhibli
                        ? 'opacity-100 rotate-0 scale-100 text-emerald-600 dark:text-emerald-400'
                        : 'opacity-0 -rotate-90 scale-50'
                      }`}
          role="img"
          aria-label="Ghibli Meadow"
        >
          🌿
        </span>

        {/* Icono Saint Seiya (Noche) */}
        <span
          className={`absolute text-base transition-all duration-500 transform
                      ${!esGhibli
                        ? 'opacity-100 rotate-0 scale-100 text-amber-400'
                        : 'opacity-0 rotate-90 scale-50'
                      }`}
          role="img"
          aria-label="Saint Seiya Cosmos"
        >
          🌌
        </span>
      </div>

      {/* Etiqueta textual visible en pantallas medianas o según variante */}
      <span className="font-titulo text-xs font-semibold tracking-wider transition-colors duration-200 hidden sm:inline-block">
        {esGhibli ? 'Ghibli' : 'Cosmos'}
      </span>

      {/* Micro-indicador de aura */}
      <span
        className={`w-2 h-2 rounded-full transition-all duration-300
                    ${esGhibli
                      ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
                      : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                    }`}
      />
    </button>
  )
}
