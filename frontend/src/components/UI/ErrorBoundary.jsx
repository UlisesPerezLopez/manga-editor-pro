// ErrorBoundary.jsx
// Capturador de errores de renderizado en React para evitar bloqueos de pantalla en blanco (WSOD).

import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('MEP ErrorBoundary detectó un error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-rdc-primary flex items-center justify-center p-6 text-rdc-text transition-colors duration-300">
          <div className="text-center bg-rdc-secondary/95 border border-rdc-border p-8 rounded-2xl shadow-2xl max-w-lg backdrop-blur-md">
            <div className="text-5xl mb-4 animate-bounce">⚠️</div>
            <h2 className="text-rdc-error text-xl font-bold font-titulo mb-2">
              Se ha producido un error en la vista
            </h2>
            <p className="text-rdc-muted text-xs mb-4 font-titulo leading-relaxed">
              {this.state.error?.message || 'Ocurrió un error inesperado al renderizar este componente.'}
            </p>

            <div className="flex flex-wrap gap-3 justify-center mt-6">
              <button
                type="button"
                onClick={() => {
                  this.handleReset()
                  window.location.reload()
                }}
                className="bg-rdc-accent hover:bg-rdc-accent-hover text-white font-titulo font-bold px-5 py-2.5 rounded-xl transition-all shadow-md text-xs cursor-pointer hover:scale-105"
              >
                🔄 Recargar Vista
              </button>
              <button
                type="button"
                onClick={() => {
                  this.handleReset()
                  window.location.href = '/dashboard'
                }}
                className="bg-rdc-card hover:bg-rdc-secondary border border-rdc-border hover:border-rdc-accent text-rdc-text font-titulo font-bold px-5 py-2.5 rounded-xl transition-all text-xs cursor-pointer"
              >
                ← Volver al Panel
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
