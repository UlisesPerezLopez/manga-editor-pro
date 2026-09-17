// LandingPage.jsx
// Página pública de presentación de MEP — Manga Editor Pro con fondos dinámicos, soporte i18n, Lucide React y cambio de tema (Ghibli / Cosmos).

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Palette,
  Zap,
  Dices,
  ScrollText,
  Users,
  LayoutGrid,
  FolderUp,
  Sparkles,
  ArrowRight
} from 'lucide-react'
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
      icon: Palette,
      iconColor: 'text-purple-400',
      titulo: t('landing.modes.custom.title') || 'Tu Propio Estilo',
      desc: t('landing.modes.custom.desc') || 'Sube 3 a 5 páginas de tu arte para clonar tu firma visual con IA.',
      ghibliClasses: 'bg-[#FDFBF7]/95 border-emerald-200/80 text-[#1B2D23] shadow-md hover:border-emerald-300 hover:shadow-lg',
      cosmosClasses: 'bg-purple-950/40 border-purple-500/80 text-white from-purple-900/30 to-transparent shadow-purple-900/20 hover:border-purple-400',
      btnGhibli: 'bg-emerald-700 hover:bg-emerald-800 text-white border-transparent shadow-sm',
      btnCosmos: 'border-purple-500/50 hover:bg-purple-900/40 text-purple-200',
    },
    {
      icon: Zap,
      iconColor: 'text-amber-400',
      titulo: t('landing.modes.legendary.title') || 'Estilos Legendarios',
      desc: t('landing.modes.legendary.desc') || 'Crea en el estilo visual de los grandes mangakas de la historia.',
      ghibliClasses: 'bg-[#FDFBF7]/95 border-amber-200/80 text-[#1B2D23] shadow-md hover:border-amber-300 hover:shadow-lg',
      cosmosClasses: 'bg-blue-950/40 border-rdc-accent/80 text-white from-blue-900/30 to-transparent shadow-blue-900/20 hover:border-blue-400',
      btnGhibli: 'bg-amber-700 hover:bg-amber-800 text-white border-transparent shadow-sm',
      btnCosmos: 'border-blue-500/50 hover:bg-blue-900/40 text-blue-200',
    },
    {
      icon: Dices,
      iconColor: 'text-emerald-400',
      titulo: t('landing.modes.random.title') || 'Estilo Sorpresa',
      desc: t('landing.modes.random.desc') || 'Deja que la IA combine técnicas y cree un estilo único para ti.',
      ghibliClasses: 'bg-[#FDFBF7]/95 border-rose-200/80 text-[#1B2D23] shadow-md hover:border-rose-300 hover:shadow-lg',
      cosmosClasses: 'bg-green-950/40 border-green-500/80 text-white from-green-900/30 to-transparent shadow-green-900/20 hover:border-green-400',
      btnGhibli: 'bg-[#D97736] hover:bg-[#c06528] text-white border-transparent shadow-sm',
      btnCosmos: 'border-green-500/50 hover:bg-green-900/40 text-green-200',
    },
  ]

  const FEATURES = [
    {
      icon: Palette,
      titulo: t('landing.features.visualSignature.title') || 'Firma Visual con IA',
      desc: t('landing.features.visualSignature.desc') || 'Entrena o selecciona un estilo visual maestro para mantener consistencia artística.',
    },
    {
      icon: Zap,
      titulo: t('landing.features.legendaryStyles.title') || 'Catálogo Legendario',
      desc: t('landing.features.legendaryStyles.desc') || 'Shonen, Seinen, Shojo, Cyberpunk y más con directivas de arte optimizadas.',
    },
    {
      icon: ScrollText,
      titulo: t('landing.features.aiWriter.title') || 'Guionista IA de Cómic',
      desc: t('landing.features.aiWriter.desc') || 'Estructura arcos narrativos, sinopsis y guiones técnicos listos para producción.',
    },
    {
      icon: Users,
      titulo: t('landing.features.consistentCharacters.title') || 'Directorio de Personajes',
      desc: t('landing.features.consistentCharacters.desc') || 'Consistencia facial y física absoluta en todas tus viñetas y páginas.',
    },
    {
      icon: LayoutGrid,
      titulo: t('landing.features.proEditor.title') || 'Canvas Studio Multi-página',
      desc: t('landing.features.proEditor.desc') || 'Maqueta viñetas, bocadillos de diálogo y dibujo libre acelerado por hardware.',
    },
    {
      icon: FolderUp,
      titulo: t('landing.features.proExport.title') || 'Preimpresión Editorial 300 DPI',
      desc: t('landing.features.proExport.desc') || 'Exportación a PNG, PDF para imprenta con sangrado y paquetes digitales CBZ.',
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
          to="/"
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
                         font-titulo font-semibold px-4 sm:px-5 py-2 rounded-xl
                         transition-all duration-200 text-sm shadow-md hover:scale-105 cursor-pointer flex items-center gap-1.5"
            >
              <span>{t('nav.dashboard') || 'Ir al Panel'}</span>
              <ArrowRight className="w-4 h-4" />
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
                           font-titulo font-semibold px-4 py-2 rounded-xl
                           transition-all duration-200 text-sm shadow-md hover:scale-105 cursor-pointer"
              >
                {t('nav.register')}
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <section className="relative px-6 py-24 sm:py-32 flex flex-col items-center justify-center text-center overflow-hidden min-h-[600px]">
        {/* Fondo dinámico aleatorio con overlay */}
        {fondoAleatorio && (
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 scale-105"
            style={{ backgroundImage: `url(${fondoAleatorio})` }}
          />
        )}
        <div
          className={`absolute inset-0 transition-colors duration-500 backdrop-blur-[0.5px] ${
            esGhibli
              ? 'bg-amber-50/20 backdrop-brightness-95'
              : 'bg-black/40 backdrop-blur-[0.5px]'
          }`}
        />

        <div className="relative z-10 max-w-4xl mx-auto space-y-6">
          <h1 className="font-manga text-5xl sm:text-7xl lg:text-8xl tracking-tight drop-shadow-lg text-rdc-text">
            MEP
          </h1>

          <p className="font-titulo text-2xl sm:text-3xl lg:text-4xl font-bold tracking-wide drop-shadow-md text-rdc-text">
            {t('landing.heroTitle')}
          </p>

          <p className="font-titulo text-base sm:text-lg text-rdc-muted max-w-2xl mx-auto leading-relaxed drop-shadow-sm">
            {t('landing.heroSubtitle')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/register')}
              className="w-full sm:w-auto bg-rdc-accent hover:bg-rdc-accent-hover text-white font-titulo font-semibold text-lg px-8 py-3.5 rounded-xl transition-all duration-200 shadow-xl hover:shadow-rdc-accent/20 hover:scale-105 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{isAuthenticated ? (t('nav.dashboard') || 'Ir al Panel') : t('landing.getStarted')}</span>
              <Sparkles className="w-5 h-5" />
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
          <p className="text-rdc-muted text-base max-w-xl mx-auto font-titulo">
            {t('landing.threeModesSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {MODOS.map((modo, i) => {
            const ModoIcon = modo.icon
            return (
              <div
                key={i}
                className={`border-2 rounded-2xl p-8 transition-all duration-300
                            hover:scale-105 hover:shadow-2xl flex flex-col justify-between backdrop-blur-md ${
                              esGhibli ? modo.ghibliClasses : modo.cosmosClasses
                            }`}
              >
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-black/20 flex items-center justify-center mb-6">
                    <ModoIcon className={`w-8 h-8 ${modo.iconColor}`} />
                  </div>
                  <h3 className="font-titulo text-2xl font-bold mb-3">
                    {modo.titulo}
                  </h3>
                  <p className="text-sm leading-relaxed mb-6 opacity-90 font-titulo">
                    {modo.desc}
                  </p>
                </div>

                <button
                  onClick={() => navigate(isAuthenticated ? '/new-project' : '/register')}
                  className={`w-full py-2.5 rounded-xl border font-titulo text-sm font-semibold transition-all duration-200 mt-auto cursor-pointer ${
                    esGhibli ? modo.btnGhibli : modo.btnCosmos
                  }`}
                >
                  {t('landing.getStarted')}
                </button>
              </div>
            )
          })}
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
            <p className="text-rdc-muted text-base font-titulo">
              {t('landing.featuresSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => {
              const FeatureIcon = f.icon
              return (
                <div
                  key={i}
                  className="bg-rdc-secondary border border-rdc-border rounded-2xl
                             p-6 hover:border-rdc-accent transition-all duration-200
                             hover:shadow-theme-subtle-glow backdrop-blur-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-rdc-card border border-rdc-border flex items-center justify-center mb-3 text-rdc-accent">
                    <FeatureIcon className="w-5 h-5" />
                  </div>
                  <h3 className="font-titulo text-lg text-rdc-text
                                 font-semibold mb-2">
                    {f.titulo}
                  </h3>
                  <p className="text-rdc-muted text-sm leading-relaxed font-titulo">
                    {f.desc}
                  </p>
                </div>
              )
            })}
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
          <p className="text-rdc-muted text-base mb-8 font-titulo">
            {t('landing.ctaSubtitle')}
          </p>
          <button
            onClick={() => navigate(isAuthenticated ? '/new-project' : '/register')}
            className="bg-rdc-accent hover:bg-rdc-accent-hover text-white
                       font-titulo font-semibold text-lg px-10 py-4 rounded-xl
                       transition-all duration-200 shadow-xl
                       hover:shadow-theme-glow hover:scale-105 cursor-pointer inline-flex items-center gap-2"
          >
            <span>{t('landing.ctaButton')}</span>
            <Sparkles className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-rdc-border py-8 px-6 text-center
                         text-rdc-muted text-sm transition-colors duration-300 z-10 relative">
        <p className="font-titulo mb-1">
          MEP — Manga Editor Pro · {t('brand.tagline')}
        </p>
        <p className="text-xs opacity-75 font-titulo">
          {t('landing.footerNote')}
        </p>
      </footer>
    </div>
  )
}
