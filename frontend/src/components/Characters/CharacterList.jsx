// CharacterList.jsx
// Vista completa de la sección de Personajes dentro del ProjectStudio con soporte i18n y Lucide React.

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Users,
  UserPlus,
  Star,
  Skull,
  HeartHandshake,
  UserCheck,
  Plus
} from 'lucide-react'
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
    if (!confirm(t('characters.deleteConfirm', { name: personaje.nombre }) || `¿Eliminar a ${personaje.nombre}?`)) return

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
            {personajes.length} {t('dashboard.characters')?.toLowerCase() || 'personajes registrados'}
          </p>
        </div>
        <button
          onClick={handleNuevoPersonaje}
          className="bg-rdc-accent hover:bg-rdc-accent-hover text-white
                     font-titulo font-semibold px-5 py-2.5 rounded-xl
                     transition-all flex items-center gap-2 shadow-md cursor-pointer hover:scale-105 text-sm"
        >
          <UserPlus className="w-4 h-4" />
          <span>{t('characters.addBtn') || 'Nuevo Personaje'}</span>
        </button>
      </div>

      {/* Estado de carga */}
      {cargando && (
        <div className="py-12">
          <Spinner texto={t('dashboard.loading') || 'Cargando personajes...'} />
        </div>
      )}

      {/* Sin personajes */}
      {!cargando && personajes.length === 0 && (
        <div className="border-2 border-dashed border-rdc-border rounded-2xl
                        p-12 text-center bg-rdc-secondary/40">
          <div className="w-16 h-16 rounded-2xl bg-rdc-card border border-rdc-border flex items-center justify-center mx-auto mb-4 text-rdc-muted">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="font-titulo text-xl text-rdc-text font-semibold mb-2">
            {t('characters.noCharacters') || 'Sin personajes registrados'}
          </h3>
          <p className="text-rdc-muted text-sm mb-6 max-w-md mx-auto font-titulo">
            {t('characters.subtitle') || 'Crea tus personajes manualmente o impórtalos desde las sugerencias del Guionista IA.'}
          </p>
          <button
            onClick={handleNuevoPersonaje}
            className="bg-rdc-accent hover:bg-rdc-accent-hover text-white
                       font-titulo font-semibold px-6 py-3 rounded-xl
                       transition-all shadow-lg inline-flex items-center gap-2 cursor-pointer hover:scale-105 text-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('characters.addBtn') || 'Crear Personaje'}</span>
          </button>
        </div>
      )}

      {/* Galería agrupada por rol */}
      {!cargando && personajes.length > 0 && (
        <div className="space-y-8">
          {Object.entries(grupos).map(([rol, lista]) => {
            if (lista.length === 0) return null

            const rolConfig = {
              protagonista: { label: t('characters.protagonist') || 'Protagonistas', icon: Star, color: 'text-amber-400' },
              antagonista:  { label: t('characters.antagonist') || 'Antagonistas',   icon: Skull, color: 'text-red-400' },
              apoyo:        { label: t('characters.support') || 'Personajes de Apoyo', icon: HeartHandshake, color: 'text-emerald-400' },
              secundario:   { label: t('characters.secondary') || 'Secundarios',    icon: Users, color: 'text-rdc-muted' },
            }

            const config = rolConfig[rol] || rolConfig.secundario
            const RolHeaderIcon = config.icon

            return (
              <div key={rol}>
                <h3 className="font-titulo text-base text-rdc-text font-semibold
                               mb-4 flex items-center gap-2">
                  <RolHeaderIcon className={`w-4 h-4 ${config.color}`} />
                  <span>{config.label}</span>
                  <span className="text-xs bg-rdc-card text-rdc-muted
                                   px-2.5 py-0.5 rounded-full font-mono border border-rdc-border">
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
