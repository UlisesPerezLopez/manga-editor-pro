// CanvasToolbar.jsx
// Barra lateral de herramientas de lienzo para MEP — Manga Editor Pro.
// Herramientas profesionales de maquetación: selección, mano/pan, texto/onomatopeya y pincel de entintado.

import { useTranslation } from 'react-i18next'
import {
  MousePointer,
  Hand,
  Type,
  Paintbrush,
  Undo2,
  Redo2,
  Trash2,
  Eraser
} from 'lucide-react'

export default function CanvasToolbar({
  herramientaActiva = 'seleccionar',
  onCambiarHerramienta,
  onDeshacer,
  onRehacer,
  onEliminarSeleccion,
  onLimpiarCanvas,
  puedeDeshacer = false,
  puedeRehacer = false,
}) {
  const { t } = useTranslation()

  const HERRAMIENTAS = [
    {
      id: 'seleccionar',
      icon: MousePointer,
      label: t('editor.tools.select') || 'Seleccionar',
      tecla: 'V',
      desc: 'Puntero de selección e interacción de objetos',
    },
    {
      id: 'mano',
      icon: Hand,
      label: t('editor.tools.hand') || 'Mano / Desplazar',
      tecla: 'H',
      desc: 'Modo navegación / pan para arrastrar con zoom',
    },
    {
      id: 'texto',
      icon: Type,
      label: t('editor.tools.text') || 'Texto Libre / Cartela',
      tecla: 'T',
      desc: 'Insertar cuadro de texto libre o narrativo con un clic',
    },
    {
      id: 'pincel',
      icon: Paintbrush,
      label: t('editor.tools.draw') || 'Pincel de tinta',
      tecla: 'B',
      desc: 'Modo lápiz/pincel de entintado manual libre',
    },
  ]

  return (
    <div className="flex flex-col items-center justify-between p-2 bg-rdc-secondary/95
                    border-r border-rdc-border h-full w-14 z-20 backdrop-blur-md select-none">

      {/* Herramientas de interacción en el lienzo */}
      <div className="space-y-1.5 w-full flex flex-col items-center">
        {HERRAMIENTAS.map(h => {
          const Icon = h.icon
          const activo = herramientaActiva === h.id
          return (
            <button
              key={h.id}
              type="button"
              onClick={() => onCambiarHerramienta?.(h.id)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center
                          transition-all duration-150 relative group cursor-pointer ${
                            activo
                              ? 'bg-rdc-accent text-white shadow-md scale-105 ring-1 ring-rdc-accent'
                              : 'text-rdc-muted hover:bg-rdc-card hover:text-rdc-text'
                          }`}
              title={`${h.label} [${h.tecla}]`}
            >
              <Icon className="w-5 h-5 stroke-[1.75]" />

              {/* Tooltip flotante */}
              <div className="absolute left-14 top-1/2 -translate-y-1/2 z-50
                              bg-slate-900 border border-slate-700 rounded-xl
                              px-3 py-2 text-xs text-slate-100 whitespace-nowrap
                              opacity-0 group-hover:opacity-100 pointer-events-none
                              transition-opacity duration-150 shadow-2xl font-titulo">
                <p className="font-bold flex items-center gap-1.5">
                  <span>{h.label}</span>
                  <span className="text-amber-400 font-mono text-[10px]">[{h.tecla}]</span>
                </p>
                <p className="text-slate-400 text-[10px] mt-0.5">{h.desc}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Separador y acciones de edición / historial */}
      <div className="w-full flex flex-col items-center space-y-1.5 pt-2 border-t border-rdc-border">
        {/* Deshacer */}
        <button
          type="button"
          onClick={onDeshacer}
          disabled={!puedeDeshacer}
          className="w-10 h-10 rounded-xl flex items-center justify-center
                     text-rdc-muted hover:bg-rdc-card hover:text-rdc-text
                     transition-all duration-150 disabled:opacity-30
                     disabled:cursor-not-allowed cursor-pointer relative group"
        >
          <Undo2 className="w-5 h-5 stroke-[1.75]" />
          <div className="absolute left-14 top-1/2 -translate-y-1/2 z-50
                          bg-slate-900 border border-slate-700 rounded-xl
                          px-3 py-1.5 text-xs text-slate-100 whitespace-nowrap
                          opacity-0 group-hover:opacity-100 pointer-events-none
                          transition-opacity duration-150 shadow-xl font-titulo">
            {t('editor.tools.undo') || 'Deshacer'} <span className="text-amber-400 font-mono text-[10px]">(Ctrl+Z)</span>
          </div>
        </button>

        {/* Rehacer */}
        <button
          type="button"
          onClick={onRehacer}
          disabled={!puedeRehacer}
          className="w-10 h-10 rounded-xl flex items-center justify-center
                     text-rdc-muted hover:bg-rdc-card hover:text-rdc-text
                     transition-all duration-150 disabled:opacity-30
                     disabled:cursor-not-allowed cursor-pointer relative group"
        >
          <Redo2 className="w-5 h-5 stroke-[1.75]" />
          <div className="absolute left-14 top-1/2 -translate-y-1/2 z-50
                          bg-slate-900 border border-slate-700 rounded-xl
                          px-3 py-1.5 text-xs text-slate-100 whitespace-nowrap
                          opacity-0 group-hover:opacity-100 pointer-events-none
                          transition-opacity duration-150 shadow-xl font-titulo">
            {t('editor.tools.redo') || 'Rehacer'} <span className="text-amber-400 font-mono text-[10px]">(Ctrl+Y)</span>
          </div>
        </button>

        {/* Separador fino */}
        <div className="w-8 h-px bg-rdc-border my-1" />

        {/* Eliminar Selección */}
        <button
          type="button"
          onClick={onEliminarSeleccion}
          className="w-10 h-10 rounded-xl flex items-center justify-center
                     text-rdc-muted hover:bg-red-500/20 hover:text-red-400
                     transition-all duration-150 cursor-pointer relative group"
        >
          <Trash2 className="w-5 h-5 stroke-[1.75]" />
          <div className="absolute left-14 top-1/2 -translate-y-1/2 z-50
                          bg-slate-900 border border-slate-700 rounded-xl
                          px-3 py-1.5 text-xs text-slate-100 whitespace-nowrap
                          opacity-0 group-hover:opacity-100 pointer-events-none
                          transition-opacity duration-150 shadow-xl font-titulo">
            {t('editor.tools.delete') || 'Eliminar Selección'} <span className="text-amber-400 font-mono text-[10px]">(Supr)</span>
          </div>
        </button>

        {/* Limpiar Marco Seleccionado */}
        {onLimpiarCanvas && (
          <button
            type="button"
            onClick={onLimpiarCanvas}
            className="w-10 h-10 rounded-xl flex items-center justify-center
                       text-rdc-muted hover:bg-amber-500/20 hover:text-amber-400
                       transition-all duration-150 cursor-pointer relative group"
          >
            <Eraser className="w-5 h-5 stroke-[1.75]" />
            <div className="absolute left-14 top-1/2 -translate-y-1/2 z-50
                            bg-slate-900 border border-slate-700 rounded-xl
                            px-3 py-1.5 text-xs text-slate-100 whitespace-nowrap
                            opacity-0 group-hover:opacity-100 pointer-events-none
                            transition-opacity duration-150 shadow-xl font-titulo">
              {t('editor.tools.clear') || 'Limpiar Marco Seleccionado'}
            </div>
          </button>
        )}
      </div>
    </div>
  )
}
