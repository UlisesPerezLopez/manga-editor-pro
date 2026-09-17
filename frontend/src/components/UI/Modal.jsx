// Modal.jsx
// Componente de modal reutilizable con overlay difuminado y soporte de tema artístico.

import { useEffect } from 'react'

export default function Modal({ abierto, onCerrar, titulo, children, ancho = "max-w-2xl" }) {
  // Cerrar con Escape
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onCerrar() }
    if (abierto) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [abierto, onCerrar])

  if (!abierto) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto animate-fade-in"
      onClick={onCerrar}
    >
      <div
        className={`relative w-full ${ancho} my-auto bg-rdc-secondary border border-rdc-border
                    rounded-2xl shadow-2xl max-h-[90vh] flex flex-col transition-colors duration-300`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del modal */}
        <div className="flex items-center justify-between p-6 border-b border-rdc-border transition-colors duration-300 flex-shrink-0">
          <h3 className="font-titulo text-xl text-rdc-text font-semibold">{titulo}</h3>
          <button
            onClick={onCerrar}
            className="text-rdc-muted hover:text-rdc-text transition-colors text-2xl
                       w-8 h-8 flex items-center justify-center rounded-lg
                       hover:bg-rdc-card cursor-pointer"
          >
            ×
          </button>
        </div>
        {/* Contenido scrollable */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}