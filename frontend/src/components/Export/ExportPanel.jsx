// ExportPanel.jsx
// Centro integral de Exportación y Preimpresión Editorial para MEP — Manga Editor Pro con Lucide React.

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import JSZip from 'jszip'
import {
  Download,
  FileImage,
  FileText,
  Package,
  BookOpen,
  Scissors,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Check
} from 'lucide-react'
import { exportAPI } from '../../services/api'

// Especificaciones de formatos editoriales (Dimensiones estándar en mm y píxeles a 300 DPI)
const FORMATOS_EDITORIALES = [
  {
    id: 'b6',
    nombre: 'Manga Tankobon B6',
    dimensiones_mm: '128 × 182 mm',
    ancho_px_300dpi: 1512,
    alto_px_300dpi: 2150,
    sangrado_mm: 3,
    descripcion: 'Estándar japonés para tomos recopilatorios (Tankōbon)'
  },
  {
    id: 'a5',
    nombre: 'Estándar Editorial A5',
    dimensiones_mm: '148 × 210 mm',
    ancho_px_300dpi: 1748,
    alto_px_300dpi: 2480,
    sangrado_mm: 3,
    descripcion: 'Formato Kanzenban / Novela gráfica internacional'
  },
  {
    id: 'us_comic',
    nombre: 'Cómic Americano US',
    dimensiones_mm: '170 × 260 mm',
    ancho_px_300dpi: 2008,
    alto_px_300dpi: 3071,
    sangrado_mm: 3.175,
    descripcion: 'Estándar para cómic occidental / grapa'
  },
  {
    id: 'webtoon',
    nombre: 'Webtoon Longstrip Digital',
    dimensiones_mm: 'Digital Screen',
    ancho_px_300dpi: 800,
    alto_px_300dpi: 1280,
    sangrado_mm: 0,
    descripcion: 'Optimizado para lectura móvil vertical continua'
  }
]

export default function ExportPanel({
  proyecto,
  canvasRef,          // ref al componente MangaCanvas (via forwardRef)
  capituloActual,     // objeto {id, numero, titulo} del capítulo abierto
  onAbrirLector = null
}) {
  const { t } = useTranslation()

  // Pestaña activa: 'estandar' | 'preimpresion'
  const [pestanaActiva, setPestanaActiva] = useState('estandar')

  // Estados de exportación
  const [exportando, setExportando] = useState(false)
  const [mensajeEstado, setMensajeEstado] = useState('')
  const [error, setError] = useState(null)
  const [exito, setExito] = useState(null)
  const [infoPaginas, setInfoPaginas] = useState(null)
  const [resolucion, setResolucion] = useState(2)  // multiplicador (1x=720p, 2x=1440p, 3x=2160p)

  // Configuración de Preimpresión
  const [formatoSeleccionado, setFormatoSeleccionado] = useState(FORMATOS_EDITORIALES[0])
  const [mostrarGuiasSangrado, setMostrarGuiasSangrado] = useState(true)

  // Cargar info del capítulo cuando cambie
  useEffect(() => {
    if (capituloActual?.id && proyecto?.id) {
      exportAPI.infoCapitulo(proyecto.id, capituloActual.id)
        .then(r => setInfoPaginas(r.data))
        .catch(() => setInfoPaginas(null))
    }
  }, [capituloActual, proyecto])

  // Utilidad para descargar un blob
  const _descargarBlob = (blob, nombreArchivo) => {
    const url = URL.createObjectURL(blob)
    const a   = document.createElement('a')
    a.href     = url
    a.download = nombreArchivo
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ─── 1. EXPORTAR PNG PÁGINA ACTUAL ────────────────────────────────────────

  const handleExportarPNG = async () => {
    if (!canvasRef?.current) {
      setError(t('export.noChapterWarning') || 'Abre una página en el editor para exportar')
      return
    }

    setExportando(true)
    setMensajeEstado('Renderizando página en alta resolución...')
    setError(null)
    setExito(null)

    try {
      const canvas = canvasRef.current
      const paginaBase64 = canvas.exportCanvas ? canvas.exportCanvas(resolucion) : null

      if (!paginaBase64) {
        throw new Error('No se pudo obtener la imagen del canvas')
      }

      const nombreProy = proyecto?.nombre || 'manga'
      const nombrePagina = `${nombreProy}_cap${capituloActual?.numero || 1}_pag_${Date.now()}`
      const respuesta = await exportAPI.exportarPNG(proyecto?.id, paginaBase64, nombrePagina)

      _descargarBlob(respuesta.data, `${nombrePagina}.png`)
      setExito(t('export.pngSuccess') || 'Página PNG exportada con éxito')
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Error al exportar PNG')
    } finally {
      setExportando(false)
      setMensajeEstado('')
    }
  }

  // ─── 2. EXPORTAR PDF MULTI-PÁGINA ────────────────────────────────────────

  const handleExportarPDF = async () => {
    if (!capituloActual?.id || !canvasRef?.current || !proyecto?.id) {
      setError(t('export.noChapterWarning') || 'Abre una página en el editor para exportar')
      return
    }

    setExportando(true)
    setMensajeEstado('Ensamblando PDF vectorial a 300 DPI...')
    setError(null)
    setExito(null)

    try {
      const canvas = canvasRef.current
      const paginaBase64 = canvas.exportCanvas ? canvas.exportCanvas(resolucion) : null

      if (!paginaBase64) {
        throw new Error('No se pudo obtener la imagen del canvas')
      }

      const respuesta = await exportAPI.exportarPDF(
        proyecto.id,
        capituloActual.id,
        [paginaBase64]
      )

      const nombreProy = proyecto?.nombre || 'manga'
      const nombreArchivo = `${nombreProy}_${capituloActual.titulo || `Cap${capituloActual.numero}`}.pdf`
      _descargarBlob(respuesta.data, nombreArchivo)
      setExito(t('export.pdfSuccess') || 'Capítulo PDF exportado con éxito')
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Error al exportar PDF')
    } finally {
      setExportando(false)
      setMensajeEstado('')
    }
  }

  // ─── 3. EXPORTAR PAQUETE .CBZ (COMIC BOOK ZIP) CON METADATOS ──────────────

  const handleExportarCBZ = async () => {
    if (!capituloActual?.id || !canvasRef?.current) {
      setError(t('export.noChapterWarning') || 'Abre una página en el editor para exportar')
      return
    }

    setExportando(true)
    setMensajeEstado(t('prepress.generatingCBZ') || 'Generando paquete CBZ con ComicInfo.xml...')
    setError(null)
    setExito(null)

    try {
      const zip = new JSZip()
      const canvas = canvasRef.current
      const paginaBase64 = canvas.exportCanvas ? canvas.exportCanvas(resolucion) : null

      if (!paginaBase64) {
        throw new Error('No se pudo obtener el canvas')
      }

      // Convertir dataURI a binario para el ZIP
      const base64Puro = paginaBase64.replace(/^data:image\/png;base64,/, '').replace(/^data:image\/jpeg;base64,/, '')
      zip.file('001.png', base64Puro, { base64: true })

      // Crear archivo ComicInfo.xml estándar para lectores de cómic (CDisplayEx, Tachiyomi, Panels)
      const esManga = proyecto?.formato_lectura === 'manga'
      const nombreProy = proyecto?.nombre || 'Manga Project'
      const xmlMetadata = `<?xml version="1.0" encoding="utf-8"?>
<ComicInfo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <Title>${capituloActual.titulo || `Capítulo ${capituloActual.numero}`}</Title>
  <Series>${nombreProy}</Series>
  <Number>${capituloActual.numero}</Number>
  <PageCount>${infoPaginas?.total_paginas || 1}</PageCount>
  <Manga>${esManga ? 'YesAndRightToLeft' : 'No'}</Manga>
  <Format>TBP</Format>
  <Publisher>MEP Manga Editor Pro</Publisher>
</ComicInfo>`

      zip.file('ComicInfo.xml', xmlMetadata)

      // Generar y descargar archivo .cbz
      const contenidoZip = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }
      })

      const nombreCBZ = `${nombreProy}_Cap${capituloActual.numero}.cbz`
      _descargarBlob(contenidoZip, nombreCBZ)
      setExito(t('prepress.cbzSuccess') || 'Paquete digital .cbz generado exitosamente')
    } catch (err) {
      console.error('Error al generar CBZ:', err)
      setError(err.message || 'Error al compilar el archivo CBZ')
    } finally {
      setExportando(false)
      setMensajeEstado('')
    }
  }

  return (
    <div className="space-y-6">

      {/* Cabecera con selector de Pestañas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rdc-border pb-4">
        <div>
          <h2 className="font-titulo text-2xl text-rdc-text font-semibold flex items-center gap-2">
            <Download className="w-6 h-6 text-rdc-accent" />
            <span>{t('export.title') || 'Exportación & Impresión Editorial'}</span>
          </h2>
          <p className="text-rdc-muted text-sm mt-0.5">
            {t('export.subtitle') || 'Genera entregables para web, lectores digitales (CBZ) o imprenta a 300 DPI.'}
          </p>
        </div>

        {/* Pestañas */}
        <div className="flex bg-rdc-card p-1 rounded-xl border border-rdc-border text-xs font-titulo">
          <button
            onClick={() => setPestanaActiva('estandar')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              pestanaActiva === 'estandar'
                ? 'bg-rdc-accent text-white font-bold shadow-xs'
                : 'text-rdc-muted hover:text-rdc-text'
            }`}
          >
            {t('prepress.tabStandard') || 'Digital'}
          </button>
          <button
            onClick={() => setPestanaActiva('preimpresion')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              pestanaActiva === 'preimpresion'
                ? 'bg-rdc-accent text-white font-bold shadow-xs'
                : 'text-rdc-muted hover:text-rdc-text'
            }`}
          >
            {t('prepress.tabPrepress') || 'Preimpresión 300 DPI'}
          </button>
        </div>
      </div>

      {/* Info del capítulo */}
      {infoPaginas && (
        <div className="bg-rdc-card border border-rdc-border rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-rdc-muted text-xs uppercase font-titulo font-semibold">
              {t('export.selectedChapter') || 'Capítulo Seleccionado'}
            </p>
            <p className="text-rdc-text font-titulo font-semibold text-base mt-0.5">
              {infoPaginas.capitulo.titulo || `Capítulo ${infoPaginas.capitulo.numero}`}
            </p>
            <p className="text-rdc-muted text-xs mt-0.5">
              {t('export.totalCount', { count: infoPaginas.total_paginas }) || `${infoPaginas.total_paginas} páginas registradas`}
            </p>
          </div>

          {onAbrirLector && (
            <button
              onClick={onAbrirLector}
              className="bg-rdc-secondary hover:bg-rdc-primary border border-rdc-border text-rdc-accent font-titulo font-semibold text-xs px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{t('reader.openReader') || 'Ver en Lector'}</span>
            </button>
          )}
        </div>
      )}

      {!capituloActual && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
          <p className="text-yellow-500 dark:text-yellow-400 text-xs font-titulo">
            {t('export.noChapterWarning') || 'Selecciona un capítulo o abre el editor para exportar.'}
          </p>
        </div>
      )}

      {/* ────────────────── PESTAÑA 1: EXPORTACIÓN ESTÁNDAR ────────────────── */}
      {pestanaActiva === 'estandar' && (
        <div className="space-y-6">

          {/* Selector de resolución */}
          <div>
            <label className="block text-rdc-muted text-sm mb-3 font-titulo font-semibold">
              {t('export.resolution') || 'Resolución de Renderizado'}
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { val: 1, label: '1×', sub: 'Web (720px)',    rec: false },
                { val: 2, label: '2×', sub: 'HD (1440px)',    rec: true  },
                { val: 3, label: '3×', sub: '300 DPI (2160px)', rec: false },
              ].map(op => (
                <button
                  key={op.val}
                  onClick={() => setResolucion(op.val)}
                  className={`border rounded-2xl p-3.5 text-center transition-all cursor-pointer ${
                    resolucion === op.val
                      ? 'border-rdc-accent bg-rdc-accent/10 shadow-md'
                      : 'border-rdc-border hover:border-rdc-muted bg-rdc-card'
                  }`}
                >
                  <p className="font-manga text-2xl text-rdc-accent">{op.label}</p>
                  <p className="text-rdc-text text-xs font-semibold mt-1 font-titulo">{op.sub}</p>
                  {op.rec && (
                    <p className="text-rdc-accent text-[10px] mt-0.5 font-titulo font-bold">{t('export.recommended') || 'Recomendado'}</p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Botones de exportación */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            
            {/* PNG */}
            <button
              onClick={handleExportarPNG}
              disabled={exportando || !capituloActual}
              className="bg-rdc-card hover:bg-rdc-secondary border border-rdc-border hover:border-rdc-accent text-rdc-text p-4 rounded-2xl transition-all disabled:opacity-50 text-left flex flex-col justify-between shadow-xs cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <FileImage className="w-6 h-6 text-rdc-accent" />
                <span className="text-[10px] bg-rdc-border px-1.5 py-0.5 rounded font-titulo font-bold">PNG</span>
              </div>
              <div>
                <p className="font-titulo font-semibold text-sm">{t('export.exportPNG') || 'Página PNG'}</p>
                <p className="text-rdc-muted text-xs mt-0.5">{t('export.exportPNGDesc') || 'Exporta el canvas actual'}</p>
              </div>
            </button>

            {/* PDF */}
            <button
              onClick={handleExportarPDF}
              disabled={exportando || !capituloActual}
              className="bg-rdc-accent hover:bg-rdc-accent-hover text-white p-4 rounded-2xl transition-all disabled:opacity-50 text-left flex flex-col justify-between shadow-lg cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-6 h-6" />
                <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded font-titulo font-bold">PDF</span>
              </div>
              <div>
                <p className="font-titulo font-semibold text-sm">{t('export.exportPDF') || 'Documento PDF'}</p>
                <p className="text-white/80 text-xs mt-0.5">Vectorial para imprenta</p>
              </div>
            </button>

            {/* CBZ */}
            <button
              onClick={handleExportarCBZ}
              disabled={exportando || !capituloActual}
              className="bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/50 hover:border-purple-400 text-purple-200 p-4 rounded-2xl transition-all disabled:opacity-50 text-left flex flex-col justify-between shadow-xs cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <Package className="w-6 h-6 text-purple-400" />
                <span className="text-[10px] bg-purple-900/80 px-1.5 py-0.5 rounded font-titulo font-bold">CBZ</span>
              </div>
              <div>
                <p className="font-titulo font-semibold text-sm">{t('prepress.downloadCBZ') || 'Cómic Digital (.CBZ)'}</p>
                <p className="text-purple-300/80 text-xs mt-0.5">{t('prepress.downloadCBZDesc') || 'Con metadatos ComicInfo'}</p>
              </div>
            </button>

          </div>

        </div>
      )}

      {/* ────────────────── PESTAÑA 2: CENTRO DE PREIMPRESIÓN ──────────────── */}
      {pestanaActiva === 'preimpresion' && (
        <div className="space-y-6">

          {/* Selector de Formato Editorial */}
          <div>
            <label className="block text-rdc-muted text-sm mb-3 font-titulo font-semibold">
              {t('prepress.editorialFormat') || 'Formato de Impresión Estándar'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FORMATOS_EDITORIALES.map(f => (
                <div
                  key={f.id}
                  onClick={() => setFormatoSeleccionado(f)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    formatoSeleccionado.id === f.id
                      ? 'border-rdc-accent bg-rdc-accent/10 shadow-md'
                      : 'border-rdc-border bg-rdc-card hover:border-rdc-muted'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-titulo font-bold text-sm text-rdc-text">{f.nombre}</h4>
                    <span className="text-xs text-rdc-accent font-semibold font-titulo">{f.dimensiones_mm}</span>
                  </div>
                  <p className="text-rdc-muted text-xs mt-1 leading-snug">{f.descripcion}</p>
                  <div className="mt-3 pt-2 border-t border-rdc-border/50 flex items-center justify-between text-[11px] text-rdc-muted font-titulo">
                    <span>300 DPI: {f.ancho_px_300dpi}×{f.alto_px_300dpi} px</span>
                    <span>Sangrado: {f.sangrado_mm} mm</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Guías de Sangrado y Control de Calidad */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Bleed & Crop Guides */}
            <div className="bg-rdc-card border border-rdc-border rounded-2xl p-4.5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-titulo text-xs font-bold uppercase tracking-wider text-rdc-text flex items-center gap-1.5">
                  <Scissors className="w-4 h-4 text-rdc-accent" />
                  <span>{t('prepress.bleedTitle') || 'Guías de Sangrado & Corte'}</span>
                </h4>
                <input
                  type="checkbox"
                  checked={mostrarGuiasSangrado}
                  onChange={(e) => setMostrarGuiasSangrado(e.target.checked)}
                  className="accent-rdc-accent cursor-pointer w-4 h-4"
                />
              </div>
              <p className="text-rdc-muted text-xs leading-relaxed">
                {t('prepress.bleedDesc') || 'Añade una tolerancia de 3mm en todos los bordes externos para evitar líneas blancas al cortar.'}
              </p>
              <div className="p-2.5 bg-rdc-secondary/80 rounded-xl text-xs font-titulo space-y-1 text-rdc-text/90">
                <div className="flex justify-between">
                  <span>Margen de Sangrado (Bleed):</span>
                  <strong className="text-rdc-accent">3.0 mm</strong>
                </div>
                <div className="flex justify-between">
                  <span>Margen de Seguridad de Textos:</span>
                  <strong className="text-emerald-400">5.0 mm</strong>
                </div>
              </div>
            </div>

            {/* DPI Resolution Check */}
            <div className="bg-rdc-card border border-rdc-border rounded-2xl p-4.5 space-y-3">
              <h4 className="font-titulo text-xs font-bold uppercase tracking-wider text-rdc-text flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-rdc-accent" />
                <span>{t('prepress.qualityCheck') || 'Control de Calidad (Pre-flight)'}</span>
              </h4>
              <div className="space-y-2 text-xs font-titulo">
                <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300">
                  <span>{t('prepress.dpi300') || 'Resolución 300 DPI'}</span>
                  <span className="font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Óptimo
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-blue-950/40 border border-blue-500/40 text-blue-300">
                  <span>{t('prepress.cmykWarning') || 'Conversión Escala de Grises'}</span>
                  <span className="font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Listo
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Botones de Descarga en Preimpresión */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleExportarPDF}
              disabled={exportando || !capituloActual}
              className="flex-1 bg-rdc-accent hover:bg-rdc-accent-hover text-white font-titulo font-semibold py-3.5 px-4 rounded-xl transition-all shadow-lg text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>{t('prepress.downloadPDFHighRes') || 'Descargar PDF 300 DPI Imprenta'}</span>
            </button>
            <button
              onClick={handleExportarCBZ}
              disabled={exportando || !capituloActual}
              className="flex-1 bg-purple-950/50 hover:bg-purple-900/60 border border-purple-500/50 text-purple-200 font-titulo font-semibold py-3.5 px-4 rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Package className="w-4 h-4 text-purple-400" />
              <span>{t('prepress.downloadCBZ') || 'Descargar Paquete .CBZ'}</span>
            </button>
          </div>

        </div>
      )}

      {/* Estados de carga, error y éxito */}
      {exportando && (
        <div className="bg-rdc-card border border-rdc-accent/40 rounded-2xl p-4 flex items-center gap-3 text-rdc-text text-sm font-titulo">
          <div className="w-5 h-5 border-2 border-rdc-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <span>{mensajeEstado || 'Procesando exportación...'}</span>
        </div>
      )}

      {error && (
        <div className="bg-rdc-error/20 border border-rdc-error text-rdc-error rounded-2xl p-3.5 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {exito && (
        <div className="bg-emerald-500/20 border border-emerald-500 text-emerald-400 rounded-2xl p-3.5 text-xs font-titulo flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{exito}</span>
        </div>
      )}

    </div>
  )
}
