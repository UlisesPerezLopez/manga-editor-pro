// AiEngineToggle.jsx
// Componente interactivo para conmutar y monitorear el motor de IA dual (Cloud Free vs Local GPU) con Lucide React.

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Check,
  Activity,
  Sparkles,
  Server,
  Zap,
  RefreshCw
} from 'lucide-react'
import useAiStore from '../../store/aiStore'
import MangaIcon from './MangaIcon'

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

  const [menuAbierto, setMenuAbierto] = useState(false)
  const menuRef = useRef(null)

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuAbierto(false)
      }
    }
    if (menuAbierto) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuAbierto])

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
    <div className="relative" ref={menuRef}>
      {/* Botón trigger */}
      <button
        onClick={() => setMenuAbierto(prev => !prev)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-titulo
                    transition-all duration-200 backdrop-blur-md hover:scale-[1.02] cursor-pointer ${badgeClasses}`}
        title={t('aiEngine.selectMode') || 'Seleccionar Motor de IA'}
      >
        <span className="flex items-center justify-center">
          {esLocal ? (
            <MangaIcon name="modo_local_gpu" size={18} className="mr-2" />
          ) : (
            <MangaIcon name="modo_cloud" size={18} className="mr-2" />
          )}
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

      {/* Panel Desplegable Flotante hacia Abajo */}
      {menuAbierto && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] z-[9999] p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800 mb-3">
            <h3 className="font-titulo text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rdc-accent" />
              <span>{t('aiEngine.title') || 'Motor de Inteligencia Artificial'}</span>
            </h3>
            <button
              onClick={() => setMenuAbierto(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1 cursor-pointer font-bold"
            >
              ✕
            </button>
          </div>

          <p className="text-slate-600 dark:text-slate-300 text-xs font-titulo leading-relaxed mb-3">
            {t('aiEngine.cloudFreeDesc') || 'Alterna entre el motor en la nube de alta disponibilidad y el motor local acelerado por GPU.'}
          </p>

          {/* Opciones de Motor en Tarjetas Interactivas */}
          <div className="space-y-2.5 mb-3">
            
            {/* Opción 1: Cloud Gratis */}
            <div
              onClick={() => handleSeleccionarModo('cloud_free')}
              className={`p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between relative ${
                !esLocal
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-black dark:border-amber-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] ring-2 ring-emerald-600/30'
                  : 'bg-slate-50 dark:bg-slate-800/80 border-slate-900 dark:border-slate-700 hover:border-black dark:hover:border-slate-500'
              }`}
            >
              {!esLocal && (
                <div className="absolute top-2.5 right-2.5 bg-emerald-600 text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full font-titulo shadow-xs flex items-center gap-0.5">
                  <Check className="w-2.5 h-2.5 stroke-[3]" /> Activo
                </div>
              )}
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                  <MangaIcon name="modo_cloud" size={18} />
                </div>
                <div>
                  <h4 className="font-titulo text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {t('aiEngine.cloudFree') || 'Cloud Free (Zero-Cost)'}
                  </h4>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-titulo">
                    {t('aiEngine.recommended') || 'Recomendado · Gemini 2.5'}
                  </span>
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-snug">
                {t('aiEngine.cloudFreeDesc') || 'Generación en la nube ultrarrápida sin requerir tarjeta gráfica dedicada.'}
              </p>
            </div>

            {/* Opción 2: Local GPU */}
            <div
              onClick={() => handleSeleccionarModo('local')}
              className={`p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between relative ${
                esLocal
                  ? 'bg-purple-50 dark:bg-purple-950/30 border-black dark:border-amber-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] ring-2 ring-purple-600/30'
                  : 'bg-slate-50 dark:bg-slate-800/80 border-slate-900 dark:border-slate-700 hover:border-black dark:hover:border-slate-500'
              }`}
            >
              {esLocal && (
                <div className="absolute top-2.5 right-2.5 bg-purple-600 text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full font-titulo shadow-xs flex items-center gap-0.5">
                  <Check className="w-2.5 h-2.5 stroke-[3]" /> Activo
                </div>
              )}
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-400 flex-shrink-0">
                  <MangaIcon name="modo_local_gpu" size={18} />
                </div>
                <div>
                  <h4 className="font-titulo text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {t('aiEngine.localGpu') || 'Local GPU (Offline)'}
                  </h4>
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold font-titulo">
                    {t('aiEngine.unlimitedLocal') || 'Privacidad Total · Ollama'}
                  </span>
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-snug">
                {t('aiEngine.localGpuDesc') || 'Ejecución 100% offline en tu tarjeta gráfica con Ollama y ComfyUI.'}
              </p>
            </div>

          </div>

          {/* Estado de Diagnóstico */}
          <div className="bg-slate-100 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 space-y-2 mb-3">
            <div className="flex items-center justify-between">
              <span className="font-titulo text-[10px] uppercase tracking-wider font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-rdc-accent" />
                Diagnóstico de Servicios
              </span>
              <button
                onClick={() => verificarEstadoIA()}
                disabled={verificando}
                className="text-rdc-accent hover:text-rdc-accent-hover text-[11px] font-titulo font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${verificando ? 'animate-spin' : ''}`} />
                {verificando ? 'Comprobando...' : 'Revisar'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-titulo">
              <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Ollama</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${ollamaOk ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/20 text-red-500'}`}>
                  {ollamaOk ? 'Operativo' : 'Inactivo'}
                </span>
              </div>
              <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">ComfyUI</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${comfyOk ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/20 text-red-500'}`}>
                  {comfyOk ? 'Operativo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>

          {/* Botón de cierre "Listo" */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setMenuAbierto(false)}
              className="bg-rdc-accent hover:bg-rdc-accent-hover text-white font-titulo font-semibold text-xs px-4 py-1.5 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              {t('common.done') || 'Listo'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
