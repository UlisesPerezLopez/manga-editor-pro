// PublishModal.jsx
// Módulo de Publicación Digital, SEO especializado (Schema.org / JSON-LD) y previsualización Open Graph con Lucide React.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Globe,
  Lock,
  Zap,
  Copy,
  Check,
  Save,
  CheckCircle2,
  Share2,
  FileCode2,
  BookOpen,
  FileText
} from 'lucide-react'
import Modal from '../UI/Modal'
import { chaptersAPI } from '../../services/api'

export default function PublishModal({ abierto, onCerrar, proyecto, capitulos = [], onActualizar }) {
  const { t } = useTranslation()

  const [capituloSeleccionadoId, setCapituloSeleccionadoId] = useState(
    capitulos[0]?.id || null
  )
  const [guardando, setGuardando] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [exito, setExito] = useState(null)

  const capituloActivo = capitulos.find(c => c.id === capituloSeleccionadoId) || capitulos[0]

  // Estado local del capítulo
  const [esPublico, setEsPublico] = useState(capituloActivo?.is_published ?? true)
  const [esPremium, setEsPremium] = useState(capituloActivo?.is_premium ?? false)
  const [accesoAnticipado, setAccesoAnticipado] = useState(capituloActivo?.early_access ?? false)

  // Generar JSON-LD estructurado de Schema.org para Cómics
  const generarSchemaOrgJsonLd = () => {
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "ComicSeries",
      "name": proyecto?.nombre || "Manga Project",
      "description": proyecto?.system_prompt_maestro || "Novela gráfica creada con MEP Manga Editor Pro",
      "publisher": {
        "@type": "Organization",
        "name": "MEP — Manga Editor Pro"
      },
      "inLanguage": "es",
      "genre": proyecto?.modo_creacion || "Manga",
      "readingDirection": proyecto?.formato_lectura === "manga" ? "rtl" : "ltr",
      "hasPart": capitulos.map(c => ({
        "@type": "ComicIssue",
        "name": c.titulo || `Capítulo ${c.numero}`,
        "issueNumber": c.numero,
        "isAccessibleForFree": !c.is_premium,
        "url": `${window.location.origin}/read/${proyecto?.id}/${c.id}`
      }))
    }
    return JSON.stringify(jsonLd, null, 2)
  }

  const handleCopiarJsonLd = () => {
    navigator.clipboard.writeText(generarSchemaOrgJsonLd())
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  const handleGuardarEstado = async () => {
    if (!proyecto || !capituloActivo) return
    setGuardando(true)
    setExito(null)
    try {
      await chaptersAPI.actualizarPublicacion(proyecto.id, capituloActivo.id, {
        is_published: esPublico,
        is_premium: esPremium,
        early_access: accesoAnticipado
      })
      setExito(t('publishing.publishingSuccess') || 'Ajustes guardados con éxito')
      onActualizar?.()
    } catch (err) {
      console.error('Error al actualizar estado:', err)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Publicación Digital & SEO Editorial"
      ancho="max-w-3xl"
    >
      <div className="space-y-6 text-xs font-titulo">
        
        {/* Selector de capítulo */}
        {capitulos.length > 0 && (
          <div className="flex items-center gap-3 bg-rdc-card p-3 rounded-xl border border-rdc-border">
            <span className="text-rdc-muted">Capítulo a configurar:</span>
            <select
              value={capituloSeleccionadoId || ''}
              onChange={(e) => {
                const cId = parseInt(e.target.value)
                setCapituloSeleccionadoId(cId)
                const targetCap = capitulos.find(c => c.id === cId)
                if (targetCap) {
                  setEsPublico(targetCap.is_published ?? true)
                  setEsPremium(targetCap.is_premium ?? false)
                  setAccesoAnticipado(targetCap.early_access ?? false)
                }
              }}
              className="bg-rdc-secondary border border-rdc-border px-3 py-1.5 rounded-lg text-rdc-text text-xs outline-none flex-1 font-semibold font-titulo"
            >
              {capitulos.map(c => (
                <option key={c.id} value={c.id}>
                  Cap. {c.numero}: {c.titulo || `Capítulo ${c.numero}`} {c.is_premium ? '🔒 (Premium)' : '📖'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ── 1. ESTADO DE PUBLICACIÓN & REGLAS DE MONETIZACIÓN ── */}
        <div className="bg-rdc-card p-4.5 rounded-2xl border border-rdc-border space-y-4">
          <h4 className="font-bold text-rdc-text text-sm flex items-center gap-2">
            <Globe className="w-4 h-4 text-rdc-accent" />
            <span>{t('publishing.status') || 'Estado de Distribución'}</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Público vs Borrador */}
            <div
              onClick={() => setEsPublico(!esPublico)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                esPublico
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                  : 'bg-rdc-secondary border-rdc-border text-rdc-muted'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${esPublico ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                  {esPublico ? 'Público' : 'Borrador'}
                </span>
                {esPublico ? <Globe className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              </div>
              <p className="text-[11px] leading-tight opacity-80">
                {esPublico ? (t('publishing.published') || 'Visible para lectores') : (t('publishing.draft') || 'Oculto / Solo autor')}
              </p>
            </div>

            {/* Gratuito vs Premium */}
            <div
              onClick={() => setEsPremium(!esPremium)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                esPremium
                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
                  : 'bg-rdc-secondary border-rdc-border text-rdc-muted'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${esPremium ? 'bg-amber-400' : 'bg-gray-500'}`} />
                  {esPremium ? 'Premium' : 'Gratuito'}
                </span>
                {esPremium ? <Lock className="w-4 h-4 text-amber-400" /> : <BookOpen className="w-4 h-4" />}
              </div>
              <p className="text-[11px] leading-tight opacity-80">
                {esPremium ? (t('publishing.premium') || 'Monetizado') : (t('publishing.free') || 'Acceso Libre')}
              </p>
            </div>

            {/* Acceso Anticipado */}
            <div
              onClick={() => setAccesoAnticipado(!accesoAnticipado)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                accesoAnticipado
                  ? 'bg-purple-950/40 border-purple-500/50 text-purple-300'
                  : 'bg-rdc-secondary border-rdc-border text-rdc-muted'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${accesoAnticipado ? 'bg-purple-400' : 'bg-gray-500'}`} />
                  Acceso Anticipado
                </span>
                <Zap className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-[11px] leading-tight opacity-80">
                Solo mecenas de Patreon o pase de creador.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {exito && (
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> {exito}
              </span>
            )}
            <button
              onClick={handleGuardarEstado}
              disabled={guardando}
              className="ml-auto bg-rdc-accent hover:bg-rdc-accent-hover text-white font-bold py-2 px-4 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{t('publishing.applyChanges') || 'Guardar Configuración'}</span>
            </button>
          </div>
        </div>

        {/* ── 2. SCHEMA.ORG & OPEN GRAPH PREVIEW ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Tarjeta Social Open Graph */}
          <div className="bg-rdc-card p-4.5 rounded-2xl border border-rdc-border space-y-3">
            <h5 className="font-bold text-rdc-text flex items-center gap-2">
              <Share2 className="w-4 h-4 text-rdc-accent" />
              <span>{t('publishing.openGraphTitle') || 'Previsualización Social (Open Graph)'}</span>
            </h5>
            <div className="bg-rdc-secondary rounded-xl border border-rdc-border overflow-hidden text-[11px]">
              <div className="h-28 bg-gradient-to-r from-blue-950 via-indigo-950 to-purple-950 flex items-center justify-center text-white font-manga text-3xl tracking-widest shadow-inner">
                {proyecto?.nombre?.slice(0, 14) || 'MEP MANGA'}
              </div>
              <div className="p-3 space-y-1">
                <p className="font-bold text-rdc-text text-xs truncate">
                  {proyecto?.nombre} — Cap. {capituloActivo?.numero || 1}
                </p>
                <p className="text-rdc-muted text-[11px] line-clamp-2">
                  {capituloActivo?.sinopsis || `Lee el nuevo capítulo de ${proyecto?.nombre} en MEP Manga Editor Pro.`}
                </p>
                <p className="text-[10px] text-rdc-accent pt-1">mep-editor.pro</p>
              </div>
            </div>
          </div>

          {/* Marcado JSON-LD Schema.org */}
          <div className="bg-rdc-card p-4.5 rounded-2xl border border-rdc-border space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-bold text-rdc-text flex items-center gap-1.5">
                  <FileCode2 className="w-4 h-4 text-rdc-accent" />
                  <span>{t('publishing.seoTitle') || 'Schema.org ComicSeries'}</span>
                </h5>
                <button
                  onClick={handleCopiarJsonLd}
                  className="text-[11px] text-rdc-accent hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copiado ? (
                    <>
                      <Check className="w-3 h-3" /> ¡Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> {t('publishing.copyJsonLd') || 'Copiar JSON-LD'}
                    </>
                  )}
                </button>
              </div>
              <p className="text-rdc-muted text-[11px] leading-tight mb-2">
                {t('publishing.seoDesc') || 'Metadatos estructurados compatibles con Google Search y motores de descubrimiento de cómics.'}
              </p>
              <pre className="bg-black/70 text-emerald-400 p-2.5 rounded-xl text-[10px] font-mono overflow-x-auto max-h-36 border border-rdc-border">
                {generarSchemaOrgJsonLd()}
              </pre>
            </div>
          </div>

        </div>

      </div>
    </Modal>
  )
}
