// CharacterList.jsx
// Vista completa de la sección de Personajes dentro del ProjectStudio con soporte i18n.

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import useCharacterStore from '../../store/characterStore'
import CharacterCard from './CharacterCard'
import CharacterModal from './CharacterModal'
import Spinner from '../UI/Spinner'

export default function CharacterList({ proyecto }) {
  const { t } = useTranslation()
  const {
    personajes, cargando,
    cargarPersonajes, eliminarPersonaje
  } = useCharacterStore()

  const [modalAbierto, setModalAbierto] = useState(false)
  const [personajeEditando, setPersonajeEditando] = useState(null)

  useEffect(() => {
    if (proyecto?.id) {
      cargarPersonajes(proyecto.id)
    }
  }, [proyecto?.id])

  const handleNuevoPersonaje = () => {
    setPersonajeEditando(null)
    setModalAbierto(true)
  }

  const handleEditar = (personaje) => {
    setPersonajeEditando(personaje)
    setModalAbierto(true)
  }

  const handleEliminar = async (personaje) => {
    if (!proyecto?.id || !personaje?.id) return
    if (!confirm(t('characters.deleteConfirm', { name: personaje.nombre }))) return

    const resultado = await eliminarPersonaje(proyecto.id, personaje.id)
    if (!resultado?.exito) {
      alert('Error al eliminar el personaje')
    }
  }

  const handleCerrarModal = () => {
    setModalAbierto(false)
    setPersonajeEditando(null)
  }

  // Agrupar personajes por rol
  const grupos = {
    protagonista: personajes.filter(p => p.rol === 'protagonista'),
    antagonista:  personajes.filter(p => p.rol === 'antagonista'),
    apoyo:        personajes.filter(p => p.rol === 'apoyo'),
    secundario:   personajes.filter(p => p.rol === 'secundario' || !p.rol),
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-rdc-muted text-sm mt-1 font-titulo">
            {personajes.length} {t('dashboard.characters').toLowerCase()}
          </p>
        </div>
        <button
          onClick={handleNuevoPersonaje}
          className="bg-rdc-accent hover:bg-rdc-accent-hover text-white
                     font-titulo font-semibold px-5 py-2.5 rounded-lg
                     transition-colors duration-200 flex items-center gap-2 shadow-md"
        >
          <span className="text-lg">+</span>
          {t('characters.addBtn')}
        </button>
      </div>

      {/* Estado de carga */}
      {cargando && (
        <div className="py-12">
          <Spinner texto={t('dashboard.loading')} />
        </div>
      )}

      {/* Sin personajes */}
      {!cargando && personajes.length === 0 && (
        <div className="border-2 border-dashed border-rdc-border rounded-xl
                        p-12 text-center">
          <p className="text-5xl mb-4">👤</p>
          <h3 className="font-titulo text-xl text-rdc-text font-semibold mb-2">
            {t('characters.noCharacters')}
          </h3>
          <p className="text-rdc-muted text-sm mb-6 max-w-md mx-auto">
            {t('characters.subtitle')}
          </p>
          <button
            onClick={handleNuevoPersonaje}
            className="bg-rdc-accent hover:bg-rdc-accent-hover text-white
                       font-titulo font-semibold px-6 py-3 rounded-lg
                       transition-colors duration-200 shadow-lg"
          >
            {t('characters.addBtn')}
          </button>
        </div>
      )}

      {/* Galería agrupada por rol */}
      {!cargando && personajes.length > 0 && (
        <div className="space-y-8">
          {Object.entries(grupos).map(([rol, lista]) => {
            if (lista.length === 0) return null

            const titulos = {
              protagonista: `⭐ ${t('characters.protagonist')}`,
              antagonista:  `💀 ${t('characters.antagonist')}`,
              apoyo:        `🤝 ${t('characters.support')}`,
              secundario:   `👥 ${t('characters.secondary')}`,
            }

            return (
              <div key={rol}>
                <h3 className="font-titulo text-lg text-rdc-muted font-semibold
                               mb-4 flex items-center gap-2">
                  {titulos[rol]}
                  <span className="text-xs bg-rdc-card text-rdc-muted
                                   px-2 py-0.5 rounded-full font-mono">
                    {lista.length}
                  </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {lista.map(personaje => (
                    <CharacterCard
                      key={personaje.id}
                      personaje={personaje}
                      onEditar={handleEditar}
                      onEliminar={handleEliminar}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal crear/editar */}
      <CharacterModal
        abierto={modalAbierto}
        onCerrar={handleCerrarModal}
        personajeEditar={personajeEditando}
        idProyecto={proyecto?.id}
      />
    </div>
  )
}