// MangaIcon.jsx
// Componente maestro reutilizable para renderizar iconos manga de alta resolución.

import React from 'react'
import { MANGA_ICONS } from '../../assets/icons'

export default function MangaIcon({
  name,
  size = 20,
  alt,
  className = '',
  style = {},
  ...props
}) {
  const iconSrc = MANGA_ICONS[name]

  if (!iconSrc) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[MangaIcon] Icono "${name}" no encontrado en MANGA_ICONS.`)
    }
    return null
  }

  const isNumericSize = typeof size === 'number' || (!isNaN(size) && typeof size === 'string' && /^\d+$/.test(size))
  const dimensionStyles = isNumericSize
    ? { width: Number(size), height: Number(size), minWidth: Number(size), minHeight: Number(size), ...style }
    : style

  return (
    <img
      src={iconSrc}
      alt={alt || name || 'manga-icon'}
      width={isNumericSize ? Number(size) : undefined}
      height={isNumericSize ? Number(size) : undefined}
      className={`inline-block object-contain select-none pointer-events-none flex-shrink-0 ${className}`}
      style={dimensionStyles}
      loading="lazy"
      draggable={false}
      {...props}
    />
  )
}
