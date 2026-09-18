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
      titulo: t('landing.modes.custom.title') || 'Tu Propio Estilo',
      desc: t('landing.modes.custom.desc') || 'Sube 3 a 5 páginas de tu arte para clonar tu firma visual con IA.',
      ghibliClasses: 'bg-white/90 border-2 border-purple-200 hover:border-purple-300 shadow-sm hover:shadow-md',
      cosmosClasses: 'bg-[#0e1322] border-2 border-purple-500/40 hover:border-purple-400 text-white shadow-lg shadow-purple-950/20',
      badgeGhibli: 'bg-purple-100 text-purple-700',
      badgeCosmos: 'bg-purple-950/60 text-purple-400 border border-purple-500/30',
      btnGhibli: 'bg-purple-100 hover:bg-purple-200 text-purple-900 font-semibold py-2 px-3 text-xs sm:text-sm rounded-lg transition-colors',
      btnCosmos: 'bg-purple-600 hover:bg-purple-500 text-white shadow-md font-semibold py-2 px-3 text-xs sm:text-sm rounded-lg transition-colors',
    },
    {
      icon: Zap,
      titulo: t('landing.modes.legendary.title') || 'Estilos Legendarios',
      desc: t('landing.modes.legendary.desc') || 'Crea en el estilo visual de los grandes mangakas de la historia.',
      ghibliClasses: 'bg-white/90 border-2 border-amber-200 hover:border-amber-300 shadow-sm hover:shadow-md',
      cosmosClasses: 'bg-[#0e1322] border-2 border-amber-500/40 hover:border-amber-400 text-white shadow-lg shadow-amber-950/20',
      badgeGhibli: 'bg-amber-100 text-amber-700',
      badgeCosmos: 'bg-amber-950/60 text-amber-400 border border-amber-500/30',
      btnGhibli: 'bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold py-2 px-3 text-xs sm:text-sm rounded-lg transition-colors',
      btnCosmos: 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md font-bold py-2 px-3 text-xs sm:text-sm rounded-lg transition-colors',
    },
    {
      icon: Dices,
      titulo: t('landing.modes.random.title') || 'Estilo Sorpresa',
      desc: t('landing.modes.random.desc') || 'Deja que la IA combine técnicas y cree un estilo único para ti.',
      ghibliClasses: 'bg-white/90 border-2 border-emerald-200 hover:border-emerald-300 shadow-sm hover:shadow-md',
      cosmosClasses: 'bg-[#0e1322] border-2 border-emerald-500/40 hover:border-emerald-400 text-white shadow-lg shadow-emerald-950/20',
      badgeGhibli: 'bg-emerald-100 text-emerald-700',
      badgeCosmos: 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30',
      btnGhibli: 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-semibold py-2 px-3 text-xs sm:text-sm rounded-lg transition-colors',
      btnCosmos: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md font-semibold py-2 px-3 text-xs sm:text-sm rounded-lg transition-colors',
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
                      border-rdc-border px-6 py-3
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

      {/* ── HERO SECTION RESTAURADO ── */}
      <section className="relative px-4 sm:px-6 min-h-[380px] sm:min-h-[420px] lg:min-h-[440px] flex flex-col items-center justify-center text-center overflow-hidden">
        {/* Fondo dinámico aleatorio con overlay */}
        {fondoAleatorio && (
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 scale-105"
            style={{ backgroundImage: `url(${fondoAleatorio})` }}
          />
        )}
        <div
          className={`absolute inset-0 transition-colors duration-500 ${
            esGhibli
              ? 'bg-black/20'
              : 'bg-black/40 backdrop-blur-[0.5px]'
          }`}
        />

        <div className="relative z-10 max-w-3xl mx-auto space-y-2">
          {/* ── Cartel Central Manga / Narrator Box Opaco ── */}
          <div
            className={`relative mx-auto max-w-lg px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl border-2 border-black transition-all duration-300 ${
              esGhibli
                ? 'bg-white shadow-[4px_4px_0px_0px_rgba(5,150,105,0.9)]'
                : 'bg-[#0B0F19] shadow-[4px_4px_0px_0px_rgba(245,158,11,0.9)]'
            }`}
          >
            {/* Tag / Badge de Narrador Manga */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider mb-1.5 border ${
                esGhibli
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-amber-950/90 text-amber-300 border-amber-500/40'
              }`}
            >
              <Sparkles className="w-3 h-3 text-rdc-accent" />
              <span>MEP STUDIO · {t('brand.name')}</span>
            </div>

            {/* Título Principal MEP */}
            <h1
              className={`font-manga text-4xl sm:text-5xl tracking-tight leading-none mb-1 select-none ${
                esGhibli ? 'text-emerald-700' : 'text-amber-500'
              }`}
            >
              MEP
            </h1>

            {/* Subtítulo MANGA EDITOR PRO */}
            <p
              className={`font-titulo text-base sm:text-lg font-black tracking-wide uppercase mb-1 ${
                esGhibli ? 'text-slate-900' : 'text-white'
              }`}
            >
              MANGA EDITOR PRO
            </p>

            {/* Descripción / Tagline sintética */}
            <p
              className={`font-titulo text-xs sm:text-sm max-w-md mx-auto leading-tight truncate sm:whitespace-normal ${
                esGhibli ? 'text-slate-700 font-medium' : 'text-slate-300 font-medium'
              }`}
            >
              {t('brand.tagline')}
            </p>
          </div>
        </div>
      </section>

      {/* ── SECCIÓN: TRES FORMAS DE CREAR TU CÓMIC ── */}
      <section className="w-full px-4 sm:px-6 relative z-10">
        <div className="text-center pt-3 sm:pt-4">
          <h2 className={`font-titulo text-xl sm:text-2xl font-extrabold mb-0.5 ${
            esGhibli ? 'text-slate-900' : 'text-white'
          }`}>
            {t('landing.threeModesTitle')}
          </h2>
        </div>
        <p className="text-center text-xs sm:text-sm mb-4 font-titulo max-w-xl mx-auto text-slate-500 dark:text-slate-400">
          {t('landing.threeModesSubtitle')}
        </p>

        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 px-4 pb-8 sm:pb-12">
          {MODOS.map((modo, i) => {
            const ModoIcon = modo.icon
            return (
              <div
                key={i}
                className={`min-h-[250px] sm:min-h-[270px] flex flex-col justify-between p-4 sm:p-5 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
                  esGhibli ? modo.ghibliClasses : modo.cosmosClasses
                }`}
              >
                <div>
                  <div className={`w-9 h-9 p-2 rounded-lg flex items-center justify-center mb-2.5 ${
                    esGhibli ? modo.badgeGhibli : modo.badgeCosmos
                  }`}>
                    <ModoIcon className="w-5 h-5" />
                  </div>
                  <h3 className={`font-titulo text-base sm:text-lg font-bold mb-1 ${
                    esGhibli ? 'text-slate-900' : 'text-white'
                  }`}>
                    {modo.titulo}
                  </h3>
                  <p className={`text-xs sm:text-sm leading-snug mb-3 font-titulo ${
                    esGhibli ? 'text-slate-600' : 'text-slate-300'
                  }`}>
                    {modo.desc}
                  </p>
                </div>

                <button
                  onClick={() => navigate(isAuthenticated ? '/new-project' : '/register')}
                  className={`w-full font-titulo cursor-pointer flex items-center justify-center gap-1.5 ${
                    esGhibli ? modo.btnGhibli : modo.btnCosmos
                  }`}
                >
                  <span>{t('landing.getStarted')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── SECCIÓN: CARACTERÍSTICAS (TODO LO QUE NECESITAS PARA CREAR) ── */}
      <section className={`border-t border-rdc-border transition-colors duration-300 z-10 relative ${
        esGhibli ? 'bg-[#F9F8F3]/60' : 'bg-[#0a0d18]/70'
      }`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center pt-12 pb-2">
            <h2 className={`font-titulo text-3xl font-bold ${
              esGhibli ? 'text-slate-900' : 'text-white'
            }`}>
              {t('landing.featuresTitle')}
            </h2>
          </div>
          <p className={`text-base text-center mb-10 font-titulo max-w-2xl mx-auto px-4 ${
            esGhibli ? 'text-slate-600' : 'text-slate-400'
          }`}>
            {t('landing.featuresSubtitle')}
          </p>

          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 px-4 pb-16">
            {FEATURES.map((f, i) => {
              const FeatureIcon = f.icon
              return (
                <div
                  key={i}
                  className={`p-6 sm:p-7 rounded-2xl transition-all duration-200 flex flex-col justify-start hover:scale-[1.01] ${
                    esGhibli
                      ? 'bg-white/90 border border-slate-200/90 shadow-sm hover:border-emerald-400/60 hover:shadow-md'
                      : 'bg-[#0e1322] border border-slate-800 hover:border-slate-700 hover:shadow-lg hover:shadow-slate-950/40 backdrop-blur-sm'
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl p-2.5 flex items-center justify-center mb-4 shrink-0 ${
                      esGhibli
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                        : 'bg-slate-800/90 border border-slate-700 text-amber-400'
                    }`}
                  >
                    <FeatureIcon className="w-6 h-6" />
                  </div>
                  <h3 className={`font-titulo text-lg font-bold mb-1 ${
                    esGhibli ? 'text-slate-900' : 'text-white'
                  }`}>
                    {f.titulo}
                  </h3>
                  <p className={`leading-relaxed text-sm mt-2 font-titulo ${
                    esGhibli ? 'text-slate-600' : 'text-slate-300'
                  }`}>
                    {f.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="px-6 py-14 sm:py-16 text-center relative overflow-hidden z-10">
        <div className="max-w-2xl mx-auto relative z-10">
          <h2 className={`font-titulo text-3xl sm:text-4xl font-bold mb-3 ${
            esGhibli ? 'text-slate-900' : 'text-white'
          }`}>
            {t('landing.ctaTitle')}
          </h2>
          <p className={`text-sm sm:text-base mb-8 font-titulo ${
            esGhibli ? 'text-slate-600' : 'text-slate-400'
          }`}>
            {t('landing.ctaSubtitle')}
          </p>
          <button
            onClick={() => navigate(isAuthenticated ? '/new-project' : '/register')}
            className="bg-rdc-accent hover:bg-rdc-accent-hover text-white
                       font-titulo font-semibold text-base px-8 py-3.5 rounded-xl
                       transition-all duration-200 shadow-xl
                       hover:shadow-theme-glow hover:scale-105 cursor-pointer inline-flex items-center gap-2"
          >
            <span>{t('landing.ctaButton')}</span>
            <Sparkles className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-rdc-border py-6 px-6 text-center
                         text-rdc-muted text-xs transition-colors duration-300 z-10 relative">
        <p className="font-titulo mb-1">
          MEP — Manga Editor Pro · {t('brand.tagline')}
        </p>
        <p className="opacity-75 font-titulo">
          {t('landing.footerNote')}
        </p>
      </footer>
    </div>
  )
}
