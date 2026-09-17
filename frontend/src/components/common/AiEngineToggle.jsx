// AiEngineToggle.jsx
// Componente interactivo para conmutar y monitorear el motor de IA dual (Cloud Free vs Local GPU).

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import useAiStore from '../../store/aiStore'
import Modal from '../UI/Modal'

export default function AiEngineToggle({ variant = 'default' }) {
  const { t } = useTranslation()
  const {
    aiMode,
    estadoIA,
    cargando,
    verificando,
    setAiMode,
    verificarEstadoIA
  } = useAiStore()

  const [modalAbierto, setModalAbierto] = useState(false)

  // Verificar estado del subsistema al montar el componente
  useEffect(() => {
    verificarEstadoIA()
  }, [])

  const esLocal = aiMode === 'local'

  // Determinar salud del motor activo
  const ollamaOk = estadoIA?.subsistemas?.ollama_local?.estado === 'OPERATIVO'
  const comfyOk = estadoIA?.subsistemas?.comfyui_local?.estado === 'OPERATIVO'
  const localTotalmenteOk = ollamaOk && comfyOk
  const localParcialmenteOk = ollamaOk || comfyOk

  const handleSeleccionarModo = async (nuevoModo) => {
    await setAiMode(nuevoModo)
  }

  // Estilos del badge según variante
  const badgeClasses = esLocal
    ? 'bg-purple-950/70 border-purple-500/50 text-purple-200 hover:border-purple-400 shadow-sm'
    : 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200 hover:border-emerald-400 shadow-sm'

  return (
    <>
      <button
        onClick={() => setModalAbierto(true)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-titulo
                    transition-all duration-200 backdrop-blur-md hover:scale-[1.02] cursor-pointer ${badgeClasses}`}
        title={t('aiEngine.selectMode')}
      >
        <span className="text-sm leading-none">
          {esLocal ? '🖥️' : '☁️'}
        </span>
        <span className="font-semibold hidden sm:inline">
          {esLocal ? t('aiEngine.localGpu') : t('aiEngine.cloudFree')}
        </span>

        {/* Indicador de estado de conexión */}
        <span className="flex h-2 w-2 relative ml-0.5">
          {esLocal ? (
            localTotalmenteOk ? (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            ) : localParcialmenteOk ? (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
            ) : (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            )
          ) : (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              esLocal
                ? localTotalmenteOk
                  ? 'bg-emerald-500'
                  : localParcialmenteOk
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
                : 'bg-emerald-500'
            }`}
          ></span>
        </span>
      </button>

      {/* Modal de Configuración y Diagnóstico del Motor de IA */}
      <Modal
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        titulo={`🤖 ${t('aiEngine.title')}`}
        ancho="max-w-xl"
      >
        <div className="space-y-5">
          <p className="text-rdc-text text-xs sm:text-sm font-titulo leading-relaxed">
            {t('aiEngine.cloudFreeDesc')}
          </p>

          {/* Opciones de Motor en Tarjetas Interactivas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            {/* Opción 1: Cloud Gratis */}
            <div
              onClick={() => handleSeleccionarModo('cloud_free')}
              className={`p-4.5 rounded-xl border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between relative shadow-md ${
                !esLocal
                  ? 'bg-emerald-500/15 border-emerald-500 shadow-emerald-500/10 scale-[1.02]'
                  : 'bg-rdc-card/90 border-rdc-border hover:border-emerald-500/60'
              }`}
            >
              {!esLocal && (
                <div className="absolute top-3 right-3 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full font-titulo shadow-sm">
                  ✓ Activo
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">☁️</span>
                  <div>
                    <h4 className="font-titulo text-base font-bold text-rdc-text leading-tight">
                      {t('aiEngine.cloudFree')}
                    </h4>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold font-titulo">
                      {t('aiEngine.recommended')}
                    </span>
                  </div>
                </div>

                <p className="text-rdc-text/80 text-xs leading-relaxed mb-3">
                  {t('aiEngine.cloudFreeDesc')}
                </p>
              </div>

              <div className="space-y-1.5 pt-2.5 border-t border-rdc-border/60 text-[11px] font-titulo font-medium">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <span>✓</span> {t('aiEngine.hardwareFree')}
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <span>✓</span> Gemini 2.5 Flash + Flux Pipeline
                </div>
              </div>
            </div>

            {/* Opción 2: Local GPU */}
            <div
              onClick={() => handleSeleccionarModo('local')}
              className={`p-4.5 rounded-xl border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between relative shadow-md ${
                esLocal
                  ? 'bg-purple-500/15 border-purple-500 shadow-purple-500/10 scale-[1.02]'
                  : 'bg-rdc-card/90 border-rdc-border hover:border-purple-500/60'
              }`}
            >
              {esLocal && (
                <div className="absolute top-3 right-3 bg-purple-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full font-titulo shadow-sm">
                  ✓ Activo
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🖥️</span>
                  <div>
                    <h4 className="font-titulo text-base font-bold text-rdc-text leading-tight">
                      {t('aiEngine.localGpu')}
                    </h4>
                    <span className="text-[11px] text-purple-600 dark:text-purple-400 font-bold font-titulo">
                      Ollama + ComfyUI
                    </span>
                  </div>
                </div>

                <p className="text-rdc-text/80 text-xs leading-relaxed mb-3">
                  {t('aiEngine.localGpuDesc')}
                </p>
              </div>

              <div className="space-y-1.5 pt-2.5 border-t border-rdc-border/60 text-[11px] font-titulo font-medium">
                <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-300">
                  <span>✓</span> {t('aiEngine.privateLocal')}
                </div>
                <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-300">
                  <span>✓</span> IP-Adapter & Qwen 2.5 Local
                </div>
              </div>
            </div>

          </div>

          {/* Diagnóstico en Tiempo Real de Subsistemas Locales */}
          <div className="bg-rdc-card border border-rdc-border rounded-xl p-4 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-titulo text-xs font-semibold text-rdc-text uppercase tracking-wider flex items-center gap-2">
                📡 {t('aiEngine.status')}
              </h5>
              <button
                onClick={verificarEstadoIA}
                disabled={verificando}
                className="text-xs text-rdc-accent hover:text-rdc-accent-hover font-titulo flex items-center gap-1 transition-colors"
              >
                <span className={verificando ? 'animate-spin' : ''}>🔄</span>
                {verificando ? t('aiEngine.checking') : 'Actualizar'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Ollama */}
              <div className="flex items-center justify-between bg-rdc-secondary/70 px-3 py-2 rounded-lg border border-rdc-border/50">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${ollamaOk ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className="text-rdc-text font-medium">{t('aiEngine.ollamaStatus')}</span>
                </div>
                <span className={`font-semibold font-titulo ${ollamaOk ? 'text-emerald-400' : 'text-red-400'}`}>
                  {ollamaOk ? t('aiEngine.online') : t('aiEngine.offline')}
                </span>
              </div>

              {/* ComfyUI */}
              <div className="flex items-center justify-between bg-rdc-secondary/70 px-3 py-2 rounded-lg border border-rdc-border/50">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${comfyOk ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className="text-rdc-text font-medium">{t('aiEngine.comfyStatus')}</span>
                </div>
                <span className={`font-semibold font-titulo ${comfyOk ? 'text-emerald-400' : 'text-red-400'}`}>
                  {comfyOk ? t('aiEngine.online') : t('aiEngine.offline')}
                </span>
              </div>
            </div>

            {/* Aviso si el modo local está activo y los servicios no responden */}
            {esLocal && (!ollamaOk || !comfyOk) && (
              <div className="mt-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 rounded-lg p-3 text-xs leading-relaxed">
                ⚠️ {t('aiEngine.localWarning')}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleSeleccionarModo('cloud_free')}
                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-titulo font-semibold px-3 py-1 rounded text-xs transition-colors"
                  >
                    {t('aiEngine.switchToCloud')}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setModalAbierto(false)}
              className="bg-rdc-accent hover:bg-rdc-accent-hover text-white font-titulo font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
            >
              Listo
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
