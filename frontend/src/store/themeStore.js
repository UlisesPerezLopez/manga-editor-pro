// themeStore.js
// Store global de gestión de temas artísticos en MEP — Manga Editor Pro.
// Modos:
// - 'ghibli': Modo Día ("Ghibli Meadow & Sky")
// - 'seiya': Modo Noche ("Sanctuary & Cosmos - Saint Seiya")

import { create } from 'zustand'

export const TEMAS = {
  GHIBLI: 'ghibli', // Día
  SEIYA: 'seiya',   // Noche
}

export const CLAVE_LOCALSTORAGE_TEMA = 'mep_theme'

export const aplicarTemaDOM = (tema) => {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  root.classList.remove('theme-ghibli', 'theme-seiya', 'dark')

  if (tema === TEMAS.GHIBLI) {
    root.classList.add('theme-ghibli')
    root.setAttribute('data-theme', 'ghibli')
    root.style.colorScheme = 'light'
  } else {
    root.classList.add('theme-seiya', 'dark')
    root.setAttribute('data-theme', 'seiya')
    root.style.colorScheme = 'dark'
  }
}

const obtenerTemaInicial = () => {
  if (typeof window === 'undefined') return TEMAS.SEIYA

  const guardado = localStorage.getItem(CLAVE_LOCALSTORAGE_TEMA)
  if (guardado === TEMAS.GHIBLI || guardado === TEMAS.SEIYA) {
    return guardado
  }

  // Detección por preferencia de sistema
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return TEMAS.GHIBLI
  }

  return TEMAS.SEIYA
}

const temaInicial = obtenerTemaInicial()
aplicarTemaDOM(temaInicial)

export const useThemeStore = create((set, get) => ({
  tema: temaInicial,

  setTema: (nuevoTema) => {
    if (nuevoTema !== TEMAS.GHIBLI && nuevoTema !== TEMAS.SEIYA) return
    localStorage.setItem(CLAVE_LOCALSTORAGE_TEMA, nuevoTema)
    aplicarTemaDOM(nuevoTema)
    set({ tema: nuevoTema })
  },

  toggleTema: () => {
    const actual = get().tema
    const nuevo = actual === TEMAS.GHIBLI ? TEMAS.SEIYA : TEMAS.GHIBLI
    localStorage.setItem(CLAVE_LOCALSTORAGE_TEMA, nuevo)
    aplicarTemaDOM(nuevo)
    set({ tema: nuevo })
  },
}))

export default useThemeStore
