// canvasSnapping.js
// Alineación magnética a cuadrícula (Snap-to-Grid) y líneas guía inteligentes (Smart Alignment Guides) para Fabric.js.

import { fabric } from 'fabric'

export const CONFIG_SNAPPING_DEFAULT = {
  gridActiva: true,
  gridTamano: 16,          // 8px, 16px, 32px
  guiasInteligentes: true,
  umbralAlineacion: 6,     // píxeles de tolerancia magnética
  colorGuia: '#FF3366',    // Magenta/rojo visible sobre fondos oscuros y claros
}

/**
 * Limpia todas las líneas guía temporales del canvas
 */
export function limpiarGuias(canvas) {
  if (!canvas) return
  const objetos = canvas.getObjects()
  const guias = objetos.filter(obj => obj.data?.esGuiaAlineacion)
  guias.forEach(g => canvas.remove(g))
  canvas.renderAll()
}

/**
 * Dibuja una línea guía temporal en el canvas
 */
function dibujarLineaGuia(canvas, x1, y1, x2, y2, color) {
  const linea = new fabric.Line([x1, y1, x2, y2], {
    stroke: color || '#FF3366',
    strokeWidth: 1,
    selectable: false,
    evented: false,
    strokeDashArray: [4, 4],
    opacity: 0.85,
    data: { esGuiaAlineacion: true }
  })
  canvas.add(linea)
  return linea
}

/**
 * Procesa el ajuste magnético y guías durante el movimiento de un objeto
 */
export function procesarSnapping(canvas, activeObj, config = CONFIG_SNAPPING_DEFAULT) {
  if (!canvas || !activeObj || activeObj.data?.esGuiaAlineacion) return

  limpiarGuias(canvas)

  const bounds = activeObj.getBoundingRect(true)
  let nuevoLeft = activeObj.left
  let nuevoTop = activeObj.top

  const umbral = config.umbralAlineacion || 6
  const canvasW = canvas.getWidth()
  const canvasH = canvas.getHeight()

  // ─── 1. AJUSTE MAGNÉTICO A CUADRÍCULA (GRID SNAP) ─────────────────────────
  if (config.gridActiva && config.gridTamano > 0) {
    const grid = config.gridTamano
    nuevoLeft = Math.round(nuevoLeft / grid) * grid
    nuevoTop = Math.round(nuevoTop / grid) * grid
    activeObj.set({ left: nuevoLeft, top: nuevoTop })
  }

  // ─── 2. GUÍAS INTELIGENTES (SMART GUIDES) ──────────────────────────────────
  if (config.guiasInteligentes) {
    const objCentroX = nuevoLeft + bounds.width / 2
    const objCentroY = nuevoTop + bounds.height / 2
    const objRight = nuevoLeft + bounds.width
    const objBottom = nuevoTop + bounds.height

    // A. Alinear con el centro absoluto del lienzo
    const centroCanvasX = canvasW / 2
    const centroCanvasY = canvasH / 2

    if (Math.abs(objCentroX - centroCanvasX) < umbral) {
      activeObj.set({ left: centroCanvasX - bounds.width / 2 })
      dibujarLineaGuia(canvas, centroCanvasX, 0, centroCanvasX, canvasH, '#00E5FF')
    }

    if (Math.abs(objCentroY - centroCanvasY) < umbral) {
      activeObj.set({ top: centroCanvasY - bounds.height / 2 })
      dibujarLineaGuia(canvas, 0, centroCanvasY, canvasW, centroCanvasY, '#00E5FF')
    }

    // B. Alinear con bordes y centros de otros objetos adyacentes
    const otrosObjetos = canvas.getObjects().filter(
      o => o !== activeObj && !o.data?.esGuiaAlineacion && o.visible
    )

    for (const otro of otrosObjetos) {
      const oBounds = otro.getBoundingRect(true)
      const oLeft = oBounds.left
      const oTop = oBounds.top
      const oRight = oLeft + oBounds.width
      const oBottom = oTop + oBounds.height
      const oCentroX = oLeft + oBounds.width / 2
      const oCentroY = oTop + oBounds.height / 2

      // Alineación Vertical (Eje X)
      // Izquierda con Izquierda
      if (Math.abs(nuevoLeft - oLeft) < umbral) {
        activeObj.set({ left: oLeft })
        dibujarLineaGuia(canvas, oLeft, 0, oLeft, canvasH, config.colorGuia)
      }
      // Derecha con Derecha
      else if (Math.abs(objRight - oRight) < umbral) {
        activeObj.set({ left: oRight - bounds.width })
        dibujarLineaGuia(canvas, oRight, 0, oRight, canvasH, config.colorGuia)
      }
      // Centros X
      else if (Math.abs(objCentroX - oCentroX) < umbral) {
        activeObj.set({ left: oCentroX - bounds.width / 2 })
        dibujarLineaGuia(canvas, oCentroX, 0, oCentroX, canvasH, config.colorGuia)
      }

      // Alineación Horizontal (Eje Y)
      // Arriba con Arriba
      if (Math.abs(nuevoTop - oTop) < umbral) {
        activeObj.set({ top: oTop })
        dibujarLineaGuia(canvas, 0, oTop, canvasW, oTop, config.colorGuia)
      }
      // Abajo con Abajo
      else if (Math.abs(objBottom - oBottom) < umbral) {
        activeObj.set({ top: oBottom - bounds.height })
        dibujarLineaGuia(canvas, 0, oBottom, canvasW, oBottom, config.colorGuia)
      }
      // Centros Y
      else if (Math.abs(objCentroY - oCentroY) < umbral) {
        activeObj.set({ top: oCentroY - bounds.height / 2 })
        dibujarLineaGuia(canvas, 0, oCentroY, canvasW, oCentroY, config.colorGuia)
      }
    }
  }

  activeObj.setCoords()
  canvas.renderAll()
}

export default {
  CONFIG_SNAPPING_DEFAULT,
  limpiarGuias,
  procesarSnapping
}
