// LayersPanel.jsx
// Panel de gestión de capas con reordenamiento z-index, visibilidad, bloqueo y eliminación de objetos en Fabric.js.

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export default function LayersPanel({ canvas, onActualizar }) {
  const { t } = useTranslation()
  const [objetos, setObjetos] = useState([])
  const [objetoActivo, setObjetoActivo] = useState(null)
  const [editandoId, setEditandoId] = useState(null)
  const [nombreEditado, setNombreEditado] = useState('')

  const sincronizarCapas = () => {
    if (!canvas) {
      setObjetos([])
      return
    }

    const todos = canvas.getObjects().filter(o => !o.data?.esGuiaAlineacion)
    // Invertir para que la capa superior aparezca al inicio de la lista
    setObjetos([...todos].reverse())
    setObjetoActivo(canvas.getActiveObject())
  }

  useEffect(() => {
    if (!canvas) return

    sincronizarCapas()

    const handleEventos = () => sincronizarCapas()

    canvas.on('object:added', handleEventos)
    canvas.on('object:removed', handleEventos)
    canvas.on('object:modified', handleEventos)
    canvas.on('selection:created', handleEventos)
    canvas.on('selection:updated', handleEventos)
    canvas.on('selection:cleared', handleEventos)

    return () => {
      canvas.off('object:added', handleEventos)
      canvas.off('object:removed', handleEventos)
      canvas.off('object:modified', handleEventos)
      canvas.off('selection:created', handleEventos)
      canvas.off('selection:updated', handleEventos)
      canvas.off('selection:cleared', handleEventos)
    }
  }, [canvas])

  // Obtener icono y etiqueta según tipo de objeto
  const getInfoObjeto = (obj, idxOriginal) => {
    const tipo = obj.data?.tipo || obj.data?.type || obj.tipo || obj.type
    if (tipo === 'vineta' || tipo === 'panel') {
      const pId = obj.data?.panelId || obj.data?.id
      return { icon: '⬛', nombre: obj.data?.nombre || `Marco de Viñeta ${pId ? '#' + pId : idxOriginal + 1}` }
    }
    if (tipo === 'panel_image') {
      const pId = obj.data?.panelId || obj.data?.id
      return { icon: '🖼️', nombre: obj.data?.nombre || `Ilustración Viñeta ${pId ? '#' + pId : idxOriginal + 1}` }
    }
    if (tipo === 'balloon_shape') {
      return { icon: '💬', nombre: obj.data?.nombre || `Silueta Bocadillo` }
    }
    if (tipo === 'balloon_text') {
      const extracto = (obj.text || '').slice(0, 15)
      return { icon: '📝', nombre: obj.data?.nombre || (extracto ? `"${extracto}..."` : `Texto Bocadillo`) }
    }
    if (tipo === 'free_text') {
      const extracto = (obj.text || '').slice(0, 15)
      return { icon: '✏️', nombre: obj.data?.nombre || (extracto ? `"${extracto}..."` : `Texto Libre / Cartela`) }
    }
    if (tipo === 'sfx' || tipo === 'sfx_text') {
      const extracto = (obj.text || '').slice(0, 15)
      return { icon: '💥', nombre: obj.data?.nombre || (extracto ? `SFX: ${extracto}` : `Onomatopeya SFX`) }
    }
    if (tipo === 'kinetic_fx' || tipo === 'fx_layer') {
      return { icon: '⚡', nombre: obj.data?.nombre || `Efecto Cinético` }
    }
    if (tipo === 'bocadillo_dialogo') {
      return { icon: '💬', nombre: obj.data?.nombre || `${t('editor.layers.dialogue')} ${idxOriginal + 1}` }
    }
    if (tipo === 'bocadillo_pensamiento') {
      return { icon: '💭', nombre: obj.data?.nombre || `${t('editor.layers.thought')} ${idxOriginal + 1}` }
    }
    if (tipo === 'bocadillo_narracion') {
      return { icon: '📋', nombre: obj.data?.nombre || `${t('editor.layers.narration')} ${idxOriginal + 1}` }
    }
    if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
      const extracto = (obj.text || '').slice(0, 12)
      return { icon: '✏️', nombre: obj.data?.nombre || (extracto ? `"${extracto}..."` : t('editor.layers.text')) }
    }
    if (obj.type === 'image') {
      return { icon: '🖼️', nombre: obj.data?.nombre || t('editor.layers.image') }
    }
    if (obj.type === 'path') {
      return { icon: '🖌️', nombre: obj.data?.nombre || `Trazo de Pincel` }
    }
    return { icon: '🎨', nombre: obj.data?.nombre || t('editor.layers.drawing') }
  }

  const limpiarHuerfanos = () => {
    if (!canvas) return
    const objetos = canvas.getObjects()
    const marcosIds = new Set(
      objetos
        .filter(o => o.data?.tipo === 'vineta' || o.data?.type === 'panel')
        .map(o => o.data?.panelId || o.data?.id)
        .filter(Boolean)
    )

    const aEliminar = objetos.filter(o => {
      // Ignorar guías de alineación
      if (o.data?.esGuiaAlineacion) return false

      const tipo = o.data?.tipo || o.data?.type

      // 1. Marcos de viñeta
      if (tipo === 'vineta' || tipo === 'panel') return false

      // 2. Ilustración asignada a un marco existente
      if (tipo === 'panel_image' && o.data?.panelId && marcosIds.has(o.data.panelId)) {
        return false
      }

      // 3. Bocadillos y textos de bocadillo
      if (
        tipo === 'balloon' ||
        tipo === 'balloon_shape' ||
        tipo === 'balloon_text' ||
        o.data?.balloonId ||
        tipo === 'bocadillo' ||
        tipo === 'bocadillo_dialogo' ||
        tipo === 'bocadillo_pensamiento' ||
        tipo === 'bocadillo_narracion'
      ) {
        return false
      }

      // 4. Texto libre / cartela
      if (tipo === 'free_text') return false

      // 5. Efectos cinéticos / tramas
      if (tipo === 'kinetic_fx' || tipo === 'fx_layer') return false

      // 6. Onomatopeyas SFX
      if (tipo === 'sfx' || tipo === 'sfx_text') return false

      // Cualquier otro objeto (p.ej. 'path' de pinceles fantasma, ilustraciones huérfanas) se purga
      return true
    })

    if (aEliminar.length > 0) {
      aEliminar.forEach(obj => canvas.remove(obj))
      canvas.discardActiveObject()
      canvas.renderAll()
      sincronizarCapas()
      onActualizar?.()
    }
  }

  const seleccionarObjeto = (obj) => {
    if (!canvas || !obj.visible) return
    canvas.setActiveObject(obj)
    canvas.renderAll()
    setObjetoActivo(obj)
  }

  const toggleVisibilidad = (obj, e) => {
    e.stopPropagation()
    if (!canvas) return
    const nuevaVisibilidad = !obj.visible
    obj.set('visible', nuevaVisibilidad)
    if (!nuevaVisibilidad && canvas.getActiveObject() === obj) {
      canvas.discardActiveObject()
    }
    canvas.renderAll()
    sincronizarCapas()
    onActualizar?.()
  }

  const toggleBloqueo = (obj, e) => {
    e.stopPropagation()
    if (!canvas) return
    const bloqueado = !obj.lockMovementX
    obj.set({
      lockMovementX: bloqueado,
      lockMovementY: bloqueado,
      lockScalingX: bloqueado,
      lockScalingY: bloqueado,
      lockRotation: bloqueado,
      selectable: !bloqueado,
      evented: true,
      hasControls: !bloqueado,
    })
    canvas.renderAll()
    sincronizarCapas()
    onActualizar?.()
  }

  const moverCapa = (obj, direccion, e) => {
    e.stopPropagation()
    if (!canvas) return
    if (direccion === 'arriba') canvas.bringForward(obj)
    if (direccion === 'abajo') canvas.sendBackwards(obj)
    if (direccion === 'frente') canvas.bringToFront(obj)
    if (direccion === 'fondo') canvas.sendToBack(obj)

    canvas.renderAll()
    sincronizarCapas()
    onActualizar?.()
  }

  const eliminarObjeto = (obj, e) => {
    e.stopPropagation()
    if (!canvas) return
    canvas.remove(obj)
    canvas.discardActiveObject()
    canvas.renderAll()
    sincronizarCapas()
    onActualizar?.()
  }

  const iniciarRenombrar = (obj, nombreActual, e) => {
    e.stopPropagation()
    setEditandoId(obj)
    setNombreEditado(nombreActual)
  }

  const guardarNombre = (obj) => {
    if (!obj.data) obj.data = {}
    obj.data.nombre = nombreEditado.trim()
    setEditandoId(null)
    sincronizarCapas()
    onActualizar?.()
  }

  return (
    <div className="flex flex-col h-full bg-rdc-secondary text-xs">
      <div className="p-3 border-b border-rdc-border flex items-center justify-between gap-2">
        <p className="font-titulo font-bold text-rdc-text tracking-wide text-xs truncate">
          📑 {t('editor.layers.title')} ({objetos.length})
        </p>
        <button
          type="button"
          onClick={limpiarHuerfanos}
          className="px-2 py-1 bg-rdc-card hover:bg-rdc-primary border border-rdc-border hover:border-amber-500 text-amber-400 hover:text-amber-300 text-[11px] font-titulo font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-xs flex-shrink-0"
          title="Elimina trazos de pincel huérfanos e ilustraciones flotantes no asignadas a viñetas"
        >
          <span>🧹 Limpiar Huérfanos</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {objetos.length === 0 ? (
          <div className="text-center py-8 text-rdc-muted text-xs font-titulo">
            <p className="text-2xl mb-1.5 opacity-60">📑</p>
            {t('editor.layers.noObjects')}
          </div>
        ) : (
          objetos.map((obj, i) => {
            const idxOriginal = objetos.length - 1 - i
            const { icon, nombre } = getInfoObjeto(obj, idxOriginal)
            const esActivo = objetoActivo === obj
            const esBloqueado = obj.lockMovementX
            const esVisible = obj.visible !== false

            return (
              <div
                key={i}
                onClick={() => seleccionarObjeto(obj)}
                className={`group flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                  esActivo
                    ? 'bg-rdc-accent/15 border-rdc-accent text-rdc-text font-semibold shadow-sm'
                    : 'bg-rdc-card/70 border-rdc-border hover:border-rdc-border-hover text-rdc-muted hover:text-rdc-text'
                } ${!esVisible ? 'opacity-40' : ''}`}
              >
                {/* Nombre y tipo */}
                <div className="flex items-center gap-2 overflow-hidden flex-1 mr-1">
                  <span className="text-sm">{icon}</span>
                  {editandoId === obj ? (
                    <input
                      type="text"
                      value={nombreEditado}
                      onChange={(e) => setNombreEditado(e.target.value)}
                      onBlur={() => guardarNombre(obj)}
                      onKeyDown={(e) => e.key === 'Enter' && guardarNombre(obj)}
                      autoFocus
                      className="bg-rdc-secondary border border-rdc-accent px-1.5 py-0.5 rounded text-xs text-rdc-text w-full outline-none font-titulo"
                    />
                  ) : (
                    <span
                      onDoubleClick={(e) => iniciarRenombrar(obj, nombre, e)}
                      className="truncate font-titulo text-[11px]"
                      title="Doble clic para renombrar"
                    >
                      {nombre}
                    </span>
                  )}
                </div>

                {/* Acciones de capa */}
                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                  {/* Visibilidad */}
                  <button
                    onClick={(e) => toggleVisibilidad(obj, e)}
                    className="p-1 hover:bg-rdc-secondary rounded text-[11px] transition-colors"
                    title={esVisible ? t('editor.layers.visible') : t('editor.layers.hidden')}
                  >
                    {esVisible ? '👁️' : '🙈'}
                  </button>

                  {/* Bloqueo */}
                  <button
                    onClick={(e) => toggleBloqueo(obj, e)}
                    className="p-1 hover:bg-rdc-secondary rounded text-[11px] transition-colors"
                    title={esBloqueado ? t('editor.layers.locked') : t('editor.layers.unlocked')}
                  >
                    {esBloqueado ? '🔒' : '🔓'}
                  </button>

                  {/* Reordenar Z-Index */}
                  <div className="flex items-center">
                    <button
                      onClick={(e) => moverCapa(obj, 'arriba', e)}
                      className="p-1 hover:bg-rdc-secondary rounded text-[10px]"
                      title={t('editor.layers.bringForward')}
                    >
                      ⬆️
                    </button>
                    <button
                      onClick={(e) => moverCapa(obj, 'abajo', e)}
                      className="p-1 hover:bg-rdc-secondary rounded text-[10px]"
                      title={t('editor.layers.sendBackwards')}
                    >
                      ⬇️
                    </button>
                  </div>

                  {/* Eliminar */}
                  <button
                    onClick={(e) => eliminarObjeto(obj, e)}
                    className="p-1 hover:bg-red-500/20 text-red-400 rounded text-[10px] transition-colors"
                    title={t('editor.layers.delete')}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
