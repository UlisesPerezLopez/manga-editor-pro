// PageTemplates.jsx
// Plantillas predefinidas de layout de página manga con soporte multilingüe.

import { useTranslation } from 'react-i18next'

// Dimensiones estándar del canvas (en píxeles)
const CANVAS_W = 595  // A4 ancho
const CANVAS_H = 842  // A4 alto
const MARGEN = 20     // margen interior

export const PLANTILLAS = {
  blank: {
    id: 'blank',
    nombre: 'En blanco',
    emoji: '⬜',
    descripcion: 'Canvas vacío para diseño libre',
    generarVinetas: () => []
  },

  splash: {
    id: 'splash',
    nombre: 'Splash Page',
    emoji: '🖼️',
    descripcion: 'Una sola viñeta a página completa',
    generarVinetas: () => [{
      left: MARGEN, top: MARGEN,
      width: CANVAS_W - MARGEN * 2,
      height: CANVAS_H - MARGEN * 2
    }]
  },

  dos_filas: {
    id: 'dos_filas',
    nombre: '2 Filas iguales',
    emoji: '▬▬',
    descripcion: 'Dos viñetas horizontales',
    generarVinetas: () => {
      const h = (CANVAS_H - MARGEN * 3) / 2
      return [
        { left: MARGEN, top: MARGEN,           width: CANVAS_W - MARGEN*2, height: h },
        { left: MARGEN, top: MARGEN*2 + h,     width: CANVAS_W - MARGEN*2, height: h },
      ]
    }
  },

  tres_filas: {
    id: 'tres_filas',
    nombre: '3 Filas iguales',
    emoji: '▬▬▬',
    descripcion: 'Tres viñetas horizontales',
    generarVinetas: () => {
      const h = (CANVAS_H - MARGEN * 4) / 3
      return [
        { left: MARGEN, top: MARGEN,             width: CANVAS_W - MARGEN*2, height: h },
        { left: MARGEN, top: MARGEN*2 + h,       width: CANVAS_W - MARGEN*2, height: h },
        { left: MARGEN, top: MARGEN*3 + h*2,     width: CANVAS_W - MARGEN*2, height: h },
      ]
    }
  },

  cuatro_panel: {
    id: 'cuatro_panel',
    nombre: '4 Panel (2×2)',
    emoji: '⊞',
    descripcion: 'Cuatro viñetas en cuadrícula',
    generarVinetas: () => {
      const w = (CANVAS_W - MARGEN * 3) / 2
      const h = (CANVAS_H - MARGEN * 3) / 2
      return [
        { left: MARGEN,         top: MARGEN,         width: w, height: h },
        { left: MARGEN*2 + w,   top: MARGEN,         width: w, height: h },
        { left: MARGEN,         top: MARGEN*2 + h,   width: w, height: h },
        { left: MARGEN*2 + w,   top: MARGEN*2 + h,   width: w, height: h },
      ]
    }
  },

  accion_dinamica: {
    id: 'accion_dinamica',
    nombre: 'Acción dinámica',
    emoji: '⚡',
    descripcion: 'Una viñeta grande arriba y dos pequeñas abajo',
    generarVinetas: () => {
      const hGrande = (CANVAS_H - MARGEN * 3) * 0.6
      const hPequeña = (CANVAS_H - MARGEN * 3) * 0.4
      const wMitad = (CANVAS_W - MARGEN * 3) / 2
      return [
        { left: MARGEN,       top: MARGEN,             width: CANVAS_W - MARGEN*2, height: hGrande },
        { left: MARGEN,       top: MARGEN*2 + hGrande, width: wMitad,              height: hPequeña },
        { left: MARGEN*2+wMitad, top: MARGEN*2 + hGrande, width: wMitad,           height: hPequeña },
      ]
    }
  },

  dialogo: {
    id: 'dialogo',
    nombre: 'Diálogo',
    emoji: '💬',
    descripcion: 'Tres viñetas para escenas de conversación',
    generarVinetas: () => {
      const h1 = (CANVAS_H - MARGEN * 4) * 0.45
      const wMitad = (CANVAS_W - MARGEN * 3) / 2
      const h2 = (CANVAS_H - MARGEN * 4) * 0.55
      return [
        { left: MARGEN,          top: MARGEN,         width: wMitad, height: h1 },
        { left: MARGEN*2+wMitad, top: MARGEN,         width: wMitad, height: h1 },
        { left: MARGEN,          top: MARGEN*2 + h1,  width: CANVAS_W - MARGEN*2, height: h2 },
      ]
    }
  },
}

export const CANVAS_DIMENSIONES = { width: CANVAS_W, height: CANVAS_H }

export default function PageTemplates({ onSeleccionar, plantillaActual }) {
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-2 gap-2 p-3">
      {Object.values(PLANTILLAS).map(p => (
        <button
          key={p.id}
          onClick={() => {
            if (window.confirm(t('editor.applyTemplateConfirm'))) {
              onSeleccionar(p)
            }
          }}
          className={`border rounded-lg p-2 text-left transition-all duration-150
                      ${plantillaActual === p.id
                        ? 'border-rdc-accent bg-rdc-accent bg-opacity-10'
                        : 'border-rdc-border hover:border-rdc-muted'
                      }`}
        >
          <span className="text-2xl block mb-1">{p.emoji}</span>
          <p className="text-rdc-text text-xs font-semibold font-titulo">{p.nombre}</p>
          <p className="text-rdc-muted text-[11px] leading-tight mt-0.5">
            {p.descripcion}
          </p>
        </button>
      ))}
    </div>
  )
}