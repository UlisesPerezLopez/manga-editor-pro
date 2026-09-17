// LandingPage.jsx
// Página pública de presentación de MEP — Manga Editor Pro con fondos dinámicos, soporte i18n y cambio de tema (Ghibli / Seiya).

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

export default function LandingPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { token, usuario } = useAuthStore()
  const { tema } = useThemeStore()
  const esGhibli = tema === TEMAS.GHIBLI
  const isAuthenticated = Boolean(token || usuario)

  // Estado para el fondo dinámico
  const [fondoAleatorio, setFondoAleatorio] = useState('')

  // Seleccionar fondo aleatorio al montar el componente
  useEffect(() => {
    if (fondosDisponibles.length > 0) {
      const indice = Math.floor(Math.random() * fondosDisponibles.length)
      setFondoAleatorio(fondosDisponibles[indice])
    }
  }, [])

  const MODOS = [
    {
      emoji: '🎨',
      titulo: t('landing.modes.custom.title'),
      desc: t('landing.modes.custom.desc'),
      ghibliClasses: 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-amber-900/5',
      cosmosClasses: 'bg-purple-950/40 border-purple-500/80 text-white from-purple-900/30 to-transparent shadow-purple-900/20',
      btnGhibli: 'border-amber-400 hover:bg-amber-100 text-amber-950',
      btnCosmos: 'border-purple-500/50 hover:bg-purple-900/40 text-purple-200',
    },
    {
      emoji: '⚡',
      titulo: t('landing.modes.legendary.title'),
      desc: t('landing.modes.legendary.desc'),
      ghibliClasses: 'bg-orange-50/90 border-orange-300 text-orange-950 shadow-orange-900/5',
      cosmosClasses: 'bg-blue-950/40 border-rdc-accent/80 text-white from-blue-900/30 to-transparent shadow-blue-900/20',
      btnGhibli: 'border-orange-400 hover:bg-orange-100 text-orange-950',
      btnCosmos: 'border-blue-500/50 hover:bg-blue-900/40 text-blue-200',
    },
    {
      emoji: '🎲',
      titulo: t('landing.modes.random.title'),
      desc: t('landing.modes.random.desc'),
      ghibliClasses: 'bg-rose-50/90 border-rose-300 text-rose-950 shadow-rose-900/5',
      cosmosClasses: 'bg-green-950/40 border-green-500/80 text-white from-green-900/30 to-transparent shadow-green-900/20',
      btnGhibli: 'border-rose-400 hover:bg-rose-100 text-rose-950',
      btnCosmos: 'border-green-500/50 hover:bg-green-900/40 text-green-200',
    },
  ]

  const FEATURES = [
    {
      emoji: '🎨',
      titulo: t('landing.features.visualSignature.title'),
      desc: t('landing.features.visualSignature.desc'),
    },
    {
      emoji: '⚡',
      titulo: t('landing.features.legendaryStyles.title'),
      desc: t('landing.features.legendaryStyles.desc'),
    },
    {
      emoji: '📝',
      titulo: t('landing.features.aiWriter.title'),
      desc: t('landing.features.aiWriter.desc'),
    },
    {
      emoji: '👤',
      titulo: t('landing.features.consistentCharacters.title'),
      desc: t('landing.features.consistentCharacters.desc'),
    },
    {
      emoji: '🖼️',
      titulo: t('landing.features.proEditor.title'),
      desc: t('landing.features.proEditor.desc'),
    },
    {
      emoji: '📤',
      titulo: t('landing.features.proExport.title'),
      desc: t('landing.features.proExport.desc'),
    },
  ]

  return (
    <div className="min-h-screen bg-rdc-primary text-rdc-text flex flex-col justify-between transition-colors duration-300 relative overflow-x-hidden">
      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 bg-rdc-secondary/90 border-b
                      border-rdc-border px-6 py-4
                      flex items-center justify-between
                      backdrop-blur-md transition-colors duration-300">
        <Link
          to={isAuthenticated ? "/dashboard" : "/"}
          className="flex items-center gap-3 group cursor-pointer select-none"
          title="MEP — Manga Editor Pro"
        >
          <h1 className="font-manga text-3xl text-rdc-accent drop-shadow-sm group-hover:scale-105 transition-transform duration-200">
            MEP
          </h1>
          <div className="hidden sm:block">
            <p className="font-titulo text-sm tracking-widest uppercase leading-none text-rdc-text group-hover:text-rdc-accent transition-colors">
              Manga Editor Pro
            </p>
            <p className="text-rdc-muted text-xs">{t('brand.tagline')}</p>
          </div>
        </Link>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <ThemeToggle />
          <LanguageSelector />
          {isAuthenticated ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-rdc-accent hover:bg-rdc-accent-hover text-white
                         font-titulo font-semibold px-4 sm:px-5 py-2 rounded-lg
                         transition-all duration-200 text-sm shadow-md hover:scale-105 cursor-pointer"
            >
              {t('nav.dashboard') || 'Panel'}
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="text-rdc-muted hover:text-rdc-text text-sm
                           font-titulo transition-colors duration-200 cursor-pointer"
              >
                {t('nav.login')}
              </button>
              <button
                onClick={() => navigate('/register')}
                className="bg-rdc-accent hover:bg-rdc-accent-hover text-white
                           font-titulo font-semibold px-4 sm:px-5 py-2 rounded-lg
                           transition-colors duration-200 text-sm shadow-md cursor-pointer"
              >
                {t('nav.register')}
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative px-6 py-24 text-center overflow-hidden z-10">
        {/* Imagen de fondo rotativa estática, clara y visible */}
        {fondoAleatorio && (
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <img
              src={fondoAleatorio}
              alt="Manga Art Background"
              className="w-full h-full object-cover scale-105 transition-all duration-700 opacity-85"
            />
            {/* Overlay sutil para garantizar contraste sin ensuciar la ilustración */}
            <div className={`absolute inset-0 ${esGhibli ? 'bg-black/20' : 'bg-black/40'}`} />
          </div>
        )}

        {/* Contenedor Glassmorphism oscuro de alto contraste para el Hero */}
        <div className="relative max-w-3xl mx-auto z-10 bg-black/50 backdrop-blur-md rounded-2xl p-8 sm:p-12 border border-white/10 shadow-2xl">
          <h1 className="font-manga text-6xl sm:text-8xl text-rdc-accent mb-3 leading-none drop-shadow-lg tracking-wider">
            MEP
          </h1>
          <h2 className="font-titulo text-2xl sm:text-4xl text-white font-bold mb-4 tracking-wide drop-shadow-lg">
            Manga Editor Pro
          </h2>
          <p className="text-gray-100 text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed drop-shadow-md">
            {t('landing.heroDescription')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/register')}
              className="w-full sm:w-auto bg-rdc-accent hover:bg-rdc-accent-hover text-white font-titulo font-semibold text-lg px-8 py-3.5 rounded-xl transition-all duration-200 shadow-xl hover:shadow-rdc-accent/20 hover:scale-105 cursor-pointer"
            >
              {isAuthenticated ? (t('nav.dashboard') || 'Ir al Panel') : t('landing.getStarted')}
            </button>
            {!isAuthenticated && (
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto bg-white/15 hover:bg-white/25 border border-white/20 text-white font-titulo text-lg px-8 py-3.5 rounded-xl backdrop-blur-sm transition-all duration-200 cursor-pointer"
              >
                {t('landing.haveAccount')}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── SECCIÓN: 3 MODOS DE CREACIÓN ── */}
      <section className="px-6 py-20 max-w-6xl mx-auto w-full z-10 relative">
        <div className="text-center mb-14">
          <h2 className="font-titulo text-3xl sm:text-4xl text-rdc-text
                         font-semibold mb-4">
            {t('landing.threeModesTitle')}
          </h2>
          <p className="text-rdc-muted text-base max-w-xl mx-auto">
            {t('landing.threeModesSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {MODOS.map((modo, i) => (
            <div
              key={i}
              className={`border-2 rounded-2xl p-8 transition-all duration-300
                          hover:scale-105 hover:shadow-2xl flex flex-col justify-between backdrop-blur-md ${
                            esGhibli ? modo.ghibliClasses : modo.cosmosClasses
                          }`}
            >
              <div>
                <span className="text-5xl block mb-6">{modo.emoji}</span>
                <h3 className="font-titulo text-2xl font-bold mb-3">
                  {modo.titulo}
                </h3>
                <p className="text-sm leading-relaxed mb-6 opacity-90">
                  {modo.desc}
                </p>
              </div>

              <button
                onClick={() => navigate(isAuthenticated ? '/new-project' : '/register')}
                className={`w-full py-2.5 rounded-lg border font-titulo text-sm font-semibold transition-all duration-200 mt-auto ${
                  esGhibli ? modo.btnGhibli : modo.btnCosmos
                }`}
              >
                {t('landing.getStarted')}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECCIÓN: CARACTERÍSTICAS ── */}
      <section className="px-6 py-20 bg-rdc-secondary/50 border-t
                          border-rdc-border transition-colors duration-300 z-10 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-titulo text-3xl sm:text-4xl text-rdc-text
                           font-semibold mb-4">
              {t('landing.featuresTitle')}
            </h2>
            <p className="text-rdc-muted text-base">
              {t('landing.featuresSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="bg-rdc-secondary border border-rdc-border rounded-xl
                           p-6 hover:border-rdc-accent transition-all duration-200
                           hover:shadow-theme-subtle-glow backdrop-blur-sm"
              >
                <span className="text-3xl block mb-3">{f.emoji}</span>
                <h3 className="font-titulo text-lg text-rdc-text
                               font-semibold mb-2">
                  {f.titulo}
                </h3>
                <p className="text-rdc-muted text-sm leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="px-6 py-20 text-center relative overflow-hidden z-10">
        <div className="max-w-2xl mx-auto relative z-10">
          <h2 className="font-titulo text-3xl sm:text-5xl text-rdc-text
                         font-semibold mb-4">
            {t('landing.ctaTitle')}
          </h2>
          <p className="text-rdc-muted text-base mb-8">
            {t('landing.ctaSubtitle')}
          </p>
          <button
            onClick={() => navigate(isAuthenticated ? '/new-project' : '/register')}
            className="bg-rdc-accent hover:bg-rdc-accent-hover text-white
                       font-titulo font-semibold text-lg px-10 py-4 rounded-xl
                       transition-all duration-200 shadow-xl
                       hover:shadow-theme-glow hover:scale-105"
          >
            {t('landing.ctaButton')}
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-rdc-border py-8 px-6 text-center
                         text-rdc-muted text-sm transition-colors duration-300 z-10 relative">
        <p className="font-titulo mb-1">
          MEP — Manga Editor Pro · {t('brand.tagline')}
        </p>
        <p className="text-xs opacity-75">
          {t('landing.footerNote')}
        </p>
      </footer>
    </div>
  )
}