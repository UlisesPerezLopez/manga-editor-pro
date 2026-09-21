// Personajes.jsx
// Herramienta completa de "Personajes" en MEP — Manga Editor Pro.
// Vincula la narrativa del guion con la generación de retratos artísticos mediante Firma Visual activa.

import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Users,
  UserPlus,
  Sparkles,
  Download,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Search,
  BookOpen
} from 'lucide-react'
import useCharacterStore from '../store/characterStore'
import useProjectStore from '../store/projectStore'
import CharacterCard from './Characters/CharacterCard'
import CharacterModal from './Characters/CharacterModal'
import Spinner from './UI/Spinner'
import MangaIcon from './common/MangaIcon'
import { LEGENDARY_STYLES } from '../data/stylePresets'

export default function Personajes({ proyecto, onActualizar }) {
  const { t } = useTranslation()
  const {
    personajes,
    cargando,
    cargarPersonajes,
    eliminarPersonaje,
    importarPersonajesDelGuion
  } = useCharacterStore()
  const { sinopsisGenerada, guionGenerado } = useProjectStore()

  const [modalAbierto, setModalAbierto] = useState(false)
  const [personajeSeleccionado, setPersonajeSeleccionado] = useState(null)
  const [pestanaModal, setPestanaModal] = useState('ficha')
  const [filtroRol, setFiltroRol] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [notificacion, setNotificacion] = useState(null)
  const [importando, setImportando] = useState(false)

  const projectId = proyecto?.id
  const modo = proyecto?.modo_creacion || 'propio'

  // Cargar personajes al montar o cambiar de proyecto
  useEffect(() => {
    if (projectId) {
      cargarPersonajes(projectId)
    }
  }, [projectId])

  // Obtener preset legendario si aplica
  const presetActual = useMemo(() => {
    if (!proyecto?.estilo_legendario) return null
    const cleanId = proyecto.estilo_legendario.replace('aleatorio_', '').replace('legendario_', '')
    return LEGENDARY_STYLES.find(s => s.id === cleanId || s.id === proyecto.estilo_legendario)
  }, [proyecto?.estilo_legendario])

  // Abrir modal de creación manual
  const handleNuevoPersonaje = () => {
    setPersonajeSeleccionado(null)
    setPestanaModal('ficha')
    setModalAbierto(true)
  }

  // Abrir modal de edición
  const handleEditarPersonaje = (personaje) => {
    setPersonajeSeleccionado(personaje)
    setPestanaModal('ficha')
    setModalAbierto(true)
  }

  // Abrir modal directamente en generador de retrato
  const handleGenerarRetrato = (personaje) => {
    setPersonajeSeleccionado(personaje)
    setPestanaModal('retrato')
    setModalAbierto(true)
  }

  // Eliminar personaje
  const handleEliminar = async (personaje) => {
    if (!projectId || !personaje?.id) return
    if (!confirm(`¿Eliminar al personaje '${personaje.nombre}' de la obra?`)) return

    const res = await eliminarPersonaje(projectId, personaje.id)
    if (res?.exito) {
      setNotificacion({ tipo: 'exito', texto: `Personaje '${personaje.nombre}' eliminado.` })
      setTimeout(() => setNotificacion(null), 3000)
      if (onActualizar) onActualizar()
    } else {
      setNotificacion({ tipo: 'error', texto: res?.error || 'Error al eliminar personaje.' })
    }
  }

  // Importar personajes del guion / sinopsis
  const handleImportarDelGuion = async () => {
    if (!projectId) return
    setImportando(true)
    setNotificacion(null)

    // Recolectar posibles personajes sugeridos desde el store o la sinopsis
    const candidatos = []
    if (sinopsisGenerada?.personajes_sugeridos && Array.isArray(sinopsisGenerada.personajes_sugeridos)) {
      candidatos.push(...sinopsisGenerada.personajes_sugeridos)
    }

    try {
      const res = await importarPersonajesDelGuion(projectId, {
        personajes_sugeridos: candidatos
      })
      if (res?.exito) {
        const cant = res.data?.importados ?? 0
        if (cant > 0) {
          setNotificacion({
            tipo: 'exito',
            texto: `✨ ¡Se importaron ${cant} personaje(s) sugeridos del guion exitosamente!`
          })
        } else {
          setNotificacion({
            tipo: 'info',
            texto: 'No se encontraron nuevos personajes para importar o ya estaban registrados.'
          })
        }
        setTimeout(() => setNotificacion(null), 4000)
        if (onActualizar) onActualizar()
      }
    } catch (e) {
      setNotificacion({ tipo: 'error', texto: 'Error al importar personajes del guion.' })
    } finally {
      setImportando(false)
    }
  }

  // Filtrado de personajes
  const personajesFiltrados = useMemo(() => {
    return personajes.filter(p => {
      const coincideRol = filtroRol === 'todos' || (p.rol || '').toLowerCase() === filtroRol.toLowerCase()
      const query = busqueda.toLowerCase().trim()
      const coincideBusqueda = !query ||
        p.nombre?.toLowerCase().includes(query) ||
        p.descripcion_fisica?.toLowerCase().includes(query) ||
        p.personalidad?.toLowerCase().includes(query) ||
        p.ropa_tipica?.toLowerCase().includes(query)
      return coincideRol && coincideBusqueda
    })
  }, [personajes, filtroRol, busqueda])

  return (
    <div className="space-y-6">

      {/* ── Cabecera de Herramienta Entintada ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.85)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)]">
        
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-indigo-50 dark:bg-slate-800 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] flex-shrink-0">
            <MangaIcon name="personajes" size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-titulo text-lg font-black text-slate-900 dark:text-white leading-tight">
                Diseño y Ficha de Personajes
              </h3>
              {presetActual ? (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full border border-purple-500 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold uppercase tracking-wider font-titulo flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>{presetActual.nombre}</span>
                </span>
              ) : (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full border border-slate-900 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-titulo">
                  Modo {modo}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
              Administra el elenco, fichas técnicas y genera retratos oficiales con tu Firma Visual activa (FLUX.1 Dev).
            </p>
          </div>
        </div>

        {/* Botonera Superior de Acciones */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleImportarDelGuion}
            disabled={importando}
            className="py-2 px-3.5 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-900 dark:text-purple-200 font-titulo font-bold text-xs shadow-[2px_2px_0px_0px_rgba(147,51,234,0.85)] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Importar personajes identificados en la sinopsis y capítulos"
          >
            {importando ? (
              <Spinner size="xs" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-400" />
            )}
            <span>[✨ Importar Personajes del Guion]</span>
          </button>

          <button
            type="button"
            onClick={handleNuevoPersonaje}
            className="py-2 px-4 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-emerald-600 hover:bg-emerald-500 text-white font-titulo font-black text-xs shadow-[3px_3px_0px_0px_rgba(0,0,0,0.85)] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>[➕ Crear Nuevo Personaje]</span>
          </button>
        </div>

      </div>

      {/* Notificación de Estado */}
      {notificacion && (
        <div className={`p-3.5 rounded-xl border-2 text-xs font-bold flex items-center justify-between shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] animate-fade-in ${
          notificacion.tipo === 'exito'
            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200'
            : notificacion.tipo === 'info'
            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200'
            : 'border-red-600 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {notificacion.tipo === 'exito' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{notificacion.texto}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotificacion(null)}
            className="text-[11px] underline font-bold cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* ── Barra de Búsqueda y Filtros de Rol ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border-2 border-slate-900 dark:border-slate-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)]">
        
        {/* Chips de Filtrado por Rol */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'todos',          label: `Todos (${personajes.length})` },
            { id: 'protagonista',   label: 'Protagonistas' },
            { id: 'coprotagonista', label: 'Coprotagonistas' },
            { id: 'antagonista',    label: 'Antagonistas' },
            { id: 'rival',          label: 'Rivales' },
            { id: 'mentor',         label: 'Mentores' },
            { id: 'apoyo',          label: 'Apoyo' },
            { id: 'secundario',     label: 'Secundarios' },
          ].map(f => {
            const activo = filtroRol === f.id
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltroRol(f.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-titulo transition-all cursor-pointer ${
                  activo
                    ? 'border-2 border-slate-900 dark:border-slate-600 bg-purple-600 text-white font-black shadow-[1px_1px_0px_0px_rgba(0,0,0,0.85)]'
                    : 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            )
          })}
        </div>

        {/* Buscador de Personajes */}
        <div className="relative min-w-[200px] flex-1 sm:flex-none">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o rasgo..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
          />
        </div>

      </div>

      {/* Estado de Carga */}
      {cargando && (
        <div className="py-12 text-center">
          <Spinner texto="Cargando elenco de personajes..." size="md" />
        </div>
      )}

      {/* ── Cuadrícula de Personajes (Character Grid) ── */}
      {!cargando && personajesFiltrados.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {personajesFiltrados.map((personaje) => (
            <CharacterCard
              key={personaje.id}
              personaje={personaje}
              onEditar={handleEditarPersonaje}
              onGenerarRetrato={handleGenerarRetrato}
              onEliminar={handleEliminar}
            />
          ))}
        </div>
      )}

      {/* Estado Vacío */}
      {!cargando && personajesFiltrados.length === 0 && (
        <div className="p-12 text-center border-2 border-dashed border-slate-400 dark:border-slate-700 rounded-2xl bg-white/50 dark:bg-slate-900/30 space-y-4">
          <div className="w-16 h-16 rounded-2xl border-2 border-slate-900 dark:border-slate-700 bg-amber-50 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-700 dark:text-slate-300 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.85)]">
            <Users className="w-8 h-8 text-amber-500" />
          </div>

          <div className="space-y-1">
            <h4 className="font-titulo font-black text-base text-slate-900 dark:text-white">
              {busqueda || filtroRol !== 'todos'
                ? 'No se encontraron personajes con estos filtros'
                : 'Aún no hay personajes en este proyecto'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {busqueda || filtroRol !== 'todos'
                ? 'Prueba a limpiar la búsqueda o cambiar el selector de roles.'
                : 'Crea el protagonista y sus aliados manualmente o impórtalos directamente de la sinopsis generada por el Guionista IA.'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleImportarDelGuion}
              className="py-2.5 px-4 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-purple-600 hover:bg-purple-500 text-white font-titulo font-bold text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Importar del Guion</span>
            </button>

            <button
              type="button"
              onClick={handleNuevoPersonaje}
              className="py-2.5 px-4 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 font-titulo font-bold text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)] flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Crear Personaje</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Modal de Ficha Técnica & Retratos ── */}
      <CharacterModal
        abierto={modalAbierto}
        onCerrar={() => {
          setModalAbierto(false)
          setPersonajeSeleccionado(null)
        }}
        personajeEditar={personajeSeleccionado}
        proyecto={proyecto}
        pestanaInicial={pestanaModal}
        onGuardadoExitoso={() => {
          if (onActualizar) onActualizar()
        }}
      />

    </div>
  )
}
