// mangaFilters.js
// Filtros de postprocesado y tramas manga (Lineart B&N, Semitonos/Screentones, Sepia Flashback, Inversión).

import { fabric } from 'fabric'

/**
 * Genera un canvas temporal con el filtro de Tinta B&N (Binarización de alto contraste)
 */
function procesarLineartBw(imgElement, threshold = 135) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = imgElement.naturalWidth || imgElement.width
  canvas.height = imgElement.naturalHeight || imgElement.height

  ctx.drawImage(imgElement, 0, 0)
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imgData.data

  for (let i = 0; i < data.length; i += 4) {
    // Luminancia estándar NTSC
    const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    const valor = luma < threshold ? 0 : 255
    data[i] = valor
    data[i + 1] = valor
    data[i + 2] = valor
  }

  ctx.putImageData(imgData, 0, 0)
  return canvas.toDataURL('image/png')
}

/**
 * Genera un canvas con Trama de Semitonos (Halftone / Screentone Manga tradicional)
 */
function procesarHalftoneScreentone(imgElement, dotSize = 6) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const w = imgElement.naturalWidth || imgElement.width
  const h = imgElement.naturalHeight || imgElement.height
  canvas.width = w
  canvas.height = h

  // Dibujar fondo blanco de papel
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, w, h)

  // Obtener datos de la imagen original
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = w
  tempCanvas.height = h
  const tempCtx = tempCanvas.getContext('2d')
  tempCtx.drawImage(imgElement, 0, 0)
  const imgData = tempCtx.getImageData(0, 0, w, h).data

  ctx.fillStyle = '#000000'

  const maxRadius = dotSize / 2

  for (let y = 0; y < h; y += dotSize) {
    for (let x = 0; x < w; x += dotSize) {
      let sumaLuma = 0
      let contador = 0

      // Calcular luminosidad media del bloque
      for (let dy = 0; dy < dotSize && y + dy < h; dy++) {
        for (let dx = 0; dx < dotSize && x + dx < w; dx++) {
          const idx = ((y + dy) * w + (x + dx)) * 4
          const luma = 0.299 * imgData[idx] + 0.587 * imgData[idx + 1] + 0.114 * imgData[idx + 2]
          sumaLuma += luma
          contador++
        }
      }

      const mediaLuma = sumaLuma / (contador || 1)
      // Oscuridad normalizada (0 = blanco, 1 = negro puro)
      const oscuridad = 1 - (mediaLuma / 255)

      if (oscuridad > 0.08) {
        const radius = oscuridad * maxRadius
        ctx.beginPath()
        ctx.arc(x + dotSize / 2, y + dotSize / 2, radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  return canvas.toDataURL('image/png')
}

/**
 * Genera un canvas con filtro Sepia Vintage para flashbacks y memorias
 */
function procesarSepia(imgElement) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const w = imgElement.naturalWidth || imgElement.width
  const h = imgElement.naturalHeight || imgElement.height
  canvas.width = w
  canvas.height = h

  ctx.drawImage(imgElement, 0, 0)
  const imgData = ctx.getImageData(0, 0, w, h)
  const data = imgData.data

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    data[i]     = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189))
    data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168))
    data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131))
  }

  ctx.putImageData(imgData, 0, 0)
  return canvas.toDataURL('image/png')
}

/**
 * Genera un canvas con inversión de color (Negativo manga)
 */
function procesarInvertir(imgElement) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const w = imgElement.naturalWidth || imgElement.width
  const h = imgElement.naturalHeight || imgElement.height
  canvas.width = w
  canvas.height = h

  ctx.drawImage(imgElement, 0, 0)
  const imgData = ctx.getImageData(0, 0, w, h)
  const data = imgData.data

  for (let i = 0; i < data.length; i += 4) {
    data[i]     = 255 - data[i]
    data[i + 1] = 255 - data[i + 1]
    data[i + 2] = 255 - data[i + 2]
  }

  ctx.putImageData(imgData, 0, 0)
  return canvas.toDataURL('image/png')
}

/**
 * Aplica un filtro manga a un objeto fabric.Image
 */
export async function aplicarFiltroManga(fabricImage, tipoFiltro, onTerminado = null) {
  if (!fabricImage || fabricImage.type !== 'image') return false

  const imgElement = fabricImage.getElement()
  if (!imgElement) return false

  // Respaldar la imagen original si no ha sido respaldada
  if (!fabricImage.data) fabricImage.data = {}
  if (!fabricImage.data.srcOriginal) {
    fabricImage.data.srcOriginal = imgElement.src
  }

  let nuevoDataUrl = null

  if (tipoFiltro === 'ink_bw') {
    nuevoDataUrl = procesarLineartBw(imgElement)
  } else if (tipoFiltro === 'halftone') {
    nuevoDataUrl = procesarHalftoneScreentone(imgElement, 6)
  } else if (tipoFiltro === 'sepia') {
    nuevoDataUrl = procesarSepia(imgElement)
  } else if (tipoFiltro === 'invert') {
    nuevoDataUrl = procesarInvertir(imgElement)
  } else if (tipoFiltro === 'reset') {
    nuevoDataUrl = fabricImage.data.srcOriginal
  }

  if (!nuevoDataUrl) return false

  return new Promise((resolve) => {
    fabricImage.setSrc(nuevoDataUrl, () => {
      if (fabricImage.canvas) {
        fabricImage.canvas.renderAll()
      }
      if (onTerminado) onTerminado()
      resolve(true)
    })
  })
}

export default {
  aplicarFiltroManga
}
