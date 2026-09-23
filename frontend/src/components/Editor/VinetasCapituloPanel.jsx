// VinetasCapituloPanel.jsx
// Bandeja lateral de "Viñetas del Capítulo" para el Editor de Páginas (Fabric.js).
// Permite arrastrar o insertar viñetas generadas en PanelArtStudio directamente en los marcos del lienzo,
// así como generar bocadillos de diálogo con rotulación automática.

import React, { useEffect, useState, useMemo, useRef } from 'react'
import {
  Image as ImageIcon,
  Plus,
  MessageSquare,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Move,
  CheckCircle2,
  Film,
  FolderUp
} from 'lucide-react'
import useProjectStore from '../../store/projectStore'
import useEditorStore from '../../store/editorStore'
import { obtenerUrlImagen } from '../../services/api'
import Spinner from '../UI/Spinner'

export default function VinetasCapituloPanel({ onInsertarImagen, onCrearBocadillo }) {
  const {
    proyectoActivo,
    cargarVinetasCatalogo,
    subirImagenesCapitulo,
    getVinetasCapitulo,
    cargandoVinetasCatalogo,
    vinetasCatalogo,
    vinetasEstudio
  } = useProjectStore()

  const { capitulos, capituloActivo, paginaActiva } = useEditorStore()

  const [capituloSeleccionado, setCapituloSeleccionado] = useState(
    capituloActivo?.numero || 1
  )
  const [subiendo, setSubiendo] = useState(false)
  const fileInputRef = useRef(null)

  // Sincronizar capítulo cuando cambie la selección en el editor
  useEffect(() => {
    if (capituloActivo?.numero) {
      setCapituloSeleccionado(Number(capituloActivo.numero))
    }
  }, [capituloActivo?.numero])

  // Cargar catálogo de viñetas desde SQLite al montar o cambiar de proyecto
  useEffect(() => {
    if (proyectoActivo?.id) {
      cargarVinetasCatalogo(proyectoActivo.id)
    }
  }, [proyectoActivo?.id, cargarVinetasCatalogo])

  // Subir / Importar imágenes locales (.png, .jpg, .webp)
  const handleSeleccionarArchivos = async (e) => {
    const files = e.target.files
    if (!files || files.length === 0 || !proyectoActivo?.id) return
    try {
      setSubiendo(true)
      await subirImagenesCapitulo(proyectoActivo.id, capituloSeleccionado, files)
    } catch (err) {
      console.error('Error al importar imágenes:', err)
      alert('Error al importar imágenes: ' + (err.response?.data?.detail || err.message))
    } finally {
      setSubiendo(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Obtener viñetas filtradas por el capítulo seleccionado (combinando BD + memoria en tiempo real)
  const vinetas = useMemo(() => {
    return getVinetasCapitulo(capituloSeleccionado)
  }, [getVinetasCapitulo, capituloSeleccionado, vinetasCatalogo, vinetasEstudio])

  return (
    <div className="flex flex-col h-full bg-rdc-secondary text-rdc-text">
      {/* ── Cabecera de la Bandeja ── */}
      <div className="p-3 border-b border-rdc-border space-y-2.5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-rdc-accent" />
            <h3 className="font-titulo text-xs font-black uppercase tracking-wider text-rdc-text">
              Viñetas del Capítulo
            </h3>
          </div>
          <button
            type="button"
            onClick={() => proyectoActivo?.id && cargarVinetasCatalogo(proyectoActivo.id)}
            disabled={cargandoVinetasCatalogo || subiendo}
            className="text-rdc-muted hover:text-rdc-accent transition-colors p-1 rounded-md cursor-pointer disabled:opacity-50"
            title="Recargar catálogo de viñetas"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cargandoVinetasCatalogo || subiendo ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Selector de Capítulo */}
        {capitulos && capitulos.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-rdc-muted font-titulo">Capítulo:</span>
            <select
              value={capituloSeleccionado}
              onChange={(e) => setCapituloSeleccionado(Number(e.target.value))}
              className="flex-1 text-xs py-1 px-2 rounded-lg border border-rdc-border bg-rdc-primary text-rdc-text focus:outline-none focus:ring-1 focus:ring-rdc-accent font-titulo font-bold"
            >
              {capitulos.map((c) => (
                <option key={c.id || c.numero} value={c.numero}>
                  Capítulo {c.numero} {c.titulo ? `— ${c.titulo}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Input y Botón de Importar / Subir Imágenes Locales */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleSeleccionarArchivos}
          multiple
          accept=".png,.jpg,.jpeg,.webp"
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={subiendo || cargandoVinetasCatalogo}
          className="w-full py-1.5 px-2.5 rounded-lg bg-rdc-card hover:bg-rdc-primary border border-rdc-border hover:border-rdc-accent text-rdc-text text-xs font-titulo font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
          title="Importar imágenes locales (.png, .jpg, .webp)"
        >
          {subiendo ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-rdc-accent" />
              <span>Importando imágenes...</span>
            </>
          ) : (
            <>
              <FolderUp className="w-3.5 h-3.5 text-rdc-accent" />
              <span>📂 Subir / Importar Imágenes</span>
            </>
          )}
        </button>

        <p className="text-[11px] text-rdc-muted leading-tight">
          Arrastra una viñeta al lienzo o pulsa <strong>Insertar</strong> para colocarla en el marco seleccionado.
        </p>
      </div>

      {/* ── Lista de Viñetas Disponibles ── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {cargandoVinetasCatalogo ? (
          <div className="py-12 text-center">
            <Spinner texto="Cargando viñetas del capítulo..." size="sm" />
          </div>
        ) : vinetas.length === 0 ? (
          <div className="p-4 text-center rounded-xl border border-dashed border-rdc-border bg-rdc-primary/40 space-y-2 mt-2">
            <ImageIcon className="w-8 h-8 text-rdc-muted mx-auto opacity-40" />
            <p className="font-titulo text-xs font-bold text-rdc-text">
              No hay viñetas generadas en este capítulo
            </p>
            <p className="text-[11px] text-rdc-muted leading-relaxed">
              Genera ilustraciones con FLUX.1 en la herramienta "Generador de Viñetas" del Studio para maquetarlas aquí.
            </p>
          </div>
        ) : (
          vinetas.map((vin, idx) => {
            const urlCompleta = obtenerUrlImagen(vin.imagen_url)
            return (
              <div
                key={vin.id || idx}
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', urlCompleta)
                  e.dataTransfer.setData('application/json', JSON.stringify(vin))
                  e.dataTransfer.effectAllowed = 'copy'
                }}
                className="group relative rounded-xl border border-rdc-border bg-rdc-primary p-2.5 space-y-2 shadow-xs hover:border-rdc-accent transition-all cursor-grab active:cursor-grabbing"
              >
                {/* Miniatura y Badge */}
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-rdc-border bg-slate-950 flex items-center justify-center">
                  <img
                    src={urlCompleta}
                    alt={`Viñeta ${vin.vineta_num}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />
                  <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/75 text-white font-mono text-[10px] font-bold">
                    Pág. {vin.pagina_num} · Viñeta #{vin.vineta_num}
                  </div>
                  <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-medium">
                    <Move className="w-3 h-3 text-amber-300" />
                    <span>Arrastrar</span>
                  </div>
                </div>

                {/* Plano y Detalles */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-titulo font-bold text-rdc-accent truncate">
                      {vin.plano || 'Plano Medio'}
                    </span>
                  </div>

                  {vin.descripcion_escena && (
                    <p className="text-[11px] text-rdc-muted line-clamp-2 leading-relaxed">
                      {vin.descripcion_escena}
                    </p>
                  )}

                  {/* Diálogo Asociado */}
                  {vin.dialogo && (
                    <div className="p-1.5 rounded-md bg-rdc-secondary/70 border border-rdc-border text-[10px] text-rdc-text italic line-clamp-2 flex items-start gap-1">
                      <MessageSquare className="w-3 h-3 text-indigo-400 flex-shrink-0 mt-0.5" />
                      <span>"{vin.dialogo}"</span>
                    </div>
                  )}
                </div>

                {/* Botonera de Acción Rápida */}
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => onInsertarImagen?.(urlCompleta, vin)}
                    className="flex-1 py-1 px-2 rounded-lg bg-rdc-accent hover:bg-rdc-accent-hover text-white text-[11px] font-titulo font-bold flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
                    title="Insertar en la viñeta activa del lienzo"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Insertar</span>
                  </button>

                  {vin.dialogo && onCrearBocadillo && (
                    <button
                      type="button"
                      onClick={() => onCrearBocadillo(vin.dialogo)}
                      className="py-1 px-2 rounded-lg border border-rdc-border bg-rdc-secondary hover:bg-rdc-card text-rdc-text text-[11px] font-titulo font-semibold flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
                      title="Insertar bocadillo con el diálogo de esta viñeta"
                    >
                      <MessageSquare className="w-3 h-3 text-indigo-400" />
                      <span>Bocadillo</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── Footer / Contador ── */}
      <div className="p-2.5 border-t border-rdc-border bg-rdc-primary/50 flex items-center justify-between text-[11px] text-rdc-muted font-mono flex-shrink-0">
        <span>{vinetas.length} ilustraciones</span>
        <span className="text-[10px] text-emerald-500 font-sans font-bold flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Activas para rotulación
        </span>
      </div>
    </div>
  )
}
