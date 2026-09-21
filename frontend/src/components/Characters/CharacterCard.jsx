// CharacterCard.jsx
// Tarjeta entintada de personaje para MEP — Manga Editor Pro con renderizado de avatar y acciones rápidas.

import { Pencil, Trash2, Sparkles, Image, Shield, Users } from 'lucide-react'
import { getRoleBadge, getDefaultAvatar } from '../../assets/avatars'
import { obtenerUrlImagen } from '../../services/api'

const CONFIG_ROL = {
  protagonista:   { bg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-500/50', label: 'Protagonista' },
  coprotagonista: { bg: 'bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border-blue-500/50',   label: 'Coprotagonista' },
  antagonista:    { bg: 'bg-red-100 dark:bg-red-950/60 text-red-900 dark:text-red-300 border-red-500/50',       label: 'Antagonista' },
  rival:          { bg: 'bg-orange-100 dark:bg-orange-950/60 text-orange-900 dark:text-orange-300 border-orange-500/50', label: 'Rival' },
  mentor:         { bg: 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 border-purple-500/50', label: 'Mentor' },
  apoyo:          { bg: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border-emerald-500/50', label: 'Apoyo' },
  secundario:     { bg: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-400 dark:border-slate-600', label: 'Secundario' },
}

export default function CharacterCard({ personaje, onEditar, onGenerarRetrato, onEliminar }) {
  const rol = (personaje.rol || 'secundario').toLowerCase()
  const configRol = CONFIG_ROL[rol] || CONFIG_ROL.secundario

  const rawAvatar = personaje.avatar_url || personaje.avatar || personaje.imagen_url || null
  const avatarSrc = rawAvatar ? obtenerUrlImagen(rawAvatar) : getDefaultAvatar(rol)

  return (
    <div className="border-2 border-slate-900 dark:border-slate-700 rounded-xl p-4 bg-white/95 dark:bg-[#131b2e]/90 shadow-[3px_3px_0px_0px_rgba(15,23,42,0.9)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_rgba(15,23,42,0.9)] transition-all flex flex-col justify-between group">
      
      <div>
        {/* Cabecera: Avatar, Nombre y Rol */}
        <div className="flex items-start gap-3 pb-3 border-b-2 border-slate-200 dark:border-slate-800">
          
          {/* Avatar del Personaje */}
          <div className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-slate-900 dark:border-slate-700 bg-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,0.9)] flex-shrink-0 group-hover:scale-105 transition-transform">
            <img
              src={avatarSrc}
              alt={personaje.nombre}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null
                e.target.src = getDefaultAvatar(rol)
              }}
            />
            {personaje.avatar_url && (
              <div className="absolute bottom-0 inset-x-0 bg-purple-600/90 text-white text-[8px] font-bold text-center py-0.2 uppercase font-mono">
                IA Retrato
              </div>
            )}
          </div>

          {/* Nombre y Badge de Rol */}
          <div className="flex-1 min-w-0">
            <h3 className="font-titulo text-base font-black text-slate-900 dark:text-white truncate leading-tight">
              {personaje.nombre}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-md border font-titulo font-bold uppercase tracking-wider ${configRol.bg}`}>
                <img
                  src={getRoleBadge(rol)}
                  alt={configRol.label}
                  className="w-3.5 h-3.5 inline-block mr-1 object-contain pointer-events-none"
                />
                <span>{configRol.label}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Detalles Narrativos y Físicos */}
        <div className="py-3 space-y-2 text-xs">
          {personaje.descripcion_fisica && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-titulo block">
                Rasgos Físicos
              </span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-2 font-medium">
                {personaje.descripcion_fisica}
              </p>
            </div>
          )}

          {(personaje.ropa_tipica || personaje.vestimenta) && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-titulo block">
                Vestimenta
              </span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-1 font-medium">
                {personaje.ropa_tipica || personaje.vestimenta}
              </p>
            </div>
          )}

          {personaje.personalidad && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-titulo block">
                Personalidad
              </span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-2 font-medium">
                {personaje.personalidad}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Botonera de Acciones Entintada */}
      <div className="pt-3 border-t-2 border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onEditar?.(personaje)}
          className="py-1.5 px-2 rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-titulo font-bold shadow-[2px_2px_0px_0px_rgba(15,23,42,0.85)] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-center gap-1 cursor-pointer"
          title="Editar ficha del personaje"
        >
          <Pencil className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Editar</span>
        </button>

        <button
          type="button"
          onClick={() => onGenerarRetrato?.(personaje)}
          className="py-1.5 px-2 rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-titulo font-bold shadow-[2px_2px_0px_0px_rgba(15,23,42,0.85)] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-center gap-1 cursor-pointer"
          title="Generar retrato artístico con Firma Visual (FLUX.1 Dev)"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Retrato</span>
        </button>

        <button
          type="button"
          onClick={() => onEliminar?.(personaje)}
          className="py-1.5 px-2 rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-700 dark:text-red-300 text-xs font-titulo font-bold shadow-[2px_2px_0px_0px_rgba(15,23,42,0.85)] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-center gap-1 cursor-pointer"
          title="Eliminar personaje"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Borrar</span>
        </button>
      </div>

    </div>
  )
}
