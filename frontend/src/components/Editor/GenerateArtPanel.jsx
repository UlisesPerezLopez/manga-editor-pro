// GenerateArtPanel.jsx
// Panel lateral que aparece al seleccionar una viñeta vacía en el canvas.
// Soporta renderizado polimórfico (Local GPU ComfyUI vs Cloud Free Flux) con selector de personajes y estado dinámico.

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { imageAPI } from '../../services/api'
import useCharacterStore from '../../store/characterStore'
import useAiStore from '../../store/aiStore'

const ANGULOS = [
  'medium shot', 'close-up', 'wide shot',
  'extreme close-up', 'bird eye view', 'low angle'
]

const EMOCIONES = [
  'neutral', 'intense', 'happy', 'sad',
  'angry', 'surprised', 'fearful', 'determined'
]

export default function GenerateArtPanel({
  proyecto,
  vinetaSeleccionada,    // objeto Fabric con la viñeta activa
  onImagenGenerada,      // callback: recibe la URL/base64 de la imagen
  onCerrar
}) {
  const { t } = useTranslation()
  const { personajes } = useCharacterStore()
  const { aiMode, setAiMode } = useAiStore()

  const [descripcion, setDescripcion] = useState('')
  const [personajesSeleccionados, setPersonajesSeleccionados] = useState([])
  const [angulo, setAngulo] = useState('medium shot')
  const [emocion, setEmocion] = useState('neutral')
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState(null)

  const esLocal = aiMode === 'local'

  const togglePersonaje = (id) => {
    setPersonajesSeleccionados(prev =>
      prev.includes(id)
        ? prev.filter(p => p !== id)
        : [...prev, id]
    )
  }

  const handleGenerar = async () => {
    if (!descripcion.trim()) {
      setError(t('editor.sceneDesc'))
      return
    }

    setGenerando(true)
    setError(null)

    try {
      const datos = {
        id_proyecto: proyecto.id,
        descripcion: descripcion.trim(),
        personajes_ids: personajesSeleccionados,
        emocion,
        angulo,
        ancho: Math.round(vinetaSeleccionada?.width || 1024),
        alto: Math.round(vinetaSeleccionada?.height || 1024),
      }

      const respuesta = await imageAPI.generarImagenVineta(datos)

      if (respuesta.data?.imagen) {
        onImagenGenerada(respuesta.data.imagen)
        onCerrar()
      } else {
        throw new Error('No se recibió la imagen generada')
      }

    } catch (err) {
      console.error('Error al generar imagen:', err)
      const msg = err.response?.data?.detail || err.message || 'Error al generar imagen'
      setError(typeof msg === 'object' ? msg.mensaje || JSON.stringify(msg) : msg)
    } finally {
      setGenerando(false)
    }
  }

  const handleFallbackCloud = async () => {
    await setAiMode('cloud_free')
    setError(null)
  }

  return (
    <div className="w-80 bg-rdc-secondary border-l border-rdc-border p-4
                    flex flex-col gap-4 overflow-y-auto flex-shrink-0 z-20 shadow-xl transition-colors duration-300">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-rdc-border pb-3">
        <div>
          <h3 className="font-titulo text-sm text-rdc-text font-semibold flex items-center gap-1.5">
            <span>🎨</span> {t('editor.generateArtTitle')}
          </h3>
          <p className="text-rdc-muted text-[11px] font-titulo">
            {t('editor.generateArtSubtitle')}
          </p>
        </div>
        <button
          onClick={onCerrar}
          className="text-rdc-muted hover:text-rdc-text text-xl leading-none px-1"
        >
          ×
        </button>
      </div>

      {/* Indicador de Motor Gráfico Activo */}
      <div className={`p-2.5 rounded-lg border text-xs font-titulo transition-all ${
        esLocal
          ? 'bg-purple-950/40 border-purple-500/50 text-purple-200'
          : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
      }`}>
        <div className="flex items-center justify-between font-semibold">
          <span>{esLocal ? '🖥️ Modo Local GPU' : '☁️ Modo Cloud Gratis'}</span>
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/40">
            {esLocal ? 'ComfyUI IPAdapter' : 'Pollinations Flux'}
          </span>
        </div>
        <p className="text-[11px] text-rdc-muted mt-1 leading-snug">
          {esLocal
            ? 'Renderizado en tu hardware local con máxima consistencia.'
            : 'Renderizado en la nube sin costo ni consumo de memoria.'
          }
        </p>
      </div>

      {/* Descripción de la escena */}
      <div>
        <label className="block text-rdc-muted text-xs mb-1.5 font-titulo">
          {t('editor.scenePrompt')} <span className="text-rdc-accent">*</span>
        </label>
        <textarea
          value={descripcion}
          onChange={e => { setDescripcion(e.target.value); setError(null) }}
          rows={3}
          placeholder="Ej: El guerrero desenvaina su espada mientras el cielo se oscurece con relámpagos..."
          className="w-full bg-rdc-card border border-rdc-border rounded-lg
                     px-3 py-2 text-rdc-text placeholder-rdc-muted text-xs
                     focus:outline-none focus:border-rdc-accent resize-none
                     transition-colors duration-200"
          disabled={generando}
        />
      </div>

      {/* Selector de personajes */}
      {personajes.length > 0 && (
        <div>
          <label className="block text-rdc-muted text-xs mb-1.5 font-titulo">
            {t('editor.charactersInScene')}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {personajes.map(p => (
              <button
                key={p.id}
                onClick={() => togglePersonaje(p.id)}
                disabled={generando}
                className={`text-xs px-2.5 py-1 rounded-full border
                            transition-all duration-200 disabled:opacity-50 font-titulo
                            ${personajesSeleccionados.includes(p.id)
                              ? 'bg-rdc-accent text-white border-rdc-accent'
                              : 'bg-rdc-card text-rdc-muted border-rdc-border hover:border-rdc-muted'
                            }`}
              >
                {p.nombre}
                {p.prompt_ia && ' 🤖'}
              </button>
            ))}
          </div>
          {personajesSeleccionados.length > 0 && (
            <p className="text-rdc-muted text-xs mt-1 font-titulo">
              ✅ {t('characters.generateAISheet')}
            </p>
          )}
        </div>
      )}

      {/* Ángulo y emoción */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-rdc-muted text-xs mb-1.5 font-titulo">{t('editor.angle')}</label>
          <select
            value={angulo}
            onChange={e => setAngulo(e.target.value)}
            disabled={generando}
            className="w-full bg-rdc-card border border-rdc-border rounded-lg
                       px-2 py-2 text-rdc-text text-xs
                       focus:outline-none focus:border-rdc-accent"
          >
            {ANGULOS.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-rdc-muted text-xs mb-1.5 font-titulo">{t('editor.emotion')}</label>
          <select
            value={emocion}
            onChange={e => setEmocion(e.target.value)}
            disabled={generando}
            className="w-full bg-rdc-card border border-rdc-border rounded-lg
                       px-2 py-2 text-rdc-text text-xs
                       focus:outline-none focus:border-rdc-accent"
          >
            {EMOCIONES.map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mensaje de Error con Fallback */}
      {error && (
        <div className="bg-rdc-error/20 border border-rdc-error text-rdc-error rounded-lg p-2.5 text-xs space-y-2">
          <p className="font-semibold leading-tight">❌ {error}</p>
          {esLocal && (
            <button
              onClick={handleFallbackCloud}
              className="w-full bg-rdc-accent hover:bg-rdc-accent-hover text-white font-titulo font-bold py-1 px-2 rounded text-xs transition-colors"
            >
              ☁️ {t('aiEngine.switchToCloud')}
            </button>
          )}
        </div>
      )}

      {/* Botón generar */}
      <button
        onClick={handleGenerar}
        disabled={generando || !descripcion.trim()}
        className="w-full bg-rdc-accent hover:bg-rdc-accent-hover text-white
                   font-titulo font-semibold py-3 rounded-lg
                   transition-colors duration-200
                   disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center justify-center gap-2 shadow-lg mt-auto"
      >
        {generando ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent
                            rounded-full animate-spin" />
            <span>
              {esLocal
                ? 'Renderizando con ComfyUI (Local)...'
                : 'Renderizando con Cloud Flux...'}
            </span>
          </>
        ) : (
          t('editor.generateBtn')
        )}
      </button>

      {generando && (
        <p className="text-rdc-muted text-[11px] text-center font-titulo">
          {esLocal ? 'Procesando en GPU local (~5-15s)...' : 'Generando en la nube (~10-20s)...'}
        </p>
      )}
    </div>
  )
}