// VinetasCapituloPanel.jsx
// Bandeja lateral de "Viñetas del Capítulo" para el Editor de Páginas (Fabric.js).
// Permite arrastrar o insertar viñetas generadas en PanelArtStudio directamente en los marcos del lienzo,
// así como generar bocadillos de diálogo con rotulación automática.

import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
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
import { insertarImagenEnVineta } from './MangaCanvas'
import Spinner from '../UI/Spinner'

export default function VinetasCapituloPanel({ onInsertarImagen, onCrearBocadillo, canvasRef }) {
  const { t } = useTranslation()
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

  const formatPlano = (plano) => {
    if (!plano) return t('editor.panelsSidebar.shotTypes.medium') || 'Plano Medio'
    const p = plano.toLowerCase().replace(/[-_ ]/g, '')
    if (p.includes('wide') || p.includes('general') || p.includes('panoramico')) {
      return t('editor.panelsSidebar.shotTypes.wide') || 'Plano General'
    }
    if (p.includes('close') || p.includes('primer')) {
      return t('editor.panelsSidebar.shotTypes.closeUp') || 'Primer Plano'
    }
    if (p.includes('full') || p.includes('entero')) {
      return t('editor.panelsSidebar.shotTypes.full') || 'Plano Entero'
    }
    return t('editor.panelsSidebar.shotTypes.medium') || 'Plano Medio'
  }

  // Obtener viñetas filtradas por el capítulo seleccionado (combinando BD + memoria en tiempo real)
  const vinetas = useMemo(() => {
    return getVinetasCapitulo(capituloSeleccionado)
  }, [getVinetasCapitulo, capituloSeleccionado, vinetasCatalogo, vinetasEstudio])

  const handleInsertarVineta = (vin) => {
    const canvas = canvasRef?.current?.getFabricCanvas?.() || canvasRef?.current?.canvas
    const url = vin.imagen_url

    if (canvas) {
      // 1. Verificar si hay un marco seleccionado en el canvas
      const activo = canvas.getActiveObject()
      let marcoDestino = null
      if (activo && (activo.data?.tipo === 'vineta' || activo.data?.type === 'panel')) {
        marcoDestino = activo
      } else {
        // 2. Si no, buscar el primer marco disponible (tipo === 'vineta')
        const marcos = canvas.getObjects().filter(o => o.data?.tipo === 'vineta' || o.data?.type === 'panel')
        const imagenes = canvas.getObjects().filter(o => o.data?.tipo === 'panel_image')
        const marcoVacio = marcos.find(m => {
          const mId = m.data?.panelId || m.data?.id
          return !imagenes.some(img => (img.data?.panelId || img.data?.id) === mId)
        })
        marcoDestino = marcoVacio || marcos[0]
      }

      if (marcoDestino) {
        insertarImagenEnVineta(canvas, url, marcoDestino)
        return
      }
    }

    if (onInsertarImagen) {
      const urlCompleta = obtenerUrlImagen(vin.imagen_url)
      onInsertarImagen(urlCompleta, vin)
    }
  }

  return (
    <div className="flex flex-col h-full bg-rdc-secondary text-rdc-text">
      {/* ── Cabecera de la Bandeja ── */}
      <div className="p-3 border-b border-rdc-border space-y-2.5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-rdc-accent" />
            <h3 className="font-titulo text-xs font-black uppercase tracking-wider text-rdc-text">
              {t('editor.panelsSidebar.title')}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => proyectoActivo?.id && cargarVinetasCatalogo(proyectoActivo.id)}
            disabled={cargandoVinetasCatalogo || subiendo}
            className="text-rdc-muted hover:text-rdc-accent transition-colors p-1 rounded-md cursor-pointer disabled:opacity-50"
            title={t('editor.panelsSidebar.reloadCatalog')}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cargandoVinetasCatalogo || subiendo ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Selector de Capítulo */}
        {capitulos && capitulos.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-rdc-muted font-titulo">
              {t('editor.panelsSidebar.chapter')}:
            </span>
            <select
              value={capituloSeleccionado}
              onChange={(e) => setCapituloSeleccionado(Number(e.target.value))}
              className="flex-1 text-xs py-1 px-2 rounded-lg border border-rdc-border bg-rdc-primary text-rdc-text focus:outline-none focus:ring-1 focus:ring-rdc-accent font-titulo font-bold"
            >
              {capitulos.map((c) => (
                <option key={c.id || c.numero} value={c.numero}>
                  {t('editor.panelsSidebar.chapter')} {c.numero} {c.titulo ? `— ${c.titulo}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Input y Botón de Importar / Subir Imágenes Locales */}
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept=".png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={handleSeleccionarArchivos}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={subiendo || cargandoVinetasCatalogo}
          className="w-full py-1.5 px-2.5 rounded-lg bg-rdc-card hover:bg-rdc-primary border border-rdc-border hover:border-rdc-accent text-rdc-text text-xs font-titulo font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
          title={t('editor.panelsSidebar.uploadImages')}
        >
          {subiendo ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-rdc-accent" />
              <span>{t('editor.panelsSidebar.importing')}</span>
            </>
          ) : (
            <>
              <FolderUp className="w-3.5 h-3.5 text-rdc-accent" />
              <span>📂 {t('editor.panelsSidebar.uploadImages')}</span>
            </>
          )}
        </button>

        <p className="text-[11px] text-rdc-muted leading-tight">
          {t('editor.panelsSidebar.dragHint')}
        </p>
      </div>

      {/* ── Lista de Viñetas Disponibles ── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {cargandoVinetasCatalogo ? (
          <div className="py-12 text-center">
            <Spinner texto={t('editor.panelsSidebar.loadingPanels')} size="sm" />
          </div>
        ) : vinetas.length === 0 ? (
          <div className="p-4 text-center rounded-xl border border-dashed border-rdc-border bg-rdc-primary/40 space-y-2 mt-2">
            <ImageIcon className="w-8 h-8 text-rdc-muted mx-auto opacity-40" />
            <p className="font-titulo text-xs font-bold text-rdc-text">
              {t('editor.panelsSidebar.noPanels')}
            </p>
            <p className="text-[11px] text-rdc-muted leading-relaxed">
              {t('editor.panelsSidebar.noPanelsDesc')}
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
                  e.dataTransfer.setData('text/plain', vin.imagen_url)
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
                    {t('reader.page') || 'Pág.'} {vin.pagina_num} · #{vin.vineta_num}
                  </div>
                  <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-medium">
                    <Move className="w-3 h-3 text-amber-300" />
                    <span>{t('editor.panelsSidebar.drag')}</span>
                  </div>
                </div>

                {/* Plano y Detalles */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-titulo font-bold text-rdc-accent truncate">
                      {formatPlano(vin.plano)}
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
                    onClick={() => handleInsertarVineta(vin)}
                    className="flex-1 py-1 px-2 rounded-lg bg-rdc-accent hover:bg-rdc-accent-hover text-white text-[11px] font-titulo font-bold flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
                    title={t('editor.panelsSidebar.insert')}
                  >
                    <Plus className="w-3 h-3" />
                    <span>{t('editor.panelsSidebar.insert')}</span>
                  </button>

                  {vin.dialogo && onCrearBocadillo && (
                    <button
                      type="button"
                      onClick={() => onCrearBocadillo(vin.dialogo)}
                      className="py-1 px-2 rounded-lg border border-rdc-border bg-rdc-secondary hover:bg-rdc-card text-rdc-text text-[11px] font-titulo font-semibold flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
                      title={t('editor.panelsSidebar.insertBalloon')}
                    >
                      <MessageSquare className="w-3 h-3 text-indigo-400" />
                      <span>{t('editor.panelsSidebar.insertBalloon')}</span>
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
        <span>{t('editor.panelsSidebar.illustrationsCount', { count: vinetas.length })}</span>
        <span className="text-[10px] text-emerald-500 font-sans font-bold flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> {t('editor.panelsSidebar.activeForLettering')}
        </span>
      </div>
    </div>
  )
}
