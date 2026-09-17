// CharacterModal.jsx
// Modal para crear y editar personajes con todos sus campos y soporte i18n.

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '../UI/Modal'
import useCharacterStore from '../../store/characterStore'

export default function CharacterModal({
  abierto,
  onCerrar,
  personajeEditar,  // Si viene, es modo edición; si no, modo creación
  idProyecto,
}) {
  const { t } = useTranslation()
  const {
    crearPersonaje, actualizarPersonaje, regenerarFicha,
    guardando, error, limpiarError
  } = useCharacterStore()

  const ROLES = [
    { id: 'protagonista', label: `⭐ ${t('characters.protagonist')}` },
    { id: 'antagonista',  label: `💀 ${t('characters.antagonist')}` },
    { id: 'apoyo',        label: `🤝 ${t('characters.support')}` },
    { id: 'secundario',   label: `👥 ${t('characters.secondary')}` },
  ]

  const FORM_INICIAL = {
    nombre: '',
    rol: 'protagonista',
    descripcion_fisica: '',
    ropa_tipica: '',
    personalidad: '',
    arco_narrativo: '',
    motivacion: '',
    generar_ficha_ia: true,
  }

  const [form, setForm] = useState(FORM_INICIAL)
  const [regenerando, setRegenerando] = useState(false)
  const [exitoFicha, setExitoFicha] = useState(false)
  const modoEdicion = Boolean(personajeEditar)

  // Rellenar el form al abrir en modo edición
  useEffect(() => {
    if (personajeEditar) {
      setForm({
        nombre:            personajeEditar.nombre || '',
        rol:               personajeEditar.rol || 'protagonista',
        descripcion_fisica: personajeEditar.descripcion_fisica || '',
        ropa_tipica:       personajeEditar.ropa_tipica || '',
        personalidad:      personajeEditar.personalidad || '',
        arco_narrativo:    personajeEditar.arco_narrativo || '',
        motivacion:        personajeEditar.motivacion || '',
        generar_ficha_ia:  false, // En edición, no regenerar por defecto
      })
    } else {
      setForm(FORM_INICIAL)
    }
    limpiarError()
    setExitoFicha(false)
  }, [personajeEditar, abierto])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleGuardar = async () => {
    if (!form.nombre.trim()) return

    let resultado
    if (modoEdicion) {
      const { generar_ficha_ia, ...datosActualizar } = form
      resultado = await actualizarPersonaje(
        idProyecto,
        personajeEditar.id,
        datosActualizar,
        generar_ficha_ia  // regenerar ficha si el checkbox está marcado
      )
    } else {
      resultado = await crearPersonaje(idProyecto, form)
    }

    if (resultado.exito) {
      onCerrar()
    }
  }

  const handleRegenerarFicha = async () => {
    if (!personajeEditar) return
    setRegenerando(true)
    setExitoFicha(false)
    const resultado = await regenerarFicha(idProyecto, personajeEditar.id)
    setRegenerando(false)
    if (resultado.exito) setExitoFicha(true)
  }

  const titulo = modoEdicion
    ? `✏️ ${personajeEditar?.nombre}`
    : `👤 ${t('characters.addBtn')}`

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={titulo}
      ancho="max-w-2xl"
    >
      <div className="space-y-5">

        {/* Error */}
        {error && (
          <div className="bg-rdc-error bg-opacity-20 border border-rdc-error
                          text-rdc-error rounded-lg p-3 text-sm">
            ❌ {error}
          </div>
        )}

        {/* Nombre */}
        <div>
          <label className="block text-rdc-muted text-sm mb-2 font-titulo">
            {t('characters.name')}
          </label>
          <input
            type="text"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            placeholder="Ej: Akira Nakamura"
            className="w-full bg-rdc-card border border-rdc-border rounded-lg
                       px-4 py-3 text-rdc-text placeholder-rdc-muted text-sm
                       focus:outline-none focus:border-rdc-accent
                       transition-colors duration-200"
          />
        </div>

        {/* Rol */}
        <div>
          <label className="block text-rdc-muted text-sm mb-3 font-titulo">{t('characters.role')}</label>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => setForm(p => ({ ...p, rol: r.id }))}
                className={`border rounded-lg p-3 text-left transition-all
                  ${form.rol === r.id
                    ? 'border-rdc-accent bg-rdc-accent bg-opacity-10'
                    : 'border-rdc-border hover:border-rdc-muted'
                  }`}
              >
                <p className="text-rdc-text text-sm font-semibold font-titulo">{r.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Descripción física */}
        <div>
          <label className="block text-rdc-muted text-sm mb-2 font-titulo">
            {t('characters.physicalDesc')}
          </label>
          <textarea
            name="descripcion_fisica"
            value={form.descripcion_fisica}
            onChange={handleChange}
            rows={3}
            placeholder="Ej: Joven de 17 años, cabello negro azabache largo hasta los hombros, ojos azul oscuro, cicatriz en la mejilla izquierda, complexión atlética..."
            className="w-full bg-rdc-card border border-rdc-border rounded-lg
                       px-4 py-3 text-rdc-text placeholder-rdc-muted text-sm
                       focus:outline-none focus:border-rdc-accent resize-none
                       transition-colors duration-200"
          />
        </div>

        {/* Ropa típica */}
        <div>
          <label className="block text-rdc-muted text-sm mb-2 font-titulo">
            {t('characters.typicalOutfit')}
          </label>
          <textarea
            name="ropa_tipica"
            value={form.ropa_tipica}
            onChange={handleChange}
            rows={2}
            placeholder="Ej: Uniforme escolar azul marino desgastado, abrigo gris con capucha, zapatillas blancas..."
            className="w-full bg-rdc-card border border-rdc-border rounded-lg
                       px-4 py-3 text-rdc-text placeholder-rdc-muted text-sm
                       focus:outline-none focus:border-rdc-accent resize-none
                       transition-colors duration-200"
          />
        </div>

        {/* Personalidad */}
        <div>
          <label className="block text-rdc-muted text-sm mb-2 font-titulo">
            {t('characters.personality')}
          </label>
          <textarea
            name="personalidad"
            value={form.personalidad}
            onChange={handleChange}
            rows={2}
            placeholder="Ej: Introvertido y analítico, leal a sus amigos, oculta sus emociones tras una fachada de frialdad..."
            className="w-full bg-rdc-card border border-rdc-border rounded-lg
                       px-4 py-3 text-rdc-text placeholder-rdc-muted text-sm
                       focus:outline-none focus:border-rdc-accent resize-none
                       transition-colors duration-200"
          />
        </div>

        {/* Motivación */}
        <div>
          <label className="block text-rdc-muted text-sm mb-2 font-titulo">
            {t('characters.motivation')}
          </label>
          <input
            type="text"
            name="motivacion"
            value={form.motivacion}
            onChange={handleChange}
            placeholder="Ej: Descubrir la verdad sobre la desaparición de su hermana"
            className="w-full bg-rdc-card border border-rdc-border rounded-lg
                       px-4 py-3 text-rdc-text placeholder-rdc-muted text-sm
                       focus:outline-none focus:border-rdc-accent
                       transition-colors duration-200"
          />
        </div>

        {/* Opción de Ficha Técnica IA */}
        <div className="bg-rdc-card rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="generar_ficha_ia"
              name="generar_ficha_ia"
              checked={form.generar_ficha_ia}
              onChange={handleChange}
              className="w-4 h-4 accent-rdc-accent"
            />
            <label htmlFor="generar_ficha_ia"
                   className="text-rdc-text text-sm cursor-pointer font-titulo">
              {modoEdicion
                ? t('characters.regenerateAISheet')
                : t('characters.autoGenSheet')
              }
            </label>
          </div>

          {/* Botón regenerar ficha en modo edición */}
          {modoEdicion && personajeEditar?.prompt_ia && (
            <div className="pl-7 space-y-2">
              <button
                onClick={handleRegenerarFicha}
                disabled={regenerando || guardando}
                className="text-xs text-rdc-accent hover:text-rdc-accent-hover
                           border border-rdc-accent border-opacity-40
                           px-3 py-1.5 rounded-lg transition-all duration-200
                           disabled:opacity-50 flex items-center gap-2 font-titulo"
              >
                {regenerando ? (
                  <>
                    <div className="w-3 h-3 border border-rdc-accent
                                    border-t-transparent rounded-full animate-spin" />
                    Regenerando...
                  </>
                ) : `🔄 ${t('characters.regenerateAISheet')}`}
              </button>
              {exitoFicha && (
                <p className="text-green-400 text-xs">
                  ✅ Ficha Técnica regenerada correctamente
                </p>
              )}
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCerrar}
            className="flex-1 border border-rdc-border text-rdc-muted
                       hover:text-rdc-text hover:border-rdc-muted
                       py-3 rounded-lg font-titulo transition-all duration-200"
          >
            {t('editor.cancel')}
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando || !form.nombre.trim()}
            className="flex-1 bg-rdc-accent hover:bg-rdc-accent-hover
                       text-white font-titulo font-semibold py-3 rounded-lg
                       transition-colors duration-200 disabled:opacity-50
                       flex items-center justify-center gap-2 shadow-md"
          >
            {guardando ? (
              <>
                <div className="w-4 h-4 border-2 border-white
                                border-t-transparent rounded-full animate-spin" />
                {form.generar_ficha_ia ? 'Generando con IA...' : 'Guardando...'}
              </>
            ) : (
              t('characters.saveBtn')
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}