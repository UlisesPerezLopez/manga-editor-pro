// AiEngineFallbackBanner.jsx
// Banner reactivo que ofrece fallback inmediato a Cloud Gratis cuando los servicios locales no responden.

import { useTranslation } from 'react-i18next'
import useAiStore from '../../store/aiStore'

export default function AiEngineFallbackBanner() {
  const { t } = useTranslation()
  const {
    aiMode,
    bannerErrorVisible,
    mensajeBanner,
    cambiarACloudTemporal,
    cerrarBanner
  } = useAiStore()

  if (!bannerErrorVisible || aiMode !== 'local') return null

  return (
    <div className="bg-gradient-to-r from-yellow-900/90 via-amber-900/90 to-yellow-950/90 border-b border-yellow-500/40 text-white px-4 py-2.5 shadow-lg backdrop-blur-md sticky top-0 z-50 flex items-center justify-between gap-4 transition-all duration-300 animate-slide-down">
      <div className="flex items-center gap-2.5 text-xs sm:text-sm">
        <span className="text-lg">⚠️</span>
        <div>
          <span className="font-semibold text-yellow-200 font-titulo mr-1">
            {t('aiEngine.localGpu')}:
          </span>
          <span className="text-yellow-100/90">
            {mensajeBanner || t('aiEngine.fallbackPrompt')}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={cambiarACloudTemporal}
          className="bg-yellow-400 hover:bg-yellow-300 text-black font-titulo font-bold text-xs px-3 py-1.5 rounded-lg transition-colors shadow-sm cursor-pointer"
        >
          {t('aiEngine.switchToCloud')}
        </button>
        <button
          onClick={cerrarBanner}
          className="text-yellow-300/80 hover:text-white text-base px-1.5 py-0.5 rounded transition-colors"
          title="Cerrar aviso"
        >
          ×
        </button>
      </div>
    </div>
  )
}
