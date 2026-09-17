// Register.jsx
// Página de registro de nuevo usuario con diseño MEP, fondos dinámicos, selector de idioma, tema y selector inicial de motor de IA.

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useAuthStore from '../store/authStore'
import useAiStore from '../store/aiStore'
import useThemeStore, { TEMAS } from '../store/themeStore'
import LanguageSelector from '../components/common/LanguageSelector'
import ThemeToggle from '../components/common/ThemeToggle'

// Carga dinámica de Vite: obtiene todos los PNG que coincidan con el patrón
const modulosFondos = import.meta.glob('../assets/fondo_login_*.png', { eager: true, query: '?url', import: 'default' })
const fondosDisponibles = Object.values(modulosFondos)

export default function Register() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { register, cargando, error, limpiarError } = useAuthStore()
  const { setAiMode } = useAiStore()
  const { tema } = useThemeStore()
  const esGhibli = tema === TEMAS.GHIBLI

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    nombre_artistico: '',
  })
  const [preferenciaIA, setPreferenciaIA] = useState('cloud_free')
  const [exito, setExito] = useState(false)

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
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    if (error) limpiarError()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Guardar preferencia de IA seleccionada
    setAiMode(preferenciaIA)

    const resultado = await register(
      form.username, form.email, form.password, form.nombre_artistico
    )
    if (resultado.exito) {
      setExito(true)
      setTimeout(() => navigate('/login'), 2000)
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
            className="w-full h-full object-cover scale-105 transition-all duration-700 opacity-90"
          />
          {/* Overlay temático para realce sin sobreexposición */}
          <div className={`absolute inset-0 ${esGhibli ? 'bg-black/20' : 'bg-black/45'}`} />
        </div>
      )}

      {/* Selector de idioma y tema en esquina superior derecha */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        <ThemeToggle variant="floating" />
        <LanguageSelector variante="floating" />
      </div>

      {/* Contenedor del formulario */}
      <div className="w-full max-w-md relative z-10 py-6">

        {/* Logo y título */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-block group cursor-pointer select-none">
            <h1 className="font-manga text-5xl text-rdc-accent mb-1 drop-shadow-lg group-hover:scale-105 transition-transform duration-200">
              MEP
            </h1>
            <p className="font-titulo text-xl font-bold tracking-widest uppercase text-rdc-text drop-shadow-md">
              Manga Editor Pro
            </p>
            <p className="text-rdc-muted text-xs mt-0.5">{t('brand.tagline')}</p>
          </Link>
        </div>

        {/* Card de registro con Glassmorphism refinado */}
        <div
          className={`backdrop-blur-md rounded-2xl p-7 shadow-2xl transition-all duration-300 border ${
            esGhibli
              ? 'bg-[#FFFFFF]/85 border-[#D2DEC9] shadow-emerald-950/5'
              : 'bg-slate-900/80 border-slate-700/80 shadow-black/50'
          }`}
        >
          <h2 className="font-titulo text-2xl text-rdc-text mb-5 font-bold tracking-wide">
            {t('auth.registerTitle')}
          </h2>

          {/* Mensaje de éxito */}
          {exito && (
            <div className="bg-rdc-success/20 border border-rdc-success text-rdc-success rounded-xl p-3 mb-5 text-sm font-titulo font-semibold animate-in fade-in">
              ✓ {t('auth.accountCreated')}
            </div>
          )}

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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-rdc-text text-xs font-bold uppercase tracking-wider mb-1.5 font-titulo">
                {t('auth.username')}
              </label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                required
                minLength={3}
                placeholder={t('auth.usernamePlaceholder')}
                className="w-full bg-rdc-card/80 border border-rdc-border rounded-xl
                           px-4 py-2.5 text-rdc-text placeholder-rdc-muted text-sm font-medium
                           focus:outline-none focus:border-rdc-accent focus:ring-2 focus:ring-rdc-accent/20
                           transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-rdc-text text-xs font-bold uppercase tracking-wider mb-1.5 font-titulo">
                {t('auth.artisticName')}
              </label>
              <input
                type="text"
                name="nombre_artistico"
                value={form.nombre_artistico}
                onChange={handleChange}
                placeholder={t('auth.artisticNamePlaceholder')}
                className="w-full bg-rdc-card/80 border border-rdc-border rounded-xl
                           px-4 py-2.5 text-rdc-text placeholder-rdc-muted text-sm font-medium
                           focus:outline-none focus:border-rdc-accent focus:ring-2 focus:ring-rdc-accent/20
                           transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-rdc-text text-xs font-bold uppercase tracking-wider mb-1.5 font-titulo">
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
                           px-4 py-2.5 text-rdc-text placeholder-rdc-muted text-sm font-medium
                           focus:outline-none focus:border-rdc-accent focus:ring-2 focus:ring-rdc-accent/20
                           transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-rdc-text text-xs font-bold uppercase tracking-wider mb-1.5 font-titulo">
                {t('auth.passwordMin')}
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full bg-rdc-card/80 border border-rdc-border rounded-xl
                           px-4 py-2.5 text-rdc-text placeholder-rdc-muted text-sm font-medium
                           focus:outline-none focus:border-rdc-accent focus:ring-2 focus:ring-rdc-accent/20
                           transition-all duration-200"
              />
            </div>

            {/* Selector Inicial de Motor de IA */}
            <div className="pt-2">
              <label className="block text-rdc-text text-xs font-bold uppercase tracking-wider mb-2 font-titulo flex items-center justify-between">
                <span>🤖 {t('aiEngine.modeLabel')}</span>
                <span className="text-[10px] text-rdc-muted font-normal">
                  {t('aiEngine.changeAnytime')}
                </span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPreferenciaIA('cloud_free')}
                  className={`p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                    preferenciaIA === 'cloud_free'
                      ? 'border-emerald-500 bg-emerald-500/15 shadow-sm'
                      : 'border-rdc-border bg-rdc-card/50 hover:border-emerald-500/40 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-titulo font-bold text-xs text-rdc-text">
                    <span>☁️</span> {t('aiEngine.cloudFree')}
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-titulo">
                    {t('aiEngine.recommended')}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPreferenciaIA('local')}
                  className={`p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                    preferenciaIA === 'local'
                      ? 'border-purple-500 bg-purple-500/15 shadow-sm'
                      : 'border-rdc-border bg-rdc-card/50 hover:border-purple-500/40 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-titulo font-bold text-xs text-rdc-text">
                    <span>🖥️</span> {t('aiEngine.localGpu')}
                  </div>
                  <div className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5 font-titulo">
                    Ollama + ComfyUI
                  </div>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando || exito}
              className="w-full bg-rdc-accent hover:bg-rdc-accent-hover text-white
                         font-titulo font-bold py-3 rounded-xl transition-all duration-200
                         text-base disabled:opacity-50 shadow-lg hover:shadow-theme-glow hover:scale-[1.02] cursor-pointer mt-4"
            >
              {cargando ? t('auth.creatingAccount') : t('auth.submitRegister')}
            </button>
          </form>

          <p className="text-center text-rdc-muted text-xs mt-5 font-titulo">
            {t('auth.alreadyRegistered')}{' '}
            <Link
              to="/login"
              className="text-rdc-accent hover:text-rdc-accent-hover font-bold transition-colors underline"
            >
              {t('auth.loginLink')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}