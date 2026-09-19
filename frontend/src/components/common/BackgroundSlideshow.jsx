// BackgroundSlideshow.jsx
// Slideshow animado aleatorio para fondos de pantalla con cross-fade suave (1000ms) y ciclo de 17 segundos.

import { useState, useEffect } from 'react'

// Carga dinámica automática de todas las ilustraciones de fondo como fallback
const modulosFondos = import.meta.glob('../../assets/fondo_login_*.png', { eager: true, query: '?url', import: 'default' })
const FONDOS_DEFAULT = Object.values(modulosFondos)

export default function BackgroundSlideshow({
  imagenes = [],
  images = [],
  intervalo = 17000,
  overlayClassName = '',
}) {
  const listaRaw = (imagenes && imagenes.length > 0) ? imagenes : images
  const listaImagenes = (listaRaw && listaRaw.length > 0) ? listaRaw : FONDOS_DEFAULT

  // 1. Estado inicial aleatorio (randomizado)
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (!listaImagenes || listaImagenes.length === 0) return 0
    return Math.floor(Math.random() * listaImagenes.length)
  })

  // 2. Rotación continua aleatoria sin repetir la imagen inmediatamente anterior
  useEffect(() => {
    if (!listaImagenes || listaImagenes.length <= 1) return

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        let nextIndex
        do {
          nextIndex = Math.floor(Math.random() * listaImagenes.length)
        } while (nextIndex === prevIndex)
        return nextIndex
      })
    }, intervalo)

    return () => clearInterval(timer)
  }, [listaImagenes, intervalo])

  if (!listaImagenes || listaImagenes.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0">
      {listaImagenes.map((imgSrc, index) => (
        <div
          key={imgSrc + index}
          className={`absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
            index === currentIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{ backgroundImage: `url(${imgSrc})` }}
        />
      ))}
      {overlayClassName && (
        <div className={`absolute inset-0 ${overlayClassName}`} />
      )}
    </div>
  )
}
