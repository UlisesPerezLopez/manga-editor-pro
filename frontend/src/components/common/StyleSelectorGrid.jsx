// StyleSelectorGrid.jsx
// Cuadrícula de selección de 25 estilos legendarios con soporte de contraste para Ghibli y Cosmos (Dark Mode).

import React, { useState, useMemo } from 'react'
import { Check } from 'lucide-react'
import { LEGENDARY_STYLES } from '../../data/stylePresets'

export default function StyleSelectorGrid({
  estiloSeleccionado,
  onSeleccionar,
  estilos = LEGENDARY_STYLES,
  maxHeight = 'max-h-[65vh]',
}) {
  const [filtroEscuela, setFiltroEscuela] = useState('todos')

  const estilosFiltrados = useMemo(() => {
    if (filtroEscuela === 'todos') return estilos
    return estilos.filter((s) => s.school === filtroEscuela)
  }, [estilos, filtroEscuela])

  return (
    <div className="w-full">
      {/* Filtros por escuela */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 custom-scrollbar">
        {[
          { id: 'todos', label: `Todos (${estilos.length})` },
          { id: 'manga', label: `Manga (${estilos.filter((s) => s.school === 'manga').length})` },
          { id: 'europeo', label: `Europeo (${estilos.filter((s) => s.school === 'europeo').length})` },
          { id: 'americano', label: `Americano (${estilos.filter((s) => s.school === 'americano').length})` },
        ].map((filtro) => (
          <button
            key={filtro.id}
            type="button"
            onClick={() => setFiltroEscuela(filtro.id)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-titulo transition-all cursor-pointer whitespace-nowrap select-none ${
              filtroEscuela === filtro.id
                ? 'bg-slate-900 text-white border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.8)] font-bold'
                : 'bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-slate-900'
            }`}
          >
            {filtro.label}
          </button>
        ))}
      </div>

      {/* Cuadrícula de estilos */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-2 ${maxHeight} overflow-y-auto custom-scrollbar`}
      >
        {estilosFiltrados.map((style) => {
          const seleccionado = estiloSeleccionado === style.id
          return (
            <button
              key={style.id}
              type="button"
              onClick={() => onSeleccionar && onSeleccionar(style.id)}
              className={`border-2 rounded-xl p-3 transition-all cursor-pointer flex flex-col items-center text-center select-none justify-between min-h-[165px] ${
                seleccionado
                  ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-500/10 dark:bg-amber-500/15 dark:border-amber-400 shadow-[4px_4px_0px_0px_rgba(245,158,11,0.6)]'
                  : 'bg-white border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,0.9)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 dark:bg-[#151c2e]/90 dark:border-slate-700/80 dark:shadow-[3px_3px_0px_0px_rgba(2,6,23,0.8)] dark:hover:bg-[#1c263d] dark:hover:border-amber-400/80 dark:hover:shadow-[4px_4px_0px_0px_rgba(245,158,11,0.5)] dark:hover:-translate-y-0.5'
              }`}
            >
              <div className="w-full flex flex-col items-center">
                <img
                  src={style.icon}
                  alt={style.name}
                  className="w-14 h-14 object-contain mx-auto mb-1 drop-shadow-sm"
                  loading="lazy"
                  onError={(e) => {
                    e.target.onerror = null
                    e.target.src = '/assets/legendary_styles/shonen_legendario.png'
                  }}
                />
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-2 line-clamp-1">
                  {style.name}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300/80 mt-1 line-clamp-2 leading-relaxed">
                  {style.subtitle}
                </p>
              </div>

              {seleccionado && (
                <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 dark:text-amber-200 bg-amber-200/90 dark:bg-amber-900/70 px-2 py-0.5 rounded-full border border-amber-400">
                  <Check className="w-3 h-3" />
                  Seleccionado
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
