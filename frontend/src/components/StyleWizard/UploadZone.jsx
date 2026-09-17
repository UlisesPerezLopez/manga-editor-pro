// UploadZone.jsx
// Zona de drag & drop para subir imágenes de referencia de estilo con soporte multilingüe.

import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'

export default function UploadZone({ onImagenesSeleccionadas, cargando }) {
  const { t } = useTranslation()
  const [arrastrando, setArrastrando] = useState(false)
  const [previews, setPreviews] = useState([])
  const inputRef = useRef(null)

  const procesarArchivos = (archivos) => {
    const validos = Array.from(archivos).filter(f =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
    )

    if (validos.length === 0) {
      alert('Solo se aceptan imágenes JPG, PNG o WEBP')
      return
    }

    // Generar previsualizaciones
    const nuevasPreviews = validos.map(f => ({
      nombre: f.name,
      url: URL.createObjectURL(f),
      archivo: f
    }))

    setPreviews(prev => {
      const todas = [...prev, ...nuevasPreviews].slice(0, 10)
      onImagenesSeleccionadas(todas.map(p => p.archivo))
      return todas
    })
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setArrastrando(false)
    procesarArchivos(e.dataTransfer.files)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setArrastrando(true)
  }

  const handleDragLeave = () => setArrastrando(false)

  const handleClick = () => {
    if (!cargando) inputRef.current?.click()
  }

  const handleInputChange = (e) => {
    procesarArchivos(e.target.files)
  }

  const eliminarImagen = (index) => {
    setPreviews(prev => {
      const nuevas = prev.filter((_, i) => i !== index)
      onImagenesSeleccionadas(nuevas.map(p => p.archivo))
      return nuevas
    })
  }

  const limpiarTodo = () => {
    setPreviews([])
    onImagenesSeleccionadas([])
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-4">

      {/* Zona de drop */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-xl p-8 text-center
                    transition-all duration-200 cursor-pointer
                    ${arrastrando
                      ? 'border-rdc-accent bg-rdc-accent bg-opacity-10'
                      : 'border-rdc-border hover:border-rdc-accent hover:bg-rdc-card'
                    }
                    ${cargando ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp"
          onChange={handleInputChange}
          className="hidden"
          disabled={cargando}
        />
        <p className="text-4xl mb-3">🖼️</p>
        <p className="text-rdc-text font-titulo font-semibold">
          {t('styleWizard.dragDrop')}
        </p>
        <p className="text-rdc-muted text-sm mt-1">
          {t('styleWizard.clickSelect')}
        </p>
        <p className="text-rdc-muted text-xs mt-3">
          {t('styleWizard.formats')}
        </p>
        <div className="mt-3 inline-block bg-rdc-accent bg-opacity-10
                        border border-rdc-accent border-opacity-30
                        rounded-lg px-3 py-1">
          <p className="text-rdc-accent text-xs font-mono font-semibold">
            {t('styleWizard.selectedCount', { count: previews.length })}
          </p>
        </div>
      </div>

      {/* Grid de previsualizaciones */}
      {previews.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-rdc-muted text-sm font-titulo">
              {previews.length} {t('dashboard.aiImages').toLowerCase()}
            </p>
            <button
              onClick={limpiarTodo}
              disabled={cargando}
              className="text-rdc-error text-xs hover:underline disabled:opacity-50 font-titulo"
            >
              Eliminar todas
            </button>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {previews.map((preview, index) => (
              <div key={index} className="relative group aspect-square">
                <img
                  src={preview.url}
                  alt={preview.nombre}
                  className="w-full h-full object-cover rounded-lg border border-rdc-border"
                />
                {!cargando && (
                  <button
                    onClick={(e) => { e.stopPropagation(); eliminarImagen(index) }}
                    className="absolute top-1 right-1 w-5 h-5 bg-rdc-error
                               rounded-full text-white text-xs
                               opacity-0 group-hover:opacity-100
                               transition-opacity duration-200
                               flex items-center justify-center shadow-lg"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recomendación de cantidad */}
      {previews.length > 0 && previews.length < 5 && (
        <div className="bg-yellow-500 bg-opacity-10 border border-yellow-500
                        border-opacity-30 rounded-lg p-3">
          <p className="text-yellow-400 text-xs">
            {t('styleWizard.minWarning')}
          </p>
        </div>
      )}
    </div>
  )
}