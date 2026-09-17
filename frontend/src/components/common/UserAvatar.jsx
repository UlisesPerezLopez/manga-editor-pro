// UserAvatar.jsx
// Componente de avatar de usuario profesional con selector de avatares Manga/Anime,
// subida de avatar personalizado y menú de perfil.

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  User,
  Upload,
  LogOut,
  Sparkles,
  ChevronDown,
  Check,
  Camera,
  Cpu,
  Cloud
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import useAiStore from '../../store/aiStore'

// Importar avatares SVG manga locales
import avatarShonen from '../../assets/avatars/avatar_shonen.svg'
import avatarShojo from '../../assets/avatars/avatar_shojo.svg'
import avatarSeinen from '../../assets/avatars/avatar_seinen.svg'
import avatarCyberpunk from '../../assets/avatars/avatar_cyberpunk.svg'
import avatarMecha from '../../assets/avatars/avatar_mecha.svg'
import avatarChibi from '../../assets/avatars/avatar_chibi.svg'

const AVATARES_PREDETERMINADOS = [
  { id: 'shonen',    nombre: 'Shōnen Hero',   src: avatarShonen },
  { id: 'shojo',     nombre: 'Shōjo Sparkle', src: avatarShojo },
  { id: 'seinen',    nombre: 'Seinen Grit',   src: avatarSeinen },
  { id: 'cyberpunk', nombre: 'Cyberpunk Neo', src: avatarCyberpunk },
  { id: 'mecha',     nombre: 'Mecha Pilot',   src: avatarMecha },
  { id: 'chibi',     nombre: 'Chibi Mascot',  src: avatarChibi },
]

export default function UserAvatar({ showName = true, className = '' }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { usuario, actualizarAvatar, logout } = useAuthStore()
  const { aiMode } = useAiStore()
  
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [cargandoImagen, setCargandoImagen] = useState(false)
  const menuRef = useRef(null)
  const fileInputRef = useRef(null)

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuAbierto(false)
      }
    }
    if (menuAbierto) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuAbierto])

  const avatarActual = usuario?.avatar_url || avatarShonen
  const nombreMostrar = usuario?.nombre_artistico || usuario?.username || 'Mangaka'

  const handleSeleccionarPreset = async (src) => {
    setCargandoImagen(true)
    await actualizarAvatar(src)
    setCargandoImagen(false)
  }

  const handleSubirArchivo = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no debe superar los 2MB')
      return
    }

    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64 = event.target?.result
      if (base64) {
        setCargandoImagen(true)
        await actualizarAvatar(base64)
        setCargandoImagen(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      {/* Botón trigger del avatar */}
      <button
        onClick={() => setMenuAbierto(prev => !prev)}
        className="flex items-center gap-2.5 p-1 rounded-full hover:bg-rdc-card/70 transition-all group cursor-pointer border border-transparent hover:border-rdc-border"
        title={t('avatar.title') || 'Perfil de Creador'}
      >
        <div className="relative">
          <img
            src={avatarActual}
            alt={nombreMostrar}
            className="w-8 h-8 rounded-full object-cover border-2 border-rdc-accent/80 shadow-sm group-hover:scale-105 transition-transform"
          />
          {/* Badge online indicator */}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-rdc-secondary rounded-full shadow-xs" />
        </div>

        {showName && (
          <div className="hidden md:flex flex-col text-left">
            <span className="font-titulo text-xs font-semibold text-rdc-text group-hover:text-rdc-accent transition-colors leading-tight line-clamp-1">
              {nombreMostrar}
            </span>
            <span className="text-[10px] text-rdc-muted font-mono leading-none">
              {usuario?.username ? `@${usuario.username}` : 'MEP Creator'}
            </span>
          </div>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-rdc-muted group-hover:text-rdc-text transition-transform duration-200" />
      </button>

      {/* Menú Desplegable Flotante */}
      {menuAbierto && (
        <div className="absolute right-0 mt-2 w-72 bg-rdc-secondary/95 backdrop-blur-md border border-rdc-border rounded-2xl shadow-2xl z-50 p-4 animate-in fade-in zoom-in-95 duration-150 transition-colors">
          
          {/* Header del perfil */}
          <div className="flex items-center gap-3 pb-3 border-b border-rdc-border mb-3">
            <div className="relative">
              <img
                src={avatarActual}
                alt={nombreMostrar}
                className="w-12 h-12 rounded-full object-cover border-2 border-rdc-accent shadow-md"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 bg-rdc-accent hover:bg-rdc-accent-hover text-white p-1 rounded-full shadow-sm transition-transform hover:scale-110"
                title={t('avatar.uploadCustom') || 'Subir foto'}
              >
                <Camera className="w-3 h-3" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-titulo text-sm font-bold text-rdc-text truncate">
                {nombreMostrar}
              </p>
              <p className="text-xs text-rdc-muted truncate">{usuario?.email}</p>
              <div className="flex items-center gap-1.5 mt-1">
                {aiMode === 'local' ? (
                  <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-1 font-mono">
                    <Cpu className="w-2.5 h-2.5" /> Qwen Local
                  </span>
                ) : (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-1 font-mono">
                    <Cloud className="w-2.5 h-2.5" /> Cloud Free
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Selector de Avatares Manga Predeterminados */}
          <div className="mb-3">
            <p className="text-[11px] font-titulo font-semibold text-rdc-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-rdc-accent" />
              {t('avatar.selectPreset') || 'Elige tu Avatar Manga'}
            </p>
            <div className="grid grid-cols-6 gap-1.5">
              {AVATARES_PREDETERMINADOS.map(av => {
                const esActivo = avatarActual === av.src
                return (
                  <button
                    key={av.id}
                    onClick={() => handleSeleccionarPreset(av.src)}
                    className={`relative rounded-xl p-1 transition-all group hover:scale-110 cursor-pointer border ${
                      esActivo
                        ? 'border-rdc-accent bg-rdc-accent/20 ring-2 ring-rdc-accent/40 shadow-sm'
                        : 'border-rdc-border hover:border-rdc-accent/50 bg-rdc-card'
                    }`}
                    title={av.nombre}
                  >
                    <img
                      src={av.src}
                      alt={av.nombre}
                      className="w-full h-full rounded-lg object-cover"
                    />
                    {esActivo && (
                      <div className="absolute inset-0 bg-rdc-accent/30 rounded-xl flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-white drop-shadow-sm stroke-[3]" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Input oculto para subir archivo */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp"
            onChange={handleSubirArchivo}
            className="hidden"
          />

          {/* Botón de subir avatar propio */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={cargandoImagen}
            className="w-full py-2 px-3 bg-rdc-card hover:bg-rdc-secondary border border-rdc-border hover:border-rdc-accent rounded-xl text-xs font-titulo font-semibold text-rdc-text flex items-center justify-center gap-2 transition-all duration-200 mb-2 shadow-xs cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-rdc-accent" />
            {cargandoImagen ? 'Actualizando...' : (t('avatar.uploadCustom') || 'Subir Imagen Propia')}
          </button>

          {/* Separador */}
          <div className="h-px bg-rdc-border my-2" />

          {/* Cerrar Sesión */}
          <button
            onClick={handleLogout}
            className="w-full py-2 px-3 hover:bg-rdc-error/15 text-rdc-muted hover:text-rdc-error rounded-xl text-xs font-titulo font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            {t('avatar.logout') || 'Cerrar Sesión'}
          </button>
        </div>
      )}
    </div>
  )
}
