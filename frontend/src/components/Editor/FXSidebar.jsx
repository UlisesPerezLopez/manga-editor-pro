// FXSidebar.jsx
// Generador procedural de efectos cinéticos de manga para Fabric.js (MEP).
// Genera en canvas HTML5:
// 1. Speedlines Radiales (rayos que convergen al centro).
// 2. Speedlines Horizontales (trazos cinéticos de velocidad).
// 3. Tramas Screentone Halftone (semitonos de puntos manga tradicionales).
// Se insertan como capas vectoriales/rasterizadas semitransparentes sobre viñetas o lienzo.

import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { fabric } from 'fabric'
import {
  Sparkles,
  Zap,
  Wind,
  ArrowDown,
  Radio,
  CircleDot,
  Grid,
  Sliders,
  Check,
  Plus,
  Trash2,
  Eye
} from 'lucide-react'

const TIPOS_EFECTOS = [
  {
    id: 'radial_speedlines',
    nombre: 'Speedlines Radiales',
    descripcion: 'Rayos de impacto que convergen hacia el punto focal central',
    icon: Zap,
    color: 'text-amber-400'
  },
  {
    id: 'horizontal_speedlines',
    nombre: 'Speedlines Horizontales',
    descripcion: 'Líneas de movimiento dinámico y velocidad lateral',
    icon: Wind,
    color: 'text-sky-400'
  },
  {
    id: 'vertical_speedlines',
    nombre: 'Speedlines Verticales',
    descripcion: 'Trazos de tensión, caída y velocidad vertical',
    icon: ArrowDown,
    color: 'text-emerald-400'
  },
  {
    id: 'shockwave_concentric',
    nombre: 'Ondas de Choque Concéntricas',
    descripcion: 'Ondas concéntricas de explosión e impacto sísmico',
    icon: Radio,
    color: 'text-rose-400'
  },
  {
    id: 'screentone_20',
    nombre: 'Trama Screentone (20%)',
    descripcion: 'Semitono fino tradicional de puntos manga (20% cobertura)',
    icon: CircleDot,
    color: 'text-purple-400'
  },
  {
    id: 'screentone_40',
    nombre: 'Trama Screentone Densa (40%)',
    descripcion: 'Sombreado denso de puntos manga para dramatismo (40% cobertura)',
    icon: Grid,
    color: 'text-indigo-400'
  }
]

export default function FXSidebar({ canvasRef, onActualizar }) {
  const { t } = useTranslation()
  const previewCanvasRef = useRef(null)

  const [efectoActivo, setEfectoActivo] = useState('radial_speedlines')
  const [densidad, setDensidad] = useState(60)
  const [radioFoco, setRadioFoco] = useState(35) // En porcentaje para radial
  const [opacidad, setOpacidad] = useState(80) // En porcentaje
  const [colorEfecto, setColorEfecto] = useState('#000000')

  // Renderizar miniatura previa procedural en canvas 2D
  useEffect(() => {
    const canvas = previewCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height

    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, w, h)

    ctx.fillStyle = colorEfecto
    ctx.strokeStyle = colorEfecto

    if (efectoActivo === 'radial_speedlines') {
      const cx = w / 2
      const cy = h / 2
      const maxR = Math.hypot(w, h) / 2
      const minR = (maxR * radioFoco) / 100
      const numRays = Math.max(20, Math.round((densidad / 100) * 80))

      for (let i = 0; i < numRays; i++) {
        const baseAngle = (i / numRays) * Math.PI * 2
        const halfWidth = (Math.PI / numRays) * 0.45
        const rInner = minR + (Math.sin(i * 99) * 0.5 + 0.5) * 15

        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(baseAngle - halfWidth) * maxR, cy + Math.sin(baseAngle - halfWidth) * maxR)
        ctx.lineTo(cx + Math.cos(baseAngle + halfWidth) * maxR, cy + Math.sin(baseAngle + halfWidth) * maxR)
        ctx.lineTo(cx + Math.cos(baseAngle) * rInner, cy + Math.sin(baseAngle) * rInner)
        ctx.closePath()
        ctx.fill()
      }
    } else if (efectoActivo === 'horizontal_speedlines') {
      const numLines = Math.max(15, Math.round((densidad / 100) * 55))
      for (let i = 0; i < numLines; i++) {
        const y = (i / numLines) * h + (Math.sin(i * 12) * 4)
        const lineH = 1 + (i % 3) * 0.8
        const lineW = w * (0.35 + (Math.cos(i * 7) * 0.5 + 0.5) * 0.6)
        const x = (Math.sin(i * 23) * 0.5 + 0.5) * (w - lineW)

        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + lineW * 0.85, y + lineH / 2)
        ctx.lineTo(x + lineW, y)
        ctx.lineTo(x + lineW * 0.85, y - lineH / 2)
        ctx.closePath()
        ctx.fill()
      }
    } else if (efectoActivo === 'vertical_speedlines') {
      const numLines = Math.max(15, Math.round((densidad / 100) * 55))
      for (let i = 0; i < numLines; i++) {
        const x = (i / numLines) * w + (Math.sin(i * 14) * 4)
        const lineW = 1 + (i % 3) * 0.8
        const lineH = h * (0.35 + (Math.cos(i * 9) * 0.5 + 0.5) * 0.6)
        const y = (Math.sin(i * 27) * 0.5 + 0.5) * (h - lineH)

        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + lineW / 2, y + lineH * 0.85)
        ctx.lineTo(x, y + lineH)
        ctx.lineTo(x - lineW / 2, y + lineH * 0.85)
        ctx.closePath()
        ctx.fill()
      }
    } else if (efectoActivo === 'shockwave_concentric') {
      const cx = w / 2
      const cy = h / 2
      const maxR = Math.hypot(w, h) / 2
      const numRings = Math.max(3, Math.round((densidad / 100) * 8))
      ctx.lineWidth = 1.5

      for (let i = 1; i <= numRings; i++) {
        const r = (i / (numRings + 1)) * maxR
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.stroke()
        for (let a = 0; a < 6; a++) {
          const angle = (a / 6) * Math.PI * 2 + (i * 0.5)
          ctx.beginPath()
          ctx.arc(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, 1.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    } else if (efectoActivo === 'screentone_20' || efectoActivo === 'screentone_dots') {
      const spacing = Math.max(8, Math.round(18 - (densidad / 100) * 6))
      const dotR = 1.3
      for (let x = spacing / 2; x < w; x += spacing) {
        for (let y = spacing / 2; y < h; y += spacing) {
          ctx.beginPath()
          ctx.arc(x, y, dotR, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    } else if (efectoActivo === 'screentone_40') {
      const spacing = Math.max(7, Math.round(14 - (densidad / 100) * 5))
      const dotR = 2.4
      for (let x = spacing / 2; x < w; x += spacing) {
        for (let y = spacing / 2; y < h; y += spacing) {
          ctx.beginPath()
          ctx.arc(x, y, dotR, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
  }, [efectoActivo, densidad, radioFoco, colorEfecto])

  // Generar imagen procedural en resolución completa y montarla en Fabric
  const insertarEfectoEnCanvas = () => {
    const canvas = canvasRef?.current?.getFabricCanvas()
    if (!canvas) return

    // Buscar si hay una viñeta seleccionada o activa
    const activo = canvas.getActiveObject()
    let vinetaDestino = null

    if (activo && (activo.data?.type === 'panel' || activo.data?.tipo === 'vineta' || (activo.type === 'rect' && !activo.data?.balloonId))) {
      vinetaDestino = activo
    } else {
      vinetaDestino = canvas.getObjects().find(o => !o.data?.esGuiaAlineacion && (o.data?.type === 'panel' || o.data?.tipo === 'vineta' || (o.type === 'rect' && !o.data?.balloonId)))
    }

    const wResolucion = vinetaDestino ? Math.round(vinetaDestino.getScaledWidth ? vinetaDestino.getScaledWidth() : vinetaDestino.width * (vinetaDestino.scaleX || 1)) : 595
    const hResolucion = vinetaDestino ? Math.round(vinetaDestino.getScaledHeight ? vinetaDestino.getScaledHeight() : vinetaDestino.height * (vinetaDestino.scaleY || 1)) : 842

    const offscreen = document.createElement('canvas')
    offscreen.width = Math.max(300, wResolucion)
    offscreen.height = Math.max(300, hResolucion)
    const ctx = offscreen.getContext('2d')

    ctx.clearRect(0, 0, offscreen.width, offscreen.height)
    ctx.fillStyle = colorEfecto
    ctx.strokeStyle = colorEfecto

    if (efectoActivo === 'radial_speedlines') {
      const cx = offscreen.width / 2
      const cy = offscreen.height / 2
      const maxR = Math.hypot(offscreen.width, offscreen.height) / 2
      const minR = (maxR * radioFoco) / 100
      const numRays = Math.max(30, Math.round((densidad / 100) * 120))

      for (let i = 0; i < numRays; i++) {
        const baseAngle = (i / numRays) * Math.PI * 2 + (Math.random() - 0.5) * (Math.PI / numRays * 0.4)
        const halfWidth = (Math.PI / numRays) * (0.3 + Math.random() * 0.4)
        const rInner = minR + Math.random() * 30

        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(baseAngle - halfWidth) * maxR, cy + Math.sin(baseAngle - halfWidth) * maxR)
        ctx.lineTo(cx + Math.cos(baseAngle + halfWidth) * maxR, cy + Math.sin(baseAngle + halfWidth) * maxR)
        ctx.lineTo(cx + Math.cos(baseAngle) * rInner, cy + Math.sin(baseAngle) * rInner)
        ctx.closePath()
        ctx.fill()
      }
    } else if (efectoActivo === 'horizontal_speedlines') {
      const numLines = Math.max(25, Math.round((densidad / 100) * 90))
      for (let i = 0; i < numLines; i++) {
        const y = Math.random() * offscreen.height
        const lineH = 1 + Math.random() * 2.5
        const lineW = offscreen.width * (0.3 + Math.random() * 0.65)
        const x = Math.random() * (offscreen.width - lineW)

        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + lineW * 0.85, y + lineH / 2)
        ctx.lineTo(x + lineW, y)
        ctx.lineTo(x + lineW * 0.85, y - lineH / 2)
        ctx.closePath()
        ctx.fill()
      }
    } else if (efectoActivo === 'vertical_speedlines') {
      const numLines = Math.max(25, Math.round((densidad / 100) * 90))
      for (let i = 0; i < numLines; i++) {
        const x = Math.random() * offscreen.width
        const lineW = 1 + Math.random() * 2.5
        const lineH = offscreen.height * (0.3 + Math.random() * 0.65)
        const y = Math.random() * (offscreen.height - lineH)

        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + lineW / 2, y + lineH * 0.85)
        ctx.lineTo(x, y + lineH)
        ctx.lineTo(x - lineW / 2, y + lineH * 0.85)
        ctx.closePath()
        ctx.fill()
      }
    } else if (efectoActivo === 'shockwave_concentric') {
      const cx = offscreen.width / 2
      const cy = offscreen.height / 2
      const maxR = Math.hypot(offscreen.width, offscreen.height) / 2
      const numRings = Math.max(5, Math.round((densidad / 100) * 14))
      ctx.lineWidth = Math.max(2, Math.round(offscreen.width / 180))

      for (let i = 1; i <= numRings; i++) {
        const r = (i / (numRings + 1)) * maxR
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.stroke()
        for (let a = 0; a < 8; a++) {
          const angle = (a / 8) * Math.PI * 2 + (i * 0.4)
          ctx.beginPath()
          ctx.arc(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, 2.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    } else if (efectoActivo === 'screentone_20' || efectoActivo === 'screentone_dots') {
      const spacing = Math.max(10, Math.round(24 - (densidad / 100) * 8))
      const dotR = 2.0
      for (let x = spacing / 2; x < offscreen.width; x += spacing) {
        for (let y = spacing / 2; y < offscreen.height; y += spacing) {
          ctx.beginPath()
          ctx.arc(x, y, dotR, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    } else if (efectoActivo === 'screentone_40') {
      const spacing = Math.max(9, Math.round(18 - (densidad / 100) * 7))
      const dotR = 3.2
      for (let x = spacing / 2; x < offscreen.width; x += spacing) {
        for (let y = spacing / 2; y < offscreen.height; y += spacing) {
          ctx.beginPath()
          ctx.arc(x, y, dotR, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    const dataUrl = offscreen.toDataURL('image/png')

    fabric.Image.fromURL(dataUrl, (img) => {
      if (!img) return

      const opacValor = Math.max(0.1, Math.min(1.0, opacidad / 100))

      if (vinetaDestino) {
        const destLeft = vinetaDestino.left
        const destTop = vinetaDestino.top
        const destW = vinetaDestino.getScaledWidth ? vinetaDestino.getScaledWidth() : vinetaDestino.width * (vinetaDestino.scaleX || 1)
        const destH = vinetaDestino.getScaledHeight ? vinetaDestino.getScaledHeight() : vinetaDestino.height * (vinetaDestino.scaleY || 1)

        img.set({
          left: destLeft,
          top: destTop,
          scaleX: destW / img.width,
          scaleY: destH / img.height,
          opacity: opacValor,
          globalCompositeOperation: 'source-over',
          clipPath: new fabric.Rect({
            left: destLeft,
            top: destTop,
            width: destW,
            height: destH,
            absolutePositioned: true
          }),
          selectable: true,
          hasControls: true,
          cornerColor: '#E5A93C',
          cornerStyle: 'circle',
          borderColor: '#E5A93C',
          cornerSize: 8,
          transparentCorners: false,
          data: {
            type: 'fx_layer',
            tipo: 'fx_layer',
            fxTipo: efectoActivo,
            nombre: `Efecto: ${efectoActivo}`
          }
        })

        canvas.add(img)

        // Ubicar el efecto justo por encima de la imagen del panel si existe
        const targetPanelId = vinetaDestino.data?.panelId || vinetaDestino.data?.id
        const panelImg = canvas.getObjects().find(o => 
          (o.data?.type === 'panel_image' || o.data?.tipo === 'imagen_generada') &&
          targetPanelId && (o.data?.panelId === targetPanelId || o.data?.id === targetPanelId)
        )
        if (panelImg) {
          const imgIdx = canvas.getObjects().indexOf(panelImg)
          if (imgIdx > -1) {
            img.moveTo(imgIdx + 1)
          }
        }

        // El marco perimetral negro de 4px se coloca por encima del arte y del efecto
        canvas.bringToFront(vinetaDestino)

        // Todos los bocadillos y textos en la capa superior absoluta
        canvas.getObjects().forEach(o => {
          if (o.data?.type === 'balloon_shape' || o.data?.type === 'balloon_text' || o.data?.type === 'sfx_text' || o.data?.type === 'balloon' || o.data?.tipo === 'bocadillo' || o.type === 'i-text' || o.type === 'textbox' || o.type === 'text') {
            canvas.bringToFront(o)
          }
        })
      } else {
        // En centro de lienzo
        img.set({
          left: 20,
          top: 20,
          scaleX: 555 / img.width,
          scaleY: 802 / img.height,
          opacity: opacValor,
          globalCompositeOperation: 'source-over',
          selectable: true,
          hasControls: true,
          cornerColor: '#E5A93C',
          cornerStyle: 'circle',
          borderColor: '#E5A93C',
          cornerSize: 8,
          transparentCorners: false,
          data: {
            type: 'fx_layer',
            tipo: 'fx_layer',
            fxTipo: efectoActivo,
            nombre: `Efecto: ${efectoActivo}`
          }
        })
        canvas.add(img)
      }

      canvas.setActiveObject(img)
      canvas.renderAll()
      onActualizar?.()
    })
  }

  return (
    <div className="flex flex-col h-full bg-rdc-secondary text-rdc-text text-xs">
      {/* ── Cabecera ── */}
      <div className="p-3 border-b border-rdc-border space-y-1.5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-rdc-accent" />
          <h3 className="font-titulo text-xs font-black uppercase tracking-wider text-rdc-text">
            {t('editor.fx.kineticTitle')}
          </h3>
        </div>
        <p className="text-[11px] text-rdc-muted leading-tight">
          {t('editor.fx.kineticDesc')}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Selector de Tipo de Efecto */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold font-titulo uppercase tracking-wider text-rdc-muted">
            {t('editor.fx.effectType')}
          </label>
          <div className="space-y-1.5">
            {TIPOS_EFECTOS.map((ef) => {
              const Icon = ef.icon
              const esActivo = efectoActivo === ef.id
              const nombreTraducido = t(`editor.fx.effects.${ef.id}`) || ef.nombre
              const descTraducida = t(`editor.fx.effects.${ef.id}_desc`) || ef.descripcion

              return (
                <button
                  key={ef.id}
                  onClick={() => setEfectoActivo(ef.id)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                    esActivo
                      ? 'bg-rdc-accent/15 border-rdc-accent text-rdc-text shadow-xs'
                      : 'bg-rdc-primary border-rdc-border hover:border-rdc-accent/60 text-rdc-muted hover:text-rdc-text'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg bg-rdc-card border border-rdc-border ${ef.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-titulo font-bold text-xs text-rdc-text">
                      {nombreTraducido}
                    </div>
                    <div className="text-[10px] text-rdc-muted leading-tight mt-0.5">
                      {descTraducida}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Vista Previa Interactiva en Vivo */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-titulo font-bold text-rdc-muted">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-rdc-accent" />
              {t('editor.fx.previewRealtime')}
            </span>
            <span className="text-[10px] font-mono">{opacidad}% {t('editor.fx.opacity')}</span>
          </div>

          <div className="aspect-[4/3] rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white overflow-hidden shadow-inner flex items-center justify-center p-1">
            <canvas
              ref={previewCanvasRef}
              width={260}
              height={195}
              className="w-full h-full object-contain"
              style={{ opacity: opacidad / 100 }}
            />
          </div>
        </div>

        {/* Parámetros Procedurales */}
        <div className="bg-rdc-primary p-3 rounded-xl border border-rdc-border space-y-3 font-titulo">
          <div className="flex items-center gap-1.5 text-xs font-bold text-rdc-text pb-1 border-b border-rdc-border">
            <Sliders className="w-3.5 h-3.5 text-rdc-accent" />
            <span>{t('editor.fx.settings')}</span>
          </div>

          {/* Slider Densidad */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-rdc-muted">{t('editor.fx.density')}</span>
              <span className="font-mono text-rdc-text font-bold">{densidad}%</span>
            </div>
            <input
              type="range"
              min="15"
              max="100"
              value={densidad}
              onChange={(e) => setDensidad(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Slider Radio de Foco (Solo en radial) */}
          {efectoActivo === 'radial_speedlines' && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-rdc-muted">{t('editor.fx.focalRadius')}</span>
                <span className="font-mono text-rdc-text font-bold">{radioFoco}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="75"
                value={radioFoco}
                onChange={(e) => setRadioFoco(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          )}

          {/* Slider Opacidad */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-rdc-muted">{t('editor.fx.layerOpacity')}</span>
              <span className="font-mono text-rdc-text font-bold">{opacidad}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              value={opacidad}
              onChange={(e) => setOpacidad(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Color del Trazo */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-rdc-muted">{t('editor.fx.strokeColor')}</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setColorEfecto('#000000')}
                className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                  colorEfecto === '#000000' ? 'border-amber-400 scale-110' : 'border-slate-400'
                } bg-black`}
                title={t('editor.fx.blackInk')}
              />
              <button
                type="button"
                onClick={() => setColorEfecto('#FFFFFF')}
                className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                  colorEfecto === '#FFFFFF' ? 'border-amber-400 scale-110' : 'border-slate-400'
                } bg-white`}
                title={t('editor.fx.whiteGlow')}
              />
            </div>
          </div>
        </div>

        {/* Botón de Inserción */}
        <button
          type="button"
          onClick={insertarEfectoEnCanvas}
          className="w-full py-2.5 px-3 rounded-xl bg-rdc-accent hover:bg-rdc-accent-hover text-white text-xs font-titulo font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>{t('editor.fx.insertLayer')}</span>
        </button>
      </div>

      {/* ── Footer ── */}
      <div className="p-2.5 border-t border-rdc-border bg-rdc-primary/50 text-[11px] text-rdc-muted font-mono flex items-center justify-between flex-shrink-0">
        <span>{t('editor.fx.clipPathLayers')}</span>
        <span className="text-[10px] text-amber-400 font-bold">{t('editor.fx.comicMode')}</span>
      </div>
    </div>
  )
}
