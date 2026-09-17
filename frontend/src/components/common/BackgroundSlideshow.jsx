// BackgroundSlideshow.jsx
// Slideshow animado para fondos de pantalla con transiciones suaves de opacidad (Tailwind).

import { useState, useEffect } from 'react'

export default function BackgroundSlideshow({
  imagenes = [],
  images = [],
  intervalo = 5000,
  overlayClassName = 'bg-black/50',
}) {
  const listaImagenes = (imagenes && imagenes.length > 0) ? imagenes : images
  const [indiceActivo, setIndiceActivo] = useState(0)

  useEffect(() => {
    if (!listaImagenes || listaImagenes.length <= 1) return

    const timer = setInterval(() => {
      setIndiceActivo((prev) => (prev + 1) % listaImagenes.length)
    }, intervalo)

    return () => clearInterval(timer)
  }, [listaImagenes, intervalo])

  if (!listaImagenes || listaImagenes.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 select-none">
      {listaImagenes.map((url, idx) => (
        <img
          key={url || idx}
          src={url}
          alt={`Background Slide ${idx + 1}`}
          className={`absolute inset-0 object-cover w-full h-full -z-10 transition-opacity duration-1000 ease-in-out ${
            idx === indiceActivo ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          }`}
          style={{ willChange: 'opacity, transform' }}
        />
      ))}
      {overlayClassName && (
        <div className={`absolute inset-0 ${overlayClassName}`} />
      )}
    </div>
  )
}
