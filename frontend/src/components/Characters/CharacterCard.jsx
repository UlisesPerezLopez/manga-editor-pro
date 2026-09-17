// CharacterCard.jsx
// Tarjeta visual de un personaje con sus datos principales.

const COLORES_ROL = {
  protagonista: { bg: 'bg-rdc-accent',   text: 'text-white',       label: '⭐ Protagonista' },
  antagonista:  { bg: 'bg-rdc-error',    text: 'text-white',       label: '💀 Antagonista'  },
  apoyo:        { bg: 'bg-green-600',    text: 'text-white',       label: '🤝 Apoyo'        },
  secundario:   { bg: 'bg-rdc-card',     text: 'text-rdc-muted',   label: '👥 Secundario'   },
}

const EMOJIS_ROL = {
  protagonista: '⭐',
  antagonista:  '💀',
  apoyo:        '🤝',
  secundario:   '👥',
}

export default function CharacterCard({ personaje, onEditar, onEliminar }) {
  const rol = personaje.rol || 'secundario'
  const colorRol = COLORES_ROL[rol] || COLORES_ROL.secundario

  return (
    <div className="bg-rdc-secondary border border-rdc-border rounded-xl
                    overflow-hidden hover:border-rdc-accent
                    transition-all duration-200 group">

      {/* Cabecera con rol y avatar */}
      <div className="bg-rdc-card px-4 py-5 flex items-center gap-4">
        {/* Avatar con inicial */}
        <div className="w-14 h-14 rounded-full bg-rdc-secondary border-2
                        border-rdc-border flex items-center justify-center
                        flex-shrink-0">
          <span className="font-manga text-2xl text-rdc-accent">
            {personaje.nombre.charAt(0).toUpperCase()}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-titulo text-lg text-rdc-text font-semibold
                         truncate">
            {personaje.nombre}
          </h3>
          <span className={`inline-block text-xs px-2 py-0.5 rounded-full
                            mt-1 ${colorRol.bg} ${colorRol.text}
                            bg-opacity-80`}>
            {colorRol.label}
          </span>
        </div>
      </div>

      {/* Cuerpo con información */}
      <div className="p-4 space-y-3">

        {personaje.descripcion_fisica && (
          <div>
            <p className="text-rdc-muted text-xs uppercase mb-1">
              Descripción física
            </p>
            <p className="text-rdc-text text-sm leading-relaxed line-clamp-2">
              {personaje.descripcion_fisica}
            </p>
          </div>
        )}

        {personaje.personalidad && (
          <div>
            <p className="text-rdc-muted text-xs uppercase mb-1">
              Personalidad
            </p>
            <p className="text-rdc-text text-sm leading-relaxed line-clamp-2">
              {personaje.personalidad}
            </p>
          </div>
        )}

        {personaje.motivacion && (
          <div>
            <p className="text-rdc-muted text-xs uppercase mb-1">
              Motivación
            </p>
            <p className="text-rdc-text text-sm leading-relaxed line-clamp-2">
              {personaje.motivacion}
            </p>
          </div>
        )}

        {/* Indicador de Ficha Técnica IA */}
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg
                         ${personaje.prompt_ia
                           ? 'bg-rdc-accent bg-opacity-10 text-rdc-accent border border-rdc-accent border-opacity-20'
                           : 'bg-rdc-card text-rdc-muted'
                         }`}>
          <span>{personaje.prompt_ia ? '🤖' : '⚪'}</span>
          <span>
            {personaje.prompt_ia
              ? 'Ficha Técnica IA generada'
              : 'Sin Ficha Técnica IA'
            }
          </span>
        </div>
      </div>

      {/* Acciones */}
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={() => onEditar(personaje)}
          className="flex-1 bg-rdc-card hover:bg-rdc-border text-rdc-text
                     text-sm font-titulo py-2 rounded-lg
                     transition-colors duration-200"
        >
          ✏️ Editar
        </button>
        <button
          onClick={() => onEliminar(personaje)}
          className="px-3 text-rdc-muted hover:text-rdc-error
                     transition-colors duration-200 text-sm"
        >
          🗑️
        </button>
      </div>
    </div>
  )
}