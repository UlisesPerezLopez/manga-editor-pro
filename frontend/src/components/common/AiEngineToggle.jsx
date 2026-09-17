// AiEngineToggle.jsx
// Componente interactivo para conmutar y monitorear el motor de IA dual (Cloud Free vs Local GPU) con Lucide React.

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Cloud,
  Cpu,
  Check,
  Activity,
  Sparkles,
  Server,
  Zap,
  RefreshCw
} from 'lucide-react'
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
    ? 'bg-purple-950/70 border-purple-500/50 text-purple-200 hover:border-purple-400 shadow-xs'
    : 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200 hover:border-emerald-400 shadow-xs'

  return (
    <>
      <button
        onClick={() => setModalAbierto(true)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-titulo
                    transition-all duration-200 backdrop-blur-md hover:scale-[1.02] cursor-pointer ${badgeClasses}`}
        title={t('aiEngine.selectMode') || 'Seleccionar Motor de IA'}
      >
        <span className="flex items-center justify-center">
          {esLocal ? <Cpu className="w-3.5 h-3.5 text-purple-400" /> : <Cloud className="w-3.5 h-3.5 text-emerald-400" />}
        </span>
        <span className="font-semibold hidden sm:inline text-[11px]">
          {esLocal ? (t('aiEngine.localGpu') || 'Local GPU') : (t('aiEngine.cloudFree') || 'Cloud Free')}
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
        titulo={`Motor de Inteligencia Artificial`}
        ancho="max-w-xl"
      >
        <div className="space-y-5">
          <p className="text-rdc-text text-xs sm:text-sm font-titulo leading-relaxed">
            {t('aiEngine.cloudFreeDesc') || 'Alterna entre el motor en la nube de alta disponibilidad y el motor local acelerado por GPU.'}
          </p>

          {/* Opciones de Motor en Tarjetas Interactivas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            {/* Opción 1: Cloud Gratis */}
            <div
              onClick={() => handleSeleccionarModo('cloud_free')}
              className={`p-4.5 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between relative shadow-md ${
                !esLocal
                  ? 'bg-emerald-500/15 border-emerald-500 shadow-emerald-500/10 scale-[1.02]'
                  : 'bg-rdc-card/90 border-rdc-border hover:border-emerald-500/60'
              }`}
            >
              {!esLocal && (
                <div className="absolute top-3 right-3 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full font-titulo shadow-sm flex items-center gap-1">
                  <Check className="w-2.5 h-2.5 stroke-[3]" /> Activo
                </div>
              )}
              <div>
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-titulo text-base font-bold text-rdc-text leading-tight">
                      {t('aiEngine.cloudFree') || 'Cloud Free (Zero-Cost)'}
                    </h4>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold font-titulo">
                      {t('aiEngine.recommended') || 'Recomendado'}
                    </span>
                  </div>
                </div>

                <p className="text-rdc-text/80 text-xs leading-relaxed mb-3">
                  {t('aiEngine.cloudFreeDesc') || 'Generación en la nube ultrarrápida sin requerir tarjeta gráfica dedicada.'}
                </p>
              </div>

              <div className="space-y-1.5 pt-2.5 border-t border-rdc-border/60 text-[11px] font-titulo font-medium">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <Check className="w-3.5 h-3.5 flex-shrink-0" /> {t('aiEngine.hardwareFree') || 'Sin requisitos de GPU'}
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <Check className="w-3.5 h-3.5 flex-shrink-0" /> Gemini 2.5 Flash + Flux Pipeline
                </div>
              </div>
            </div>

            {/* Opción 2: Local GPU */}
            <div
              onClick={() => handleSeleccionarModo('local')}
              className={`p-4.5 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between relative shadow-md ${
                esLocal
                  ? 'bg-purple-500/15 border-purple-500 shadow-purple-500/10 scale-[1.02]'
                  : 'bg-rdc-card/90 border-rdc-border hover:border-purple-500/60'
              }`}
            >
              {esLocal && (
                <div className="absolute top-3 right-3 bg-purple-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full font-titulo shadow-sm flex items-center gap-1">
                  <Check className="w-2.5 h-2.5 stroke-[3]" /> Activo
                </div>
              )}
              <div>
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-titulo text-base font-bold text-rdc-text leading-tight">
                      {t('aiEngine.localGpu') || 'Local GPU (Offline)'}
                    </h4>
                    <span className="text-[11px] text-purple-600 dark:text-purple-400 font-bold font-titulo">
                      {t('aiEngine.unlimitedLocal') || 'Privacidad Total'}
                    </span>
                  </div>
                </div>

                <p className="text-rdc-text/80 text-xs leading-relaxed mb-3">
                  {t('aiEngine.localGpuDesc') || 'Ejecución 100% offline en tu tarjeta gráfica con Ollama y ComfyUI.'}
                </p>
              </div>

              <div className="space-y-1.5 pt-2.5 border-t border-rdc-border/60 text-[11px] font-titulo font-medium">
                <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                  <Check className="w-3.5 h-3.5 flex-shrink-0" /> Ollama Qwen 2.5 7B
                </div>
                <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                  <Check className="w-3.5 h-3.5 flex-shrink-0" /> ComfyUI + SDXL Turbo
                </div>
              </div>
            </div>
          </div>

          {/* Estado de Diagnóstico */}
          <div className="bg-rdc-card border border-rdc-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-titulo text-xs uppercase tracking-wider font-bold text-rdc-muted flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-rdc-accent" />
                Diagnóstico de Servicios
              </span>
              <button
                onClick={() => verificarEstadoIA()}
                disabled={verificando}
                className="text-rdc-accent hover:text-rdc-accent-hover text-xs font-titulo font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${verificando ? 'animate-spin' : ''}`} />
                {verificando ? 'Comprobando...' : 'Revisar'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-titulo">
              <div className="p-2.5 rounded-xl bg-rdc-secondary flex items-center justify-between">
                <span>Ollama Local</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${ollamaOk ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  {ollamaOk ? 'Operativo' : 'Inactivo'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-rdc-secondary flex items-center justify-between">
                <span>ComfyUI Local</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${comfyOk ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  {comfyOk ? 'Operativo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
