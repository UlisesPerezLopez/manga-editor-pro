// BalloonsSidebar.jsx
// Panel lateral de Bocadillos y Globos de Texto Editoriales para MEP — Manga Editor Pro.
// Consume balloonPresets.json y renderiza 10 vectores SVG clasificados por categoría.
// Soporta clic directo para insertar o Drag & Drop hacia el lienzo Fabric.js.

import React, { useState, useMemo } from 'react'
import {
  MessageSquare,
  Zap,
  Cloud,
  VolumeX,
  FileText,
  Plus,
  Move,
  Type,
  Layers
} from 'lucide-react'
import balloonPresetsData from '../../data/balloonPresets.json'

const CATEGORIAS = [
  { id: 'todas',    label: 'Todos',        icon: Layers },
  { id: 'speech',   label: 'Diálogo',      icon: MessageSquare },
  { id: 'scream',   label: 'Grito',        icon: Zap },
  { id: 'thought',  label: 'Pensamiento',  icon: Cloud },
  { id: 'whisper',  label: 'Susurro',      icon: VolumeX },
  { id: 'caption',  label: 'Cartela',      icon: FileText },
]

export default function BalloonsSidebar({ onInsertarBocadillo, canvasRef }) {
  const [categoriaActiva, setCategoriaActiva] = useState('todas')
  const [textoPersonalizado, setTextoPersonalizado] = useState('')

  // Convertir presets objeto a array
  const presets = useMemo(() => {
    return Object.values(balloonPresetsData || {})
  }, [])

  // Filtrar por categoría activa
  const presetsFiltrados = useMemo(() => {
    if (categoriaActiva === 'todas') return presets
    return presets.filter(p => p.tipo === categoriaActiva)
  }, [presets, categoriaActiva])

  // Manejar inserción
  const handleInsertar = (preset) => {
    if (onInsertarBocadillo) {
      onInsertarBocadillo(preset, textoPersonalizado)
      return
    }

    if (canvasRef?.current?.insertarBocadilloPreset) {
      canvasRef.current.insertarBocadilloPreset(preset, null, null, textoPersonalizado)
    }
  }

  return (
    <div className="flex flex-col h-full bg-rdc-secondary text-rdc-text">
      {/* ── Cabecera del Panel ── */}
      <div className="p-3 border-b border-rdc-border space-y-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-rdc-accent" />
          <h3 className="font-titulo text-xs font-black uppercase tracking-wider text-rdc-text">
            Bocadillos & Globos
          </h3>
        </div>
        <p className="text-[11px] text-rdc-muted leading-tight">
          Vectores SVG con tipografía editorial integrada. Haz clic o arrastra al lienzo.
        </p>

        {/* Input opcional de texto previo */}
        <div className="pt-1">
          <input
            type="text"
            value={textoPersonalizado}
            onChange={(e) => setTextoPersonalizado(e.target.value)}
            placeholder="Texto inicial (opcional)..."
            className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-rdc-border bg-rdc-primary text-rdc-text placeholder:text-rdc-muted/70 focus:outline-none focus:ring-1 focus:ring-rdc-accent font-titulo"
          />
        </div>

        {/* Filtros de Categoría */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar py-1">
          {CATEGORIAS.map((cat) => {
            const Icon = cat.icon
            const esActiva = categoriaActiva === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setCategoriaActiva(cat.id)}
                className={`px-2 py-1 rounded-lg text-[10px] font-titulo font-bold whitespace-nowrap flex items-center gap-1 transition-all cursor-pointer ${
                  esActiva
                    ? 'bg-rdc-accent text-white shadow-xs'
                    : 'bg-rdc-card border border-rdc-border text-rdc-muted hover:text-rdc-text hover:bg-rdc-primary'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Catálogo de Bocadillos SVG ── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {presetsFiltrados.length === 0 ? (
          <div className="p-4 text-center rounded-xl border border-dashed border-rdc-border text-rdc-muted text-xs">
            No hay bocadillos en esta categoría.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {presetsFiltrados.map((preset) => {
              const fontPrincipal = preset.fontFamily?.split(',')[0]?.replace(/['"]/g, '').trim() || 'Comic Relief'

              return (
                <div
                  key={preset.id}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData(
                      'application/json',
                      JSON.stringify({
                        type: 'balloon_preset',
                        preset,
                        texto: textoPersonalizado
                      })
                    )
                    e.dataTransfer.setData('text/plain', preset.svg)
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  onClick={() => handleInsertar(preset)}
                  className="group relative rounded-xl border border-rdc-border bg-rdc-primary p-2.5 space-y-2 shadow-xs hover:border-rdc-accent transition-all duration-150 cursor-grab active:cursor-grabbing flex flex-col justify-between"
                >
                  {/* Vista Previa del SVG */}
                  <div className="relative aspect-[4/3] rounded-lg bg-white p-2 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden">
                    <img
                      src={preset.svg}
                      alt={preset.nombre}
                      className="w-full h-full object-contain filter drop-shadow-xs group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                    />
                    <div className="absolute bottom-1 right-1 flex items-center gap-0.5 px-1 py-0.5 rounded bg-black/60 text-white text-[9px] font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                      <Move className="w-2.5 h-2.5 text-amber-300" />
                      <span>Arrastrar</span>
                    </div>
                  </div>

                  {/* Metadatos y Tipografía */}
                  <div className="space-y-1">
                    <h4 className="font-titulo text-[11px] font-bold text-rdc-text truncate leading-tight group-hover:text-rdc-accent transition-colors">
                      {preset.nombre}
                    </h4>
                    <div className="flex items-center justify-between text-[10px] text-rdc-muted font-mono">
                      <span className="flex items-center gap-1 truncate max-w-[100px]" title={preset.fontFamily}>
                        <Type className="w-2.5 h-2.5 text-rdc-accent flex-shrink-0" />
                        {fontPrincipal}
                      </span>
                      <span>{preset.fontSize}px</span>
                    </div>
                  </div>

                  {/* Botón Insertar */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleInsertar(preset)
                    }}
                    className="w-full py-1 px-2 rounded-lg bg-rdc-card hover:bg-rdc-accent hover:text-white border border-rdc-border text-rdc-text text-[10px] font-titulo font-bold flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Insertar</span>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="p-2.5 border-t border-rdc-border bg-rdc-primary/50 text-[11px] text-rdc-muted font-mono flex items-center justify-between flex-shrink-0">
        <span>{presetsFiltrados.length} modelos SVG</span>
        <span className="text-[10px] font-sans text-amber-400 font-bold">IText Editable</span>
      </div>
    </div>
  )
}
