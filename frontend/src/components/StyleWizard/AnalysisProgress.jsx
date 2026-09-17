// AnalysisProgress.jsx
// Muestra el progreso del análisis de imágenes con Gemini Vision.
// Simula pasos visuales mientras el backend procesa.

import { useState, useEffect } from 'react'

const PASOS = [
  { emoji: '📤', texto: 'Enviando imágenes a Gemini Vision...' },
  { emoji: '🎨', texto: 'Extrayendo paleta de colores...' },
  { emoji: '✏️', texto: 'Analizando técnica de línea y sombreado...' },
  { emoji: '👤', texto: 'Detectando proporciones y estilo de personajes...' },
  { emoji: '🧠', texto: 'Consolidando el perfil visual...' },
  { emoji: '⚗️', texto: 'Generando el System Prompt Maestro...' },
  { emoji: '✅', texto: 'Firma Visual casi lista...' },
]

export default function AnalysisProgress({ numImagenes }) {
  const [pasoActual, setPasoActual] = useState(0)

  useEffect(() => {
    // Avanzar un paso cada ~8 segundos (el análisis tarda 30-90s)
    const intervalo = setInterval(() => {
      setPasoActual(prev => {
        if (prev < PASOS.length - 1) return prev + 1
        return prev
      })
    }, 8000)

    return () => clearInterval(intervalo)
  }, [])

  return (
    <div className="py-6 space-y-6">
      {/* Animación central */}
      <div className="text-center">
        <div className="text-5xl mb-4 animate-pulse-soft">
          {PASOS[pasoActual].emoji}
        </div>
        <p className="font-titulo text-lg text-rdc-text font-semibold">
          Analizando tu estilo...
        </p>
        <p className="text-rdc-muted text-sm mt-1">
          Procesando {numImagenes} imagen{numImagenes !== 1 ? 'es' : ''} con Gemini Vision
        </p>
      </div>

      {/* Barra de progreso */}
      <div className="bg-rdc-card rounded-full h-2">
        <div
          className="bg-rdc-accent h-2 rounded-full transition-all duration-1000"
          style={{ width: `${((pasoActual + 1) / PASOS.length) * 100}%` }}
        />
      </div>

      {/* Lista de pasos */}
      <div className="space-y-2">
        {PASOS.map((paso, index) => (
          <div
            key={index}
            className={`flex items-center gap-3 py-2 px-3 rounded-lg
                        transition-all duration-300
                        ${index === pasoActual
                          ? 'bg-rdc-accent bg-opacity-10 border border-rdc-accent border-opacity-30'
                          : index < pasoActual
                            ? 'opacity-60'
                            : 'opacity-30'
                        }`}
          >
            <span className="text-lg">
              {index < pasoActual ? '✅' : paso.emoji}
            </span>
            <p className={`text-sm ${
              index === pasoActual ? 'text-rdc-accent font-semibold' : 'text-rdc-muted'
            }`}>
              {paso.texto}
            </p>
          </div>
        ))}
      </div>

      <p className="text-rdc-muted text-xs text-center">
        Este proceso puede tardar entre 30 y 90 segundos.
        No cierres esta ventana.
      </p>
    </div>
  )
}