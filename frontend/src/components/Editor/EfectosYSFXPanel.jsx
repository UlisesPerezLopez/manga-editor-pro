// EfectosYSFXPanel.jsx
// Panel unificado de Efectos Cinéticos Manga y Galería de Onomatopeyas SFX para MEP — Manga Editor Pro.
// Proporciona sub-pestañas ergonómicas para alternar entre líneas cinéticas/screentones y efectos sonoros.

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles, Zap } from 'lucide-react'
import FXSidebar from './FXSidebar'
import SFXSidebar from './SFXSidebar'

export default function EfectosYSFXPanel({ canvasRef, onActualizar, onInsertarSFX }) {
  const { t } = useTranslation()
  const [subTab, setSubTab] = useState('fx') // 'fx' (cinéticos) | 'sfx' (onomatopeyas)

  return (
    <div className="flex flex-col h-full bg-rdc-secondary text-rdc-text text-xs">
      {/* ── Selector de Sub-pestañas Ergonómico ── */}
      <div className="p-2 border-b border-rdc-border bg-slate-900/60 flex-shrink-0">
        <div className="grid grid-cols-2 gap-1 bg-rdc-primary p-0.5 rounded-lg border border-rdc-border">
          <button
            type="button"
            onClick={() => setSubTab('fx')}
            className={`py-1.5 px-2 rounded-md font-titulo font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              subTab === 'fx'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-rdc-muted hover:text-rdc-text hover:bg-rdc-card'
            }`}
            title={t('editor.fx.linesAndTonesTitle')}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('editor.fx.linesAndTones')}</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('sfx')}
            className={`py-1.5 px-2 rounded-md font-titulo font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              subTab === 'sfx'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-rdc-muted hover:text-rdc-text hover:bg-rdc-card'
            }`}
            title={t('editor.fx.sfxTitle')}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{t('editor.tabs.sfx')}</span>
          </button>
        </div>
      </div>

      {/* ── Contenido Activo ── */}
      <div className="flex-1 overflow-hidden">
        {subTab === 'fx' ? (
          <FXSidebar canvasRef={canvasRef} onActualizar={onActualizar} />
        ) : (
          <SFXSidebar onInsertarSFX={onInsertarSFX} />
        )}
      </div>
    </div>
  )
}
