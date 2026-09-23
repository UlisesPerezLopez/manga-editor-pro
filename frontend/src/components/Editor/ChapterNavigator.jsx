// ChapterNavigator.jsx
// Navegador de capítulos y páginas en el panel derecho del editor con iconografía Lucide React e i18n.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Layers,
  FolderPlus,
  Plus,
  ChevronDown,
  ChevronRight,
  FileText,
  Trash2,
  BookOpen
} from 'lucide-react'
import useEditorStore from '../../store/editorStore'

export default function ChapterNavigator({ proyecto }) {
  const { t } = useTranslation()
  const {
    capitulos, paginaActiva, capituloActivo,
    crearCapitulo, crearPagina, cargarPagina,
    eliminarCapitulo, eliminarPagina
  } = useEditorStore()

  const [capitulosExpandidos, setCapitulosExpandidos] = useState({ 1: true, default: true })
  const [creandoCap, setCreandoCap] = useState(false)
  const [tituloCap, setTituloCap] = useState('')

  const toggleCapitulo = (id) => {
    setCapitulosExpandidos(prev => ({ ...prev, [id]: prev[id] === undefined ? false : !prev[id] }))
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
    <div className="flex flex-col h-full bg-rdc-secondary/95">
      {/* Header con botón "+ Capítulo" completo */}
      <div className="flex items-center justify-between p-3 border-b border-rdc-border">
        <p className="text-rdc-muted text-xs tracking-wider font-titulo font-bold flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-rdc-accent" />
          {t('editor.structure.title') || 'Estructura del Proyecto'}
        </p>
        <button
          onClick={() => setCreandoCap(true)}
          className="text-rdc-accent hover:text-rdc-accent-hover text-xs transition-colors duration-200 font-titulo font-semibold flex items-center gap-1 bg-rdc-card hover:bg-rdc-card/80 px-2.5 py-1 rounded-lg border border-rdc-border cursor-pointer shadow-xs"
          title={t('editor.structure.newChapter') || 'Nuevo capítulo'}
        >
          <Plus className="w-3 h-3" />
          <span>{t('editor.structure.newChapter') || '+ Nuevo Capítulo'}</span>
        </button>
      </div>

      {/* Formulario nuevo capítulo */}
      {creandoCap && (
        <div className="p-3 border-b border-rdc-border space-y-2 bg-rdc-card/50">
          <input
            type="text"
            value={tituloCap}
            onChange={e => setTituloCap(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCrearCapitulo()}
            placeholder={t('editor.chapterTitle') || 'Título del capítulo'}
            autoFocus
            className="w-full bg-rdc-secondary border border-rdc-border rounded-lg
                       px-2.5 py-1.5 text-rdc-text text-xs
                       focus:outline-none focus:border-rdc-accent font-titulo"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCrearCapitulo}
              className="flex-1 bg-rdc-accent hover:bg-rdc-accent-hover text-white text-xs font-titulo font-semibold
                         py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              {t('editor.createChapter') || 'Crear'}
            </button>
            <button
              onClick={() => { setCreandoCap(false); setTituloCap('') }}
              className="flex-1 border border-rdc-border text-rdc-muted hover:text-rdc-text
                         text-xs py-1.5 rounded-lg transition-colors font-titulo cursor-pointer"
            >
              {t('editor.cancel') || 'Cancelar'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de capítulos */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {capitulos.length === 0 && (
          <div className="p-6 text-center">
            <p className="text-rdc-muted text-xs font-titulo">
              {t('editor.noChapters') || 'No hay capítulos aún'}
            </p>
            <button
              onClick={() => setCreandoCap(true)}
              className="text-rdc-accent text-xs mt-2 hover:underline font-titulo font-semibold cursor-pointer"
            >
              {t('editor.createFirst') || 'Crear el primero'}
            </button>
          </div>
        )}

        {capitulos.map(capitulo => {
          const estaExpandido = capitulosExpandidos[capitulo.id] !== false
          return (
            <div key={capitulo.id} className="bg-rdc-card/40 border border-rdc-border/60 rounded-xl overflow-hidden">
              {/* Fila del capítulo */}
              <div
                className="flex items-center gap-1.5 px-2.5 py-2 hover:bg-rdc-card/80
                           cursor-pointer group transition-colors"
                onClick={() => toggleCapitulo(capitulo.id)}
              >
                <button
                  type="button"
                  className="text-rdc-muted hover:text-rdc-text text-xs p-0.5"
                >
                  {estaExpandido ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>

                <div className="flex-1 min-w-0">
                  <p className="text-rdc-text text-xs font-bold truncate font-titulo">
                    {capitulo.titulo || `Capítulo ${capitulo.numero}`}
                  </p>
                  <p className="text-rdc-muted text-[10px]">
                    {capitulo.paginas?.length || 0} páginas
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCrearPagina(capitulo)
                  }}
                  className="p-1 rounded-md bg-rdc-secondary hover:bg-rdc-accent hover:text-white text-rdc-muted
                             text-xs transition-colors cursor-pointer"
                  title="Nueva página"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Páginas del capítulo */}
              {estaExpandido && (
                <div className="px-2 pb-2 pt-1 space-y-1 border-t border-rdc-border/40 bg-rdc-secondary/30">
                  {(capitulo.paginas || []).map(pagina => {
                    const esActiva = paginaActiva?.id === pagina.id
                    return (
                      <button
                        key={pagina.id}
                        onClick={() => handleAbrirPagina(pagina, capitulo)}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs
                                    transition-all duration-150 flex items-center gap-2 cursor-pointer font-titulo ${
                                      esActiva
                                        ? 'bg-rdc-accent text-white font-bold shadow-xs'
                                        : 'text-rdc-muted hover:bg-rdc-card hover:text-rdc-text'
                                    }`}
                      >
                        <FileText className={`w-3.5 h-3.5 ${esActiva ? 'text-white' : 'text-rdc-muted'}`} />
                        <span className="flex-1 truncate">
                          Página {pagina.numero}
                        </span>
                        {pagina.canvas_json && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${esActiva ? 'bg-white/20 text-white' : 'bg-rdc-card text-rdc-accent'}`}>
                            editada
                          </span>
                        )}
                      </button>
                    )
                  })}

                  {(capitulo.paginas || []).length === 0 && (
                    <p className="text-rdc-muted text-[11px] px-2 py-1 italic font-titulo text-center">
                      Sin páginas aún
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
