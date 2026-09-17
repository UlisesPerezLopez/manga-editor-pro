// StyleWizard/index.jsx
// Wizard completo de Firma Visual con 4 pasos y soporte i18n:
// 1. Subir imágenes → 2. Analizar → 3. Validar resultado → 4. Bloqueado

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { styleAPI } from '../../services/api'
import UploadZone from './UploadZone'
import AnalysisProgress from './AnalysisProgress'
import StyleResult from './StyleResult'

const PASOS = {
  SUBIR: 'subir',
  ANALIZANDO: 'analizando',
  RESULTADO: 'resultado',
  BLOQUEADO: 'bloqueado',
}

export default function StyleWizard({ proyecto, onEstiloBloqueado }) {
  const { t } = useTranslation()
  const [paso, setPaso] = useState(PASOS.SUBIR)
  const [imagenesSeleccionadas, setImagenesSeleccionadas] = useState([])
  const [subiendoImagenes, setSubiendoImagenes] = useState(false)
  const [resultadoAnalisis, setResultadoAnalisis] = useState(null)
  const [bloqueando, setBloqueando] = useState(false)
  const [error, setError] = useState(null)
  const [estadoInicial, setEstadoInicial] = useState(null)

  // Al montar, verificar si ya hay análisis previo
  useEffect(() => {
    if (proyecto?.id) {
      cargarEstadoInicial()
    }
  }, [proyecto?.id])

  const cargarEstadoInicial = async () => {
    if (!proyecto?.id) return
    try {
      const respuesta = await styleAPI.obtenerEstado(proyecto.id)
      const estado = respuesta?.data
      if (!estado) return
      setEstadoInicial(estado)

      // Si ya está bloqueado, mostrar directamente el estado final
      if (estado.style_locked) {
        setPaso(PASOS.BLOQUEADO)
      }
      // Si hay análisis pero no bloqueado, ir a resultado
      else if (estado.tiene_analisis) {
        setResultadoAnalisis({
          perfil_estilo: {
            paleta_colores: estado.paleta_colores || [],
            tecnica_linea: estado.tecnica_linea || '',
            estilo_sombreado: '',
            proporciones_personaje: '',
            atmosfera: '',
            elementos_caracteristicos: [],
            num_imagenes_analizadas: estado.num_referencias || 0,
          },
          system_prompt_maestro: estado.system_prompt_preview || '',
        })
        setPaso(PASOS.RESULTADO)
      }
    } catch (err) {
      console.error('Error al cargar estado de estilo:', err)
    }
  }

  const handleSubirYAnalizar = async () => {
    if (!proyecto?.id) return
    if (imagenesSeleccionadas.length < 3) {
      setError('Selecciona al menos 3 imágenes de referencia')
      return
    }

    setError(null)
    setSubiendoImagenes(true)

    try {
      // Fase 1: Subir imágenes
      const formData = new FormData()
      imagenesSeleccionadas.forEach(archivo => {
        formData.append('imagenes', archivo)
      })

      await styleAPI.subirReferencias(proyecto.id, formData)

      // Fase 2: Iniciar análisis
      setSubiendoImagenes(false)
      setPaso(PASOS.ANALIZANDO)

      const respuestaAnalisis = await styleAPI.analizarEstilo(proyecto.id)
      setResultadoAnalisis(respuestaAnalisis.data)
      setPaso(PASOS.RESULTADO)

    } catch (err) {
      const msg = err.response?.data?.detail || 'Error durante el proceso'
      setError(msg)
      setSubiendoImagenes(false)
      setPaso(PASOS.SUBIR)
    }
  }

  const handleBloquearEstilo = async () => {
    if (!proyecto?.id) return
    setBloqueando(true)
    try {
      await styleAPI.bloquearEstilo(proyecto.id)
      setPaso(PASOS.BLOQUEADO)
      if (onEstiloBloqueado) onEstiloBloqueado()
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al bloquear el estilo'
      setError(msg)
    } finally {
      setBloqueando(false)
    }
  }

  const handleRepetirAnalisis = async () => {
    if (!proyecto?.id) return
    try {
      await styleAPI.eliminarReferencias(proyecto.id)
      setResultadoAnalisis(null)
      setImagenesSeleccionadas([])
      setError(null)
      setPaso(PASOS.SUBIR)
    } catch (err) {
      setError('Error al reiniciar el análisis')
    }
  }

  return (
    <div className="space-y-6">

      {/* ── PASO: Subir imágenes ── */}
      {paso === PASOS.SUBIR && (
        <div className="space-y-5">
          <div className="bg-purple-500 bg-opacity-10 border border-purple-500
                          border-opacity-30 rounded-xl p-4">
            <h3 className="font-titulo text-lg text-purple-300 font-semibold mb-1">
              🎨 {t('styleWizard.title')}
            </h3>
            <p className="text-rdc-muted text-sm">
              {t('styleWizard.desc')}
            </p>
          </div>

          <UploadZone
            onImagenesSeleccionadas={setImagenesSeleccionadas}
            cargando={subiendoImagenes}
          />

          {error && (
            <div className="bg-rdc-error bg-opacity-20 border border-rdc-error
                            text-rdc-error rounded-lg p-3 text-sm">
              ❌ {error}
            </div>
          )}

          <button
            onClick={handleSubirYAnalizar}
            disabled={imagenesSeleccionadas.length < 3 || subiendoImagenes}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white
                       font-titulo font-semibold py-4 rounded-xl
                       transition-colors duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-3 text-lg shadow-lg"
          >
            {subiendoImagenes ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent
                                rounded-full animate-spin" />
                Subiendo {imagenesSeleccionadas.length} imágenes...
              </>
            ) : (
              <>
                {t('styleWizard.analyzeBtn', { count: imagenesSeleccionadas.length })}
              </>
            )}
          </button>
        </div>
      )}

      {/* ── PASO: Analizando ── */}
      {paso === PASOS.ANALIZANDO && (
        <AnalysisProgress numImagenes={imagenesSeleccionadas.length} />
      )}

      {/* ── PASO: Mostrar resultado ── */}
      {paso === PASOS.RESULTADO && resultadoAnalisis && (
        <StyleResult
          perfil={resultadoAnalisis.perfil_estilo}
          systemPrompt={resultadoAnalisis.system_prompt_maestro}
          onBloquear={handleBloquearEstilo}
          onRepetir={handleRepetirAnalisis}
          bloqueando={bloqueando}
        />
      )}

      {/* ── PASO: Estilo bloqueado ── */}
      {paso === PASOS.BLOQUEADO && (
        <div className="text-center py-8 space-y-4">
          <p className="text-6xl">🔒</p>
          <h3 className="font-titulo text-2xl text-rdc-accent font-semibold">
            {t('styleWizard.lockedTitle')}
          </h3>
          <p className="text-rdc-muted max-w-md mx-auto">
            {t('styleWizard.lockedSubtitle')}
          </p>
          {estadoInicial?.paleta_colores?.length > 0 && (
            <div className="flex gap-2 justify-center flex-wrap mt-4">
              {estadoInicial.paleta_colores.map((color, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-lg border border-rdc-border shadow"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          )}
          {estadoInicial?.system_prompt_preview && (
            <div className="bg-rdc-card rounded-lg p-4 text-left mt-4">
              <p className="text-rdc-muted text-xs uppercase mb-2 font-titulo">
                {t('projectStudio.masterPromptActive')}
              </p>
              <p className="text-rdc-text text-xs font-mono leading-relaxed">
                {estadoInicial.system_prompt_preview}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}