// PublishModal.jsx
// Módulo de Publicación Digital, SEO especializado (Schema.org / JSON-LD) y previsualización Open Graph.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
      setExito(t('publishing.publishingSuccess'))
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
      titulo={`🚀 ${t('publishing.title')}`}
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
              className="bg-rdc-secondary border border-rdc-border px-3 py-1.5 rounded-lg text-rdc-text text-xs outline-none flex-1 font-semibold"
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
        <div className="bg-rdc-card p-4 rounded-xl border border-rdc-border space-y-4">
          <h4 className="font-bold text-rdc-text text-sm flex items-center gap-2">
            <span>🌐</span> {t('publishing.status')}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Público vs Borrador */}
            <div
              onClick={() => setEsPublico(!esPublico)}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                esPublico
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                  : 'bg-rdc-secondary border-rdc-border text-rdc-muted'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold">{esPublico ? '🟢 Público' : '⚪ Borrador'}</span>
                <span className="text-base">{esPublico ? '🌐' : '📝'}</span>
              </div>
              <p className="text-[11px] leading-tight opacity-80">
                {esPublico ? t('publishing.published') : t('publishing.draft')}
              </p>
            </div>

            {/* Gratuito vs Premium */}
            <div
              onClick={() => setEsPremium(!esPremium)}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                esPremium
                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
                  : 'bg-rdc-secondary border-rdc-border text-rdc-muted'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold">{esPremium ? '🔒 Premium' : '🎁 Gratuito'}</span>
                <span className="text-base">{esPremium ? '🖋️' : '🆓'}</span>
              </div>
              <p className="text-[11px] leading-tight opacity-80">
                {esPremium ? t('publishing.premium') : t('publishing.free')}
              </p>
            </div>

            {/* Acceso Anticipado */}
            <div
              onClick={() => setAccesoAnticipado(!accesoAnticipado)}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                accesoAnticipado
                  ? 'bg-purple-950/40 border-purple-500/50 text-purple-300'
                  : 'bg-rdc-secondary border-rdc-border text-rdc-muted'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold">⚡ Acceso Anticipado</span>
                <span className="text-base">🚀</span>
              </div>
              <p className="text-[11px] leading-tight opacity-80">
                Solo mecenas de Patreon o pase de creador.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {exito && <span className="text-emerald-400 font-bold">✅ {exito}</span>}
            <button
              onClick={handleGuardarEstado}
              disabled={guardando}
              className="ml-auto bg-rdc-accent hover:bg-rdc-accent-hover text-white font-bold py-2 px-4 rounded-lg transition-all shadow-md flex items-center gap-1.5"
            >
              <span>💾</span> {t('publishing.applyChanges')}
            </button>
          </div>
        </div>

        {/* ── 2. SCHEMA.ORG & OPEN GRAPH PREVIEW ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Tarjeta Social Open Graph */}
          <div className="bg-rdc-card p-4 rounded-xl border border-rdc-border space-y-3">
            <h5 className="font-bold text-rdc-text flex items-center gap-2">
              <span>📱</span> {t('publishing.openGraphTitle')}
            </h5>
            <div className="bg-rdc-secondary rounded-lg border border-rdc-border overflow-hidden text-[11px]">
              <div className="h-28 bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 flex items-center justify-center text-white font-manga text-3xl tracking-widest shadow-inner">
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
          <div className="bg-rdc-card p-4 rounded-xl border border-rdc-border space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-bold text-rdc-text flex items-center gap-1.5">
                  <span>🏷️</span> {t('publishing.seoTitle')}
                </h5>
                <button
                  onClick={handleCopiarJsonLd}
                  className="text-[11px] text-rdc-accent hover:underline font-bold"
                >
                  {copiado ? '✅ ¡Copiado!' : `📋 ${t('publishing.copyJsonLd')}`}
                </button>
              </div>
              <p className="text-rdc-muted text-[11px] leading-tight mb-2">
                {t('publishing.seoDesc')}
              </p>
              <pre className="bg-black/70 text-emerald-400 p-2.5 rounded-lg text-[10px] font-mono overflow-x-auto max-h-36 border border-rdc-border">
                {generarSchemaOrgJsonLd()}
              </pre>
            </div>
          </div>

        </div>

      </div>
    </Modal>
  )
}
