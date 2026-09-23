// fontLoader.js
// Cargador dinámico de Google Fonts y fuentes locales (.ttf, .otf, .woff2) para Canvas Fabric.js

export const CATALOGO_FUENTES = [
  // Cómic / Humor
  { id: 'Comic Relief', name: 'Comic Relief', categoria: 'comic', origen: 'local', fallback: 'cursive' },
  { id: 'Bangers', name: 'Bangers', categoria: 'comic', origen: 'google', fallback: 'impact, cursive' },
  { id: 'Comic Neue', name: 'Comic Neue', categoria: 'comic', origen: 'google', fallback: 'cursive, sans-serif' },
  { id: 'Luckiest Guy', name: 'Luckiest Guy', categoria: 'comic', origen: 'google', fallback: 'impact, cursive' },
  { id: 'Permanent Marker', name: 'Permanent Marker', categoria: 'comic', origen: 'google', fallback: 'cursive' },
  { id: 'Boogaloo', name: 'Boogaloo', categoria: 'comic', origen: 'google', fallback: 'cursive' },
  { id: 'Bungee', name: 'Bungee', categoria: 'comic', origen: 'google', fallback: 'impact, sans-serif' },
  { id: 'Chewy', name: 'Chewy', categoria: 'comic', origen: 'google', fallback: 'cursive' },
  { id: 'Chango', name: 'Chango', categoria: 'comic', origen: 'local', fallback: 'cursive' },

  // Histórico / Épico / Clásico (específico para "Raíces de Ceniza")
  { id: 'Cinzel', name: 'Cinzel', categoria: 'historico', origen: 'google', fallback: 'serif' },
  { id: 'Cinzel Decorative', name: 'Cinzel Decorative', categoria: 'historico', origen: 'google', fallback: 'serif' },
  { id: 'MedievalSharp', name: 'MedievalSharp', categoria: 'historico', origen: 'google', fallback: 'cursive, serif' },
  { id: 'Almendra', name: 'Almendra', categoria: 'historico', origen: 'google', fallback: 'serif' },
  { id: 'Pirata One', name: 'Pirata One', categoria: 'historico', origen: 'google', fallback: 'serif' },
  { id: 'IM Fell English', name: 'IM Fell English', categoria: 'historico', origen: 'google', fallback: 'serif' },
  { id: 'UnifrakturMaguntia', name: 'UnifrakturMaguntia', categoria: 'historico', origen: 'google', fallback: 'serif' },

  // Diálogo / Manuscrito
  { id: 'Patrick Hand', name: 'Patrick Hand', categoria: 'dialogo', origen: 'google', fallback: 'cursive' },
  { id: 'Short Stack', name: 'Short Stack', categoria: 'dialogo', origen: 'google', fallback: 'cursive' },
  { id: 'Kalam', name: 'Kalam', categoria: 'dialogo', origen: 'google', fallback: 'cursive' },
  { id: 'Caveat', name: 'Caveat', categoria: 'dialogo', origen: 'google', fallback: 'cursive' },
  { id: 'Gochi Hand', name: 'Gochi Hand', categoria: 'dialogo', origen: 'google', fallback: 'cursive' },
  { id: 'Indie Flower', name: 'Indie Flower', categoria: 'dialogo', origen: 'google', fallback: 'cursive' },

  // Narración / Cartelas
  { id: 'Oswald', name: 'Oswald', categoria: 'narracion', origen: 'google', fallback: 'sans-serif' },
  { id: 'Special Elite', name: 'Special Elite', categoria: 'narracion', origen: 'google', fallback: 'monospace, cursive' },
  { id: 'Playfair Display', name: 'Playfair Display', categoria: 'narracion', origen: 'google', fallback: 'serif' },
  { id: 'Merriweather', name: 'Merriweather', categoria: 'narracion', origen: 'google', fallback: 'serif' },
  { id: 'Anton', name: 'Anton', categoria: 'narracion', origen: 'google', fallback: 'impact, sans-serif' },
  { id: 'Arial', name: 'Arial', categoria: 'narracion', origen: 'system', fallback: 'sans-serif' },
]

export const CATEGORIAS_FUENTES = [
  { id: 'todas', label: 'Todas las Fuentes' },
  { id: 'comic', label: '💥 Cómic & Humor' },
  { id: 'historico', label: '⚔️ Histórico & Épico' },
  { id: 'dialogo', label: '💬 Diálogo & Manuscrito' },
  { id: 'narracion', label: '📜 Cartelas & Narración' },
  { id: 'subidas', label: '📁 Fuentes del Documento' },
]

// Caché en memoria de fuentes cargadas
const fuentesCargadas = new Set(['Arial', 'Comic Relief', 'Bangers', 'Comic Neue', 'Oswald', 'Chango'])

/**
 * Carga dinámicamente una Google Font en el DOM y espera a que esté lista en document.fonts
 */
export async function cargarGoogleFont(nombreFuente) {
  if (!nombreFuente || fuentesCargadas.has(nombreFuente)) return true

  try {
    const linkId = `gfont-${nombreFuente.replace(/\s+/g, '-').toLowerCase()}`
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link')
      link.id = linkId
      link.rel = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(nombreFuente)}:ital,wght@0,400;0,700;1,400;1,700&display=swap`
      document.head.appendChild(link)
    }

    if (document.fonts?.load) {
      await document.fonts.load(`16px "${nombreFuente}"`)
    }
    fuentesCargadas.add(nombreFuente)
    return true
  } catch (err) {
    console.warn(`[FontLoader] Error al cargar fuente de Google: ${nombreFuente}`, err)
    return false
  }
}

/**
 * Carga un archivo de fuente local (.ttf, .otf, .woff2) usando el API nativo FontFace
 */
export async function cargarFuenteArchivo(archivo) {
  if (!archivo) throw new Error('Archivo inválido')

  const nombreLimpio = archivo.name.replace(/\.[^/.]+$/, '').trim()
  const buffer = await archivo.arrayBuffer()

  const fontFace = new FontFace(nombreLimpio, buffer)
  const loadedFace = await fontFace.load()
  document.fonts.add(loadedFace)

  fuentesCargadas.add(nombreLimpio)

  return {
    id: nombreLimpio,
    name: nombreLimpio,
    categoria: 'subidas',
    origen: 'local-upload',
    fallback: 'sans-serif'
  }
}
