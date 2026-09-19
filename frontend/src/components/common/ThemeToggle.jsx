// ThemeToggle.jsx
// Conmutador Día (Studio Ghibli) / Noche (Saint Seiya Cosmos) con Lucide React.

import { useTranslation } from 'react-i18next'
import useThemeStore, { TEMAS } from '../../store/themeStore'
import MangaIcon from './MangaIcon'

export default function ThemeToggle({ className = '', variant = 'default' }) {
  const { t } = useTranslation()
  const { tema, toggleTema } = useThemeStore()

  const esGhibli = tema === TEMAS.GHIBLI

  // Estilos según variante (default para navbar o floating para auth)
  const baseClasses = variant === 'floating'
    ? 'bg-rdc-secondary/80 backdrop-blur-md border border-rdc-border shadow-lg p-2 rounded-xl'
    : 'bg-rdc-card/80 hover:bg-rdc-card border border-rdc-border px-3 py-1.5 rounded-xl shadow-xs'

  return (
    <button
      onClick={toggleTema}
      type="button"
      title={esGhibli ? (t('theme.switchToSeiya') || 'Cambiar a modo Cosmos') : (t('theme.switchToGhibli') || 'Cambiar a modo Ghibli')}
      aria-label={esGhibli ? 'Modo Cosmos' : 'Modo Ghibli'}
      className={`relative inline-flex items-center gap-2 transition-all duration-300
                  hover:border-rdc-accent group cursor-pointer
                  text-rdc-text select-none ${baseClasses} ${className}`}
    >
      {/* Contenedor del icono con microanimación */}
      <div className="relative flex items-center justify-center">
        {esGhibli ? (
          <MangaIcon name="tema_ghibli" size={18} className="mr-2 transition-transform duration-300 group-hover:scale-110" />
        ) : (
          <MangaIcon name="tema_cosmos" size={18} className="mr-2 transition-transform duration-300 group-hover:scale-110" />
        )}
      </div>

      {/* Etiqueta textual */}
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
