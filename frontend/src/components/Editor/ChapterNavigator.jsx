// ChapterNavigator.jsx
// Navegador de capítulos y páginas en el panel derecho del editor con soporte i18n.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import useEditorStore from '../../store/editorStore'

export default function ChapterNavigator({ proyecto }) {
  const { t } = useTranslation()
  const {
    capitulos, paginaActiva, capituloActivo,
    crearCapitulo, crearPagina, cargarPagina,
    eliminarCapitulo, eliminarPagina
  } = useEditorStore()

  const [capitulosExpandidos, setCapitulosExpandidos] = useState({})
  const [creandoCap, setCreandoCap] = useState(false)
  const [tituloCap, setTituloCap] = useState('')

  const toggleCapitulo = (id) => {
    setCapitulosExpandidos(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleCrearCapitulo = async () => {
    if (!tituloCap.trim()) return
    const siguienteNum = capitulos.length > 0
      ? Math.max(...capitulos.map(c => c.numero)) + 1
      : 1

    const resultado = await crearCapitulo(proyecto.id, {
      numero: siguienteNum,
      titulo: tituloCap.trim()
    })

    if (resultado.exito) {
      setTituloCap('')
      setCreandoCap(false)
      // Expandir el nuevo capítulo automáticamente
      setCapitulosExpandidos(prev => ({
        ...prev, [resultado.capitulo.id]: true
      }))
    } else {
      alert(resultado.error)
    }
  }

  const handleCrearPagina = async (capitulo) => {
    const siguienteNum = capitulo.paginas?.length > 0
      ? Math.max(...capitulo.paginas.map(p => p.numero)) + 1
      : 1

    const resultado = await crearPagina(proyecto.id, capitulo.id, {
      numero: siguienteNum,
      layout_template: 'blank'
    })

    if (!resultado.exito) alert(resultado.error)
  }

  const handleAbrirPagina = (pagina, capitulo) => {
    cargarPagina(proyecto.id, pagina.id, capitulo)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3
                      border-b border-rdc-border">
        <p className="text-rdc-muted text-xs uppercase tracking-wider font-titulo">
          {t('editor.structure')}
        </p>
        <button
          onClick={() => setCreandoCap(true)}
          className="text-rdc-accent hover:text-rdc-accent-hover text-xs
                     transition-colors duration-200 font-titulo font-semibold"
          title="Nuevo capítulo"
        >
          {t('editor.newChapter')}
        </button>
      </div>

      {/* Formulario nuevo capítulo */}
      {creandoCap && (
        <div className="p-3 border-b border-rdc-border space-y-2">
          <input
            type="text"
            value={tituloCap}
            onChange={e => setTituloCap(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCrearCapitulo()}
            placeholder={t('editor.chapterTitle')}
            autoFocus
            className="w-full bg-rdc-card border border-rdc-border rounded
                       px-2 py-1.5 text-rdc-text text-xs
                       focus:outline-none focus:border-rdc-accent"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCrearCapitulo}
              className="flex-1 bg-rdc-accent text-white text-xs font-titulo
                         py-1 rounded transition-colors"
            >
              {t('editor.createChapter')}
            </button>
            <button
              onClick={() => { setCreandoCap(false); setTituloCap('') }}
              className="flex-1 border border-rdc-border text-rdc-muted
                         text-xs py-1 rounded transition-colors font-titulo"
            >
              {t('editor.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Lista de capítulos */}
      <div className="flex-1 overflow-y-auto">
        {capitulos.length === 0 && (
          <div className="p-4 text-center">
            <p className="text-rdc-muted text-xs">
              {t('editor.noChapters')}
            </p>
            <button
              onClick={() => setCreandoCap(true)}
              className="text-rdc-accent text-xs mt-2 hover:underline font-titulo"
            >
              {t('editor.createFirst')}
            </button>
          </div>
        )}

        {capitulos.map(capitulo => (
          <div key={capitulo.id}>
            {/* Fila del capítulo */}
            <div
              className="flex items-center gap-1 px-3 py-2 hover:bg-rdc-card
                         cursor-pointer group border-b border-rdc-border
                         border-opacity-30"
            >
              <button
                onClick={() => toggleCapitulo(capitulo.id)}
                className="text-rdc-muted text-xs w-4"
              >
                {capitulosExpandidos[capitulo.id] ? '▼' : '▶'}
              </button>
              <button
                onClick={() => toggleCapitulo(capitulo.id)}
                className="flex-1 text-left"
              >
                <p className="text-rdc-text text-xs font-semibold truncate">
                  {capitulo.titulo || `Capítulo ${capitulo.numero}`}
                </p>
                <p className="text-rdc-muted text-xs">
                  {t('editor.pagesCount', { count: capitulo.paginas?.length || 0 })}
                </p>
              </button>
              <button
                onClick={() => handleCrearPagina(capitulo)}
                className="opacity-0 group-hover:opacity-100 text-rdc-accent
                           text-xs px-1 transition-opacity font-bold"
                title={t('editor.newPage')}
              >
                +
              </button>
            </div>

            {/* Páginas del capítulo */}
            {capitulosExpandidos[capitulo.id] && (
              <div className="pl-6 py-1 space-y-0.5">
                {(capitulo.paginas || []).map(pagina => (
                  <button
                    key={pagina.id}
                    onClick={() => handleAbrirPagina(pagina, capitulo)}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs
                                transition-all duration-150 flex items-center gap-2
                                ${paginaActiva?.id === pagina.id
                                  ? 'bg-rdc-accent bg-opacity-20 text-rdc-accent font-semibold'
                                  : 'text-rdc-muted hover:bg-rdc-card hover:text-rdc-text'
                                }`}
                  >
                    <span className="w-5 text-center font-mono">
                      {pagina.numero}
                    </span>
                    <span className="flex-1 truncate">
                      {t('editor.pageNumber', { num: pagina.numero })}
                    </span>
                    {pagina.canvas_json && (
                      <span className="text-rdc-accent text-xs">●</span>
                    )}
                  </button>
                ))}

                {(capitulo.paginas || []).length === 0 && (
                  <p className="text-rdc-muted text-xs px-2 py-1 italic">
                    Sin páginas
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}