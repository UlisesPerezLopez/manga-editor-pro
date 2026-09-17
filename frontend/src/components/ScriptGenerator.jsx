// ScriptGenerator.jsx
// Componente del generador de guiones con IA (Gemini) con soporte multilingüe.
// Permite generar tanto la sinopsis del proyecto como el guion de un capítulo.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import useProjectStore from '../store/projectStore'
import useAiStore from '../store/aiStore'
import Spinner from './UI/Spinner'

const GENEROS = [
  "Aventura", "Acción", "Romance", "Terror", "Ciencia ficción",
  "Fantasía", "Drama", "Comedia", "Misterio", "Thriller"
]

const TONOS = [
  "épico y emotivo", "oscuro y serio", "ligero y divertido",
  "melancólico y reflexivo", "intenso y tenso", "esperanzador"
]

export default function ScriptGenerator({ proyecto }) {
  const { t } = useTranslation()
  const { aiMode } = useAiStore()
  const {
    generarSinopsis, generarCapitulo,
    generandoGuion, generandoSinopsis,
    guionGenerado, sinopsisGenerada,
    errorGuion, errorSinopsis,
    limpiarGuion, limpiarSinopsis
  } = useProjectStore()

  const [modo, setModo] = useState('sinopsis') // 'sinopsis' | 'capitulo'
  const [form, setForm] = useState({
    genero: 'Aventura',
    tono: 'épico y emotivo',
    premisa: '',
    num_capitulos: 5,
    numero_capitulo: 1,
  })

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

  const estaGenerando = generandoGuion || generandoSinopsis

  return (
    <div className="space-y-6">

      {/* Selector de modo */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { id: 'sinopsis', emoji: '📖', label: t('scriptGenerator.tabSinopsis') },
          { id: 'capitulo', emoji: '📝', label: t('scriptGenerator.tabCapitulo') },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => { setModo(m.id); limpiarGuion(); limpiarSinopsis() }}
            className={`border-2 rounded-lg p-4 text-left transition-all duration-200 font-titulo
              ${modo === m.id
                ? 'border-rdc-accent bg-rdc-accent bg-opacity-10'
                : 'border-rdc-border hover:border-rdc-muted'}`}
          >
            <span className="text-2xl block mb-1">{m.emoji}</span>
            <p className="text-rdc-text text-sm font-semibold">{m.label}</p>
          </button>
        ))}
      </div>

      {/* Formulario de generación */}
      <div className="space-y-4">

        {/* Premisa */}
        <div>
          <label className="block text-rdc-muted text-sm mb-2 font-titulo">
            {t('scriptGenerator.premise')}
          </label>
          <textarea
            name="premisa"
            value={form.premisa}
            onChange={handleChange}
            rows={3}
            placeholder={modo === 'sinopsis'
              ? "Ej: Un joven espadachín descubre que su clan fue traicionado y debe buscar justicia..."
              : "Ej: El protagonista llega a la ciudad misteriosa y tiene su primer encuentro con el rival..."
            }
            className="w-full bg-rdc-card border border-rdc-border rounded-lg
                       px-4 py-3 text-rdc-text placeholder-rdc-muted text-sm
                       focus:outline-none focus:border-rdc-accent resize-none
                       transition-colors duration-200"
          />
        </div>

        {/* Género y Tono */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-rdc-muted text-sm mb-2 font-titulo">{t('scriptGenerator.genre')}</label>
            <select
              name="genero"
              value={form.genero}
              onChange={handleChange}
              className="w-full bg-rdc-card border border-rdc-border rounded-lg
                         px-4 py-3 text-rdc-text text-sm
                         focus:outline-none focus:border-rdc-accent"
            >
              {GENEROS.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-rdc-muted text-sm mb-2 font-titulo">{t('scriptGenerator.tone')}</label>
            <select
              name="tono"
              value={form.tono}
              onChange={handleChange}
              className="w-full bg-rdc-card border border-rdc-border rounded-lg
                         px-4 py-3 text-rdc-text text-sm
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
            <label className="block text-rdc-muted text-sm mb-2 font-titulo">
              {t('scriptGenerator.numChapters')}
            </label>
            <input
              type="number"
              name="num_capitulos"
              value={form.num_capitulos}
              onChange={handleChange}
              min={1} max={20}
              className="w-full bg-rdc-card border border-rdc-border rounded-lg
                         px-4 py-3 text-rdc-text text-sm
                         focus:outline-none focus:border-rdc-accent"
            />
          </div>
        )}

        {modo === 'capitulo' && (
          <div>
            <label className="block text-rdc-muted text-sm mb-2 font-titulo">
              {t('scriptGenerator.chapterNumber')}
            </label>
            <input
              type="number"
              name="numero_capitulo"
              value={form.numero_capitulo}
              onChange={handleChange}
              min={1}
              className="w-full bg-rdc-card border border-rdc-border rounded-lg
                         px-4 py-3 text-rdc-text text-sm
                         focus:outline-none focus:border-rdc-accent"
            />
          </div>
        )}

        {/* Botón generar */}
        <button
          onClick={modo === 'sinopsis' ? handleGenerarSinopsis : handleGenerarCapitulo}
          disabled={estaGenerando || !form.premisa.trim()}
          className="w-full bg-rdc-accent hover:bg-rdc-accent-hover text-white
                     font-titulo font-semibold py-3 rounded-lg
                     transition-colors duration-200
                     disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-3 shadow-lg"
        >
          {estaGenerando ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent
                              rounded-full animate-spin" />
              <span>
                {aiMode === 'local'
                  ? 'Generando con Qwen 2.5 Local (Ollama)...'
                  : `${t('scriptGenerator.generating')} (Cloud)...`}
              </span>
            </>
          ) : (
            <>
              {modo === 'sinopsis' ? t('scriptGenerator.generateSinopsisBtn') : t('scriptGenerator.generateChapterBtn')}
            </>
          )}
        </button>

        {/* Indicador de Motor Activo */}
        <div className="flex items-center justify-between text-[11px] text-rdc-muted font-titulo pt-1">
          <span>
            ⚙️ {t('aiEngine.title')}:{' '}
            <strong className={aiMode === 'local' ? 'text-purple-400' : 'text-emerald-400'}>
              {aiMode === 'local' ? '🖥️ Qwen 2.5 Local (GPU)' : '☁️ Cloud Free (Zero-Cost)'}
            </strong>
          </span>
          <span className="text-[10px] opacity-75">
            {aiMode === 'local' ? 'Ollama @ :11434' : 'Gemini / Pollinations'}
          </span>
        </div>
      </div>

      {/* Mostrar errores */}
      {(errorGuion || errorSinopsis) && (
        <div className="bg-rdc-error bg-opacity-20 border border-rdc-error
                        text-rdc-error rounded-lg p-4 text-sm">
          <p className="font-semibold mb-1">❌ Error</p>
          <p>{errorGuion || errorSinopsis}</p>
        </div>
      )}

      {/* Resultado: Sinopsis */}
      {sinopsisGenerada && (
        <div className="space-y-4 border-t border-rdc-border pt-6">
          <h4 className="font-titulo text-lg text-rdc-accent font-semibold">
            📖 {t('scriptGenerator.tabSinopsis')}
          </h4>

          <div className="bg-rdc-card rounded-lg p-4">
            <p className="text-rdc-muted text-xs uppercase mb-2 font-titulo">Contraportada</p>
            <p className="text-rdc-text text-sm leading-relaxed">
              {sinopsisGenerada.sinopsis_contraportada}
            </p>
          </div>

          {sinopsisGenerada.personajes_sugeridos?.length > 0 && (
            <div>
              <p className="text-rdc-muted text-xs uppercase mb-3 font-titulo">Personajes sugeridos</p>
              <div className="space-y-2">
                {sinopsisGenerada.personajes_sugeridos.map((p, i) => (
                  <div key={i} className="bg-rdc-card rounded-lg p-3">
                    <p className="text-rdc-text text-sm font-semibold">
                      {p.nombre}
                      <span className="text-rdc-muted text-xs font-normal ml-2 font-titulo">
                        ({p.rol})
                      </span>
                    </p>
                    <p className="text-rdc-muted text-xs mt-1">{p.motivacion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sinopsisGenerada.estructura_capitulos?.length > 0 && (
            <div>
              <p className="text-rdc-muted text-xs uppercase mb-3 font-titulo">Estructura de capítulos</p>
              <div className="space-y-2">
                {sinopsisGenerada.estructura_capitulos.map((cap, i) => (
                  <div key={i} className="bg-rdc-card rounded-lg p-3 flex gap-3">
                    <span className="text-rdc-accent font-manga text-lg min-w-[2rem]">
                      {cap.numero}
                    </span>
                    <div>
                      <p className="text-rdc-text text-sm font-semibold">{cap.titulo}</p>
                      <p className="text-rdc-muted text-xs mt-1">{cap.gancho}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resultado: Guion de capítulo */}
      {guionGenerado && (
        <div className="space-y-4 border-t border-rdc-border pt-6">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-titulo text-lg text-rdc-accent font-semibold">
                📝 {guionGenerado.titulo_capitulo}
              </h4>
              <p className="text-rdc-muted text-xs mt-1 font-titulo">
                {guionGenerado.num_paginas} {t('dashboard.card.pages').toLowerCase()} · {guionGenerado.tono_capitulo}
              </p>
            </div>
            <span className="text-green-400 text-xs bg-green-400 bg-opacity-10
                             border border-green-400 border-opacity-30
                             px-2 py-1 rounded font-titulo">
              ✅ {t('scriptGenerator.saveToDb')}
            </span>
          </div>

          <div className="bg-rdc-card rounded-lg p-4">
            <p className="text-rdc-muted text-xs uppercase mb-2 font-titulo">Sinopsis</p>
            <p className="text-rdc-text text-sm leading-relaxed">
              {guionGenerado.sinopsis}
            </p>
          </div>

          {/* Escenas/páginas */}
          <div>
            <p className="text-rdc-muted text-xs uppercase mb-3 font-titulo">
              Escenas ({guionGenerado.escenas?.length || 0} {t('dashboard.card.pages').toLowerCase()})
            </p>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {guionGenerado.escenas?.map((escena, i) => (
                <div key={i} className="bg-rdc-card rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-rdc-accent font-manga">
                      Pág. {escena.numero_pagina}
                    </span>
                    <span className="text-rdc-muted text-xs font-mono">
                      {escena.tipo_layout}
                    </span>
                  </div>
                  <p className="text-rdc-text text-sm mb-3">
                    {escena.descripcion_pagina}
                  </p>
                  {/* Viñetas de la página */}
                  <div className="space-y-2 pl-3 border-l border-rdc-border">
                    {escena.vinetas?.map((vineta, j) => (
                      <div key={j} className="text-xs">
                        <span className="text-rdc-accent font-titulo font-semibold">Viñeta {vineta.numero}</span>
                        <span className="text-rdc-muted ml-2">{vineta.angulo_camara}</span>
                        <p className="text-rdc-muted mt-1">{vineta.descripcion_visual}</p>
                        {vineta.dialogo && (
                          <p className="text-rdc-text mt-1 italic">"{vineta.dialogo}"</p>
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