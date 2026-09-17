// ProyectoCard.jsx
// Tarjeta de proyecto para el Dashboard con soporte de portada, subida rápida,
// badges de estado, estadísticas y acciones con iconos Lucide React.

import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ImagePlus,
  BookOpen,
  Trash2,
  Lock,
  Unlock,
  ImageIcon,
  Users,
  Layers,
  FileText,
  Sparkles,
  Calendar
} from 'lucide-react'
import { projectsAPI } from '../../services/api'
import useProjectStore from '../../store/projectStore'

const COLORES_MODO = {
  propio:     'from-purple-900/80 via-purple-800/60 to-slate-900/90',
  legendario: 'from-blue-900/80 via-indigo-800/60 to-slate-900/90',
  aleatorio:  'from-emerald-900/80 via-teal-800/60 to-slate-900/90',
}

export default function ProyectoCard({
  proyecto,
  stats,
  onAbrir,
  onEliminar,
  onLeer,
  onPortadaActualizada
}) {
  const { t, i18n } = useTranslation()
  const { actualizarPortada } = useProjectStore()
  const fileInputRef = useRef(null)
  const [subiendoPortada, setSubiendoPortada] = useState(false)
  const [portadaLocal, setPortadaLocal] = useState(proyecto?.portada_url || stats?.portada_url || null)

  const modo = proyecto.modo_creacion || 'propio'
  const gradiente = COLORES_MODO[modo] || COLORES_MODO.propio

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return '—'
    try {
      return new Date(fechaStr).toLocaleDateString(i18n.language || 'es', {
        day: '2-digit', month: 'short', year: 'numeric'
      })
    } catch {
      return String(fechaStr).split('T')[0]
    }
  }

  const handleSubirPortada = (e) => {
    e.stopPropagation()
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      alert('La portada no debe superar los 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target?.result
      if (base64) {
        setSubiendoPortada(true)
        setPortadaLocal(base64)
        try {
          await actualizarPortada(proyecto.id, base64)
          onPortadaActualizada?.(proyecto.id, base64)
        } catch (err) {
          console.warn('Error al guardar portada:', err)
        } finally {
          setSubiendoPortada(false)
        }
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div
      className="bg-rdc-secondary border border-rdc-border rounded-2xl
                 overflow-hidden hover:border-rdc-accent cursor-pointer
                 transition-all duration-300 group flex flex-col shadow-lg hover:shadow-theme-subtle-glow relative"
      onClick={() => onAbrir(proyecto.id)}
    >
      {/* ── Miniatura / Cabecera Visual con Portada ── */}
      <div className={`h-40 bg-gradient-to-br ${gradiente}
                       flex items-center justify-center relative overflow-hidden`}>
        {portadaLocal ? (
          <img
            src={portadaLocal}
            alt={proyecto.nombre}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-4">
            <ImageIcon className="w-12 h-12 text-white/30 group-hover:text-white/50 group-hover:scale-110 transition-all duration-300 mb-1" />
            <span className="font-titulo text-xs text-white/60 font-medium tracking-wide">
              {proyecto.nombre}
            </span>
          </div>
        )}

        {/* Overlay sutil para oscurecer la base */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

        {/* Botón de subida rápida de portada */}
        <div className="absolute top-3 right-3 z-10">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp"
            onClick={(e) => e.stopPropagation()}
            onChange={handleSubirPortada}
            className="hidden"
          />
          <button
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              fileInputRef.current?.click()
            }}
            disabled={subiendoPortada}
            className="p-1.5 rounded-lg bg-black/60 hover:bg-rdc-accent text-white backdrop-blur-md transition-all duration-200 shadow-md cursor-pointer hover:scale-105 border border-white/10"
            title={t('cover.upload') || 'Subir portada'}
          >
            <ImagePlus className="w-4 h-4" />
          </button>
        </div>

        {/* Badge de formato */}
        <div className="absolute top-3 left-3 z-10">
          <span className="text-[11px] bg-black/60 text-white px-2.5 py-0.5 rounded-full backdrop-blur-md font-titulo border border-white/10">
            {proyecto.formato_lectura === 'manga' ? (t('dashboard.mangaFormat') || 'Manga (RTL)') : (t('dashboard.westernFormat') || 'Occidental')}
          </span>
        </div>

        {/* Badge de estilo bloqueado */}
        <div className="absolute bottom-2.5 left-3 z-10 flex items-center gap-1.5">
          {proyecto.style_locked ? (
            <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full backdrop-blur-sm font-titulo flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              {t('dashboard.fixedStyle') || 'Firma Bloqueada'}
            </span>
          ) : (
            <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full backdrop-blur-sm font-titulo flex items-center gap-1">
              <Unlock className="w-2.5 h-2.5" />
              {t('dashboard.noStyle') || 'Firma Abierta'}
            </span>
          )}
        </div>
      </div>

      {/* ── Info del proyecto ── */}
      <div className="p-4 flex-1 flex flex-col transition-colors duration-300">
        <h3 className="font-titulo text-lg text-rdc-text font-semibold leading-tight mb-3 group-hover:text-rdc-accent transition-colors duration-200 line-clamp-1">
          {proyecto.nombre}
        </h3>

        {/* Estadísticas reales con iconos Lucide */}
        {stats ? (
          <div className="grid grid-cols-4 gap-1.5 mb-4">
            {[
              { val: stats.num_personajes,        label: t('dashboard.card.characters') || 'Personajes', icon: Users },
              { val: stats.num_capitulos,         label: t('dashboard.card.chapters') || 'Capítulos',   icon: Layers },
              { val: stats.num_paginas,           label: t('dashboard.card.pages') || 'Páginas',        icon: FileText },
              { val: stats.num_imagenes_generadas, label: t('dashboard.card.images') || 'Imágenes',     icon: Sparkles },
            ].map(({ val, label, icon: Icon }) => (
              <div key={label} className="text-center bg-rdc-card rounded-xl py-2 px-1 transition-colors duration-300 flex flex-col items-center">
                <Icon className="w-3.5 h-3.5 text-rdc-muted mb-0.5 opacity-80" />
                <p className="font-manga text-base text-rdc-accent leading-none">
                  {val ?? 0}
                </p>
                <p className="text-rdc-muted text-[9px] mt-0.5 uppercase tracking-wider font-titulo truncate w-full">
                  {label}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1.5 mb-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 bg-rdc-card rounded-xl animate-pulse-soft" />
            ))}
          </div>
        )}

        {/* Fecha y acciones */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-rdc-border transition-colors duration-300">
          <div className="flex items-center gap-1.5 text-rdc-muted text-xs font-titulo">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatearFecha(proyecto.created_at)}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); onLeer(proyecto) }}
              className="text-rdc-accent hover:text-rdc-accent-hover text-xs font-titulo font-semibold transition-colors duration-200 px-2.5 py-1.5 rounded-lg bg-rdc-card hover:bg-rdc-secondary border border-rdc-border flex items-center gap-1.5 shadow-xs cursor-pointer"
              title={t('reader.readProject') || 'Leer cómic'}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('reader.readProject') || 'Leer'}</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onEliminar(proyecto) }}
              className="text-rdc-muted hover:text-rdc-error text-xs transition-colors duration-200 p-1.5 rounded-lg hover:bg-rdc-error/10 cursor-pointer"
              title="Eliminar proyecto"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
