// LanguageSelector.jsx
// Selector visual de idioma con banderas de FlagCDN (compatibilidad universal para Windows y Web) y dropdown estilizado para MEP (Manga Editor Pro)

import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export const IDIOMAS = [
  { codigo: 'es', flagUrl: 'https://flagcdn.com/w20/es.png', etiqueta: 'Español', corto: 'ES' },
  { codigo: 'en', flagUrl: 'https://flagcdn.com/w20/gb.png', etiqueta: 'English', corto: 'EN' },
  { codigo: 'de', flagUrl: 'https://flagcdn.com/w20/de.png', etiqueta: 'Deutsch', corto: 'DE' },
  { codigo: 'ja', flagUrl: 'https://flagcdn.com/w20/jp.png', etiqueta: '日本語', corto: 'JA' },
  { codigo: 'zh', flagUrl: 'https://flagcdn.com/w20/cn.png', etiqueta: '简体中文', corto: 'ZH' },
  { codigo: 'fr', flagUrl: 'https://flagcdn.com/w20/fr.png', etiqueta: 'Français', corto: 'FR' },
  { codigo: 'it', flagUrl: 'https://flagcdn.com/w20/it.png', etiqueta: 'Italiano', corto: 'IT' },
]

export default function LanguageSelector({ variante = 'default' }) {
  const { i18n } = useTranslation()
  const [abierto, setAbierto] = useState(false)
  const dropdownRef = useRef(null)

  const idiomaActual = IDIOMAS.find(
    (item) => item.codigo === (i18n.language?.split('-')[0]?.toLowerCase() || 'es')
  ) || IDIOMAS[0]

  const cambiarIdioma = (codigo) => {
    i18n.changeLanguage(codigo)
    setAbierto(false)
  }

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickFuera = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFuera)
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [])

  return (
    <div className="relative inline-block text-left z-50 select-none" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setAbierto((prev) => !prev)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer shadow-sm ${
          variante === 'floating' 
            ? 'bg-rdc-secondary/90 backdrop-blur-md border-rdc-border shadow-xl hover:border-rdc-accent text-rdc-text'
            : 'bg-rdc-card/80 border-rdc-border hover:border-rdc-accent text-rdc-text hover:bg-rdc-card'
        }`}
        aria-label="Seleccionar idioma"
        aria-expanded={abierto}
      >
        <img
          src={idiomaActual.flagUrl}
          alt={idiomaActual.corto}
          className="w-5 h-auto rounded-xs shadow-xs inline-block"
          loading="lazy"
        />
        <span className="font-titulo text-xs font-bold tracking-wider text-rdc-text">
          {idiomaActual.corto}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-rdc-muted transition-transform duration-200 ${
            abierto ? 'rotate-180 text-rdc-accent' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {abierto && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl bg-rdc-secondary border border-rdc-border shadow-2xl py-1.5 z-50 backdrop-blur-md bg-opacity-95 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1 text-[10px] font-titulo font-bold uppercase tracking-wider text-rdc-muted border-b border-rdc-border/60 mb-1">
            Idioma / Language
          </div>
          {IDIOMAS.map((item) => {
            const esActivo = item.codigo === idiomaActual.codigo
            return (
              <button
                key={item.codigo}
                type="button"
                onClick={() => cambiarIdioma(item.codigo)}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-titulo transition-colors text-left cursor-pointer ${
                  esActivo 
                    ? 'bg-rdc-accent/15 text-rdc-accent font-bold' 
                    : 'text-rdc-text hover:bg-rdc-card hover:text-rdc-accent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={item.flagUrl}
                    alt={item.corto}
                    className="w-5 h-auto rounded-xs shadow-xs inline-block mr-0.5"
                    loading="lazy"
                  />
                  <span className="font-medium">{item.etiqueta}</span>
                </div>
                <span className="text-[10px] font-mono text-rdc-muted uppercase">
                  {item.corto}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
