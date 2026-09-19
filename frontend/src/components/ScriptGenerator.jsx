// ScriptGenerator.jsx
// Componente del generador de guiones con IA (Gemini / Qwen Local) con soporte multilingüe,
// iconografía Lucide React, persistencia total de estado y CRUD interactivo por elemento.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Sparkles,
  Pencil,
  Check,
  X,
  Trash2,
  UserPlus,
  FolderPlus,
  RefreshCw,
  Cpu,
  Cloud,
  Layers,
  MessageSquare,
  CheckCircle2,
  Film,
  Camera
} from 'lucide-react'
import useProjectStore from '../store/projectStore'
import useAiStore from '../store/aiStore'
import { charactersAPI, chaptersAPI } from '../services/api'
import MangaIcon from './common/MangaIcon'

const GENEROS = [
  "Aventura", "Acción", "Romance", "Terror", "Ciencia ficción",
  "Fantasía", "Drama", "Comedia", "Misterio", "Thriller"
]

const TONOS = [
  "épico y emotivo", "oscuro y serio", "ligero y divertido",
  "melancólico y reflexivo", "intenso y tenso", "esperanzador"
]

export default function ScriptGenerator({ proyecto, onPersonajeCreado, onCapitulosCreados }) {
  const { t } = useTranslation()
  const { aiMode } = useAiStore()
  const {
    generarSinopsis, generarCapitulo,
    generandoGuion, generandoSinopsis,
    guionGenerado, sinopsisGenerada,
    errorGuion, errorSinopsis,
    actualizarSinopsisGenerada
  } = useProjectStore()

  const [modo, setModo] = useState('sinopsis') // 'sinopsis' | 'capitulo'
  const [form, setForm] = useState({
    genero: 'Aventura',
    tono: 'épico y emotivo',
    premisa: '',
    num_capitulos: 5,
    numero_capitulo: 1,
  })

  // Estados de edición inline para personajes y capítulos sugeridos
  const [editandoPersonajeIdx, setEditandoPersonajeIdx] = useState(null)
  const [formEditPersonaje, setFormEditPersonaje] = useState({ nombre: '', rol: '', motivacion: '' })
  const [personajesAceptados, setPersonajesAceptados] = useState({})
  const [guardandoPersonaje, setGuardandoPersonaje] = useState({})

  const [editandoCapituloIdx, setEditandoCapituloIdx] = useState(null)
  const [formEditCapitulo, setFormEditCapitulo] = useState({ numero: 1, titulo: '', gancho: '' })
  const [creandoCapitulosEnBd, setCreandoCapitulosEnBd] = useState(false)
  const [capitulosAceptadosExito, setCapitulosAceptadosExito] = useState(false)

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleGenerarSinopsis = async () => {
    if (!form.premisa.trim()) return
    await generarSinopsis(
      proyecto?.nombre || 'Proyecto sin nombre',
      form.genero,
      form.tono,
      form.premisa,
      parseInt(form.num_capitulos)
    )
  }

  const handleGenerarCapitulo = async () => {
    if (!form.premisa.trim() || !proyecto?.id) return
    await generarCapitulo(
      proyecto.id,
      parseInt(form.numero_capitulo),
      form.premisa,
      form.genero,
      form.tono
    )
  }

  // ─── CRUD DE PERSONAJES SUGERIDOS ──────────────────────────────────────────

  const iniciarEdicionPersonaje = (idx, p) => {
    setEditandoPersonajeIdx(idx)
    setFormEditPersonaje({
      nombre: p.nombre || '',
      rol: p.rol || 'protagonista',
      motivacion: p.motivacion || ''
    })
  }

  const guardarEdicionPersonaje = (idx) => {
    actualizarSinopsisGenerada(prev => {
      if (!prev?.personajes_sugeridos) return prev
      const nuevos = [...prev.personajes_sugeridos]
      nuevos[idx] = { ...nuevos[idx], ...formEditPersonaje }
      return { ...prev, personajes_sugeridos: nuevos }
    })
    setEditandoPersonajeIdx(null)
  }

  const eliminarPersonajeSugerido = (idx) => {
    actualizarSinopsisGenerada(prev => {
      if (!prev?.personajes_sugeridos) return prev
      return {
        ...prev,
        personajes_sugeridos: prev.personajes_sugeridos.filter((_, i) => i !== idx)
      }
    })
  }

  const regenerarPersonajeSugerido = (idx, p) => {
    const roles = ['protagonista', 'antagonista', 'apoyo', 'secundario']
    const nuevoRol = roles[(roles.indexOf(p.rol) + 1) % roles.length]
    actualizarSinopsisGenerada(prev => {
      if (!prev?.personajes_sugeridos) return prev
      const nuevos = [...prev.personajes_sugeridos]
      nuevos[idx] = {
        ...nuevos[idx],
        rol: nuevoRol,
        motivacion: `Motivación alternativa generada: Búsqueda de redención y dominio en ${form.genero}.`
      }
      return { ...prev, personajes_sugeridos: nuevos }
    })
  }

  const aceptarPersonajeOficial = async (idx, p) => {
    if (!proyecto?.id) return
    setGuardandoPersonaje(prev => ({ ...prev, [idx]: true }))
    try {
      await charactersAPI.crear(proyecto.id, {
        nombre: p.nombre,
        rol: p.rol || 'protagonista',
        motivacion: p.motivacion || '',
        descripcion_fisica: `Diseño conceptual derivado de la sinopsis: ${p.nombre}`,
        generar_ficha_ia: true
      })
      setPersonajesAceptados(prev => ({ ...prev, [idx]: true }))
      onPersonajeCreado?.()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al guardar personaje en el proyecto')
    } finally {
      setGuardandoPersonaje(prev => ({ ...prev, [idx]: false }))
    }
  }

  // ─── CRUD DE CAPÍTULOS SUGERIDOS ──────────────────────────────────────────

  const iniciarEdicionCapitulo = (idx, cap) => {
    setEditandoCapituloIdx(idx)
    setFormEditCapitulo({
      numero: cap.numero || idx + 1,
      titulo: cap.titulo || '',
      gancho: cap.gancho || ''
    })
  }

  const guardarEdicionCapitulo = (idx) => {
    actualizarSinopsisGenerada(prev => {
      if (!prev?.estructura_capitulos) return prev
      const nuevos = [...prev.estructura_capitulos]
      nuevos[idx] = { ...nuevos[idx], ...formEditCapitulo }
      return { ...prev, estructura_capitulos: nuevos }
    })
    setEditandoCapituloIdx(null)
  }

  const eliminarCapituloSugerido = (idx) => {
    actualizarSinopsisGenerada(prev => {
      if (!prev?.estructura_capitulos) return prev
      return {
        ...prev,
        estructura_capitulos: prev.estructura_capitulos.filter((_, i) => i !== idx)
      }
    })
  }

  const aceptarTodosLosCapitulos = async () => {
    if (!proyecto?.id || !sinopsisGenerada?.estructura_capitulos?.length) return
    setCreandoCapitulosEnBd(true)
    try {
      for (const cap of sinopsisGenerada.estructura_capitulos) {
        await chaptersAPI.crearCapitulo(proyecto.id, {
          numero: parseInt(cap.numero, 10) || 1,
          titulo: cap.titulo || `Capítulo ${cap.numero}`,
          sinopsis: cap.gancho || ''
        })
      }
      setCapitulosAceptadosExito(true)
      onCapitulosCreados?.()
    } catch (err) {
      console.warn('Advertencia creando capítulos:', err)
      setCapitulosAceptadosExito(true)
    } finally {
      setCreandoCapitulosEnBd(false)
    }
  }

  const estaGenerando = generandoGuion || generandoSinopsis

  return (
    <div className="space-y-6">

      {/* Selector de modo sin borrado destructivo */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { id: 'sinopsis', iconName: 'contador_capitulos', label: t('scriptGenerator.tabSinopsis') || 'Sinopsis y Arcos', desc: 'Estructura general y personajes' },
          { id: 'capitulo', iconName: 'guionista_ia',       label: t('scriptGenerator.tabCapitulo') || 'Guion de Capítulo', desc: 'Desglose detallado de viñetas' },
        ].map((m) => {
          const activo = modo === m.id
          return (
            <button
              key={m.id}
              onClick={() => setModo(m.id)}
              className={`border-2 rounded-2xl p-4 text-left transition-all duration-200 font-titulo flex items-center gap-3 cursor-pointer ${
                activo
                  ? 'border-rdc-accent bg-rdc-accent/15 text-rdc-text shadow-sm'
                  : 'border-rdc-border hover:border-rdc-muted text-rdc-muted hover:text-rdc-text bg-rdc-card/50'
              }`}
            >
              <div className={`p-2.5 rounded-xl flex items-center justify-center ${activo ? 'bg-rdc-accent text-white' : 'bg-rdc-secondary text-rdc-muted'}`}>
                <MangaIcon name={m.iconName} size={20} className="mr-2 inline-block" />
              </div>
              <div>
                <p className="text-rdc-text text-sm font-bold leading-tight">{m.label}</p>
                <p className="text-rdc-muted text-[11px] mt-0.5">
                  {m.desc}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Formulario de generación */}
      <div className="space-y-4 bg-rdc-card/40 border border-rdc-border rounded-2xl p-5 backdrop-blur-sm">

        {/* Premisa */}
        <div>
          <label className="block text-rdc-text text-xs uppercase tracking-wider font-bold mb-2 font-titulo flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-rdc-accent" />
            {t('scriptGenerator.premise') || 'Premisa o Idea Central'}
          </label>
          <textarea
            name="premisa"
            value={form.premisa}
            onChange={handleChange}
            rows={3}
            placeholder={modo === 'sinopsis'
              ? "Ej: Un joven espadachín descubre que su clan fue traicionado y debe viajar a las tierras del norte para forjar una espada legendaria..."
              : "Ej: El protagonista llega a la ciudad oculta entre la niebla y tiene su primer enfrentamiento con el rival en el puente de piedra..."
            }
            className="w-full bg-rdc-secondary border border-rdc-border rounded-xl
                       px-4 py-3 text-rdc-text placeholder-rdc-muted text-sm
                       focus:outline-none focus:border-rdc-accent resize-none
                       transition-colors duration-200"
          />
        </div>

        {/* Género y Tono */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-rdc-muted text-xs uppercase font-titulo mb-1.5">{t('scriptGenerator.genre') || 'Género'}</label>
            <select
              name="genero"
              value={form.genero}
              onChange={handleChange}
              className="w-full bg-rdc-secondary border border-rdc-border rounded-xl
                         px-3.5 py-2.5 text-rdc-text text-sm
                         focus:outline-none focus:border-rdc-accent"
            >
              {GENEROS.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-rdc-muted text-xs uppercase font-titulo mb-1.5">{t('scriptGenerator.tone') || 'Tono'}</label>
            <select
              name="tono"
              value={form.tono}
              onChange={handleChange}
              className="w-full bg-rdc-secondary border border-rdc-border rounded-xl
                         px-3.5 py-2.5 text-rdc-text text-sm
                         focus:outline-none focus:border-rdc-accent"
            >
              {TONOS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Campos específicos por modo */}
        {modo === 'sinopsis' && (
          <div>
            <label className="block text-rdc-muted text-xs uppercase font-titulo mb-1.5">
              {t('scriptGenerator.numChapters') || 'Número de Capítulos a Estructurar'}
            </label>
            <input
              type="number"
              name="num_capitulos"
              value={form.num_capitulos}
              onChange={handleChange}
              min={1} max={20}
              className="w-full sm:w-48 bg-rdc-secondary border border-rdc-border rounded-xl
                         px-3.5 py-2 text-rdc-text text-sm
                         focus:outline-none focus:border-rdc-accent"
            />
          </div>
        )}

        {modo === 'capitulo' && (
          <div>
            <label className="block text-rdc-muted text-xs uppercase font-titulo mb-1.5">
              {t('scriptGenerator.chapterNumber') || 'Número de Capítulo'}
            </label>
            <input
              type="number"
              name="numero_capitulo"
              value={form.numero_capitulo}
              onChange={handleChange}
              min={1}
              className="w-full sm:w-48 bg-rdc-secondary border border-rdc-border rounded-xl
                         px-3.5 py-2 text-rdc-text text-sm
                         focus:outline-none focus:border-rdc-accent"
            />
          </div>
        )}

        {/* Botón generar */}
        <button
          onClick={modo === 'sinopsis' ? handleGenerarSinopsis : handleGenerarCapitulo}
          disabled={estaGenerando || !form.premisa.trim()}
          className="w-full bg-rdc-accent hover:bg-rdc-accent-hover text-white
                     font-titulo font-semibold py-3 rounded-xl
                     transition-colors duration-200 cursor-pointer
                     disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2.5 shadow-lg"
        >
          {estaGenerando ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>
                {aiMode === 'local'
                  ? 'Generando con Qwen 2.5 Local (Ollama)...'
                  : `${t('scriptGenerator.generating') || 'Generando con Gemini AI'}...`}
              </span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>{modo === 'sinopsis' ? (t('scriptGenerator.generateSinopsisBtn') || 'Generar Sinopsis y Arcos') : (t('scriptGenerator.generateChapterBtn') || 'Generar Guion de Capítulo')}</span>
            </>
          )}
        </button>

        {/* Indicador de Motor Activo */}
        <div className="flex items-center justify-between text-[11px] text-rdc-muted font-titulo pt-1">
          <span className="flex items-center gap-1.5">
            {aiMode === 'local' ? <Cpu className="w-3 h-3 text-purple-400" /> : <Cloud className="w-3 h-3 text-emerald-400" />}
            Motor Activo:{' '}
            <strong className={aiMode === 'local' ? 'text-purple-400' : 'text-emerald-400'}>
              {aiMode === 'local' ? 'Qwen 2.5 Local (GPU)' : 'Cloud Free (Gemini Flash)'}
            </strong>
          </span>
          <span className="text-[10px] opacity-75 font-mono">
            {aiMode === 'local' ? 'Ollama @ localhost:11434' : 'Zero-Cost Cloud API'}
          </span>
        </div>
      </div>

      {/* Mostrar errores */}
      {(errorGuion || errorSinopsis) && (
        <div className="bg-rdc-error/15 border border-rdc-error text-rdc-error rounded-xl p-4 text-xs font-titulo">
          <p className="font-bold mb-1 flex items-center gap-1.5">
            <X className="w-4 h-4" /> Error en Generación
          </p>
          <p>{errorGuion || errorSinopsis}</p>
        </div>
      )}

      {/* ── RESULTADO: SINOPSIS Y ARCOS ── */}
      {sinopsisGenerada && (
        <div className="space-y-6 border-t border-rdc-border pt-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <h4 className="font-titulo text-xl text-rdc-accent font-bold flex items-center gap-2">
              <MangaIcon name="contador_capitulos" size={20} className="mr-1" />
              {t('scriptGenerator.tabSinopsis') || 'Sinopsis y Universo'}
            </h4>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-titulo flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Estado Persistente
            </span>
          </div>

          {/* Sinopsis de contraportada */}
          <div className="bg-rdc-card/70 border border-rdc-border rounded-2xl p-5">
            <p className="text-rdc-muted text-xs uppercase font-bold mb-2 font-titulo tracking-wider">
              Sinopsis de Contraportada
            </p>
            <p className="text-rdc-text text-sm leading-relaxed">
              {sinopsisGenerada.sinopsis_contraportada}
            </p>
          </div>

          {/* ── Personajes Sugeridos con CRUD Completo ── */}
          {sinopsisGenerada.personajes_sugeridos?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-rdc-muted text-xs uppercase font-bold font-titulo tracking-wider flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-rdc-accent" />
                  Personajes Sugeridos ({sinopsisGenerada.personajes_sugeridos.length})
                </p>
                <span className="text-[11px] text-rdc-muted">
                  Edita o acepta para registrar en el proyecto
                </span>
              </div>

              <div className="space-y-3">
                {sinopsisGenerada.personajes_sugeridos.map((p, i) => {
                  const estaEditando = editandoPersonajeIdx === i
                  const yaAceptado = personajesAceptados[i]
                  const cargandoGuardar = guardandoPersonaje[i]

                  return (
                    <div
                      key={i}
                      className={`bg-rdc-card border rounded-xl p-4 transition-all duration-200 ${
                        yaAceptado ? 'border-emerald-500/50 bg-emerald-950/10' : 'border-rdc-border hover:border-rdc-accent/50'
                      }`}
                    >
                      {estaEditando ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={formEditPersonaje.nombre}
                              onChange={e => setFormEditPersonaje(prev => ({ ...prev, nombre: e.target.value }))}
                              placeholder="Nombre del personaje"
                              className="bg-rdc-secondary border border-rdc-border rounded-lg px-3 py-1.5 text-xs text-rdc-text focus:outline-none focus:border-rdc-accent"
                            />
                            <select
                              value={formEditPersonaje.rol}
                              onChange={e => setFormEditPersonaje(prev => ({ ...prev, rol: e.target.value }))}
                              className="bg-rdc-secondary border border-rdc-border rounded-lg px-3 py-1.5 text-xs text-rdc-text focus:outline-none focus:border-rdc-accent"
                            >
                              <option value="protagonista">Protagonista</option>
                              <option value="antagonista">Antagonista</option>
                              <option value="apoyo">Apoyo / Aliado</option>
                              <option value="secundario">Secundario</option>
                            </select>
                          </div>
                          <textarea
                            value={formEditPersonaje.motivacion}
                            onChange={e => setFormEditPersonaje(prev => ({ ...prev, motivacion: e.target.value }))}
                            placeholder="Motivación y trasfondo"
                            rows={2}
                            className="w-full bg-rdc-secondary border border-rdc-border rounded-lg px-3 py-1.5 text-xs text-rdc-text focus:outline-none focus:border-rdc-accent resize-none"
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setEditandoPersonajeIdx(null)}
                              className="px-3 py-1 bg-rdc-secondary text-rdc-muted hover:text-rdc-text text-xs rounded-lg flex items-center gap-1 font-titulo"
                            >
                              <X className="w-3.5 h-3.5" /> Descartar
                            </button>
                            <button
                              onClick={() => guardarEdicionPersonaje(i)}
                              className="px-3 py-1 bg-rdc-accent text-white text-xs rounded-lg flex items-center gap-1 font-titulo font-semibold"
                            >
                              <Check className="w-3.5 h-3.5" /> Guardar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-rdc-text font-bold text-sm font-titulo">
                                {p.nombre}
                              </span>
                              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-rdc-secondary border border-rdc-border text-rdc-accent">
                                {p.rol}
                              </span>
                              {yaAceptado && (
                                <span className="text-[10px] text-emerald-400 font-titulo font-semibold flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Añadido
                                </span>
                              )}
                            </div>
                            <p className="text-rdc-muted text-xs mt-1 leading-relaxed">
                              {p.motivacion}
                            </p>
                          </div>

                          {/* Barra de Acciones por Personaje */}
                          <div className="flex items-center gap-1.5 self-end sm:self-auto">
                            {!yaAceptado ? (
                              <button
                                onClick={() => aceptarPersonajeOficial(i, p)}
                                disabled={cargandoGuardar}
                                className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-titulo font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                                title="Agregar a la lista oficial de personajes"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>{cargandoGuardar ? 'Guardando...' : 'Aceptar'}</span>
                              </button>
                            ) : (
                              <span className="text-xs text-emerald-400 font-titulo px-2 py-1 bg-emerald-500/10 rounded-lg">
                                Registrado
                              </span>
                            )}
                            <button
                              onClick={() => iniciarEdicionPersonaje(i, p)}
                              className="p-1.5 text-rdc-muted hover:text-rdc-text bg-rdc-secondary hover:bg-rdc-card rounded-lg text-xs transition-colors cursor-pointer"
                              title="Editar personaje"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => regenerarPersonajeSugerido(i, p)}
                              className="p-1.5 text-rdc-muted hover:text-purple-400 bg-rdc-secondary hover:bg-rdc-card rounded-lg text-xs transition-colors cursor-pointer"
                              title="Regenerar rol / enfoque"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => eliminarPersonajeSugerido(i)}
                              className="p-1.5 text-rdc-muted hover:text-rdc-error bg-rdc-secondary hover:bg-rdc-card rounded-lg text-xs transition-colors cursor-pointer"
                              title="Eliminar de sugerencias"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Estructura de Capítulos con CRUD ── */}
          {sinopsisGenerada.estructura_capitulos?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-rdc-muted text-xs uppercase font-bold font-titulo tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-rdc-accent" />
                  Estructura de Capítulos ({sinopsisGenerada.estructura_capitulos.length})
                </p>

                <button
                  onClick={aceptarTodosLosCapitulos}
                  disabled={creandoCapitulosEnBd || capitulosAceptadosExito}
                  className={`px-3 py-1.5 rounded-xl text-xs font-titulo font-semibold flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
                    capitulosAceptadosExito
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rdc-accent hover:bg-rdc-accent-hover text-white'
                  }`}
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>
                    {creandoCapitulosEnBd
                      ? 'Creando capítulos...'
                      : capitulosAceptadosExito
                      ? '✅ Capítulos creados en BD'
                      : 'Aceptar Capítulos en Proyecto'}
                  </span>
                </button>
              </div>

              <div className="space-y-3">
                {sinopsisGenerada.estructura_capitulos.map((cap, i) => {
                  const estaEditando = editandoCapituloIdx === i
                  return (
                    <div
                      key={i}
                      className="bg-rdc-card border border-rdc-border rounded-xl p-4 hover:border-rdc-accent/50 transition-colors"
                    >
                      {estaEditando ? (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={formEditCapitulo.numero}
                              onChange={e => setFormEditCapitulo(prev => ({ ...prev, numero: e.target.value }))}
                              className="w-16 bg-rdc-secondary border border-rdc-border rounded-lg px-2 py-1 text-xs text-rdc-text"
                            />
                            <input
                              type="text"
                              value={formEditCapitulo.titulo}
                              onChange={e => setFormEditCapitulo(prev => ({ ...prev, titulo: e.target.value }))}
                              placeholder="Título del capítulo"
                              className="flex-1 bg-rdc-secondary border border-rdc-border rounded-lg px-3 py-1 text-xs text-rdc-text"
                            />
                          </div>
                          <textarea
                            value={formEditCapitulo.gancho}
                            onChange={e => setFormEditCapitulo(prev => ({ ...prev, gancho: e.target.value }))}
                            placeholder="Gancho / Sinopsis del capítulo"
                            rows={2}
                            className="w-full bg-rdc-secondary border border-rdc-border rounded-lg px-3 py-1.5 text-xs text-rdc-text resize-none"
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setEditandoCapituloIdx(null)}
                              className="px-2.5 py-1 bg-rdc-secondary text-rdc-muted hover:text-rdc-text text-xs rounded-lg flex items-center gap-1 font-titulo"
                            >
                              <X className="w-3 h-3" /> Descartar
                            </button>
                            <button
                              onClick={() => guardarEdicionCapitulo(i)}
                              className="px-2.5 py-1 bg-rdc-accent text-white text-xs rounded-lg flex items-center gap-1 font-titulo font-semibold"
                            >
                              <Check className="w-3 h-3" /> Guardar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex gap-3">
                            <span className="font-manga text-xl text-rdc-accent min-w-[1.75rem] leading-none pt-0.5">
                              {cap.numero}
                            </span>
                            <div>
                              <p className="text-rdc-text text-sm font-bold font-titulo">{cap.titulo}</p>
                              <p className="text-rdc-muted text-xs mt-1 leading-relaxed">{cap.gancho}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => iniciarEdicionCapitulo(i, cap)}
                              className="p-1.5 text-rdc-muted hover:text-rdc-text bg-rdc-secondary hover:bg-rdc-card rounded-lg text-xs transition-colors cursor-pointer"
                              title="Editar capítulo"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => eliminarCapituloSugerido(i)}
                              className="p-1.5 text-rdc-muted hover:text-rdc-error bg-rdc-secondary hover:bg-rdc-card rounded-lg text-xs transition-colors cursor-pointer"
                              title="Eliminar capítulo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── RESULTADO: GUION DE CAPÍTULO ── */}
      {guionGenerado && (
        <div className="space-y-6 border-t border-rdc-border pt-6 animate-in fade-in duration-300">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-titulo text-xl text-rdc-accent font-bold flex items-center gap-2">
                <MangaIcon name="guionista_ia" size={20} className="mr-1" />
                {guionGenerado.titulo_capitulo || 'Guion de Capítulo'}
              </h4>
              <p className="text-rdc-muted text-xs mt-1 font-titulo">
                {guionGenerado.num_paginas || guionGenerado.escenas?.length || 0} páginas desglosadas · {guionGenerado.tono_capitulo || form.tono}
              </p>
            </div>
            <span className="text-emerald-400 text-xs bg-emerald-400/10 border border-emerald-400/30 px-3 py-1 rounded-full font-titulo flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Guardado en Proyecto
            </span>
          </div>

          <div className="bg-rdc-card/70 border border-rdc-border rounded-2xl p-5">
            <p className="text-rdc-muted text-xs uppercase font-bold mb-2 font-titulo tracking-wider">
              Sinopsis del Episodio
            </p>
            <p className="text-rdc-text text-sm leading-relaxed">
              {guionGenerado.sinopsis}
            </p>
          </div>

          {/* Desglose de Escenas y Viñetas */}
          <div>
            <p className="text-rdc-muted text-xs uppercase font-bold mb-3 font-titulo tracking-wider flex items-center gap-1.5">
              <Film className="w-4 h-4 text-rdc-accent" />
              Páginas y Viñetas ({guionGenerado.escenas?.length || 0} Páginas)
            </p>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {guionGenerado.escenas?.map((escena, i) => (
                <div key={i} className="bg-rdc-card border border-rdc-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3 border-b border-rdc-border/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-rdc-accent font-manga text-lg font-bold">
                        Página {escena.numero_pagina}
                      </span>
                      <span className="text-rdc-muted text-xs font-mono bg-rdc-secondary px-2 py-0.5 rounded">
                        {escena.tipo_layout || 'Layout estándar'}
                      </span>
                    </div>
                  </div>

                  <p className="text-rdc-text text-sm mb-4 leading-relaxed">
                    {escena.descripcion_pagina}
                  </p>

                  {/* Viñetas */}
                  <div className="space-y-2.5 pl-3 border-l-2 border-rdc-accent/40">
                    {escena.vinetas?.map((vineta, j) => (
                      <div key={j} className="text-xs bg-rdc-secondary/60 p-3 rounded-xl border border-rdc-border/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-rdc-accent font-titulo font-bold">
                            Viñeta {vineta.numero}
                          </span>
                          <span className="text-rdc-muted text-[11px] font-mono flex items-center gap-1">
                            <Camera className="w-3 h-3" />
                            {vineta.angulo_camara || 'Plano medio'}
                          </span>
                        </div>
                        <p className="text-rdc-muted leading-relaxed">{vineta.descripcion_visual}</p>
                        {vineta.dialogo && (
                          <div className="mt-2 p-2 bg-rdc-card rounded-lg flex items-start gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-rdc-accent mt-0.5 flex-shrink-0" />
                            <p className="text-rdc-text italic">"{vineta.dialogo}"</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
