// SFXSidebar.jsx
// Galería lateral de Onomatopeyas y Efectos Sonoros (SFX) para MEP — Manga Editor Pro.
// Efectos de impacto, slapstick y kanji/katakana manga con estilos precalibrados y edición total en canvas.

import React, { useState } from 'react'
import { Sparkles, Zap, Flame, Move, Plus } from 'lucide-react'

export const CATALOGO_SFX = [
  // ── Impacto Cómic ──
  {
    id: 'boom',
    texto: '¡BOOM!',
    categoria: 'impacto',
    subtexto: 'Explosión masiva',
    fontFamily: 'Bangers',
    fontSize: 48,
    fill: '#E53E3E',
    stroke: '#000000',
    strokeWidth: 3,
    angle: -10,
    shadowColor: 'rgba(0,0,0,0.6)',
    shadowBlur: 8,
  },
  {
    id: 'zas',
    texto: '¡ZAS!',
    categoria: 'impacto',
    subtexto: 'Golpe seco / bofetada',
    fontFamily: 'Bangers',
    fontSize: 42,
    fill: '#F59E0B',
    stroke: '#000000',
    strokeWidth: 3,
    angle: 8,
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowBlur: 6,
  },
  {
    id: 'crash',
    texto: '¡CRASH!',
    categoria: 'impacto',
    subtexto: 'Ruptura de cristal / derrumbe',
    fontFamily: 'Bangers',
    fontSize: 46,
    fill: '#EF4444',
    stroke: '#FFFFFF',
    strokeWidth: 2.5,
    angle: -12,
    shadowColor: 'rgba(0,0,0,0.7)',
    shadowBlur: 8,
  },
  {
    id: 'pum',
    texto: '¡PUM!',
    categoria: 'impacto',
    subtexto: 'Disparo / detonación sorda',
    fontFamily: 'Bangers',
    fontSize: 44,
    fill: '#DC2626',
    stroke: '#000000',
    strokeWidth: 3,
    angle: 6,
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowBlur: 6,
  },
  {
    id: 'plash',
    texto: '¡PLASH!',
    categoria: 'impacto',
    subtexto: 'Salpicadura de agua / lodo',
    fontFamily: 'Chango',
    fontSize: 38,
    fill: '#0284C7',
    stroke: '#FFFFFF',
    strokeWidth: 3,
    angle: -8,
    shadowColor: 'rgba(0,0,0,0.4)',
    shadowBlur: 6,
  },
  {
    id: 'bang',
    texto: '¡BANG!',
    categoria: 'impacto',
    subtexto: 'Tiroteo rápido',
    fontFamily: 'Bangers',
    fontSize: 44,
    fill: '#F97316',
    stroke: '#000000',
    strokeWidth: 3,
    angle: 11,
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowBlur: 6,
  },
  {
    id: 'catacrac',
    texto: '¡CATACRAC!',
    categoria: 'impacto',
    subtexto: 'Fractura ósea / rotura de viga',
    fontFamily: 'Bangers',
    fontSize: 38,
    fill: '#E11D48',
    stroke: '#000000',
    strokeWidth: 3,
    angle: -14,
    shadowColor: 'rgba(0,0,0,0.6)',
    shadowBlur: 8,
  },
  {
    id: 'glup',
    texto: '¡GLUP!',
    categoria: 'impacto',
    subtexto: 'Trago amargo / susto',
    fontFamily: 'Comic Neue',
    fontSize: 36,
    fill: '#84CC16',
    stroke: '#000000',
    strokeWidth: 2.5,
    angle: 5,
    shadowColor: 'rgba(0,0,0,0.4)',
    shadowBlur: 4,
  },

  // ── Movimiento & Slapstick ──
  {
    id: 'swoosh',
    texto: '¡SWOOSH!',
    categoria: 'movimiento',
    subtexto: 'Corte de espada / movimiento raudo',
    fontFamily: 'Bangers',
    fontSize: 42,
    fill: '#38BDF8',
    stroke: '#0369A1',
    strokeWidth: 2.5,
    angle: -15,
    shadowColor: 'rgba(3,105,161,0.5)',
    shadowBlur: 6,
  },
  {
    id: 'wham',
    texto: '¡WHAM!',
    categoria: 'movimiento',
    subtexto: 'Colisión violenta',
    fontFamily: 'Bangers',
    fontSize: 46,
    fill: '#FBBF24',
    stroke: '#B45309',
    strokeWidth: 3,
    angle: 9,
    shadowColor: 'rgba(0,0,0,0.6)',
    shadowBlur: 6,
  },
  {
    id: 'kaboom',
    texto: '¡KABOOM!',
    categoria: 'movimiento',
    subtexto: 'Deflagración en cadena',
    fontFamily: 'Bangers',
    fontSize: 48,
    fill: '#EA580C',
    stroke: '#7C2D12',
    strokeWidth: 3.5,
    angle: -11,
    shadowColor: 'rgba(0,0,0,0.7)',
    shadowBlur: 10,
  },
  {
    id: 'ouch',
    texto: '¡OUCH!',
    categoria: 'movimiento',
    subtexto: 'Dolor cómico',
    fontFamily: 'Chango',
    fontSize: 36,
    fill: '#EC4899',
    stroke: '#831843',
    strokeWidth: 2.5,
    angle: 7,
    shadowColor: 'rgba(0,0,0,0.4)',
    shadowBlur: 5,
  },
  {
    id: 'plop',
    texto: '¡PLOP!',
    categoria: 'movimiento',
    subtexto: 'Caída de espaldas / chasco',
    fontFamily: 'Comic Relief',
    fontSize: 38,
    fill: '#A855F7',
    stroke: '#581C87',
    strokeWidth: 2.5,
    angle: -6,
    shadowColor: 'rgba(0,0,0,0.4)',
    shadowBlur: 4,
  },
  {
    id: 'patapum',
    texto: '¡PATAPÚM!',
    categoria: 'movimiento',
    subtexto: 'Derrumbe cómico o rodada',
    fontFamily: 'Bangers',
    fontSize: 40,
    fill: '#10B981',
    stroke: '#064E3B',
    strokeWidth: 3,
    angle: 12,
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowBlur: 6,
  },

  // ── Manga Tradicional (Katakana) ──
  {
    id: 'don',
    texto: 'ドン!',
    categoria: 'manga',
    subtexto: 'DON! (Impacto clásico shonen)',
    fontFamily: 'Bangers',
    fontSize: 54,
    fill: '#FFFFFF',
    stroke: '#000000',
    strokeWidth: 4,
    angle: -5,
    shadowColor: 'rgba(0,0,0,0.8)',
    shadowBlur: 8,
  },
  {
    id: 'gogo',
    texto: 'ゴゴゴ',
    categoria: 'manga',
    subtexto: 'GOGOGO (Tensión / aura amenazante)',
    fontFamily: 'Bangers',
    fontSize: 44,
    fill: '#9333EA',
    stroke: '#000000',
    strokeWidth: 3,
    angle: -8,
    shadowColor: 'rgba(147,51,234,0.6)',
    shadowBlur: 8,
  },
  {
    id: 'baki',
    texto: 'バキッ',
    categoria: 'manga',
    subtexto: 'BAKI (Quebrado / fractura marcial)',
    fontFamily: 'Bangers',
    fontSize: 48,
    fill: '#E11D48',
    stroke: '#000000',
    strokeWidth: 3.5,
    angle: 10,
    shadowColor: 'rgba(0,0,0,0.7)',
    shadowBlur: 8,
  },
  {
    id: 'doki',
    texto: 'ドキドキ',
    categoria: 'manga',
    subtexto: 'DOKI-DOKI (Palpitar del corazón)',
    fontFamily: 'Comic Neue',
    fontSize: 40,
    fill: '#F43F5E',
    stroke: '#FFFFFF',
    strokeWidth: 2.5,
    angle: -6,
    shadowColor: 'rgba(244,63,94,0.5)',
    shadowBlur: 6,
  },
  {
    id: 'zudodo',
    texto: 'ズドド',
    categoria: 'manga',
    subtexto: 'ZUDODO (Galope / estampida terrestre)',
    fontFamily: 'Bangers',
    fontSize: 46,
    fill: '#D97706',
    stroke: '#000000',
    strokeWidth: 3,
    angle: 8,
    shadowColor: 'rgba(0,0,0,0.6)',
    shadowBlur: 6,
  },
  {
    id: 'dokaan',
    texto: 'ドカーン',
    categoria: 'manga',
    subtexto: 'DOKAAN (Gran explosión manga)',
    fontFamily: 'Bangers',
    fontSize: 52,
    fill: '#EF4444',
    stroke: '#FBBF24',
    strokeWidth: 3.5,
    angle: -12,
    shadowColor: 'rgba(0,0,0,0.8)',
    shadowBlur: 10,
  },
]

export default function SFXSidebar({ onInsertarSFX }) {
  const [categoriaActiva, setCategoriaActiva] = useState('impacto')

  const categorias = [
    { id: 'impacto', label: '💥 Impacto Cómic' },
    { id: 'movimiento', label: '⚡ Slapstick & Mov.' },
    { id: 'manga', label: '🗾 Manga Katakana' },
  ]

  const items = CATALOGO_SFX.filter(s => s.categoria === categoriaActiva)

  return (
    <div className="flex flex-col h-full bg-slate-900 select-none">
      {/* Cabecera */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/40">
        <h4 className="font-titulo text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Galería de Onomatopeyas SFX</span>
        </h4>
        <p className="text-[10px] text-slate-400 mt-0.5">
          Efectos sonoros con estilos y contornos precalibrados
        </p>

        {/* Pestañas de categoría */}
        <div className="flex items-center gap-1 mt-2.5 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60">
          {categorias.map(cat => {
            const activa = categoriaActiva === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setCategoriaActiva(cat.id)}
                className={`flex-1 py-1 px-1 rounded-md text-[10px] font-bold transition-all text-center cursor-pointer ${
                  activa
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Lista de Tarjetas Interactivas de SFX */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {items.map(sfx => {
          return (
            <div
              key={sfx.id}
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({ tipo: 'sfx', sfx }))
                e.dataTransfer.effectAllowed = 'copy'
              }}
              className="group p-2.5 rounded-xl border border-slate-800 hover:border-amber-500/50 bg-slate-950/60 hover:bg-slate-800/40 transition-all cursor-pointer space-y-2 shadow-xs"
              onClick={() => onInsertarSFX?.(sfx)}
            >
              {/* Tarjeta visual de previsualización */}
              <div className="h-16 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden relative group-hover:scale-[1.02] transition-transform">
                <span
                  style={{
                    fontFamily: sfx.fontFamily,
                    fontSize: `${Math.min(sfx.fontSize, 36)}px`,
                    color: sfx.fill,
                    WebkitTextStroke: `${sfx.strokeWidth}px ${sfx.stroke}`,
                    paintOrder: 'stroke fill',
                    transform: `rotate(${sfx.angle}deg)`,
                    textShadow: `2px 2px 6px ${sfx.shadowColor}`,
                  }}
                  className="font-black tracking-wider transition-all select-none"
                >
                  {sfx.texto}
                </span>

                <div className="absolute top-1 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[9px] font-mono text-amber-400 bg-black/60 px-1 py-0.5 rounded">
                    + Clic
                  </span>
                </div>
              </div>

              {/* Pie de tarjeta con info y botón */}
              <div className="flex items-center justify-between text-[11px] pt-0.5">
                <div>
                  <span className="font-titulo font-bold text-white block">
                    {sfx.texto}
                  </span>
                  <span className="text-[10px] text-slate-400 line-clamp-1">
                    {sfx.subtexto}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onInsertarSFX?.(sfx)
                  }}
                  className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/30 text-[10px] font-bold font-titulo flex items-center gap-1 transition-colors cursor-pointer"
                  title="Insertar en el centro del lienzo o viñeta activa"
                >
                  <Plus className="w-3 h-3" />
                  <span>Insertar</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
