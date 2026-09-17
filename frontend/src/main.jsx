// main.jsx
// Punto de entrada de la aplicación React

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Registro de Service Worker para PWA Offline
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((reg) => console.log('🚀 [PWA] Service Worker registrado:', reg.scope))
      .catch((err) => console.warn('⚠️ [PWA] Error al registrar Service Worker:', err))
  })
}