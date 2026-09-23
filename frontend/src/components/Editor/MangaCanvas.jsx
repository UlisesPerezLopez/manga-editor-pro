// MangaCanvas.jsx
// Canvas interactivo del editor de manga usando Fabric.js v5 con capas, historial, snapping y filtros.

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { fabric } from 'fabric'
import { CANVAS_DIMENSIONES, PLANTILLAS } from './PageTemplates'
import pageTemplatesData from '../../data/pageTemplates.json'
import useCanvasHistory from './useCanvasHistory'
import { procesarSnapping, limpiarGuias, CONFIG_SNAPPING_DEFAULT } from './canvasSnapping'

const { width: CANVAS_W, height: CANVAS_H } = CANVAS_DIMENSIONES

// Función auxiliar para auto-renderizar marcos de plantilla de forma atómica en Fabric.js
export const instanciarMarcosPlantilla = (canvas, plantillaKey = 'grid_4_regular') => {
  if (!canvas) return []
  const plantilla = pageTemplatesData[plantillaKey] || pageTemplatesData['grid_4_regular']
  if (!plantilla?.vinetas) return []

  const nuevosMarcos = []
  plantilla.vinetas.forEach(vin => {
    const left = Math.round(vin.x * CANVAS_W)
    const top = Math.round(vin.y * CANVAS_H)
    const width = Math.round(vin.w * CANVAS_W)
    const height = Math.round(vin.h * CANVAS_H)

    const rect = new fabric.Rect({
      left,
      top,
      width,
      height,
      fill: '#FFFFFF',
      stroke: '#000000',
      strokeWidth: 4,
      strokeUniform: true,
      selectable: true,
      hasControls: true,
      cornerColor: '#E5A93C',
      cornerStyle: 'circle',
      cornerSize: 8,
      transparentCorners: false,
      data: {
        type: 'panel',
        panelId: vin.id,
        tipo: 'vineta'
      }
    })
    canvas.add(rect)
    nuevosMarcos.push(rect)
  })

  canvas.renderAll()
  return nuevosMarcos
}

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
  plantillaActiva,
  herramientaActiva,
  onGuardar,
  onHistorialCambio,
  onVinetaSeleccionada = null,
  snappingConfig = CONFIG_SNAPPING_DEFAULT,
  zoom: zoomProp,
  onZoomChange,
}, canvasRef) { 

  const elementoCanvasRef = useRef(null) 
  const fabricRef = useRef(null)
  const snappingConfigRef = useRef(snappingConfig)
  const guardadoTimerRef = useRef(null)
  const [zoomInterno, setZoomInterno] = useState(1)
  const zoomActual = zoomProp !== undefined ? zoomProp : zoomInterno

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

    // Edición rápida de texto con doble clic en bocadillos
    const alHacerDobleClic = (e) => {
      const target = e.target
      if (target && target.type === 'group' && (target.data?.type === 'balloon' || target.data?.tipo === 'bocadillo' || target.data?.tipo?.startsWith('bocadillo'))) {
        const textObj = target.getObjects().find(o => o.type === 'i-text' || o.type === 'text')
        if (textObj) {
          const nuevoTexto = window.prompt('Editar texto del bocadillo:', textObj.text || '')
          if (nuevoTexto !== null && nuevoTexto !== undefined) {
            textObj.set('text', nuevoTexto)
            canvas.renderAll()
            guardarEstado(canvas)
          }
        }
      }
    }
    canvas.on('mouse:dblclick', alHacerDobleClic)

    // Listener para notificar al padre qué viñeta está seleccionada
    const comprobarSeleccion = (e) => {
      const obj = e.selected?.[0]
      const tipoObjeto = obj?.data?.type || obj?.data?.tipo || obj?.tipo
      
      if (obj && (tipoObjeto === 'panel' || tipoObjeto === 'vineta' || obj.type === 'rect') && onVinetaSeleccionada) {
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

  // ─── CARGAR CANVAS GUARDADO / AUTO-RENDERIZAR PLANTILLA ───────────────────

  useEffect(() => {
    if (!fabricRef.current) return

    const canvas = fabricRef.current
    canvas.clear()
    canvas.backgroundColor = '#FFFFFF'

    const plantillaId = paginaActiva?.layout_template || plantillaActiva || 'grid_4_regular'

    if (paginaActiva?.canvas_json) {
      // Cargar canvas guardado
      canvas.loadFromJSON(paginaActiva.canvas_json, () => {
        const objetos = canvas.getObjects().filter(o => !o.data?.esGuiaAlineacion)
        // Si el JSON cargado está vacío (sin objetos válidos), auto-renderizar plantilla activa
        if (objetos.length === 0 && plantillaId !== 'blank') {
          instanciarMarcosPlantilla(canvas, plantillaId)
        }
        canvas.renderAll()
        reiniciarHistorial(canvas)
      })
    } else {
      // Página nueva: auto-instanciar y renderizar plantilla activa de inmediato
      if (plantillaId !== 'blank') {
        instanciarMarcosPlantilla(canvas, plantillaId)
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
  }, [paginaActiva?.id, paginaActiva?.layout_template, plantillaActiva])

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

    // Traer elemento seleccionado al frente
    traerAlFrente: () => {
      const canvas = fabricRef.current
      if (!canvas) return
      const activo = canvas.getActiveObject()
      if (activo) {
        canvas.bringToFront(activo)
        canvas.renderAll()
        guardarEstado(canvas)
      }
    },

    // Enviar elemento seleccionado al fondo
    enviarAlFondo: () => {
      const canvas = fabricRef.current
      if (!canvas) return
      const activo = canvas.getActiveObject()
      if (activo) {
        canvas.sendToBack(activo)
        canvas.renderAll()
        guardarEstado(canvas)
      }
    },

    // Control de Zoom
    setZoom: (nuevoZoom) => {
      setZoomInterno(nuevoZoom)
      onZoomChange?.(nuevoZoom)
    },
    getZoom: () => zoomActual,

    // Aplicar plantilla estructurada desde JSON (pageTemplates.json)
    aplicarPlantillaDesdeJson: (plantilla) => {
      const canvas = fabricRef.current
      if (!canvas || !plantilla) return

      const objetosExistentes = canvas.getObjects().filter(o => 
        !o.data?.esGuiaAlineacion && (o.data?.type === 'panel' || o.data?.tipo === 'vineta' || o.data?.tipo === 'imagen_generada')
      )
      if (objetosExistentes.length > 0) {
        const confirmar = window.confirm('¿Aplicar plantilla? Se borrarán las viñetas y el contenido actual del lienzo.')
        if (!confirmar) return
      }

      canvas.clear()
      canvas.backgroundColor = '#FFFFFF'

      const vinetas = plantilla.vinetas || []
      vinetas.forEach(vin => {
        const left = Math.round(vin.x * CANVAS_W)
        const top = Math.round(vin.y * CANVAS_H)
        const width = Math.round(vin.w * CANVAS_W)
        const height = Math.round(vin.h * CANVAS_H)

        const rect = new fabric.Rect({
          left,
          top,
          width,
          height,
          fill: '#FFFFFF',
          stroke: '#000000',
          strokeWidth: 4,
          strokeUniform: true,
          selectable: true,
          hasControls: true,
          cornerColor: '#E5A93C',
          cornerStyle: 'circle',
          cornerSize: 8,
          transparentCorners: false,
          data: {
            type: 'panel',
            panelId: vin.id,
            tipo: 'vineta'
          }
        })
        canvas.add(rect)
      })

      canvas.renderAll()
      guardarEstado(canvas)
    },

    // Insertar Bocadillo desde Vector SVG y Preset Tipográfico (balloonPresets.json)
    insertarBocadilloPreset: (preset, posX = null, posY = null, textoInicial = '') => {
      const canvas = fabricRef.current
      if (!canvas || !preset) return

      const x = posX !== null && posX !== undefined ? posX : CANVAS_W / 2
      const y = posY !== null && posY !== undefined ? posY : CANVAS_H / 2

      const fontPrincipal = preset.fontFamily ? preset.fontFamily.split(',')[0].replace(/['"]/g, '').trim() : 'Comic Relief'
      const textoPorDefecto = textoInicial || (preset.tipo === 'caption' ? 'Texto de narración...' : '¡Escribe aquí!')

      fabric.loadSVGFromURL(
        preset.svg,
        (objects, options) => {
          if (!objects || objects.length === 0) return

          const svgElement = fabric.util.groupSVGElements(objects, options)
          svgElement.set({
            originX: 'center',
            originY: 'center',
          })

          const textObj = new fabric.IText(textoPorDefecto, {
            fontFamily: fontPrincipal,
            fontSize: preset.fontSize || 18,
            fill: preset.textColor || '#000000',
            originX: 'center',
            originY: 'center',
            textAlign: 'center',
            editable: true,
          })

          const balloonGroup = new fabric.Group([svgElement, textObj], {
            left: x,
            top: y,
            originX: 'center',
            originY: 'center',
            selectable: true,
            hasControls: true,
            cornerColor: '#E5A93C',
            cornerStyle: 'circle',
            borderColor: '#E5A93C',
            cornerSize: 8,
            transparentCorners: false,
            data: {
              type: 'balloon',
              tipo: 'bocadillo',
              presetId: preset.id,
              balloonType: preset.tipo
            }
          })

          canvas.add(balloonGroup)
          canvas.setActiveObject(balloonGroup)
          canvas.renderAll()
          guardarEstado(canvas)
        },
        null,
        { crossOrigin: 'anonymous' }
      )
    },

    // Exportar el canvas como dataURL PNG en alta resolución sin controles de selección
    exportCanvas: (multiplier = 2) => {
      const canvas = fabricRef.current
      if (!canvas) return null
      const activo = canvas.getActiveObject()
      canvas.discardActiveObject()
      canvas.renderAll()
      const dataUrl = canvas.toDataURL({
        format: 'png',
        multiplier: multiplier || 2,
        quality: 1,
      })
      if (activo) {
        canvas.setActiveObject(activo)
        canvas.renderAll()
      }
      return dataUrl
    },

    // Inserción de imagen con escalado 'cover' y clipPath en marco de viñeta
    insertarImagenEnVineta: async (imagenSrc, targetObj = null, coords = null) => {
      const canvas = fabricRef.current
      if (!canvas) return

      // Determinar viñeta destino si existe
      let vinetaDestino = targetObj
      if (vinetaDestino && vinetaDestino.data?.type !== 'panel' && vinetaDestino.data?.tipo !== 'vineta' && vinetaDestino.type !== 'rect') {
        vinetaDestino = null
      }

      if (!vinetaDestino && coords) {
        const point = new fabric.Point(coords.x, coords.y)
        const objetos = canvas.getObjects()
        for (let i = objetos.length - 1; i >= 0; i--) {
          const obj = objetos[i]
          const esPanel = obj.data?.type === 'panel' || obj.data?.tipo === 'vineta' || obj.type === 'rect'
          if (esPanel && obj.containsPoint(point)) {
            vinetaDestino = obj
            break
          }
        }
      }

      if (!vinetaDestino) {
        const activo = canvas.getActiveObject()
        if (activo && (activo.data?.type === 'panel' || activo.data?.tipo === 'vineta' || activo.type === 'rect')) {
          vinetaDestino = activo
        }
      }

      if (!vinetaDestino) {
        vinetaDestino = canvas.getObjects().find(o => o.data?.type === 'panel' || o.data?.tipo === 'vineta')
      }

      return new Promise((resolve, reject) => {
        fabric.Image.fromURL(
          imagenSrc,
          (img) => {
            if (!img) {
              reject(new Error('No se pudo cargar la imagen'))
              return
            }

            if (vinetaDestino) {
              const destW = vinetaDestino.width * (vinetaDestino.scaleX || 1)
              const destH = vinetaDestino.height * (vinetaDestino.scaleY || 1)
              const destLeft = vinetaDestino.left
              const destTop = vinetaDestino.top

              // Escalar la imagen en modo cover (Math.max(scaleX, scaleY))
              const scaleX = destW / img.width
              const scaleY = destH / img.height
              const scale = Math.max(scaleX, scaleY)

              const scaledW = img.width * scale
              const scaledH = img.height * scale
              const imgLeft = destLeft + (destW - scaledW) / 2
              const imgTop = destTop + (destH - scaledH) / 2

              img.set({
                left: imgLeft,
                top: imgTop,
                scaleX: scale,
                scaleY: scale,
                clipPath: new fabric.Rect({
                  left: destLeft,
                  top: destTop,
                  width: destW,
                  height: destH,
                  absolutePositioned: true
                }),
                selectable: true,
                hasControls: true,
                tipo: 'imagen_generada',
                data: {
                  type: 'panel_image',
                  tipo: 'imagen_generada',
                  panelId: vinetaDestino.data?.panelId || vinetaDestino.data?.id,
                  srcOriginal: imagenSrc
                }
              })

              // Hacemos el fondo del marco transparente para que el arte se visualice con su borde negro superior
              vinetaDestino.set('fill', 'transparent')

              canvas.add(img)
              const idx = canvas.getObjects().indexOf(vinetaDestino)
              if (idx > 0) {
                img.moveTo(idx)
              } else {
                canvas.sendToBack(img)
              }
            } else {
              // Insertar como imagen libre en el lienzo
              const posX = coords?.x ?? (CANVAS_W - Math.min(img.width, 350)) / 2
              const posY = coords?.y ?? (CANVAS_H - Math.min(img.height, 350)) / 2
              const maxDim = 350
              const scale = Math.min(maxDim / img.width, maxDim / img.height, 1)

              img.set({
                left: posX,
                top: posY,
                scaleX: scale,
                scaleY: scale,
                selectable: true,
                hasControls: true,
                tipo: 'imagen_generada',
                data: {
                  type: 'panel_image',
                  tipo: 'imagen_generada',
                  srcOriginal: imagenSrc
                }
              })
              canvas.add(img)
            }

            canvas.setActiveObject(img)
            canvas.renderAll()
            guardarEstado(canvas)
            resolve(img)
          },
          { crossOrigin: 'anonymous' }
        )
      })
    },

    insertarBocadilloDialogo: (texto, x = CANVAS_W / 2, y = CANVAS_H / 2) => {
      const canvas = fabricRef.current
      if (!canvas) return

      const ancho = Math.max(160, Math.min(260, (texto || '').length * 8 + 40))
      const alto = 70
      const izq = x - ancho / 2
      const arr = y - alto / 2

      const bocadillo = new fabric.Group([
        new fabric.Ellipse({
          rx: ancho / 2,
          ry: alto / 2,
          fill: 'white',
          stroke: COLORES.bocadillo_dialogo,
          strokeWidth: 2,
          originX: 'center',
          originY: 'center',
        }),
        new fabric.IText(texto || '—Diálogo—', {
          fontSize: 12,
          fill: '#1A1A1A',
          fontFamily: 'Comic Relief',
          originX: 'center',
          originY: 'center',
          textAlign: 'center',
        })
      ], {
        left: izq,
        top: arr,
        selectable: true,
        data: { tipo: 'bocadillo_dialogo' }
      })

      canvas.add(bocadillo)
      canvas.setActiveObject(bocadillo)
      canvas.renderAll()
      guardarEstado(canvas)
      return bocadillo
    },
  }))

  return (
    <div
      className="flex items-center justify-center w-full h-full bg-rdc-primary overflow-auto p-4"
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
      }}
      onDrop={async (e) => {
        e.preventDefault()
        if (!elementoCanvasRef.current) return
        const rect = elementoCanvasRef.current.getBoundingClientRect()
        const x = (e.clientX - rect.left) / zoomActual
        const y = (e.clientY - rect.top) / zoomActual

        // 1. Detección de preset de bocadillo (JSON)
        const jsonStr = e.dataTransfer.getData('application/json')
        if (jsonStr) {
          try {
            const parsed = JSON.parse(jsonStr)
            if (parsed.type === 'balloon_preset' && parsed.preset) {
              if (canvasRef?.current?.insertarBocadilloPreset) {
                canvasRef.current.insertarBocadilloPreset(parsed.preset, x, y, parsed.texto)
              }
              return
            }
          } catch (_) {
            // Continuar si no es un JSON de bocadillo
          }
        }

        // 2. Viñeta o imagen desde URL
        const url = e.dataTransfer.getData('text/plain')
        if (url && canvasRef?.current?.insertarImagenEnVineta) {
          await canvasRef.current.insertarImagenEnVineta(url, null, { x, y })
        }
      }}
    >
      <div
        style={{ transform: `scale(${zoomActual})`, transformOrigin: 'top center' }}
        className="shadow-2xl transition-transform duration-100 ease-out"
      >
        <canvas ref={elementoCanvasRef} />
      </div>
    </div>
  )
})

export default MangaCanvas