// App.jsx — Versión final Sprint 8
// Rutas completas con LandingPage pública y rutas protegidas.

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import LandingPage    from './pages/LandingPage'
import Login          from './pages/Login'
import Register       from './pages/Register'
import Dashboard      from './pages/Dashboard'
import NewProject     from './pages/NewProject'
import ProjectStudio  from './pages/ProjectStudio'
import Editor         from './pages/Editor'

function RutaPrivada({ children }) {
  const { token } = useAuthStore()
  return token ? children : <Navigate to="/login" replace />
}

function RutaPublica({ children }) {
  const { token } = useAuthStore()
  return !token ? children : <Navigate to="/dashboard" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing pública — ruta raíz */}
        <Route path="/" element={<LandingPage />} />

        {/* Rutas públicas (redirigen al dashboard si ya hay sesión) */}
        <Route path="/login"    element={<RutaPublica><Login /></RutaPublica>} />
        <Route path="/register" element={<RutaPublica><Register /></RutaPublica>} />

        {/* Rutas privadas */}
        <Route path="/dashboard" element={
          <RutaPrivada><Dashboard /></RutaPrivada>
        } />
        <Route path="/nuevo-proyecto" element={
          <RutaPrivada><NewProject /></RutaPrivada>
        } />
        <Route path="/new-project" element={
          <RutaPrivada><NewProject /></RutaPrivada>
        } />
        <Route path="/proyecto/:id" element={
          <RutaPrivada><ProjectStudio /></RutaPrivada>
        } />
        <Route path="/project/:id" element={
          <RutaPrivada><ProjectStudio /></RutaPrivada>
        } />
        <Route path="/editor/:id" element={
          <RutaPrivada><Editor /></RutaPrivada>
        } />

        {/* 404 → Landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App