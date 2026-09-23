// MangaFilterPanel.jsx
// Panel interactivo para aplicar filtros manga y tramas de semitonos (screentones) a imágenes en el canvas.

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { aplicarFiltroManga } from './mangaFilters'

export default function MangaFilterPanel({ canvas, onActualizar }) {
  const { t } = useTranslation()
  const [objetoImagen, setObjetoImagen] = useState(null)
  const [aplicando, setAplicando] = useState(false)
  const [filtroActivo, setFiltroActivo] = useState(null)

  const detectarImagenSeleccionada = () => {
    if (!canvas) {
      setObjetoImagen(null)
      return
    }

    const activo = canvas.getActiveObject()
    if (activo && activo.type === 'image') {
      setObjetoImagen(activo)
      return
    }

    // Si es una viñeta, verificar si contiene una imagen en el canvas en esa posición
    if (activo && (activo.data?.tipo === 'vineta' || activo.type === 'rect')) {
      const bounds = activo.getBoundingRect(true)
      const imagenes = canvas.getObjects().filter(o => o.type === 'image')
      const imgDentro = imagenes.find(img => {
        const iB = img.getBoundingRect(true)
        return (
          iB.left >= bounds.left - 20 &&
          iB.top >= bounds.top - 20 &&
          iB.left + iB.width <= bounds.left + bounds.width + 20
        )
      })
      if (imgDentro) {
        setObjetoImagen(imgDentro)
        return
      }
    }

    setObjetoImagen(null)
  }

  useEffect(() => {
    if (!canvas) return

    detectarImagenSeleccionada()

    canvas.on('selection:created', detectarImagenSeleccionada)
    canvas.on('selection:updated', detectarImagenSeleccionada)
    canvas.on('selection:cleared', detectarImagenSeleccionada)

    return () => {
      canvas.off('selection:created', detectarImagenSeleccionada)
      canvas.off('selection:updated', detectarImagenSeleccionada)
      canvas.off('selection:cleared', detectarImagenSeleccionada)
    }
  }, [canvas])

  const ejecutarFiltro = async (tipo) => {
    if (!objetoImagen || aplicando) return

    setAplicando(true)
    setFiltroActivo(tipo)

    try {
      await aplicarFiltroManga(objetoImagen, tipo, () => {
        onActualizar?.()
      })
    } catch (err) {
      console.error('Error aplicando filtro:', err)
    } finally {
      setAplicando(false)
    }
  }

  const FILTROS = [
    {
      id: 'ink_bw',
      emoji: '✒️',
      titulo: t('editor.filters.inkBw'),
      desc: t('editor.filters.inkBwDesc')
    },
    {
      id: 'halftone',
      emoji: '🏁',
      titulo: t('editor.filters.halftone'),
      desc: t('editor.filters.halftoneDesc')
    },
    {
      id: 'sepia',
      emoji: '📜',
      titulo: t('editor.filters.sepia'),
      desc: t('editor.filters.sepiaDesc')
    },
    {
      id: 'invert',
      emoji: '🌓',
      titulo: t('editor.filters.invert'),
      desc: t('editor.filters.invertDesc')
    }
  ]

  return (
    <div className="flex flex-col h-full bg-rdc-secondary text-xs">
      <div className="p-3 border-b border-rdc-border">
        <p className="font-titulo font-bold text-rdc-text tracking-wide text-xs">
          🎭 {t('editor.filters.title')}
        </p>
        <p className="text-rdc-muted text-[11px] mt-0.5 leading-tight">
          {t('editor.filters.subtitle')}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {!objetoImagen ? (
          <div className="text-center py-8 text-rdc-muted text-xs font-titulo">
            <p className="text-3xl mb-2 opacity-60">🖼️</p>
            <p className="font-semibold text-rdc-text mb-1">
              {t('editor.filters.selectImagePrompt')}
            </p>
            <p className="text-[11px] leading-relaxed">
              Haz clic sobre una viñeta con arte generado o una imagen para habilitar los filtros.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between bg-rdc-card p-2 rounded-lg border border-rdc-border">
              <span className="text-emerald-400 font-titulo font-semibold text-[11px] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Imagen seleccionada
              </span>
              <button
                onClick={() => ejecutarFiltro('reset')}
                disabled={aplicando}
                className="text-rdc-accent hover:underline font-titulo text-[11px]"
              >
                🔄 {t('editor.filters.reset')}
              </button>
            </div>

            {FILTROS.map((f) => (
              <button
                key={f.id}
                onClick={() => ejecutarFiltro(f.id)}
                disabled={aplicando}
                className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                  filtroActivo === f.id
                    ? 'bg-rdc-accent/15 border-rdc-accent text-rdc-text shadow-sm'
                    : 'bg-rdc-card border-rdc-border hover:border-rdc-accent/60 text-rdc-muted hover:text-rdc-text'
                } disabled:opacity-50`}
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-xl leading-none">{f.emoji}</span>
                  <div className="flex-1">
                    <p className="font-titulo font-bold text-rdc-text text-xs">
                      {f.titulo}
                    </p>
                    <p className="text-[11px] text-rdc-muted mt-0.5 leading-snug">
                      {f.desc}
                    </p>
                  </div>
                </div>
              </button>
            ))}

            {aplicando && (
              <div className="text-center py-2 text-rdc-accent font-titulo animate-pulse text-[11px]">
                Procesando filtro manga...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
