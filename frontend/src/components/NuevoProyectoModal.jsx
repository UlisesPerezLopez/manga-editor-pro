// NuevoProyectoModal.jsx
// Modal de creación rápida de proyectos con blindaje de las 25 Biblias de Estilo obligatorias.
// Inicializa por defecto en 'mortadela_y_salchichon' y despacha estilo_visual en el payload POST /projects.

import React, { useState } from 'react'
import { X, Sparkles, AlertTriangle } from 'lucide-react'
import { projectsAPI } from '../services/api'
import useProjectStore from '../store/projectStore'
import useThemeStore, { TEMAS } from '../store/themeStore'
import StyleSelectorGrid from './common/StyleSelectorGrid'
import ReadingFormatSelector from './common/ReadingFormatSelector'

const ESTILOS_CANONICOS = [
  'shonen_legendario', 'fantasia_oscura', 'cyberpunk_209X', 'anime_pastoral', 'mecha_clasico',
  'gotico_vampirico', 'jidaigeki_samurai', 'shojo_mistico', 'seinen_psicologico', 'cosmos_mitologico',
  'belleza_melancolica', 'isekai_fantasia', 'kodomo_aventura', 'mortadela_y_salchichon', 'superperez',
  'el_capitan_rayo', 'galos_y_druidas', 'franco_belga', 'indie_underground', 'hero_vintage_modern',
  'vigilante_nocturno', 'reloj_del_juicio', 'heroe_miltru', 'barabaros', 'us_vintage'
]

export default function NuevoProyectoModal({ isOpen, onClose, onCreado }) {
  const { tema } = useThemeStore()
  const esGhibli = tema === TEMAS.GHIBLI
  const { setProyectoActivo } = useProjectStore()

  const [nombre, setNombre] = useState('')
  const [modo, setModo] = useState('legendario')
  const [formato, setFormato] = useState('manga')
  const [estiloSeleccionado, setEstiloSeleccionado] = useState('mortadela_y_salchichon')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  if (!isOpen) return null

  const handleCrear = async (e) => {
    e?.preventDefault()
    if (!nombre.trim()) {
      setError('El nombre del proyecto es obligatorio.')
      return
    }

    const estiloDefinitivo = estiloSeleccionado || 'mortadela_y_salchichon'

    setCargando(true)
    setError(null)

    try {
      const payload = {
        nombre: nombre.trim(),
        modo_creacion: modo,
        formato_lectura: formato,
        estilo_visual: estiloDefinitivo,
        estilo_legendario: estiloDefinitivo,
      }

      const res = await projectsAPI.crear(payload)
      const nuevo = res?.data
      if (nuevo) {
        setProyectoActivo(nuevo)
        if (onCreado) onCreado(nuevo)
        if (onClose) onClose()
      }
    } catch (err) {
      console.error('Error creando proyecto:', err)
      setError(err?.response?.data?.detail || 'Error al crear el proyecto.')
    } finally {
      setCargando(false)
    }
  }

  const sortearEstilo = () => {
    const random = ESTILOS_CANONICOS[Math.floor(Math.random() * ESTILOS_CANONICOS.length)]
    setEstiloSeleccionado(random)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border-2 p-6 shadow-2xl flex flex-col justify-between ${
        esGhibli
          ? 'bg-[#FCFAF6] border-slate-900 text-slate-900 shadow-[6px_6px_0px_0px_rgba(30,41,59,0.9)]'
          : 'bg-rdc-secondary border-rdc-border text-rdc-text'
      }`}>
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-rdc-border">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-rdc-accent/15 border border-rdc-accent/30 flex items-center justify-center text-rdc-accent">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-titulo text-xl font-bold">Crear Nuevo Proyecto</h2>
              <p className="text-xs text-rdc-muted font-titulo">Asignación obligatoria de Biblia de Estilo canónica</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-rdc-muted hover:text-rdc-text transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl border border-red-500 bg-red-500/10 text-red-500 text-xs font-titulo flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCrear} className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-rdc-muted mb-1 font-titulo">
              Título del Manga / Cómic
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Las Aventuras de Pepe y Paco"
              className="w-full px-4 py-2.5 rounded-xl border border-rdc-border bg-rdc-card text-rdc-text text-sm focus:outline-none focus:border-rdc-accent font-titulo"
              required
            />
          </div>

          {/* Modalidad y Formato */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-rdc-muted mb-1 font-titulo">
                Modalidad
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'legendario', label: 'Legendario' },
                  { id: 'propio', label: 'Propio' },
                  { id: 'aleatorio', label: 'Aleatorio' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setModo(m.id)}
                    className={`py-2 px-1 text-xs rounded-xl border font-titulo font-bold transition-all cursor-pointer text-center ${
                      modo === m.id
                        ? 'bg-rdc-accent text-white border-rdc-accent shadow-xs'
                        : 'bg-rdc-card border-rdc-border text-rdc-muted hover:text-rdc-text'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-rdc-muted mb-1 font-titulo">
                Formato de Lectura
              </label>
              <ReadingFormatSelector
                value={formato}
                onChange={setFormato}
                isGhibli={esGhibli}
              />
            </div>
          </div>

          {/* Selector de 25 Biblias de Estilo */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-rdc-muted font-titulo flex items-center gap-1.5">
                <span>Biblia de Estilo Obligatoria (25 Disponibles)</span>
                <span className="text-emerald-500 font-bold">• Activa</span>
              </label>
              {modo === 'aleatorio' && (
                <button
                  type="button"
                  onClick={sortearEstilo}
                  className="text-xs px-2.5 py-0.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 font-titulo font-semibold cursor-pointer"
                >
                  🎲 Sortear
                </button>
              )}
            </div>
            <StyleSelectorGrid
              estiloSeleccionado={estiloSeleccionado}
              onSeleccionar={setEstiloSeleccionado}
              maxHeight="max-h-[38vh]"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-rdc-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-rdc-muted hover:text-rdc-text transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="px-6 py-2.5 text-xs font-bold rounded-xl bg-rdc-accent hover:bg-rdc-accent-hover text-white shadow-lg shadow-rdc-accent/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{cargando ? 'Creando...' : 'Crear Proyecto con Estilo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
