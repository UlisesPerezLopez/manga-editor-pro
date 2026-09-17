// OnlineBadge.jsx
// Indicador visual discreto del estado de conectividad (Online / Offline) y sincronización con IndexedDB.

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  contarBorradoresPendientes,
  sincronizarBorradoresConServidor
} from '../../services/indexedDbService'
import { chaptersAPI } from '../../services/api'

export default function OnlineBadge() {
  const { t } = useTranslation()
  const [estaOnline, setEstaOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [borradoresPendientes, setBorradoresPendientes] = useState(0)
  const [sincronizando, setSincronizando] = useState(false)

  const actualizarConteoPendientes = async () => {
    try {
      const num = await contarBorradoresPendientes()
      setBorradoresPendientes(num)
    } catch {
      setBorradoresPendientes(0)
    }
  }

  const ejecutarSincronizacion = async () => {
    if (!navigator.onLine || sincronizando) return
    setSincronizando(true)
    try {
      await sincronizarBorradoresConServidor(async (idProyecto, idPagina, canvasJSON) => {
        await chaptersAPI.guardarCanvas(idProyecto, idPagina, {
          canvas_json: canvasJSON,
          layout_template: 'custom'
        })
      })
      await actualizarConteoPendientes()
    } catch (err) {
      console.error('Error durante sincronización manual:', err)
    } finally {
      setSincronizando(false)
    }
  }

  useEffect(() => {
    const handleOnline = () => {
      setEstaOnline(true)
      ejecutarSincronizacion()
    }
    const handleOffline = () => setEstaOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('mep:draft-saved', actualizarConteoPendientes)
    window.addEventListener('mep:online-sync-requested', ejecutarSincronizacion)

    actualizarConteoPendientes()

    // Comprobación periódica cada 20 segundos
    const interval = setInterval(actualizarConteoPendientes, 20000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('mep:draft-saved', actualizarConteoPendientes)
      window.removeEventListener('mep:online-sync-requested', ejecutarSincronizacion)
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="flex items-center gap-1.5 font-titulo text-xs select-none">
      {estaOnline ? (
        borradoresPendientes > 0 ? (
          <button
            onClick={ejecutarSincronizacion}
            disabled={sincronizando}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/30 transition-all cursor-pointer"
            title={`${borradoresPendientes} borradores locales guardados. Haz clic para sincronizar.`}
          >
            <span className={`w-2 h-2 rounded-full bg-yellow-400 ${sincronizando ? 'animate-ping' : ''}`} />
            <span className="font-semibold hidden sm:inline">
              {sincronizando ? t('offline.syncing') : `${borradoresPendientes} ${t('offline.pendingDrafts', { count: borradoresPendientes })}`}
            </span>
            <span className={sincronizando ? 'animate-spin text-[10px]' : 'text-[10px]'}>
              🔄
            </span>
          </button>
        ) : (
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300"
            title="Conexión en línea y datos sincronizados"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-semibold hidden md:inline text-[11px]">
              {t('offline.online')}
            </span>
          </div>
        )
      ) : (
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-500/50 text-amber-200 animate-pulse-soft"
          title={t('offline.offlineDesc')}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="font-semibold text-[11px]">
            {t('offline.offline')}
          </span>
          {borradoresPendientes > 0 && (
            <span className="text-[10px] bg-amber-900/80 px-1 rounded font-mono">
              {borradoresPendientes}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
