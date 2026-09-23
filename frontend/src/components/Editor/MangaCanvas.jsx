// MangaCanvas.jsx
// Canvas interactivo del editor de manga usando Fabric.js v5 con capas, historial, snapping y filtros.

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { fabric } from 'fabric'
import {
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Minus,
  Plus,
  Palette,
  X
} from 'lucide-react'
import { CANVAS_DIMENSIONES, PLANTILLAS } from './PageTemplates'
import pageTemplatesData from '../../data/pageTemplates.json'
import balloonPresetsData from '../../data/balloonPresets.json'
import useCanvasHistory from './useCanvasHistory'
import { procesarSnapping, limpiarGuias, CONFIG_SNAPPING_DEFAULT } from './canvasSnapping'

const { width: CANVAS_W, height: CANVAS_H } = CANVAS_DIMENSIONES

export const FUENTES_DISPONIBLES = [
  { id: 'Comic Relief', label: 'Comic Relief' },
  { id: 'Bangers', label: 'Bangers' },
  { id: 'Comic Neue', label: 'Comic Neue' },
  { id: 'Oswald', label: 'Oswald' },
  { id: 'Chango', label: 'Chango' },
  { id: 'Arial', label: 'Arial' },
]

export const COLORES_PRESET = [
  '#000000',
  '#FFFFFF',
  '#E53E3E',
  '#2563EB',
  '#16A34A',
  '#D97706',
  '#7C3AED'
]

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
  const [propiedadesTexto, setPropiedadesTexto] = useState(null)

  // Hook dedicado de historial
  const {
    guardarEstado,
    deshacer: historyUndo,
    rehacer: historyRedo,
    reiniciarHistorial,
    puedeDeshacer,
    puedeRehacer
  } = useCanvasHistory(30)

  // ─── GESTIÓN DE PROPIEDADES TIPOGRÁFICAS FLOTANTES ───────────────────────

  const actualizarPropiedadTexto = (propiedad, valor) => {
    if (!propiedadesTexto || !fabricRef.current) return
    const canvas = fabricRef.current
    const { targetObj, textObj } = propiedadesTexto
    if (!textObj) return

    textObj.set(propiedad, valor)
    if (targetObj && targetObj.type === 'group') {
      targetObj.addWithUpdate()
    }
    canvas.renderAll()
    guardarEstado(canvas)

    setPropiedadesTexto(prev => {
      if (!prev) return null
      return {
        ...prev,
        [propiedad === 'fontWeight' ? 'isBold' : propiedad === 'fontStyle' ? 'isItalic' : propiedad]:
          propiedad === 'fontWeight' ? (valor === 'bold') :
          propiedad === 'fontStyle' ? (valor === 'italic') : valor,
        fontSize: propiedad === 'fontSize' ? valor : prev.fontSize,
        fontFamily: propiedad === 'fontFamily' ? valor : prev.fontFamily,
        textAlign: propiedad === 'textAlign' ? valor : prev.textAlign,
        color: propiedad === 'fill' ? valor : prev.color,
      }
    })
  }

  const cambiarTamanoTexto = (delta) => {
    if (!propiedadesTexto) return
    const actual = propiedadesTexto.fontSize || 18
    const nuevo = Math.max(8, Math.min(120, actual + delta))
    actualizarPropiedadTexto('fontSize', nuevo)
  }

  const toggleNegrita = () => {
    if (!propiedadesTexto) return
    const nuevoValor = propiedadesTexto.isBold ? 'normal' : 'bold'
    actualizarPropiedadTexto('fontWeight', nuevoValor)
  }

  const toggleCursiva = () => {
    if (!propiedadesTexto) return
    const nuevoValor = propiedadesTexto.isItalic ? 'normal' : 'italic'
    actualizarPropiedadTexto('fontStyle', nuevoValor)
  }

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

    // Edición interactiva inline de texto con doble clic en bocadillos (cero window.prompt)
    const alHacerDobleClic = (e) => {
      const target = e.target
      if (!target) return
      const canvasActual = fabricRef.current
      if (!canvasActual) return

      const esBocadillo = target.type === 'group' && (
        target.data?.type === 'balloon' || 
        target.data?.tipo === 'bocadillo' || 
        target.data?.tipo?.startsWith('bocadillo')
      )

      if (esBocadillo) {
        const textObj = target.getObjects().find(o => o.type === 'i-text' || o.type === 'text')
        if (!textObj) return

        const savedData = { ...(target.data || {}) }
        const savedIndex = canvasActual.getObjects().indexOf(target)
        const objects = target.getObjects()
        const otherObjs = objects.filter(o => o !== textObj)

        // Descomponer temporalmente el grupo para permitir edición directa en el lienzo
        target.toActiveSelection()
        canvasActual.discardActiveObject()

        // Desactivar interacción con el vector SVG de fondo mientras se edita el texto
        otherObjs.forEach(o => {
          o.selectable = false
          o.evented = false
        })

        // Activar y entrar en modo de edición de texto
        textObj.selectable = true
        textObj.evented = true
        canvasActual.setActiveObject(textObj)

        if (textObj.enterEditing) {
          textObj.enterEditing()
          if (textObj.selectAll) {
            textObj.selectAll()
          }
        }
        canvasActual.renderAll()

        const alSalirEdicion = () => {
          textObj.off('editing:exited', alSalirEdicion)

          otherObjs.forEach(o => {
            o.selectable = true
            o.evented = true
          })

          const allObjs = [...otherObjs, textObj]
          const sel = new fabric.ActiveSelection(allObjs, { canvas: canvasActual })
          canvasActual.setActiveObject(sel)
          const newGroup = sel.toGroup()

          newGroup.set({
            cornerColor: '#E5A93C',
            cornerStyle: 'circle',
            borderColor: '#E5A93C',
            cornerSize: 8,
            transparentCorners: false,
            data: savedData
          })

          if (savedIndex >= 0) {
            newGroup.moveTo(savedIndex)
          }

          canvasActual.setActiveObject(newGroup)
          canvasActual.renderAll()
          guardarEstado(canvasActual)
        }

        textObj.on('editing:exited', alSalirEdicion)
      }
    }
    canvas.on('mouse:dblclick', alHacerDobleClic)

    // Listener para notificar al padre qué viñeta está seleccionada y gestionar la barra flotante de texto
    const comprobarSeleccion = (e) => {
      const obj = e.selected?.[0]
      const tipoObjeto = obj?.data?.type || obj?.data?.tipo || obj?.tipo
      
      if (obj && (tipoObjeto === 'panel' || tipoObjeto === 'vineta' || obj.type === 'rect') && onVinetaSeleccionada) {
        onVinetaSeleccionada(obj)
      } else if (onVinetaSeleccionada) {
        onVinetaSeleccionada(null)
      }

      // Detectar objeto de texto o bocadillo para barra contextual flotante
      if (obj) {
        let textObj = null
        if (obj.type === 'i-text' || obj.type === 'text') {
          textObj = obj
        } else if (obj.type === 'group' && (obj.data?.type === 'balloon' || obj.data?.tipo === 'bocadillo' || obj.data?.tipo?.startsWith('bocadillo'))) {
          textObj = obj.getObjects().find(o => o.type === 'i-text' || o.type === 'text')
        }

        if (textObj) {
          setPropiedadesTexto({
            targetObj: obj,
            textObj: textObj,
            fontFamily: textObj.fontFamily || 'Comic Relief',
            fontSize: Math.round(textObj.fontSize || 18),
            isBold: textObj.fontWeight === 'bold' || textObj.fontWeight === 700 || textObj.fontWeight === '700',
            isItalic: textObj.fontStyle === 'italic',
            textAlign: textObj.textAlign || 'center',
            color: typeof textObj.fill === 'string' ? textObj.fill : '#000000'
          })
          return
        }
      }
      setPropiedadesTexto(null)
    }

    canvas.on('selection:created', comprobarSeleccion)
    canvas.on('selection:updated', comprobarSeleccion)
    canvas.on('selection:cleared', () => {
      limpiarGuias(canvas)
      if (onVinetaSeleccionada) onVinetaSeleccionada(null)
      setPropiedadesTexto(null)
    })

    // Atajos de teclado
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      if (fabricRef.current?.getActiveObject()?.isEditing) return

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
      canvas.forEachObject(obj => {
        if (!obj.data?.esGuiaAlineacion) {
          obj.selectable = true
          obj.evented = true
        }
      })
      return
    }

    if (herramientaActiva === 'mano') {
      canvas.isDrawingMode = false
      canvas.selection = false
      canvas.defaultCursor = 'grab'
      canvas.discardActiveObject()
      canvas.renderAll()

      canvas.forEachObject(obj => {
        obj.selectable = false
        obj.evented = false
      })

      let isDragging = false
      let lastPosX = 0
      let lastPosY = 0

      const onMouseDownPan = (opt) => {
        isDragging = true
        canvas.defaultCursor = 'grabbing'
        lastPosX = opt.e.clientX
        lastPosY = opt.e.clientY
      }

      const onMouseMovePan = (opt) => {
        if (!isDragging) return
        const vpt = canvas.viewportTransform
        vpt[4] += opt.e.clientX - lastPosX
        vpt[5] += opt.e.clientY - lastPosY
        canvas.requestRenderAll()
        lastPosX = opt.e.clientX
        lastPosY = opt.e.clientY
      }

      const onMouseUpPan = () => {
        isDragging = false
        canvas.defaultCursor = 'grab'
        canvas.setViewportTransform(canvas.viewportTransform)
      }

      canvas.on('mouse:down', onMouseDownPan)
      canvas.on('mouse:move', onMouseMovePan)
      canvas.on('mouse:up', onMouseUpPan)

      return () => {
        canvas.defaultCursor = 'default'
        canvas.off('mouse:down', onMouseDownPan)
        canvas.off('mouse:move', onMouseMovePan)
        canvas.off('mouse:up', onMouseUpPan)
        canvas.forEachObject(obj => {
          if (!obj.data?.esGuiaAlineacion) {
            obj.selectable = true
            obj.evented = true
          }
        })
      }
    }

    if (herramientaActiva === 'texto') {
      canvas.isDrawingMode = false
      canvas.selection = false
      canvas.defaultCursor = 'text'

      const onClickTexto = (opt) => {
        if (opt.target && (opt.target.type === 'i-text' || opt.target.type === 'text')) {
          return
        }
        const pointer = canvas.getPointer(opt.e)
        const nuevoTexto = new fabric.IText('¡BOOM!', {
          left: pointer.x,
          top: pointer.y,
          fontFamily: 'Bangers',
          fontSize: 32,
          fill: '#E53E3E',
          stroke: '#000000',
          strokeWidth: 1.5,
          originX: 'center',
          originY: 'center',
          editable: true,
          selectable: true,
          cornerColor: '#E5A93C',
          cornerStyle: 'circle',
          borderColor: '#E5A93C',
          cornerSize: 8,
          transparentCorners: false,
          data: { tipo: 'texto', esOnomatopeya: true }
        })
        canvas.add(nuevoTexto)
        canvas.setActiveObject(nuevoTexto)
        if (nuevoTexto.enterEditing) {
          nuevoTexto.enterEditing()
          if (nuevoTexto.selectAll) nuevoTexto.selectAll()
        }
        canvas.renderAll()
        guardarEstado(canvas)
      }

      canvas.on('mouse:down', onClickTexto)
      return () => {
        canvas.off('mouse:down', onClickTexto)
      }
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

    // Herramientas de inserción (viñeta, bocadillos, etc.)
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
    limpiarMarcoSeleccionado: () => {
      const canvas = fabricRef.current
      if (!canvas) return
      const activo = canvas.getActiveObject()
      if (!activo) {
        alert('Por favor selecciona una viñeta para vaciar su contenido.')
        return
      }

      const esPanel = activo.data?.type === 'panel' || activo.data?.tipo === 'vineta' || activo.type === 'rect'
      const esImagen = activo.data?.type === 'panel_image' || activo.data?.tipo === 'imagen_generada' || activo.type === 'image'

      if (esPanel) {
        const targetPanelId = activo.data?.panelId || activo.data?.id
        const imagenes = canvas.getObjects().filter(o => {
          if (o.data?.type === 'panel_image' || o.data?.tipo === 'imagen_generada') {
            if (targetPanelId && o.data?.panelId === targetPanelId) return true
            const pb = activo.getBoundingRect(true)
            const ib = o.getBoundingRect(true)
            return Math.abs(ib.left - pb.left) < 25 && Math.abs(ib.top - pb.top) < 25
          }
          return false
        })
        imagenes.forEach(img => canvas.remove(img))
        activo.set('fill', '#FFFFFF')
        canvas.renderAll()
        guardarEstado(canvas)
      } else if (esImagen) {
        const panelId = activo.data?.panelId
        if (panelId) {
          const panel = canvas.getObjects().find(o => 
            (o.data?.type === 'panel' || o.data?.tipo === 'vineta' || o.type === 'rect') &&
            o.data?.panelId === panelId
          )
          if (panel) panel.set('fill', '#FFFFFF')
        }
        canvas.remove(activo)
        canvas.renderAll()
        guardarEstado(canvas)
      } else {
        canvas.remove(activo)
        canvas.renderAll()
        guardarEstado(canvas)
      }
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
        const objetos = canvas.getObjects()
        for (let i = objetos.length - 1; i >= 0; i--) {
          const obj = objetos[i]
          const esPanel = !obj.data?.esGuiaAlineacion && (obj.data?.type === 'panel' || obj.data?.tipo === 'vineta' || (obj.type === 'rect' && !obj.data?.type))
          if (esPanel) {
            const pb = obj.getBoundingRect(true)
            if (coords.x >= pb.left && coords.x <= pb.left + pb.width &&
                coords.y >= pb.top && coords.y <= pb.top + pb.height) {
              vinetaDestino = obj
              break
            }
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
        const paneles = canvas.getObjects().filter(o => 
          !o.data?.esGuiaAlineacion && (o.data?.type === 'panel' || o.data?.tipo === 'vineta' || (o.type === 'rect' && !o.data?.tipo))
        )
        const imagenes = canvas.getObjects().filter(o => 
          o.data?.type === 'panel_image' || o.data?.tipo === 'imagen_generada' || o.type === 'image'
        )
        // Buscar primer marco disponible que aún no tenga imagen
        const panelVacio = paneles.find(p => {
          const pId = p.data?.panelId || p.data?.id
          if (pId) {
            return !imagenes.some(img => (img.data?.panelId || img.data?.id) === pId)
          }
          const pb = p.getBoundingRect(true)
          return !imagenes.some(img => {
            const ib = img.getBoundingRect(true)
            return Math.abs(ib.left - pb.left) < 15 && Math.abs(ib.top - pb.top) < 15
          })
        })
        vinetaDestino = panelVacio || paneles[0] || null
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
              const targetPanelId = vinetaDestino.data?.panelId || vinetaDestino.data?.id

              // Eliminar imagen previa en esta viñeta para evitar apilamiento de capas
              const imagenesPrevias = canvas.getObjects().filter(o => {
                if (o.data?.type === 'panel_image' || o.data?.tipo === 'imagen_generada') {
                  if (targetPanelId && (o.data?.panelId === targetPanelId || o.data?.id === targetPanelId)) return true
                  const ib = o.getBoundingRect(true)
                  return Math.abs(ib.left - destLeft) < 20 && Math.abs(ib.top - destTop) < 20
                }
                return false
              })
              imagenesPrevias.forEach(prev => canvas.remove(prev))

              // Escalar la imagen en modo cover exacto
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
                originX: 'left',
                originY: 'top',
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
                cornerColor: '#E5A93C',
                cornerStyle: 'circle',
                borderColor: '#E5A93C',
                cornerSize: 8,
                transparentCorners: false,
                tipo: 'imagen_generada',
                data: {
                  type: 'panel_image',
                  tipo: 'imagen_generada',
                  panelId: targetPanelId,
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
                originX: 'left',
                originY: 'top',
                scaleX: scale,
                scaleY: scale,
                selectable: true,
                hasControls: true,
                cornerColor: '#E5A93C',
                cornerStyle: 'circle',
                borderColor: '#E5A93C',
                cornerSize: 8,
                transparentCorners: false,
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

    insertarBocadilloDialogo: (texto, posX = null, posY = null) => {
      const canvas = fabricRef.current
      if (!canvas) return

      let targetX = posX
      let targetY = posY

      if (targetX === null || targetX === undefined || targetY === null || targetY === undefined) {
        const activo = canvas.getActiveObject()
        let vinetaDestino = null
        if (activo && (activo.data?.type === 'panel' || activo.data?.tipo === 'vineta' || activo.type === 'rect')) {
          vinetaDestino = activo
        }
        if (!vinetaDestino) {
          vinetaDestino = canvas.getObjects().find(o => o.data?.type === 'panel' || o.data?.tipo === 'vineta')
        }

        if (vinetaDestino) {
          const destW = vinetaDestino.width * (vinetaDestino.scaleX || 1)
          const destH = vinetaDestino.height * (vinetaDestino.scaleY || 1)
          targetX = vinetaDestino.left + destW / 2
          targetY = vinetaDestino.top + destH * 0.38
        } else {
          targetX = CANVAS_W / 2
          targetY = CANVAS_H / 2
        }
      }

      const preset = balloonPresetsData?.speech1 || {
        id: 'speech1',
        tipo: 'speech',
        svg: '/assets/editor/balloons/speech1.svg',
        fontFamily: 'Comic Relief, Bangers, cursive',
        fontSize: 18,
        textColor: '#000000'
      }

      const fontPrincipal = preset.fontFamily ? preset.fontFamily.split(',')[0].replace(/['"]/g, '').trim() : 'Comic Relief'
      const textoFinal = texto || '¡Escribe aquí!'

      fabric.loadSVGFromURL(
        preset.svg,
        (objects, options) => {
          if (!objects || objects.length === 0) {
            // Fallback vectorial en caso de que el recurso SVG no responda
            const ancho = Math.max(160, Math.min(260, textoFinal.length * 8 + 40))
            const alto = 70
            const bocadillo = new fabric.Group([
              new fabric.Ellipse({
                rx: ancho / 2,
                ry: alto / 2,
                fill: '#FFFFFF',
                stroke: '#000000',
                strokeWidth: 3,
                originX: 'center',
                originY: 'center',
              }),
              new fabric.IText(textoFinal, {
                fontSize: 16,
                fill: '#000000',
                fontFamily: fontPrincipal,
                originX: 'center',
                originY: 'center',
                textAlign: 'center',
                editable: true,
              })
            ], {
              left: targetX,
              top: targetY,
              originX: 'center',
              originY: 'center',
              selectable: true,
              data: { type: 'balloon', tipo: 'bocadillo', presetId: preset.id }
            })
            canvas.add(bocadillo)
            canvas.setActiveObject(bocadillo)
            canvas.renderAll()
            guardarEstado(canvas)
            return
          }

          const svgElement = fabric.util.groupSVGElements(objects, options)
          svgElement.set({
            originX: 'center',
            originY: 'center',
          })

          const textObj = new fabric.IText(textoFinal, {
            fontFamily: fontPrincipal,
            fontSize: preset.fontSize || 18,
            fill: preset.textColor || '#000000',
            originX: 'center',
            originY: 'center',
            textAlign: 'center',
            editable: true,
          })

          const balloonGroup = new fabric.Group([svgElement, textObj], {
            left: targetX,
            top: targetY,
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
  }))

  return (
    <div
      className="relative flex items-center justify-center w-full h-full bg-rdc-primary overflow-auto p-4"
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
      }}
      onDrop={async (e) => {
        e.preventDefault()
        const canvas = fabricRef.current
        if (!elementoCanvasRef.current || !canvas) return

        // Coordenadas precisas del lienzo usando canvas.getPointer
        const pointer = canvas.getPointer(e)
        const x = pointer.x
        const y = pointer.y

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
      {/* ── Barra contextual flotante de propiedades tipográficas ── */}
      {propiedadesTexto && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-40
                     bg-rdc-card/95 border border-rdc-border shadow-2xl rounded-2xl
                     p-2 px-3 flex items-center gap-2 backdrop-blur-md animate-fade-in
                     text-rdc-text font-titulo select-none max-w-fit"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Selector de Familia Tipográfica */}
          <div className="flex items-center gap-1">
            <Type className="w-3.5 h-3.5 text-rdc-accent" />
            <select
              value={propiedadesTexto.fontFamily}
              onChange={(e) => actualizarPropiedadTexto('fontFamily', e.target.value)}
              className="bg-rdc-secondary border border-rdc-border text-rdc-text text-xs rounded-lg px-2 py-1 focus:ring-1 focus:ring-rdc-accent cursor-pointer outline-none"
            >
              {FUENTES_DISPONIBLES.map(f => (
                <option key={f.id} value={f.id} style={{ fontFamily: f.id }}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div className="h-4 w-px bg-rdc-border mx-0.5" />

          {/* Tamaño de fuente (- size +) */}
          <div className="flex items-center gap-1 bg-rdc-secondary border border-rdc-border rounded-lg p-0.5">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => cambiarTamanoTexto(-2)}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-rdc-primary text-rdc-muted hover:text-rdc-text transition-colors cursor-pointer"
              title="Reducir tamaño"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-xs font-mono font-bold px-1 min-w-[24px] text-center">
              {propiedadesTexto.fontSize}
            </span>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => cambiarTamanoTexto(2)}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-rdc-primary text-rdc-muted hover:text-rdc-text transition-colors cursor-pointer"
              title="Aumentar tamaño"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div className="h-4 w-px bg-rdc-border mx-0.5" />

          {/* Negrita & Cursiva */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={toggleNegrita}
              className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-all cursor-pointer ${
                propiedadesTexto.isBold
                  ? 'bg-rdc-accent text-white border-rdc-accent shadow-xs'
                  : 'bg-rdc-secondary border-rdc-border text-rdc-muted hover:text-rdc-text hover:bg-rdc-primary'
              }`}
              title="Negrita"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={toggleCursiva}
              className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-all cursor-pointer ${
                propiedadesTexto.isItalic
                  ? 'bg-rdc-accent text-white border-rdc-accent shadow-xs'
                  : 'bg-rdc-secondary border-rdc-border text-rdc-muted hover:text-rdc-text hover:bg-rdc-primary'
              }`}
              title="Cursiva"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-rdc-border mx-0.5" />

          {/* Alineación */}
          <div className="flex items-center gap-0.5 bg-rdc-secondary border border-rdc-border rounded-lg p-0.5">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => actualizarPropiedadTexto('textAlign', 'left')}
              className={`p-1 rounded transition-colors cursor-pointer ${
                propiedadesTexto.textAlign === 'left' ? 'bg-rdc-accent text-white' : 'text-rdc-muted hover:text-rdc-text'
              }`}
              title="Alinear a la izquierda"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => actualizarPropiedadTexto('textAlign', 'center')}
              className={`p-1 rounded transition-colors cursor-pointer ${
                propiedadesTexto.textAlign === 'center' ? 'bg-rdc-accent text-white' : 'text-rdc-muted hover:text-rdc-text'
              }`}
              title="Centrar"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => actualizarPropiedadTexto('textAlign', 'right')}
              className={`p-1 rounded transition-colors cursor-pointer ${
                propiedadesTexto.textAlign === 'right' ? 'bg-rdc-accent text-white' : 'text-rdc-muted hover:text-rdc-text'
              }`}
              title="Alinear a la derecha"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-rdc-border mx-0.5" />

          {/* Paleta de Color */}
          <div className="flex items-center gap-1.5">
            {COLORES_PRESET.map(c => (
              <button
                key={c}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => actualizarPropiedadTexto('fill', c)}
                className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                  propiedadesTexto.color.toLowerCase() === c.toLowerCase()
                    ? 'scale-125 ring-2 ring-rdc-accent ring-offset-1 border-white shadow-xs'
                    : 'border-slate-400 hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
            {/* Color Picker nativo */}
            <label
              className="relative w-5 h-5 rounded-full border border-rdc-border overflow-hidden cursor-pointer flex items-center justify-center bg-rdc-secondary hover:ring-1 hover:ring-rdc-accent"
              title="Color personalizado"
            >
              <Palette className="w-3 h-3 text-rdc-muted pointer-events-none" />
              <input
                type="color"
                value={propiedadesTexto.color.startsWith('#') && propiedadesTexto.color.length === 7 ? propiedadesTexto.color : '#000000'}
                onChange={(e) => actualizarPropiedadTexto('fill', e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              />
            </label>
          </div>

          <div className="h-4 w-px bg-rdc-border mx-0.5" />

          {/* Cerrar barra */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setPropiedadesTexto(null)}
            className="p-1 rounded-lg text-rdc-muted hover:text-rdc-text hover:bg-rdc-primary transition-colors cursor-pointer"
            title="Cerrar barra"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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