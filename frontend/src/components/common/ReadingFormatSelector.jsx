// ReadingFormatSelector.jsx
// Selector de formato de lectura (Manga vs Cómic Occidental) con iconografía PNG oficial, bandera de Japón entintada y emoji de la Tierra.

import React from 'react'
import formatoJpManga from '../../assets/icons/formato_jp_manga.png'
import formatoOccidental from '../../assets/icons/formato_occidental.png'

export default function ReadingFormatSelector({
  value = 'manga',
  onChange,
  isGhibli = false,
}) {
  const activoManga = value === 'manga'
  const activoOccidental = value === 'occidental'

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Opción Manga (Derecha → Izquierda) */}
      <button
        type="button"
        onClick={() => onChange && onChange('manga')}
        className={`border-2 rounded-xl p-4 text-left transition-all duration-200 cursor-pointer select-none ${
          activoManga
            ? isGhibli
              ? 'border-slate-900 bg-emerald-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.85)]'
              : 'border-amber-500 bg-amber-500/15 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.85)] ring-1 ring-amber-500'
            : isGhibli
              ? 'border-slate-900/40 hover:border-slate-900 bg-white/70 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]'
              : 'border-slate-700/80 hover:border-slate-500 bg-[#151c2e]/90 text-slate-300'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          {/* 1. Imagen oficial del libro de manga */}
          <img
            src={formatoJpManga}
            alt="Formato Manga"
            className="w-6 h-6 object-contain drop-shadow-xs flex-shrink-0"
          />
          {/* 2. Bandera de Japón entintada */}
          <span className="inline-flex items-center justify-center w-6 h-4 overflow-hidden rounded-[3px] border border-slate-900 shadow-xs bg-white flex-shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#BC002D]"></span>
          </span>
          {/* 3. Nombre */}
          <span className="font-bold text-slate-900 dark:text-white text-sm">Manga</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">Derecha → Izquierda</p>
      </button>

      {/* Opción Occidental (Izquierda → Derecha) */}
      <button
        type="button"
        onClick={() => onChange && onChange('occidental')}
        className={`border-2 rounded-xl p-4 text-left transition-all duration-200 cursor-pointer select-none ${
          activoOccidental
            ? isGhibli
              ? 'border-slate-900 bg-emerald-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.85)]'
              : 'border-amber-500 bg-amber-500/15 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.85)] ring-1 ring-amber-500'
            : isGhibli
              ? 'border-slate-900/40 hover:border-slate-900 bg-white/70 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]'
              : 'border-slate-700/80 hover:border-slate-500 bg-[#151c2e]/90 text-slate-300'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          {/* 1. Imagen oficial del libro occidental */}
          <img
            src={formatoOccidental}
            alt="Formato Occidental"
            className="w-6 h-6 object-contain drop-shadow-xs flex-shrink-0"
          />
          {/* 2. Emoji Tierra */}
          <span className="text-base leading-none flex-shrink-0">🌍</span>
          {/* 3. Nombre */}
          <span className="font-bold text-slate-900 dark:text-white text-sm">Occidental</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">Izquierda → Derecha</p>
      </button>
    </div>
  )
}
