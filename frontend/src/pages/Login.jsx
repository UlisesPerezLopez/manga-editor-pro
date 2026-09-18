// Login.jsx
// Página de inicio de sesión con diseño MEP, fondos dinámicos, selector de idioma y cambio de tema (Ghibli / Seiya).

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useAuthStore from '../store/authStore'
import useThemeStore, { TEMAS } from '../store/themeStore'
import LanguageSelector from '../components/common/LanguageSelector'
import ThemeToggle from '../components/common/ThemeToggle'

// Carga dinámica de Vite: obtiene todos los PNG que coincidan con el patrón
const modulosFondos = import.meta.glob('../assets/fondo_login_*.png', { eager: true, query: '?url', import: 'default' })
const fondosDisponibles = Object.values(modulosFondos)

export default function Login() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { login, cargando, error, limpiarError } = useAuthStore()
  const { tema } = useThemeStore()
  const esGhibli = tema === TEMAS.GHIBLI

  const [form, setForm] = useState({
    email: '',
    password: '',
    recordarme: false,
  })

  // Estado para el fondo dinámico
  const [fondoAleatorio, setFondoAleatorio] = useState('')

  // Seleccionar fondo aleatorio al montar el componente
  useEffect(() => {
    if (fondosDisponibles.length > 0) {
      const indice = Math.floor(Math.random() * fondosDisponibles.length)
      setFondoAleatorio(fondosDisponibles[indice])
    }
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    if (error) limpiarError()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const resultado = await login(form.email, form.password, form.recordarme)
    if (resultado.exito) {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
      {/* Fondo de imagen dinámica rotativa estática, clara y visible */}
      {fondoAleatorio && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            src={fondoAleatorio}
            alt="Manga Art Background"
            className="w-full h-full object-cover scale-105 transition-all duration-700"
          />
          {/* Overlay temático para realce sin sobreexposición ni lavado */}
          <div className={`absolute inset-0 ${esGhibli ? 'bg-black/20' : 'bg-black/40 backdrop-blur-[0.5px]'}`} />
        </div>
      )}

      {/* Selector de idioma y tema en esquina superior derecha */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        <ThemeToggle variant="floating" />
        <LanguageSelector variante="floating" />
      </div>

      {/* Contenedor del formulario */}
      <div className="w-full max-w-md relative z-10 py-6">

        {/* Logo y título estilo Manga Speech Box */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-block group cursor-pointer select-none">
            <div
              className={`px-6 py-4 rounded-2xl border-2 border-black transition-all duration-300 inline-block ${
                esGhibli
                  ? 'bg-white shadow-[4px_4px_0px_0px_rgba(5,150,105,0.9)]'
                  : 'bg-[#0B0F19] shadow-[4px_4px_0px_0px_rgba(245,158,11,0.9)]'
              }`}
            >
              <h1
                className={`font-manga text-4xl sm:text-5xl leading-none mb-1 group-hover:scale-105 transition-transform ${
                  esGhibli ? 'text-emerald-700' : 'text-amber-500'
                }`}
              >
                MEP
              </h1>
              <p
                className={`font-titulo text-base sm:text-lg font-black tracking-widest uppercase ${
                  esGhibli ? 'text-slate-900' : 'text-white'
                }`}
              >
                Manga Editor Pro
              </p>
              <p
                className={`text-xs mt-0.5 font-medium ${
                  esGhibli ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                {t('brand.tagline')}
              </p>
            </div>
          </Link>
        </div>

        {/* Card de login con Glassmorphism refinado */}
        <div
          className={`backdrop-blur-md rounded-2xl p-8 shadow-2xl transition-all duration-300 border ${
            esGhibli
              ? 'bg-[#FFFFFF]/85 border-[#D2DEC9] shadow-emerald-950/5'
              : 'bg-slate-900/80 border-slate-700/80 shadow-black/50'
          }`}
        >
          <h2 className="font-titulo text-2xl text-rdc-text mb-6 font-bold tracking-wide">
            {t('auth.loginTitle')}
          </h2>

          {/* Mensaje de error */}
          {error && (
            <div className="bg-rdc-error/20 border border-rdc-error text-rdc-error rounded-xl p-3.5 mb-5 text-sm flex items-start gap-2 animate-in fade-in">
              <span className="text-base leading-none">⚠️</span>
              <div className="flex-1 space-y-1">
                {String(error).split(' | ').map((msg, i) => (
                  <p key={i} className="font-medium text-xs sm:text-sm">{msg}</p>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-rdc-text text-xs font-bold uppercase tracking-wider mb-2 font-titulo">
                {t('auth.email')}
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder={t('auth.emailPlaceholder')}
                className="w-full bg-rdc-card/80 border border-rdc-border rounded-xl
                           px-4 py-3 text-rdc-text placeholder-rdc-muted text-sm font-medium
                           focus:outline-none focus:border-rdc-accent focus:ring-2 focus:ring-rdc-accent/20
                           transition-all duration-200"
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-rdc-text text-xs font-bold uppercase tracking-wider mb-2 font-titulo">
                {t('auth.password')}
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className="w-full bg-rdc-card/80 border border-rdc-border rounded-xl
                           px-4 py-3 text-rdc-text placeholder-rdc-muted text-sm font-medium
                           focus:outline-none focus:border-rdc-accent focus:ring-2 focus:ring-rdc-accent/20
                           transition-all duration-200"
              />
            </div>

            {/* Recordarme */}
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="recordarme"
                name="recordarme"
                checked={form.recordarme}
                onChange={handleChange}
                className="w-4 h-4 rounded border-rdc-border text-rdc-accent
                           focus:ring-rdc-accent focus:ring-offset-0 bg-rdc-card cursor-pointer"
              />
              <label htmlFor="recordarme" className="text-rdc-text text-xs font-medium cursor-pointer font-titulo">
                {t('auth.rememberMe')}
              </label>
            </div>

            {/* Botón de envío */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-rdc-accent hover:bg-rdc-accent-hover text-white
                         font-titulo font-bold py-3.5 rounded-xl transition-all duration-200
                         text-base disabled:opacity-50 shadow-lg hover:shadow-theme-glow hover:scale-[1.02] cursor-pointer"
            >
              {cargando ? (t('auth.loggingIn') || 'Iniciando sesión...') : (t('auth.submitLogin') || t('auth.loginBtn') || 'Iniciar Sesión')}
            </button>
          </form>

          {/* Enlace a Registro */}
          <p className="text-center text-rdc-muted text-xs mt-6 font-titulo">
            {t('auth.noAccount') || '¿No tienes cuenta?'}{' '}
            <Link
              to="/register"
              className="text-rdc-accent hover:text-rdc-accent-hover font-bold transition-colors underline"
            >
              {t('auth.createOne') || 'Crear una'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}