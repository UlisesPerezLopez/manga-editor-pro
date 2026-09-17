// CharacterCard.jsx
// Tarjeta visual de un personaje con sus datos principales y Lucide React.

import { Pencil, Trash2, Bot, Star, Skull, HeartHandshake, Users } from 'lucide-react'

const CONFIG_ROL = {
  protagonista: { bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30', label: 'Protagonista', icon: Star },
  antagonista:  { bg: 'bg-red-500/20 text-red-300 border-red-500/30',       label: 'Antagonista',  icon: Skull },
  apoyo:        { bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', label: 'Apoyo',        icon: HeartHandshake },
  secundario:   { bg: 'bg-rdc-card text-rdc-muted border-rdc-border',      label: 'Secundario',   icon: Users },
}

export default function CharacterCard({ personaje, onEditar, onEliminar }) {
  const rol = personaje.rol || 'secundario'
  const configRol = CONFIG_ROL[rol] || CONFIG_ROL.secundario
  const RolIcon = configRol.icon

  return (
    <div className="bg-rdc-secondary border border-rdc-border rounded-2xl
                    overflow-hidden hover:border-rdc-accent/60
                    transition-all duration-200 group flex flex-col justify-between shadow-xs">

      <div>
        {/* Cabecera con rol y avatar */}
        <div className="bg-rdc-card px-4 py-4 flex items-center gap-3.5 border-b border-rdc-border/60">
          {/* Avatar con inicial */}
          <div className="w-12 h-12 rounded-xl bg-rdc-secondary border
                          border-rdc-border flex items-center justify-center
                          flex-shrink-0 shadow-inner">
            <span className="font-manga text-xl text-rdc-accent">
              {personaje.nombre.charAt(0).toUpperCase()}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-titulo text-base text-rdc-text font-semibold truncate leading-tight">
              {personaje.nombre}
            </h3>
            <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full
                              mt-1 border font-titulo font-semibold ${configRol.bg}`}>
              <RolIcon className="w-3 h-3" />
              <span>{configRol.label}</span>
            </span>
          </div>
        </div>

        {/* Cuerpo con información */}
        <div className="p-4 space-y-3">

          {personaje.descripcion_fisica && (
            <div>
              <p className="text-rdc-muted text-[10px] uppercase font-titulo font-bold tracking-wider mb-0.5">
                Descripción física
              </p>
              <p className="text-rdc-text text-xs leading-relaxed line-clamp-2">
                {personaje.descripcion_fisica}
              </p>
            </div>
          )}

          {personaje.personalidad && (
            <div>
              <p className="text-rdc-muted text-[10px] uppercase font-titulo font-bold tracking-wider mb-0.5">
                Personalidad
              </p>
              <p className="text-rdc-text text-xs leading-relaxed line-clamp-2">
                {personaje.personalidad}
              </p>
            </div>
          )}

          {personaje.motivacion && (
            <div>
              <p className="text-rdc-muted text-[10px] uppercase font-titulo font-bold tracking-wider mb-0.5">
                Motivación
              </p>
              <p className="text-rdc-text text-xs leading-relaxed line-clamp-2">
                {personaje.motivacion}
              </p>
            </div>
          )}

          {/* Indicador de Ficha Técnica IA */}
          <div className={`flex items-center gap-2 text-[11px] px-3 py-2 rounded-xl font-titulo
                           ${personaje.prompt_ia
                             ? 'bg-rdc-accent/10 text-rdc-accent border border-rdc-accent/20'
                             : 'bg-rdc-card text-rdc-muted border border-rdc-border'
                           }`}>
            <Bot className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">
              {personaje.prompt_ia
                ? 'Ficha Técnica IA vinculada'
                : 'Sin Ficha Técnica IA'
              }
            </span>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="px-4 pb-4 pt-1 flex gap-2">
        <button
          onClick={() => onEditar(personaje)}
          className="flex-1 bg-rdc-card hover:bg-rdc-secondary border border-rdc-border text-rdc-text
                     text-xs font-titulo font-semibold py-2 rounded-xl
                     transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Pencil className="w-3.5 h-3.5" /> Editar
        </button>
        <button
          onClick={() => onEliminar(personaje)}
          className="px-3 bg-rdc-card hover:bg-rdc-error/10 border border-rdc-border hover:border-rdc-error text-rdc-muted hover:text-rdc-error
                     transition-colors rounded-xl flex items-center justify-center cursor-pointer"
          title="Eliminar personaje"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
