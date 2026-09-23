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
  const plantilla = pageTemplatesData[plantillaKey] || 
    (plantillaKey === 'grid_5_dynamic' ? pageTemplatesData['grid_5_action'] : 
    (plantillaKey === 'grid_3_horizontal' ? pageTemplatesData['grid_3_classic'] : 
    (pageTemplatesData['grid_4_regular'] || Object.values(pageTemplatesData)[0])))
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
      fill: 'rgba(255,255,255,0.001)',
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
        tipo: 'vineta',
        panelId: vin.id,
        id: vin.id
      }
    })
    canvas.add(rect)
    nuevosMarcos.push(rect)
  })

  canvas.renderAll()
  return nuevosMarcos
}

// Algoritmo infalible de escalado cover y recorte para viñetas en Fabric.js
export const insertarImagenEnVineta = (canvas, imagenSrc, marcoObj) => {
  if (!canvas || !marcoObj) return

  const marcoId = marcoObj.data?.panelId || marcoObj.data?.id

  // 1. Purgar cualquier ilustración previa vinculada a este marco
  const prevImg = canvas.getObjects().find(o => o.data?.tipo === 'panel_image' && o.data?.panelId === marcoId)
  if (prevImg) canvas.remove(prevImg)

  // 2. Obtener dimensiones y centro exacto del marco
  const destW = marcoObj.getScaledWidth()
  const destH = marcoObj.getScaledHeight()
  const centerX = marcoObj.left + destW / 2
  const centerY = marcoObj.top + destH / 2

  // 3. Cargar la imagen y forzar modo Cover
  fabric.Image.fromURL(imagenSrc, (img) => {
    if (!img || !img.width || !img.height) return

    // Escala para cubrir el marco sin deformar
    const scale = Math.max(destW / img.width, destH / img.height)

    img.set({
      originX: 'center',
      originY: 'center',
      left: centerX,
      top: centerY,
      scaleX: scale,
      scaleY: scale,
      selectable: false,
      evented: false,
      data: { tipo: 'panel_image', panelId: marcoId }
    })

    // 4. Recorte estricto coincidente con el marco
    img.clipPath = new fabric.Rect({
      originX: 'center',
      originY: 'center',
      left: centerX,
      top: centerY,
      width: destW,
      height: destH,
      absolutePositioned: true
    })

    // 5. Inserción y orden Z de capas
    canvas.add(img)
    canvas.sendToBack(img) // El arte al fondo

    // El marco perimetral negro va justo por encima de la imagen
    marcoObj.set({ fill: 'rgba(255,255,255,0.001)' })
    canvas.bringToFront(marcoObj)

    // Traer bocadillos, textos, SFX y efectos por encima del marco
    canvas.getObjects().forEach(obj => {
      const t = obj.data?.tipo || obj.data?.type
      if (t === 'balloon' || t === 'balloon_text' || t === 'balloon_shape' || t === 'free_text' || t === 'sfx' || t === 'sfx_text' || t === 'kinetic_fx' || t === 'fx_layer') {
        canvas.bringToFront(obj)
      }
    })

    canvas.renderAll()
  }, { crossOrigin: 'anonymous' })
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
  onTextoSeleccionadoChange = null,
  onHerramientaChange = null,
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

  // ─── GESTIÓN DE PROPIEDADES TIPOGRÁFICAS (INSPECTOR & TOOLBAR) ─────────────

  const obtenerTextoActivo = () => {
    const canvas = fabricRef.current
    if (!canvas) return null
    const obj = canvas.getActiveObject()
    if (!obj) return null

    let textObj = null
    let shapeObj = null

    if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
      textObj = obj
      if (obj.data?.balloonId) {
        shapeObj = canvas.getObjects().find(o => o.data?.type === 'balloon_shape' && o.data?.balloonId === obj.data.balloonId)
      }
    } else if (obj.data?.type === 'balloon_shape') {
      shapeObj = obj
      textObj = canvas.getObjects().find(o => o.data?.type === 'balloon_text' && o.data?.balloonId === obj.data.balloonId)
    } else if (obj.type === 'group' && (obj.data?.type === 'balloon' || obj.data?.tipo === 'bocadillo' || obj.data?.tipo?.startsWith('bocadillo'))) {
      textObj = obj.getObjects().find(o => o.type === 'i-text' || o.type === 'textbox' || o.type === 'text')
      shapeObj = obj.getObjects().find(o => o !== textObj)
    }

    if (textObj) {
      return {
        targetObj: obj,
        textObj,
        shapeObj,
        fontFamily: textObj.fontFamily || 'Comic Relief',
        fontSize: Math.round(textObj.fontSize || 18),
        isBold: textObj.fontWeight === 'bold' || textObj.fontWeight === 700 || textObj.fontWeight === '700',
        isItalic: textObj.fontStyle === 'italic',
        textAlign: textObj.textAlign || 'center',
        color: typeof textObj.fill === 'string' ? textObj.fill : '#000000',
        stroke: typeof textObj.stroke === 'string' ? textObj.stroke : '#000000',
        strokeWidth: textObj.strokeWidth || 0,
        hasShadow: !!textObj.shadow,
        shapeFill: shapeObj?.fill || '#FFFFFF',
        shapeStroke: shapeObj?.stroke || '#000000',
        shapeStrokeWidth: shapeObj?.strokeWidth || 2,
        isBalloon: !!shapeObj || obj.data?.type === 'balloon_text' || obj.data?.type === 'balloon_shape',
        isSFX: obj.data?.type === 'sfx_text' || obj.data?.tipo === 'onomatopeya'
      }
    }
    return null
  }

  const actualizarPropiedadTexto = (propiedad, valor) => {
    const info = obtenerTextoActivo()
    if (!info || !fabricRef.current) return
    const canvas = fabricRef.current
    const { targetObj, textObj } = info
    if (!textObj) return

    textObj.set(propiedad, valor)
    if (propiedad === 'stroke' || propiedad === 'strokeWidth') {
      textObj.set('paintFirst', 'stroke')
    }
    if (targetObj && targetObj.type === 'group') {
      targetObj.addWithUpdate()
    }
    canvas.renderAll()
    guardarEstado(canvas)

    const updated = {
      ...info,
      [propiedad === 'fontWeight' ? 'isBold' : propiedad === 'fontStyle' ? 'isItalic' : propiedad]:
        propiedad === 'fontWeight' ? (valor === 'bold' || valor === 700 || valor === '700') :
        propiedad === 'fontStyle' ? (valor === 'italic') : valor,
      fontSize: propiedad === 'fontSize' ? valor : info.fontSize,
      fontFamily: propiedad === 'fontFamily' ? valor : info.fontFamily,
      textAlign: propiedad === 'textAlign' ? valor : info.textAlign,
      color: propiedad === 'fill' ? valor : info.color,
      stroke: propiedad === 'stroke' ? valor : info.stroke,
      strokeWidth: propiedad === 'strokeWidth' ? valor : info.strokeWidth,
    }
    setPropiedadesTexto(updated)
    onTextoSeleccionadoChange?.(updated)
  }

  const setTextStroke = (color, width) => {
    const info = obtenerTextoActivo()
    if (!info || !fabricRef.current) return
    const canvas = fabricRef.current
    const { textObj } = info
    if (!textObj) return

    if (color !== undefined) textObj.set('stroke', color)
    if (width !== undefined) textObj.set('strokeWidth', width)
    textObj.set('paintFirst', 'stroke')
    canvas.renderAll()
    guardarEstado(canvas)

    const updated = {
      ...info,
      stroke: color !== undefined ? color : info.stroke,
      strokeWidth: width !== undefined ? width : info.strokeWidth
    }
    setPropiedadesTexto(updated)
    onTextoSeleccionadoChange?.(updated)
  }

  const setTextShadow = (tipo = 'none') => {
    const info = obtenerTextoActivo()
    if (!info || !fabricRef.current) return
    const canvas = fabricRef.current
    const { textObj } = info
    if (!textObj) return

    if (tipo === 'none') {
      textObj.set('shadow', null)
    } else if (tipo === 'sutil') {
      textObj.set('shadow', new fabric.Shadow({
        color: 'rgba(0,0,0,0.35)',
        blur: 4,
        offsetX: 2,
        offsetY: 2
      }))
    } else if (tipo === 'impacto') {
      textObj.set('shadow', new fabric.Shadow({
        color: 'rgba(0,0,0,0.7)',
        blur: 8,
        offsetX: 3,
        offsetY: 3
      }))
    } else if (tipo === 'fuerte') {
      textObj.set('shadow', new fabric.Shadow({
        color: 'rgba(0,0,0,0.85)',
        blur: 14,
        offsetX: 4,
        offsetY: 4
      }))
    }
    canvas.renderAll()
    guardarEstado(canvas)

    const updated = {
      ...info,
      hasShadow: tipo !== 'none'
    }
    setPropiedadesTexto(updated)
    onTextoSeleccionadoChange?.(updated)
  }

  const setShapeFill = (color) => {
    const info = obtenerTextoActivo()
    if (!info || !fabricRef.current) return
    const canvas = fabricRef.current
    const { shapeObj, targetObj } = info
    const target = shapeObj || (targetObj?.data?.type === 'balloon_shape' ? targetObj : null)
    if (!target) return

    target.set('fill', color)
    if (target.type === 'group' && target.getObjects) {
      target.getObjects().forEach(o => o.set('fill', color))
    }
    canvas.renderAll()
    guardarEstado(canvas)

    const updated = {
      ...info,
      shapeFill: color
    }
    setPropiedadesTexto(updated)
    onTextoSeleccionadoChange?.(updated)
  }

  const setShapeStroke = (color, width) => {
    const info = obtenerTextoActivo()
    if (!info || !fabricRef.current) return
    const canvas = fabricRef.current
    const { shapeObj, targetObj } = info
    const target = shapeObj || (targetObj?.data?.type === 'balloon_shape' ? targetObj : null)
    if (!target) return

    if (color !== undefined) {
      target.set('stroke', color)
      if (target.type === 'group' && target.getObjects) {
        target.getObjects().forEach(o => o.set('stroke', color))
      }
    }
    if (width !== undefined) {
      target.set('strokeWidth', width)
      if (target.type === 'group' && target.getObjects) {
        target.getObjects().forEach(o => o.set('strokeWidth', width))
      }
    }
    target.set('strokeUniform', true)
    canvas.renderAll()
    guardarEstado(canvas)

    const updated = {
      ...info,
      shapeStroke: color !== undefined ? color : info.shapeStroke,
      shapeStrokeWidth: width !== undefined ? width : info.shapeStrokeWidth
    }
    setPropiedadesTexto(updated)
    onTextoSeleccionadoChange?.(updated)
  }

  const cambiarTamanoTexto = (delta) => {
    const info = obtenerTextoActivo()
    if (!info) return
    const actual = info.fontSize || 18
    const nuevo = Math.max(10, Math.min(120, actual + delta))
    actualizarPropiedadTexto('fontSize', nuevo)
  }

  const toggleNegrita = () => {
    const info = obtenerTextoActivo()
    if (!info) return
    const nuevoValor = info.isBold ? 'normal' : 'bold'
    actualizarPropiedadTexto('fontWeight', nuevoValor)
  }

  const toggleCursiva = () => {
    const info = obtenerTextoActivo()
    if (!info) return
    const nuevoValor = info.isItalic ? 'normal' : 'italic'
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

    // Snapping y sincronización de bocadillos inteligentes durante movimiento
    canvas.on('object:moving', (e) => {
      const target = e.target
      if (!target) return
      if (snappingConfigRef.current) {
        procesarSnapping(canvas, target, snappingConfigRef.current)
      }
      // Sincronizar posición entre silueta y caja de texto desacoplada
      if (target.data?.type === 'balloon_shape') {
        const textObj = canvas.getObjects().find(o => o.data?.type === 'balloon_text' && o.data?.balloonId === target.data.balloonId)
        if (textObj) {
          textObj.set({ left: target.left, top: target.top })
          textObj.setCoords()
        }
      } else if (target.data?.type === 'balloon_text') {
        const shapeObj = canvas.getObjects().find(o => o.data?.type === 'balloon_shape' && o.data?.balloonId === target.data.balloonId)
        if (shapeObj) {
          shapeObj.set({ left: target.left, top: target.top })
          shapeObj.setCoords()
        }
      }
    })

    // Sincronización al escalar la silueta del bocadillo: expande ancho de Textbox sin deformar tipografía
    canvas.on('object:scaling', (e) => {
      const target = e.target
      if (!target) return
      if (target.data?.type === 'balloon_shape') {
        const textObj = canvas.getObjects().find(o => o.data?.type === 'balloon_text' && o.data?.balloonId === target.data.balloonId)
        if (textObj) {
          const currentW = target.width * target.scaleX
          const usableW = Math.max(70, currentW * 0.72)
          textObj.set({
            left: target.left,
            top: target.top,
            width: usableW,
            scaleX: 1,
            scaleY: 1
          })
          textObj.setCoords()
        }
      }
    })

    canvas.on('mouse:up', () => {
      limpiarGuias(canvas)
    })

    // Edición interactiva inline de texto con doble clic (cero window.prompt)
    const alHacerDobleClic = (e) => {
      const target = e.target
      if (!target) return
      const canvasActual = fabricRef.current
      if (!canvasActual) return

      // Edición nativa inmediata en Textbox o IText
      if (target.type === 'textbox' || target.type === 'i-text' || target.type === 'text') {
        if (target.enterEditing) {
          canvasActual.setActiveObject(target)
          target.enterEditing()
          if (target.selectAll) target.selectAll()
          canvasActual.renderAll()
        }
        return
      }

      // Si hace doble clic en la silueta, transferir foco a su caja de texto vinculada
      if (target.data?.type === 'balloon_shape') {
        const textObj = canvasActual.getObjects().find(o => o.data?.type === 'balloon_text' && o.data?.balloonId === target.data.balloonId)
        if (textObj && textObj.enterEditing) {
          canvasActual.setActiveObject(textObj)
          textObj.enterEditing()
          if (textObj.selectAll) textObj.selectAll()
          canvasActual.renderAll()
        }
        return
      }

      // Compatibilidad con bocadillos legacy agrupados en fabric.Group
      const esBocadillo = target.type === 'group' && (
        target.data?.type === 'balloon' || 
        target.data?.tipo === 'bocadillo' || 
        target.data?.tipo?.startsWith('bocadillo')
      )

      if (esBocadillo) {
        const textObj = target.getObjects().find(o => o.type === 'i-text' || o.type === 'textbox' || o.type === 'text')
        if (!textObj) return

        const savedData = { ...(target.data || {}) }
        const savedIndex = canvasActual.getObjects().indexOf(target)
        const objects = target.getObjects()
        const otherObjs = objects.filter(o => o !== textObj)

        target.toActiveSelection()
        canvasActual.discardActiveObject()

        otherObjs.forEach(o => {
          o.selectable = false
          o.evented = false
        })

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

    // Listener para notificar al padre qué viñeta está seleccionada y gestionar el inspector de texto
    const comprobarSeleccion = (e) => {
      const obj = e.selected?.[0]
      const tipoObjeto = obj?.data?.type || obj?.data?.tipo || obj?.tipo
      
      if (obj && (tipoObjeto === 'panel' || tipoObjeto === 'vineta' || (obj.type === 'rect' && !obj.data?.balloonId)) && onVinetaSeleccionada) {
        onVinetaSeleccionada(obj)
      } else if (onVinetaSeleccionada) {
        onVinetaSeleccionada(null)
      }

      // Detectar objeto de texto o bocadillo para barra contextual / inspector superior
      const info = obtenerTextoActivo()
      if (info) {
        setPropiedadesTexto(info)
        onTextoSeleccionadoChange?.(info)
      } else {
        setPropiedadesTexto(null)
        onTextoSeleccionadoChange?.(null)
      }
    }

    canvas.on('selection:created', comprobarSeleccion)
    canvas.on('selection:updated', comprobarSeleccion)
    canvas.on('selection:cleared', () => {
      limpiarGuias(canvas)
      if (onVinetaSeleccionada) onVinetaSeleccionada(null)
      setPropiedadesTexto(null)
      onTextoSeleccionadoChange?.(null)
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
        canvas.defaultCursor = 'default'
        canvas.selection = true
        canvas.setViewportTransform(canvas.viewportTransform)
        canvas.forEachObject(obj => {
          if (!obj.data?.esGuiaAlineacion) {
            obj.selectable = true
            obj.evented = true
          }
        })
        canvas.renderAll()
        onHerramientaChange?.('seleccionar')
      }

      canvas.on('mouse:down', onMouseDownPan)
      canvas.on('mouse:move', onMouseMovePan)
      canvas.on('mouse:up', onMouseUpPan)

      return () => {
        canvas.defaultCursor = 'default'
        canvas.selection = true
        canvas.off('mouse:down', onMouseDownPan)
        canvas.off('mouse:move', onMouseMovePan)
        canvas.off('mouse:up', onMouseUpPan)
        canvas.forEachObject(obj => {
          if (!obj.data?.esGuiaAlineacion) {
            obj.selectable = true
            obj.evented = true
          }
        })
        canvas.renderAll()
      }
    }

    if (herramientaActiva === 'texto') {
      canvas.isDrawingMode = false
      canvas.selection = false
      canvas.defaultCursor = 'text'

      const onClickTexto = (opt) => {
        if (opt.target && (opt.target.type === 'i-text' || opt.target.type === 'text' || opt.target.type === 'textbox')) {
          return
        }
        const pointer = canvas.getPointer(opt.e)
        const nuevoTexto = new fabric.Textbox('Escribe tu texto aquí...', {
          left: pointer.x,
          top: pointer.y,
          fontFamily: 'Comic Relief',
          fontSize: 18,
          fill: '#000000',
          stroke: '',
          strokeWidth: 0,
          width: 180,
          splitByGrapheme: false,
          originX: 'left',
          originY: 'top',
          editable: true,
          selectable: true,
          cornerColor: '#E5A93C',
          cornerStyle: 'circle',
          borderColor: '#E5A93C',
          cornerSize: 8,
          transparentCorners: false,
          data: { tipo: 'free_text', type: 'free_text' }
        })
        canvas.add(nuevoTexto)
        canvas.setActiveObject(nuevoTexto)
        if (nuevoTexto.enterEditing) {
          nuevoTexto.enterEditing()
          if (nuevoTexto.selectAll) nuevoTexto.selectAll()
        }
        canvas.renderAll()
        guardarEstado(canvas)
        onHerramientaChange?.('seleccionar')
      }

      canvas.on('mouse:down', onClickTexto)
      return () => {
        canvas.off('mouse:down', onClickTexto)
        canvas.selection = true
        canvas.defaultCursor = 'default'
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
          fill: 'rgba(255,255,255,0.001)',
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
            tipo: 'vineta',
            panelId: vin.id,
            id: vin.id
          }
        })
        canvas.add(rect)
      })

      canvas.renderAll()
      guardarEstado(canvas)
    },

    // Insertar Bocadillo Inteligente Desacoplado (Silueta Vectorial + Textbox con word-wrap)
    insertarBocadilloPreset: (preset, posX = null, posY = null, textoInicial = '') => {
      const canvas = fabricRef.current
      if (!canvas || !preset) return

      const x = posX !== null && posX !== undefined ? posX : CANVAS_W / 2
      const y = posY !== null && posY !== undefined ? posY : CANVAS_H / 2

      const fontPrincipal = preset.fontFamily ? preset.fontFamily.split(',')[0].replace(/['"]/g, '').trim() : 'Comic Relief'
      const textoPorDefecto = textoInicial || (preset.tipo === 'caption' ? 'Texto de narración...' : '¡Escribe aquí!')
      const balloonId = `balloon_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`

      fabric.loadSVGFromURL(
        preset.svg,
        (objects, options) => {
          if (!objects || objects.length === 0) return

          // Silueta SVG con strokeUniform true en todos los elementos para mantener grosor al escalar
          objects.forEach(o => {
            o.set({
              strokeUniform: true,
            })
          })

          const svgShape = fabric.util.groupSVGElements(objects, options)
          svgShape.set({
            left: x,
            top: y,
            originX: 'center',
            originY: 'center',
            strokeUniform: true,
            selectable: true,
            hasControls: true,
            cornerColor: '#E5A93C',
            cornerStyle: 'circle',
            borderColor: '#E5A93C',
            cornerSize: 8,
            transparentCorners: false,
            data: {
              type: 'balloon_shape',
              balloonId,
              presetId: preset.id,
              balloonType: preset.tipo
            }
          })

          const shapeW = svgShape.width * (svgShape.scaleX || 1)
          const usableTextWidth = Math.max(90, shapeW * 0.72)

          // Caja de texto desacoplada e inteligente (fabric.Textbox con auto word-wrap)
          const textBox = new fabric.Textbox(textoPorDefecto, {
            left: x,
            top: y,
            originX: 'center',
            originY: 'center',
            width: usableTextWidth,
            fontFamily: fontPrincipal,
            fontSize: preset.fontSize || 18,
            fill: preset.textColor || '#000000',
            textAlign: 'center',
            splitByGrapheme: false,
            editable: true,
            selectable: true,
            hasControls: true,
            cornerColor: '#E5A93C',
            cornerStyle: 'circle',
            borderColor: '#E5A93C',
            cornerSize: 8,
            transparentCorners: false,
            data: {
              type: 'balloon_text',
              balloonId,
              presetId: preset.id
            }
          })

          canvas.add(svgShape)
          canvas.add(textBox)
          canvas.setActiveObject(textBox)
          canvas.renderAll()
          guardarEstado(canvas)
        },
        null,
        { crossOrigin: 'anonymous' }
      )
    },

    // Insertar Bocadillo de Diálogo rápido con arquitectura desacoplada
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
      const balloonId = `balloon_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`

      fabric.loadSVGFromURL(
        preset.svg,
        (objects, options) => {
          if (!objects || objects.length === 0) {
            const ancho = Math.max(160, Math.min(260, textoFinal.length * 8 + 40))
            const alto = 70
            const elipse = new fabric.Ellipse({
              left: targetX,
              top: targetY,
              rx: ancho / 2,
              ry: alto / 2,
              fill: '#FFFFFF',
              stroke: '#000000',
              strokeWidth: 3,
              strokeUniform: true,
              originX: 'center',
              originY: 'center',
              selectable: true,
              hasControls: true,
              cornerColor: '#E5A93C',
              cornerStyle: 'circle',
              cornerSize: 8,
              data: {
                type: 'balloon_shape',
                balloonId,
                presetId: 'speech_fallback'
              }
            })

            const textBox = new fabric.Textbox(textoFinal, {
              left: targetX,
              top: targetY,
              originX: 'center',
              originY: 'center',
              width: ancho * 0.75,
              fontSize: 16,
              fill: '#000000',
              fontFamily: fontPrincipal,
              textAlign: 'center',
              splitByGrapheme: false,
              editable: true,
              selectable: true,
              cornerColor: '#E5A93C',
              cornerStyle: 'circle',
              cornerSize: 8,
              data: {
                type: 'balloon_text',
                balloonId,
                presetId: 'speech_fallback'
              }
            })

            canvas.add(elipse)
            canvas.add(textBox)
            canvas.setActiveObject(textBox)
            canvas.renderAll()
            guardarEstado(canvas)
            return
          }

          objects.forEach(o => o.set({ strokeUniform: true }))
          const svgShape = fabric.util.groupSVGElements(objects, options)
          svgShape.set({
            left: targetX,
            top: targetY,
            originX: 'center',
            originY: 'center',
            strokeUniform: true,
            selectable: true,
            hasControls: true,
            cornerColor: '#E5A93C',
            cornerStyle: 'circle',
            borderColor: '#E5A93C',
            cornerSize: 8,
            transparentCorners: false,
            data: {
              type: 'balloon_shape',
              balloonId,
              presetId: preset.id,
              balloonType: preset.tipo
            }
          })

          const shapeW = svgShape.width * (svgShape.scaleX || 1)
          const usableTextWidth = Math.max(90, shapeW * 0.72)

          const textBox = new fabric.Textbox(textoFinal, {
            left: targetX,
            top: targetY,
            originX: 'center',
            originY: 'center',
            width: usableTextWidth,
            fontFamily: fontPrincipal,
            fontSize: preset.fontSize || 18,
            fill: preset.textColor || '#000000',
            textAlign: 'center',
            splitByGrapheme: false,
            editable: true,
            selectable: true,
            hasControls: true,
            cornerColor: '#E5A93C',
            cornerStyle: 'circle',
            borderColor: '#E5A93C',
            cornerSize: 8,
            transparentCorners: false,
            data: {
              type: 'balloon_text',
              balloonId,
              presetId: preset.id
            }
          })

          canvas.add(svgShape)
          canvas.add(textBox)
          canvas.setActiveObject(textBox)
          canvas.renderAll()
          guardarEstado(canvas)
        },
        null,
        { crossOrigin: 'anonymous' }
      )
    },

    // Insertar Onomatopeya / SFX con estilo tipográfico y ángulo dinámico
    insertarSFX: (sfx, posX = null, posY = null) => {
      const canvas = fabricRef.current
      if (!canvas || !sfx) return

      const x = posX !== null && posX !== undefined ? posX : CANVAS_W / 2
      const y = posY !== null && posY !== undefined ? posY : CANVAS_H / 2

      const sfxObj = new fabric.IText(sfx.texto, {
        left: x,
        top: y,
        originX: 'center',
        originY: 'center',
        fontFamily: sfx.fontFamily || 'Bangers',
        fontSize: sfx.fontSize || 44,
        fill: sfx.fill || '#E53E3E',
        stroke: sfx.stroke || '#000000',
        strokeWidth: sfx.strokeWidth || 3,
        paintFirst: 'stroke',
        angle: sfx.angle || 0,
        shadow: new fabric.Shadow({
          color: sfx.shadowColor || 'rgba(0,0,0,0.6)',
          blur: sfx.shadowBlur || 8,
          offsetX: 3,
          offsetY: 3
        }),
        editable: true,
        selectable: true,
        hasControls: true,
        cornerColor: '#E5A93C',
        cornerStyle: 'circle',
        borderColor: '#E5A93C',
        cornerSize: 8,
        transparentCorners: false,
        data: {
          type: 'sfx_text',
          tipo: 'onomatopeya',
          sfxId: sfx.id
        }
      })

      canvas.add(sfxObj)
      canvas.bringToFront(sfxObj)
      canvas.setActiveObject(sfxObj)
      canvas.renderAll()
      guardarEstado(canvas)
    },

    // Restablecer el lienzo a plantilla limpia activa (purgando borradores corruptos)
    reconstruirPlantilla: (plantillaKey = null) => {
      const canvas = fabricRef.current
      if (!canvas) return
      canvas.clear()
      canvas.backgroundColor = '#FFFFFF'
      const targetPlantilla = plantillaKey || paginaActiva?.layout_template || plantillaActiva || 'grid_4_regular'
      instanciarMarcosPlantilla(canvas, targetPlantilla)
      canvas.renderAll()
      guardarEstado(canvas)
      if (paginaActiva?.id) {
        try {
          localStorage.removeItem(`editor_draft_${paginaActiva.id}`)
        } catch (_) {}
      }
      if (onGuardar) {
        onGuardar()
      }
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

    // Inserción infalible de imagen en viñeta con modo cover y clipPath
    insertarImagenEnVineta: async (imagenSrc, targetObjOrVineta = null, coords = null) => {
      const canvas = fabricRef.current
      if (!canvas) return

      let marcoDestino = null

      // 1. Coordenadas directas (p.ej. de Drop)
      if (coords) {
        marcoDestino = canvas.getObjects().find(o => {
          if (o.data?.tipo !== 'vineta' && o.data?.type !== 'panel') return false
          const w = o.getScaledWidth()
          const h = o.getScaledHeight()
          return coords.x >= o.left && coords.x <= o.left + w &&
                 coords.y >= o.top && coords.y <= o.top + h
        })
      }

      // 2. Si targetObjOrVineta ya es un objeto Fabric de viñeta
      if (!marcoDestino && targetObjOrVineta && (targetObjOrVineta.type || targetObjOrVineta.getScaledWidth)) {
        if (targetObjOrVineta.data?.tipo === 'vineta' || targetObjOrVineta.data?.type === 'panel') {
          marcoDestino = targetObjOrVineta
        }
      }

      // 3. Si hay un marco actualmente seleccionado en el canvas
      if (!marcoDestino) {
        const activo = canvas.getActiveObject()
        if (activo && (activo.data?.tipo === 'vineta' || activo.data?.type === 'panel')) {
          marcoDestino = activo
        }
      }

      // 4. Si no hay selección, buscar el marco por ordinal de la viñeta o el primer marco libre
      if (!marcoDestino) {
        let marcos = canvas.getObjects().filter(o => o.data?.tipo === 'vineta' || o.data?.type === 'panel')
        if (marcos.length === 0) {
          const plantillaId = paginaActiva?.layout_template || plantillaActiva || 'grid_4_regular'
          marcos = instanciarMarcosPlantilla(canvas, plantillaId)
        }

        // A) Buscar por vineta_num ordinal
        const numVineta = typeof targetObjOrVineta === 'number'
          ? targetObjOrVineta
          : (targetObjOrVineta?.vineta_num ? Number(targetObjOrVineta.vineta_num) : null)

        if (numVineta && marcos[numVineta - 1]) {
          marcoDestino = marcos[numVineta - 1]
        }

        // B) Si no, buscar el primer marco libre (sin panel_image)
        if (!marcoDestino) {
          const imagenes = canvas.getObjects().filter(o => o.data?.tipo === 'panel_image' || o.data?.type === 'panel_image')
          const marcoLibre = marcos.find(m => {
            const mId = m.data?.panelId || m.data?.id
            return !imagenes.some(img => (img.data?.panelId || img.data?.id) === mId)
          })
          marcoDestino = marcoLibre || marcos[0]
        }
      }

      if (marcoDestino) {
        insertarImagenEnVineta(canvas, imagenSrc, marcoDestino)
        guardarEstado(canvas)
      }
    },

    // Métodos tipográficos y de formato (accesibles desde EditorToolbar)
    actualizarPropiedadTexto,
    setTextStroke,
    setTextShadow,
    setShapeFill,
    setShapeStroke,
    cambiarTamanoTexto,
    toggleNegrita,
    toggleCursiva,
    setAlineacion: (align) => actualizarPropiedadTexto('textAlign', align),
    setColor: (color) => actualizarPropiedadTexto('fill', color),
    setFontFamily: (font) => actualizarPropiedadTexto('fontFamily', font),
    setFontSize: (size) => actualizarPropiedadTexto('fontSize', size),
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
        if (!canvas) return

        // 1. Detección de preset de bocadillo o SFX (JSON)
        const jsonStr = e.dataTransfer.getData('application/json')
        if (jsonStr) {
          try {
            const parsed = JSON.parse(jsonStr)
            if (parsed.type === 'balloon_preset' && parsed.preset) {
              const canvasEl = canvas.upperCanvasEl || elementoCanvasRef.current
              const rect = canvasEl.getBoundingClientRect()
              const x = (e.clientX - rect.left) * (canvas.width / rect.width)
              const y = (e.clientY - rect.top) * (canvas.height / rect.height)
              if (canvasRef?.current?.insertarBocadilloPreset) {
                canvasRef.current.insertarBocadilloPreset(parsed.preset, x, y, parsed.texto)
              }
              return
            }
            if (parsed.type === 'sfx_preset' && parsed.sfx) {
              const canvasEl = canvas.upperCanvasEl || elementoCanvasRef.current
              const rect = canvasEl.getBoundingClientRect()
              const x = (e.clientX - rect.left) * (canvas.width / rect.width)
              const y = (e.clientY - rect.top) * (canvas.height / rect.height)
              if (canvasRef?.current?.insertarSFX) {
                canvasRef.current.insertarSFX(parsed.sfx, x, y)
              }
              return
            }
          } catch (_) {}
        }

        // 2. Viñeta o imagen desde URL o JSON
        let imgSrc = ''
        if (jsonStr) {
          try {
            const parsed = JSON.parse(jsonStr)
            imgSrc = parsed.url || parsed.imagen_url || ''
          } catch (_) {}
        }
        if (!imgSrc) {
          imgSrc = e.dataTransfer.getData('text/plain')
        }
        if (!imgSrc) return

        const canvasEl = canvas.upperCanvasEl || elementoCanvasRef.current
        const rect = canvasEl.getBoundingClientRect()
        const pointer = {
          x: (e.clientX - rect.left) * (canvas.width / rect.width),
          y: (e.clientY - rect.top) * (canvas.height / rect.height)
        }

        // Localizar el marco que contiene el punto
        const marcoDestino = canvas.getObjects().find(o => {
          if (o.data?.tipo !== 'vineta' && o.data?.type !== 'panel') return false
          const w = o.getScaledWidth()
          const h = o.getScaledHeight()
          return pointer.x >= o.left && pointer.x <= o.left + w &&
                 pointer.y >= o.top && pointer.y <= o.top + h
        })

        if (marcoDestino) {
          insertarImagenEnVineta(canvas, imgSrc, marcoDestino)
          guardarEstado(canvas)
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