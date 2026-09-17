// PaywallOverlay.jsx
// Muro de pago y desbloqueo de capítulos premium con monedas virtuales (Tinteros) o Patreon.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import useMonetizationStore from '../../store/monetizationStore'

export default function PaywallOverlay({ capitulo, onDesbloqueado }) {
  const { t } = useTranslation()
  const {
    saldoTinteros,
    costoPorCapitulo,
    desbloquearCapitulo,
    recargarTinteros,
    patreonUrl,
    kofiUrl
  } = useMonetizationStore()

  const [mensajeError, setMensajeError] = useState(null)
  const [desbloqueando, setDesbloqueando] = useState(false)

  const handleDesbloquear = () => {
    setMensajeError(null)
    setDesbloqueando(true)

    setTimeout(() => {
      const res = desbloquearCapitulo(capitulo.id)
      if (res.exito) {
        onDesbloqueado?.()
      } else {
        setMensajeError(res.mensaje || t('monetization.insufficientInks'))
      }
      setDesbloqueando(false)
    }, 400)
  }

  const handleComprarTinteros = (cantidad) => {
    recargarTinteros(cantidad)
    setMensajeError(null)
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="max-w-md w-full bg-rdc-card border border-rdc-border rounded-2xl p-6 shadow-2xl text-center space-y-5 animate-fade-in">
        
        {/* Icono y Encabezado */}
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-3xl shadow-lg animate-bounce-gentle">
          🔒
        </div>

        <div>
          <span className="text-[11px] font-titulo font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300">
            {t('monetization.paywallTitle')}
          </span>
          <h3 className="font-titulo text-lg font-bold text-rdc-text mt-2.5">
            {capitulo?.titulo || `Capítulo ${capitulo?.numero}`}
          </h3>
          <p className="text-xs text-rdc-muted mt-1 leading-relaxed">
            {t('monetization.paywallDesc')}
          </p>
        </div>

        {/* Saldo de Tinteros */}
        <div className="bg-rdc-secondary border border-rdc-border rounded-xl p-3.5 flex items-center justify-between font-titulo text-xs">
          <span className="text-rdc-muted flex items-center gap-1.5">
            <span>🖋️</span> {t('monetization.inks')}:
          </span>
          <span className="font-bold text-amber-400 text-sm">
            {saldoTinteros} 🖋️
          </span>
        </div>

        {mensajeError && (
          <div className="text-xs text-rdc-error bg-rdc-error/15 border border-rdc-error/40 p-2.5 rounded-lg">
            {mensajeError}
          </div>
        )}

        {/* Botón principal de desbloqueo */}
        <button
          onClick={handleDesbloquear}
          disabled={desbloqueando}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-titulo font-bold text-sm shadow-lg hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <span>✨</span>
          <span>{t('monetization.unlockWithInks', { count: costoPorCapitulo })}</span>
        </button>

        {/* Opciones de Recarga / Enlaces a Creador */}
        <div className="pt-2 border-t border-rdc-border/60 space-y-2 text-xs font-titulo">
          <div className="flex items-center justify-center gap-2 text-rdc-muted">
            <span className="text-[11px]">{t('monetization.buyInks')}:</span>
            <button
              onClick={() => handleComprarTinteros(50)}
              className="text-amber-400 hover:underline font-semibold"
            >
              +50 🖋️
            </button>
            <span>·</span>
            <button
              onClick={() => handleComprarTinteros(100)}
              className="text-amber-400 hover:underline font-semibold"
            >
              +100 🖋️
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <a
              href={patreonUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-orange-950/40 border border-orange-500/40 text-orange-300 hover:bg-orange-950/70 transition-colors flex items-center justify-center gap-1.5 text-[11px]"
            >
              <span>🧡</span> Patreon
            </a>
            <a
              href={kofiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-sky-950/40 border border-sky-500/40 text-sky-300 hover:bg-sky-950/70 transition-colors flex items-center justify-center gap-1.5 text-[11px]"
            >
              <span>☕</span> Ko-fi
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}
