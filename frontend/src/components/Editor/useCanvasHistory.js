// useCanvasHistory.js
// Stack en memoria de alto rendimiento para Deshacer / Rehacer (Undo / Redo) en Fabric.js con límite configurable.

import { useRef, useCallback, useState } from 'react'

const MAX_HISTORIAL = 30
const PROPIEDADES_CUSTOM = [
  'data',
  'id',
  'name',
  'tipo',
  'locked',
  'clipPath',
  'selectable',
  'evented',
  'visible',
  'hasControls',
  'lockMovementX',
  'lockMovementY',
  'lockScalingX',
  'lockScalingY',
  'lockRotation'
]

export default function useCanvasHistory(maxEstados = MAX_HISTORIAL) {
  const stackRef = useRef([])
  const indexRef = useRef(-1)
  const isPerformingActionRef = useRef(false)

  const [estadoHistorial, setEstadoHistorial] = useState({
    puedeDeshacer: false,
    puedeRehacer: false,
    longitud: 0,
    indice: -1
  })

  const actualizarEstadoUI = useCallback(() => {
    setEstadoHistorial({
      puedeDeshacer: indexRef.current > 0,
      puedeRehacer: indexRef.current < stackRef.current.length - 1,
      longitud: stackRef.current.length,
      indice: indexRef.current
    })
  }, [])

  /**
   * Guarda el estado JSON actual del canvas en el stack de memoria
   */
  const guardarEstado = useCallback((canvas) => {
    if (!canvas || isPerformingActionRef.current) return

    try {
      const jsonActual = JSON.stringify(canvas.toJSON(PROPIEDADES_CUSTOM))

      // Evitar guardar estados duplicados consecutivos
      if (
        indexRef.current >= 0 &&
        stackRef.current[indexRef.current] === jsonActual
      ) {
        return
      }

      // Eliminar historial futuro si se realiza una acción después de hacer undo
      if (indexRef.current < stackRef.current.length - 1) {
        stackRef.current = stackRef.current.slice(0, indexRef.current + 1)
      }

      // Añadir nuevo estado
      stackRef.current.push(jsonActual)

      // Limitar tamaño máximo del stack para optimizar memoria RAM
      if (stackRef.current.length > maxEstados) {
        stackRef.current.shift()
      } else {
        indexRef.current += 1
      }

      actualizarEstadoUI()
    } catch (err) {
      console.warn('Error al capturar estado en el historial del canvas:', err)
    }
  }, [maxEstados, actualizarEstadoUI])

  /**
   * Deshacer (Undo): retrocede un paso en el stack de estados
   */
  const deshacer = useCallback((canvas, onCompletado = null) => {
    if (!canvas || indexRef.current <= 0) return

    isPerformingActionRef.current = true
    indexRef.current -= 1
    const jsonAnterior = stackRef.current[indexRef.current]

    canvas.loadFromJSON(jsonAnterior, () => {
      canvas.renderAll()
      isPerformingActionRef.current = false
      actualizarEstadoUI()
      if (onCompletado) onCompletado()
    })
  }, [actualizarEstadoUI])

  /**
   * Rehacer (Redo): avanza un paso en el stack de estados
   */
  const rehacer = useCallback((canvas, onCompletado = null) => {
    if (!canvas || indexRef.current >= stackRef.current.length - 1) return

    isPerformingActionRef.current = true
    indexRef.current += 1
    const jsonSiguiente = stackRef.current[indexRef.current]

    canvas.loadFromJSON(jsonSiguiente, () => {
      canvas.renderAll()
      isPerformingActionRef.current = false
      actualizarEstadoUI()
      if (onCompletado) onCompletado()
    })
  }, [actualizarEstadoUI])

  /**
   * Reinicia el historial con un estado inicial
   */
  const reiniciarHistorial = useCallback((canvas) => {
    if (!canvas) {
      stackRef.current = []
      indexRef.current = -1
      actualizarEstadoUI()
      return
    }

    try {
      const jsonInicial = JSON.stringify(canvas.toJSON(PROPIEDADES_CUSTOM))
      stackRef.current = [jsonInicial]
      indexRef.current = 0
      actualizarEstadoUI()
    } catch {
      stackRef.current = []
      indexRef.current = -1
      actualizarEstadoUI()
    }
  }, [actualizarEstadoUI])

  return {
    guardarEstado,
    deshacer,
    rehacer,
    reiniciarHistorial,
    puedeDeshacer: estadoHistorial.puedeDeshacer,
    puedeRehacer: estadoHistorial.puedeRehacer,
    longitudHistorial: estadoHistorial.longitud,
    indiceHistorial: estadoHistorial.indice,
    PROPIEDADES_CUSTOM
  }
}
