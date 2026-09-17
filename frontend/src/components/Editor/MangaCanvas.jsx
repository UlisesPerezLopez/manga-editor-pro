// MangaCanvas.jsx
// Canvas interactivo del editor de manga usando Fabric.js v5 con capas, historial, snapping y filtros.

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { fabric } from 'fabric'
import { CANVAS_DIMENSIONES, PLANTILLAS } from './PageTemplates'
import useCanvasHistory from './useCanvasHistory'
import { procesarSnapping, limpiarGuias, CONFIG_SNAPPING_DEFAULT } from './canvasSnapping'

const { width: CANVAS_W, height: CANVAS_H } = CANVAS_DIMENSIONES

// Colores de borde para los diferentes tipos de objetos
const COLORES = {
  vineta:                '#444444',
  bocadillo_dialogo:     '#4A90E2',
  bocadillo_pensamiento: '#9B59B6',
  bocadillo_narracion:   '#27AE60',
  texto:                 '#F0F0F0',
}

const MangaCanvas = forwardRef(function MangaCanvas({
  paginaActiva,
  herramientaActiva,
  onGuardar,
  onHistorialCambio,
  onVinetaSeleccionada = null,
  snappingConfig = CONFIG_SNAPPING_DEFAULT,
}, canvasRef) { 

  const elementoCanvasRef = useRef(null) 
  const fabricRef = useRef(null)
  const snappingConfigRef = useRef(snappingConfig)
  const guardadoTimerRef = useRef(null)
  const [zoom, setZoom] = useState(1)

  // Hook dedicado de historial
  const {
    guardarEstado,
    deshacer: historyUndo,
    rehacer: historyRedo,
    reiniciarHistorial,
    puedeDeshacer,
    puedeRehacer
  } = useCanvasHistory(30)

  useEffect(() => {
    snappingConfigRef.current = snappingConfig
  }, [snappingConfig])

  useEffect(() => {
    onHistorialCambio?.({ puedeDeshacer, puedeRehacer })
  }, [puedeDeshacer, puedeRehacer, onHistorialCambio])

  // ─── INICIALIZAR FABRIC.JS ──────────────────────────────────────────────

  useEffect(() => {
    if (!elementoCanvasRef.current) return 

    const canvas = new fabric.Canvas(elementoCanvasRef.current, { 
      width: CANVAS_W,
      height: CANVAS_H,
      backgroundColor: '#FFFFFF',
      selection: true,
      preserveObjectStacking: true,
    })

    fabricRef.current = canvas

    // Guardar estado inicial en historial
    reiniciarHistorial(canvas)

    // Evento: cambios en el canvas
    const alModificar = () => {
      limpiarGuias(canvas)
      guardarEstado(canvas)
    }

    canvas.on('object:modified', alModificar)
    canvas.on('object:added', (e) => {
      if (!e.target?.data?.esGuiaAlineacion) {
        guardarEstado(canvas)
      }
    })
    canvas.on('object:removed', (e) => {
      if (!e.target?.data?.esGuiaAlineacion) {
        guardarEstado(canvas)
      }
    })

    // Snapping y Guías durante movimiento
    canvas.on('object:moving', (e) => {
      if (snappingConfigRef.current) {
        procesarSnapping(canvas, e.target, snappingConfigRef.current)
      }
    })

    canvas.on('mouse:up', () => {
      limpiarGuias(canvas)
    })

    // Listener para notificar al padre qué viñeta está seleccionada
    const comprobarSeleccion = (e) => {
      const obj = e.selected?.[0]
      const tipoObjeto = obj?.data?.tipo || obj?.tipo
      
      if (obj && (tipoObjeto === 'vineta' || obj.type === 'rect') && onVinetaSeleccionada) {
        onVinetaSeleccionada(obj)
      } else if (onVinetaSeleccionada) {
        onVinetaSeleccionada(null)
      }
    }

    canvas.on('selection:created', comprobarSeleccion)
    canvas.on('selection:updated', comprobarSeleccion)
    canvas.on('selection:cleared', () => {
      limpiarGuias(canvas)
      if (onVinetaSeleccionada) onVinetaSeleccionada(null)
    })

    // Atajos de teclado
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        _eliminarSeleccion()
      }
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        historyUndo(canvas)
      }
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'Z')) {
        e.preventDefault()
        historyRedo(canvas)
      }
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      canvas.dispose()
      document.removeEventListener('keydown', handleKeyDown)
      if (guardadoTimerRef.current) clearInterval(guardadoTimerRef.current)
    }
  }, [])

  // ─── CARGAR CANVAS GUARDADO ─────────────────────────────────────────────

  useEffect(() => {
    if (!fabricRef.current) return

    const canvas = fabricRef.current
    canvas.clear()
    canvas.backgroundColor = '#FFFFFF'

    if (paginaActiva?.canvas_json) {
      // Cargar canvas guardado
      canvas.loadFromJSON(paginaActiva.canvas_json, () => {
        canvas.renderAll()
        reiniciarHistorial(canvas)
      })
    } else {
      // Página nueva: aplicar plantilla si tiene una
      const plantillaId = paginaActiva?.layout_template || 'blank'
      const plantilla = PLANTILLAS[plantillaId]
      if (plantilla && plantillaId !== 'blank') {
        _aplicarPlantilla(plantilla)
      }
      canvas.renderAll()
      reiniciarHistorial(canvas)
    }

    // Iniciar guardado automático cada 30 segundos
    if (guardadoTimerRef.current) clearInterval(guardadoTimerRef.current)
    if (paginaActiva) {
      guardadoTimerRef.current = setInterval(() => {
        _guardarAhora()
      }, 30000)
    }
  }, [paginaActiva?.id])

  // ─── CAMBIAR HERRAMIENTA ────────────────────────────────────────────────

  useEffect(() => {
    if (!fabricRef.current) return
    const canvas = fabricRef.current

    if (herramientaActiva === 'seleccionar') {
      canvas.isDrawingMode = false
      canvas.defaultCursor = 'default'
      canvas.selection = true
      return
    }

    if (herramientaActiva === 'pincel') {
      canvas.isDrawingMode = true
      canvas.selection = false
      if (!canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas)
      }
      canvas.freeDrawingBrush.color = '#111111'
      canvas.freeDrawingBrush.width = 3
      return () => {
        canvas.isDrawingMode = false
      }
    }

    // Herramientas de inserción (viñeta, bocadillos, texto)
    canvas.isDrawingMode = false
    canvas.defaultCursor = 'crosshair'
    canvas.selection = false

    let origenX = 0, origenY = 0
    let objetoTemp = null
    let dibujando = false

    const onMouseDown = (opt) => {
      if (opt.target) return  // Click sobre objeto existente
      const pointer = canvas.getPointer(opt.e)
      origenX = pointer.x
      origenY = pointer.y
      dibujando = true

      if (herramientaActiva === 'vineta') {
        objetoTemp = new fabric.Rect({
          left: origenX, top: origenY,
          width: 1, height: 1,
          fill: 'transparent',
          stroke: COLORES.vineta,
          strokeWidth: 2,
          selectable: true,
          hasControls: true,
          data: { tipo: 'vineta' }
        })
        canvas.add(objetoTemp)
      }
    }

    const onMouseMove = (opt) => {
      if (!dibujando || !objetoTemp) return
      const pointer = canvas.getPointer(opt.e)

      if (herramientaActiva === 'vineta') {
        const w = Math.abs(pointer.x - origenX)
        const h = Math.abs(pointer.y - origenY)
        objetoTemp.set({
          left: Math.min(pointer.x, origenX),
          top: Math.min(pointer.y, origenY),
          width: w < 10 ? 10 : w,
          height: h < 10 ? 10 : h,
        })
        canvas.renderAll()
      }
    }

    const onMouseUp = (opt) => {
      if (!dibujando) return
      dibujando = false

      if (herramientaActiva !== 'vineta' && herramientaActiva !== 'seleccionar') {
        const pointer = canvas.getPointer(opt.e)
        _crearElementoEn(pointer.x, pointer.y, herramientaActiva)
      }

      if (objetoTemp) {
        if (objetoTemp.width < 20 || objetoTemp.height < 20) {
          canvas.remove(objetoTemp)
        } else {
          canvas.setActiveObject(objetoTemp)
        }
      }

      objetoTemp = null
    }

    canvas.on('mouse:down', onMouseDown)
    canvas.on('mouse:move', onMouseMove)
    canvas.on('mouse:up', onMouseUp)

    return () => {
      canvas.off('mouse:down', onMouseDown)
      canvas.off('mouse:move', onMouseMove)
      canvas.off('mouse:up', onMouseUp)
    }
  }, [herramientaActiva])

  // ─── FUNCIONES INTERNAS ─────────────────────────────────────────────────

  const _crearElementoEn = (x, y, tipo) => {
    const canvas = fabricRef.current
    if (!canvas) return

    if (tipo === 'texto') {
      const texto = new fabric.IText('Escribe aquí', {
        left: x - 60, top: y - 15,
        fontSize: 14,
        fill: '#1A1A1A',
        fontFamily: 'Arial',
        editable: true,
        selectable: true,
        data: { tipo: 'texto' }
      })
      canvas.add(texto)
      canvas.setActiveObject(texto)
      texto.enterEditing()
      canvas.renderAll()
      return
    }

    // Bocadillos
    const ancho = 160
    const alto = 70
    const izq = x - ancho / 2
    const arr = y - alto / 2

    let bocadillo

    if (tipo === 'bocadillo_dialogo') {
      // Elipse con borde azul
      bocadillo = new fabric.Group([
        new fabric.Ellipse({
          rx: ancho / 2, ry: alto / 2,
          fill: 'white',
          stroke: COLORES.bocadillo_dialogo,
          strokeWidth: 2,
          originX: 'center', originY: 'center',
        }),
        new fabric.IText('—Diálogo—', {
          fontSize: 12,
          fill: '#1A1A1A',
          fontFamily: 'Arial',
          originX: 'center', originY: 'center',
          textAlign: 'center',
        })
      ], {
        left: izq, top: arr,
        selectable: true,
        data: { tipo: 'bocadillo_dialogo' }
      })

    } else if (tipo === 'bocadillo_pensamiento') {
      bocadillo = new fabric.Group([
        new fabric.Ellipse({
          rx: ancho / 2, ry: alto / 2,
          fill: 'white',
          stroke: COLORES.bocadillo_pensamiento,
          strokeWidth: 2,
          strokeDashArray: [5, 3],
          originX: 'center', originY: 'center',
        }),
        new fabric.IText('...pensamiento...', {
          fontSize: 11,
          fill: '#555555',
          fontFamily: 'Arial',
          fontStyle: 'italic',
          originX: 'center', originY: 'center',
          textAlign: 'center',
        })
      ], {
        left: izq, top: arr,
        selectable: true,
        data: { tipo: 'bocadillo_pensamiento' }
      })

    } else if (tipo === 'bocadillo_narracion') {
      bocadillo = new fabric.Group([
        new fabric.Rect({
          width: ancho, height: alto,
          fill: '#F8F8F0',
          stroke: COLORES.bocadillo_narracion,
          strokeWidth: 2,
          rx: 4, ry: 4,
          originX: 'center', originY: 'center',
        }),
        new fabric.IText('Narración...', {
          fontSize: 11,
          fill: '#1A1A1A',
          fontFamily: 'Arial',
          originX: 'center', originY: 'center',
          textAlign: 'center',
        })
      ], {
        left: izq, top: arr,
        selectable: true,
        data: { tipo: 'bocadillo_narracion' }
      })
    }

    if (bocadillo) {
      canvas.add(bocadillo)
      canvas.setActiveObject(bocadillo)
      canvas.renderAll()
    }
  }

  const _aplicarPlantilla = (plantilla) => {
    const canvas = fabricRef.current
    if (!canvas) return

    const vinetas = plantilla.generarVinetas()
    vinetas.forEach(v => {
      const rect = new fabric.Rect({
        left: v.left, top: v.top,
        width: v.width, height: v.height,
        fill: 'transparent',
        stroke: '#333333',
        strokeWidth: 2,
        selectable: true,
        data: { tipo: 'vineta' }
      })
      canvas.add(rect)
    })
    canvas.renderAll()
  }

  const _eliminarSeleccion = () => {
    const canvas = fabricRef.current
    if (!canvas) return
    const activos = canvas.getActiveObjects()
    activos.forEach(obj => canvas.remove(obj))
    canvas.discardActiveObject()
    canvas.renderAll()
    guardarEstado(canvas)
  }

  const _guardarAhora = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas || !paginaActiva) return
    const json = JSON.stringify(canvas.toJSON(['data', 'tipo', 'nombre', 'srcOriginal']))
    onGuardar?.(json)
  }, [paginaActiva, onGuardar])

  const aplicarPlantillaExterna = (plantilla) => {
    const canvas = fabricRef.current
    if (!canvas) return
    if (!confirm('¿Aplicar plantilla? Se borrarán los elementos actuales.')) return
    canvas.clear()
    canvas.backgroundColor = '#FFFFFF'
    _aplicarPlantilla(plantilla)
    reiniciarHistorial(canvas)
  }

  // Exponer métodos al componente padre via ref
  useImperativeHandle(canvasRef, () => ({
    getFabricCanvas: () => fabricRef.current,
    getCanvasJSON: () => {
      const canvas = fabricRef.current
      if (!canvas) return null
      return canvas.toJSON(['data', 'tipo', 'nombre', 'srcOriginal'])
    },
    deshacer: () => {
      if (fabricRef.current) historyUndo(fabricRef.current)
    },
    rehacer: () => {
      if (fabricRef.current) historyRedo(fabricRef.current)
    },
    eliminarSeleccion: _eliminarSeleccion,
    limpiar: () => {
      const canvas = fabricRef.current
      if (!canvas) return
      if (!confirm('¿Limpiar todo el lienzo?')) return
      canvas.clear()
      canvas.backgroundColor = '#FFFFFF'
      canvas.renderAll()
      guardarEstado(canvas)
    },
    guardarAhora: _guardarAhora,
    aplicarPlantilla: aplicarPlantillaExterna,

    // Exportar el canvas como dataURL PNG en alta resolución sin controles de selección
    exportCanvas: (multiplier = 1) => {
      const canvas = fabricRef.current
      if (!canvas) return null
      const activo = canvas.getActiveObject()
      canvas.discardActiveObject()
      canvas.renderAll()
      const dataUrl = canvas.toDataURL({
        format: 'png',
        multiplier: multiplier || 1,
        quality: 1,
      })
      if (activo) {
        canvas.setActiveObject(activo)
        canvas.renderAll()
      }
      return dataUrl
    },

    insertarImagenEnVineta: async (imagenSrc, tipo = 'url') => {
      const canvas = fabricRef.current
      if (!canvas) return

      const vinetaActiva = canvas.getActiveObject()
      if (!vinetaActiva) return

      return new Promise((resolve, reject) => {
        fabric.Image.fromURL(
          imagenSrc,
          (img) => {
            if (!img) {
              reject(new Error('No se pudo cargar la imagen'))
              return
            }

            // Escalar la imagen para que llene la viñeta
            const scaleX = vinetaActiva.width  / img.width
            const scaleY = vinetaActiva.height / img.height
            const scale  = Math.max(scaleX, scaleY)

            img.set({
              left:    vinetaActiva.left,
              top:     vinetaActiva.top,
              scaleX:  scale,
              scaleY:  scale,
              clipPath: new fabric.Rect({
                left:   vinetaActiva.left,
                top:    vinetaActiva.top,
                width:  vinetaActiva.width,
                height: vinetaActiva.height,
                absolutePositioned: true
              }),
              selectable: true,
              tipo: 'imagen_generada',
              data: {
                tipo: 'imagen_generada',
                nombre: 'Arte IA Viñeta',
                srcOriginal: imagenSrc
              }
            })

            canvas.add(img)
            canvas.sendToBack(img)
            canvas.renderAll()
            guardarEstado(canvas)
            resolve()
          },
          { crossOrigin: 'anonymous' }
        )
      })
    },
  }))

  return (
    <div className="flex items-center justify-center w-full h-full
                    bg-rdc-primary overflow-auto p-4">
      <div
        style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
        className="shadow-2xl"
      >
        <canvas ref={elementoCanvasRef} />
      </div>
    </div>
  )
})

export default MangaCanvas