// CharacterModal.jsx
// Modal completo para diseño, edición de ficha técnica y generación de retratos de personajes con Firma Visual.

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X,
  Sparkles,
  Save,
  RotateCcw,
  Image,
  Download,
  Star,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  RefreshCw,
  Sliders
} from 'lucide-react'
import useCharacterStore from '../../store/characterStore'
import { getRoleBadge, getDefaultAvatar } from '../../assets/avatars'
import { charactersAPI, obtenerUrlImagen } from '../../services/api'

const ARQUETIPOS_PRESETS = [
  {
    id: 'protagonista_shonen',
    label: 'Protagonista Impulsivo',
    rol: 'protagonista',
    nombre: 'Ren Kurogane',
    descripcion_fisica: 'Joven de cabello oscuro revuelto, ojos dorados intensos y cicatriz leve en la mejilla.',
    ropa_tipica: 'Túnica de combate ligera reforzada con cuero negro, brazales grabados y botas de viaje.',
    personalidad: 'Apasionado, valiente y leal hasta el extremo, actúa antes de pensar.',
    arco_narrativo: 'Aprenderá que la fuerza sin templanza y estrategia no es suficiente para proteger a quienes ama.',
    motivacion: 'Convertirse en el guerrero supremo para restaurar la paz en su aldea.'
  },
  {
    id: 'rival_genio',
    label: 'Rival Calculador',
    rol: 'rival',
    nombre: 'Kaelen Vane',
    descripcion_fisica: 'Chico de porte aristocrático, cabello plateado lacio y mirada fría con ojos azul gélido.',
    ropa_tipica: 'Uniforme formal blanco y azul marino con detalles dorados, capa corta y guantes.',
    personalidad: 'Perfeccionista, distante y metódico; no tolera los errores propios ni ajenos.',
    arco_narrativo: 'Comprenderá el valor de la empatía y la colaboración frente a la autosuficiencia arrogante.',
    motivacion: 'Superar el legado de su linaje y forjar su propio destino inquebrantable.'
  },
  {
    id: 'mentor_veterano',
    label: 'Mentor Misterioso',
    rol: 'mentor',
    nombre: 'Maestro Jubei',
    descripcion_fisica: 'Hombre maduro con barba corta entrecana, mirada penetrante y complexión fuerte.',
    ropa_tipica: 'Kimono oscuro desgastado, sombrero de paja tradicional y vendajes en las manos.',
    personalidad: 'Irónico, sabio y tranquilo; oculta un poder devastador bajo una apariencia despreocupada.',
    arco_narrativo: 'Encontrar redención por sus pecados del pasado guiando a la nueva generación.',
    motivacion: 'Asegurar que sus discípulos no cometan los mismos errores trágicos que él.'
  },
  {
    id: 'antagonista_visionario',
    label: 'Antagonista Visionario',
    rol: 'antagonista',
    nombre: 'Lord Malakor',
    descripcion_fisica: 'Hombre imponente de cabello azabache largo, rostro afilado y aura oscura amenazante.',
    ropa_tipica: 'Armadura ceremonial negra con filigranas de obsidiana y una capa carmesí.',
    personalidad: 'Elocuente, despiadado y guiado por una convicción inamovible de purgar el mundo.',
    arco_narrativo: 'La tragedia de un salvador caído que se convirtió en el monstruo que juró destruir.',
    motivacion: 'Reescribir las leyes del reino para erradicar el caos y la debilidad.'
  },
  {
    id: 'coprotagonista_tactica',
    label: 'Coprotagonista Estratega',
    rol: 'coprotagonista',
    nombre: 'Lyra Chronos',
    descripcion_fisica: 'Chica ágil de cabello castaño recogido en coleta alta, gafas tácticas y mirada analítica.',
    ropa_tipica: 'Chaleco utilitario con múltiples bolsillos, pantalones reforzados y guantes tácticos.',
    personalidad: 'Pragmática, perspicaz y con un humor seco; el cerebro del equipo.',
    arco_narrativo: 'Confiar en sus compañeros más allá de las probabilidades numéricas.',
    motivacion: 'Descifrar los antiguos artefactos y descubrir la verdad oculta.'
  },
  {
    id: 'apoyo_espiritual',
    label: 'Apoyo / Sanador',
    rol: 'apoyo',
    nombre: 'Elysia',
    descripcion_fisica: 'Joven de cabello aguamarina ondulado, ojos grandes expresivos y aura cálida.',
    ropa_tipica: 'Túnica de viajera con bordados místicos, colgante de cristal y sandalias.',
    personalidad: 'Compasiva, optimista e intuitiva; infunde calma en los momentos más tensos.',
    arco_narrativo: 'Aceptar su propio poder y aprender a defenderse sin perder su pureza.',
    motivacion: 'Curar a los heridos y brindar esperanza en tiempos de oscuridad.'
  }
]

const ARQUETIPOS_BRUGUERA = [
  {
    id: 'bruguera_agente_torpe',
    label: 'Agente Despistado (Bruguera)',
    rol: 'protagonista',
    nombre: 'Filemón Pi',
    descripcion_fisica: 'Hombre enjuto con dos pelos en la cabeza, nariz de patata y expresión de perenne agobio.',
    ropa_tipica: 'Camisa blanca de manga larga con pajarita negra y pantalones oscuros remangados.',
    personalidad: 'Se cree un líder autoritario y brillante, pero sus planes siempre terminan en catástrofe.',
    arco_narrativo: 'Intentará atrapar al sospechoso sorteando trampas ridículas que siempre le estallan a él.',
    motivacion: 'Cobrar el jornal sin que el superintendente lo lance por la ventana.'
  },
  {
    id: 'bruguera_profesor_chiflado',
    label: 'Científico Loco (Bruguera)',
    rol: 'mentor',
    nombre: 'Profesor Chiflández',
    descripcion_fisica: 'Hombrecillo con calva reluciente, barba tupida desaliñada y gafas redondas de culo de vaso.',
    ropa_tipica: 'Bata blanca de laboratorio chamuscada con manchas de ácidos de colores y zapatillas de paño.',
    personalidad: 'Excéntrico, despistado y convencido de que sus catastróficos inventos son un éxito rotundo.',
    arco_narrativo: 'Fabricará artefactos imposibles que transformarán a sus aliados de formas ridículas.',
    motivacion: 'Probar su nuevo brebaje experimental aunque salte el edificio por los aires.'
  },
  {
    id: 'bruguera_jefe_colerico',
    label: 'Jefe Irascible (Bruguera)',
    rol: 'antagonista',
    nombre: 'El Superintendente Rabietas',
    descripcion_fisica: 'Hombre corpulento con patillas pobladas, bigote espeso y cara roja de pura furia.',
    ropa_tipica: 'Traje azul marino de raya diplomática, chaleco abotonado y puro humeante en la mano.',
    personalidad: 'Colérico, gritón, exigente y propenso a arrojar pisapapeles cuando se enfada.',
    arco_narrativo: 'Perseguirá a sus agentes con una maza gigante al final de cada misión fallida.',
    motivacion: 'Mantener la disciplina a base de broncas y persecuciones implacables.'
  },
  {
    id: 'bruguera_rival_esbirro',
    label: 'Agente Rival (Bruguera)',
    rol: 'rival',
    nombre: 'Agente Torpínez',
    descripcion_fisica: 'Agente rival con gabardina tres tallas más grande y sombrero calado hasta las cejas.',
    ropa_tipica: 'Gabardina marrón arrugada, gafas oscuras torcidas y zapatones enormes.',
    personalidad: 'Presuntuoso, envidioso de los méritos ajenos y torpe de solemnidad.',
    arco_narrativo: 'Intentará boicotear las misiones ajenas pero acabará recibiendo el mamporro final.',
    motivacion: 'Ganarse la confianza del superintendente y conseguir un ascenso inmerecido.'
  }
]

export default function CharacterModal({
  abierto,
  onCerrar,
  personajeEditar,
  proyecto,
  pestanaInicial = 'ficha', // 'ficha' | 'retrato'
  onGuardadoExitoso
}) {
  const { t } = useTranslation()
  const {
    crearPersonaje,
    actualizarPersonaje,
    generarAvatar,
    guardando,
    generandoAvatar,
    error,
    limpiarError
  } = useCharacterStore()

  const idProyecto = proyecto?.id
  const modoEdicion = Boolean(personajeEditar?.id)

  const ROLES = [
    { id: 'protagonista',   label: 'Protagonista',   desc: 'Héroe central de la historia' },
    { id: 'coprotagonista', label: 'Coprotagonista', desc: 'Compañero principal' },
    { id: 'antagonista',    label: 'Antagonista',    desc: 'Fuerza opositora clave' },
    { id: 'rival',          label: 'Rival',          desc: 'Competidor / contraparte' },
    { id: 'mentor',         label: 'Mentor',         desc: 'Guía o maestro experimentado' },
    { id: 'apoyo',          label: 'Apoyo',          desc: 'Aliado o especialista' },
    { id: 'secundario',     label: 'Secundario',     desc: 'Personaje de contexto' },
  ]

  const FORM_INICIAL = {
    nombre: '',
    rol: 'protagonista',
    descripcion_fisica: '',
    ropa_tipica: '',
    personalidad: '',
    arco_narrativo: '',
    motivacion: '',
    avatar_url: '',
    prompt_visual: '',
  }

  const [form, setForm] = useState(FORM_INICIAL)
  const [pestanaActiva, setPestanaActiva] = useState(pestanaInicial)
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [promptRetrato, setPromptRetrato] = useState('')
  const [avatarTemp, setAvatarTemp] = useState(null)
  const [mensajeExito, setMensajeExito] = useState(null)
  const [errorLocal, setErrorLocal] = useState(null)
  const [sugerenciaArquetipo, setSugerenciaArquetipo] = useState(null)
  const [generandoIdeaIA, setGenerandoIdeaIA] = useState(false)

  // Barajar arquetipo predefinido según el estilo del proyecto
  const handleBarajarArquetipo = () => {
    const estiloTxt = `${proyecto?.nombre || ''} ${proyecto?.estilo_legendario || ''} ${proyecto?.style_prompt || ''} ${proyecto?.system_prompt_maestro || ''}`.toLowerCase()
    const esBruguera = ['bruguera', 'ibañez', 'ibáñez', 'mortadelo', 'mortadela', 'salchichon', 'tebeo', 'caricatura'].some(k => estiloTxt.includes(k))
    const pool = esBruguera ? ARQUETIPOS_BRUGUERA : ARQUETIPOS_PRESETS
    const coincidentes = pool.filter(a => a.rol === form.rol)
    const opciones = coincidentes.length > 0 ? coincidentes : pool
    const random = opciones[Math.floor(Math.random() * opciones.length)]
    setSugerenciaArquetipo(random)
  }

  // Generar idea dinámica con IA
  const handleGenerarIdeaIA = async () => {
    if (!idProyecto) return
    setGenerandoIdeaIA(true)
    setErrorLocal(null)
    try {
      const res = await charactersAPI.generarIdea(idProyecto, {
        rol_sugerido: form.rol,
        genero: proyecto?.genero,
        tono: proyecto?.tono
      })
      if (res.data?.propuesta) {
        setSugerenciaArquetipo(res.data.propuesta)
      } else {
        handleBarajarArquetipo()
      }
    } catch (e) {
      handleBarajarArquetipo()
    } finally {
      setGenerandoIdeaIA(false)
    }
  }

  // Aplicar sugerencia a la ficha técnica
  const handleAplicarSugerencia = (sug = sugerenciaArquetipo) => {
    if (!sug) return
    const vest = sug.vestimenta || sug.ropa_tipica || ''
    const nuevoForm = {
      ...form,
      nombre: sug.nombre || form.nombre,
      rol: sug.rol || form.rol,
      descripcion_fisica: sug.descripcion_fisica || form.descripcion_fisica,
      ropa_tipica: vest || form.ropa_tipica,
      personalidad: sug.personalidad || form.personalidad,
      arco_narrativo: sug.arco_narrativo || form.arco_narrativo,
      motivacion: sug.motivacion || form.motivacion,
    }
    setForm(nuevoForm)
    setPromptRetrato(construirPromptSugerido(nuevoForm))
    setMensajeExito('✨ ¡Arquetipo aplicado a los campos de la ficha!')
    setTimeout(() => setMensajeExito(null), 3000)
  }

  // Construir prompt sugerido para el retrato del personaje
  const construirPromptSugerido = (datosForm = form) => {
    const estiloTxt = `${proyecto?.nombre || ''} ${proyecto?.estilo_legendario || ''} ${proyecto?.style_prompt || ''} ${proyecto?.system_prompt_maestro || ''}`.toLowerCase()
    const esBruguera = ['bruguera', 'ibañez', 'ibáñez', 'mortadelo', 'mortadela', 'salchichon', 'tebeo', 'caricatura'].some(k => estiloTxt.includes(k))

    const partes = []

    if (esBruguera) {
      partes.push('classic Spanish caricature comic style, Escuela Bruguera aesthetic, Francisco Ibáñez cartoon art, thick expressive black ink contours, clean flat primary colors, humorous dynamic cartoon character, lively comic panel composition, traditional European comic coloring')
      if (datosForm.nombre) partes.push(`character portrait concept art of ${datosForm.nombre}`)
      if (datosForm.rol) partes.push(`role: ${datosForm.rol}`)
      if (datosForm.descripcion_fisica) partes.push(datosForm.descripcion_fisica)
      if (datosForm.ropa_tipica) partes.push(`wearing ${datosForm.ropa_tipica}`)
      if (datosForm.personalidad) partes.push(`expression: ${datosForm.personalidad}`)
      partes.push('official character model sheet, clean bold cartoon outlines, vibrant colors, expressive funny face, comic masterpiece')
    } else {
      const estiloProyecto = proyecto?.style_prompt || proyecto?.system_prompt_maestro || 'manga artstyle, crisp lineart, professional screentone shading, masterpiece'
      if (datosForm.nombre) partes.push(`Character portrait concept art of ${datosForm.nombre}`)
      if (datosForm.rol) partes.push(`role: ${datosForm.rol}`)
      if (datosForm.descripcion_fisica) partes.push(datosForm.descripcion_fisica)
      if (datosForm.ropa_tipica) partes.push(`wearing ${datosForm.ropa_tipica}`)
      if (datosForm.personalidad) partes.push(`expression: ${datosForm.personalidad}`)
      partes.push(estiloProyecto)
      partes.push('official character concept art sheet, clean lineart, vibrant colors, highly detailed face, masterpiece')
    }

    return partes.join(', ')
  }

  // Rellenar formulario al abrir o cambiar de personaje
  useEffect(() => {
    if (abierto) {
      limpiarError()
      setErrorLocal(null)
      setMensajeExito(null)
      setPestanaActiva(pestanaInicial || 'ficha')

      if (personajeEditar) {
        const vest = personajeEditar.ropa_tipica || personajeEditar.vestimenta || ''
        const nuevoForm = {
          nombre:            personajeEditar.nombre || '',
          rol:               personajeEditar.rol || 'protagonista',
          descripcion_fisica: personajeEditar.descripcion_fisica || '',
          ropa_tipica:       vest,
          personalidad:      personajeEditar.personalidad || '',
          arco_narrativo:    personajeEditar.arco_narrativo || '',
          motivacion:        personajeEditar.motivacion || '',
          avatar_url:        personajeEditar.avatar_url || '',
          prompt_visual:     personajeEditar.prompt_visual || '',
        }
        setForm(nuevoForm)
        setAvatarTemp(personajeEditar.avatar_url || null)
        setPromptRetrato(personajeEditar.prompt_visual || construirPromptSugerido(nuevoForm))
      } else {
        setForm(FORM_INICIAL)
        setAvatarTemp(null)
        setPromptRetrato(construirPromptSugerido(FORM_INICIAL))
      }
    }
  }, [personajeEditar, abierto, pestanaInicial])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => {
      const nuevo = { ...prev, [name]: value }
      return nuevo
    })
  }

  // Guardar datos de la ficha técnica
  const handleGuardarFicha = async (e) => {
    if (e) e.preventDefault()
    if (!form.nombre.trim()) {
      setErrorLocal('El nombre del personaje es obligatorio.')
      return
    }

    setErrorLocal(null)
    limpiarError()

    let res
    if (modoEdicion) {
      res = await actualizarPersonaje(idProyecto, personajeEditar.id, {
        nombre: form.nombre.trim(),
        rol: form.rol,
        descripcion_fisica: form.descripcion_fisica,
        ropa_tipica: form.ropa_tipica,
        personalidad: form.personalidad,
        motivacion: form.motivacion,
        avatar_url: form.avatar_url || avatarTemp,
        prompt_visual: promptRetrato
      })
    } else {
      res = await crearPersonaje(idProyecto, {
        nombre: form.nombre.trim(),
        rol: form.rol,
        descripcion_fisica: form.descripcion_fisica,
        ropa_tipica: form.ropa_tipica,
        personalidad: form.personalidad,
        motivacion: form.motivacion,
        avatar_url: form.avatar_url || avatarTemp,
        prompt_visual: promptRetrato
      })
    }

    if (res?.exito) {
      setMensajeExito('✔ Ficha técnica guardada correctamente.')
      setTimeout(() => {
        setMensajeExito(null)
        onGuardadoExitoso?.(res.personaje)
        onCerrar()
      }, 1200)
    } else {
      setErrorLocal(res?.error || 'Error al guardar personaje.')
    }
  }

  // Generar Retrato con Firma Visual (FLUX.1 Dev)
  const handleGenerarRetrato = async () => {
    if (!idProyecto) return
    let personajeId = personajeEditar?.id

    // Si es un personaje nuevo que no se ha guardado, guardarlo primero
    if (!personajeId) {
      if (!form.nombre.trim()) {
        setErrorLocal('Indica un nombre para el personaje antes de generar su retrato.')
        return
      }
      const resCrear = await crearPersonaje(idProyecto, form)
      if (!resCrear.exito || !resCrear.personaje) {
        setErrorLocal('No se pudo guardar el borrador del personaje.')
        return
      }
      personajeId = resCrear.personaje.id
    }

    setErrorLocal(null)
    setMensajeExito(null)
    const promptFinal = promptRetrato.trim() || construirPromptSugerido()

    const resAvatar = await generarAvatar(idProyecto, personajeId, {
      prompt_personalizado: promptFinal,
      aspect_ratio: aspectRatio
    })

    if (resAvatar?.exito && resAvatar.data?.avatar_url) {
      const urlNueva = resAvatar.data.avatar_url
      setAvatarTemp(urlNueva)
      setForm(prev => ({ ...prev, avatar_url: urlNueva, prompt_visual: promptFinal }))
      setMensajeExito('✨ ¡Retrato oficial generado con alta resolución y Firma Visual!')
      setTimeout(() => setMensajeExito(null), 4000)
      onGuardadoExitoso?.(resAvatar.data.personaje)
    } else {
      setErrorLocal(resAvatar?.error || 'Error generando el retrato con IA.')
    }
  }

  // Asignar el avatar generado como oficial del personaje
  const handleAsignarAvatarOficial = async () => {
    if (!idProyecto || !personajeEditar?.id || !avatarTemp) return
    try {
      const res = await actualizarPersonaje(idProyecto, personajeEditar.id, {
        avatar_url: avatarTemp,
        prompt_visual: promptRetrato
      })
      if (res?.exito) {
        setMensajeExito('🌟 ¡Retrato fijado como avatar oficial!')
        setTimeout(() => setMensajeExito(null), 3000)
        onGuardadoExitoso?.(res.personaje)
      }
    } catch (e) {
      setErrorLocal('Error al fijar avatar oficial.')
    }
  }

  // Descargar el retrato actual
  const handleDescargarAvatar = () => {
    if (!avatarTemp) return
    const srcUrl = obtenerUrlImagen(avatarTemp)
    const a = document.createElement('a')
    a.href = srcUrl
    a.download = `${form.nombre?.replace(/\s+/g, '_') || 'personaje'}_avatar.png`
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  if (!abierto) return null

  const avatarDisplay = avatarTemp ? obtenerUrlImagen(avatarTemp) : getDefaultAvatar(form.rol)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl my-8 bg-white dark:bg-[#131b2e] border-2 border-slate-900 dark:border-slate-700 rounded-2xl shadow-[6px_6px_0px_0px_rgba(15,23,42,0.9)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabecera del Modal */}
        <div className="px-6 py-4 border-b-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-amber-100 dark:bg-slate-800 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(15,23,42,0.9)] flex-shrink-0">
              <User className="w-5 h-5 text-slate-900 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-titulo font-black text-lg text-slate-900 dark:text-white leading-tight">
                {modoEdicion ? `Ficha de ${form.nombre || 'Personaje'}` : 'Crear Nuevo Personaje'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Diseño técnico de personajes, atuendos y retratos con Firma Visual activa.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            className="p-1.5 rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors shadow-[2px_2px_0px_0px_rgba(15,23,42,0.85)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pestañas de Navegación del Modal */}
        <div className="px-6 pt-3 border-b-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPestanaActiva('ficha')}
            className={`pb-2.5 px-3 text-xs font-titulo font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
              pestanaActiva === 'ficha'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>1. Ficha Técnica y Rasgos</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPromptRetrato(promptRetrato || construirPromptSugerido())
              setPestanaActiva('retrato')
            }}
            className={`pb-2.5 px-3 text-xs font-titulo font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
              pestanaActiva === 'retrato'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>2. Generador de Retrato (Firma Visual)</span>
          </button>
        </div>

        {/* Notificaciones y Alertas */}
        <div className="px-6 pt-3">
          {(errorLocal || error) && (
            <div className="p-3 rounded-xl border-2 border-red-600 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(220,38,38,0.85)] mb-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorLocal || error}</span>
            </div>
          )}

          {mensajeExito && (
            <div className="p-3 rounded-xl border-2 border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(16,185,129,0.85)] mb-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{mensajeExito}</span>
            </div>
          )}
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">

          {/* ── PESTAÑA 1: FICHA TÉCNICA ── */}
          {pestanaActiva === 'ficha' && (
            <form onSubmit={handleGuardarFicha} className="space-y-4">
              
              {/* ── BARRA DE GENERACIÓN RÁPIDA DE ARQUETIPOS / PROMPTS ── */}
              <div className="p-3.5 rounded-xl border-2 border-dashed border-purple-500/60 bg-purple-50/50 dark:bg-purple-950/30 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="font-titulo text-xs font-black text-purple-950 dark:text-purple-200">
                      Asistente de Arquetipos y Creatividad Rápida
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleBarajarArquetipo}
                      className="px-2.5 py-1 text-xs font-titulo font-bold rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-[1px_1px_0px_0px_rgba(0,0,0,0.85)] flex items-center gap-1 cursor-pointer"
                      title="Elegir otro arquetipo predefinido"
                    >
                      <RotateCcw className="w-3 h-3 text-indigo-500" />
                      <span>[🔄 Barajar Arquetipo]</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleGenerarIdeaIA}
                      disabled={generandoIdeaIA}
                      className="px-2.5 py-1 text-xs font-titulo font-bold rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-purple-600 hover:bg-purple-500 text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,0.85)] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      title="Generar propuesta de personaje con IA según la premisa del proyecto"
                    >
                      {generandoIdeaIA ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3 text-amber-300" />
                      )}
                      <span>[🎲 Generar Idea con IA]</span>
                    </button>
                  </div>
                </div>

                {sugerenciaArquetipo && (
                  <div className="p-3 rounded-lg border border-purple-400/40 bg-white dark:bg-slate-900 text-xs space-y-1.5 animate-fade-in shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-titulo font-black text-slate-900 dark:text-white">
                          {sugerenciaArquetipo.nombre}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold uppercase font-titulo">
                          {sugerenciaArquetipo.rol}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAplicarSugerencia(sugerenciaArquetipo)}
                        className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-titulo font-black text-[11px] flex items-center gap-1 shadow-[1px_1px_0px_0px_rgba(0,0,0,0.85)] cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        <span>[✨ Aplicar a la Ficha]</span>
                      </button>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-tight line-clamp-2">
                      <strong className="text-slate-800 dark:text-slate-100">Físico:</strong> {sugerenciaArquetipo.descripcion_fisica} · <strong className="text-slate-800 dark:text-slate-100">Vestimenta:</strong> {sugerenciaArquetipo.vestimenta || sugerenciaArquetipo.ropa_tipica}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Nombre del Personaje */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-titulo flex items-center gap-1">
                    <span>Nombre del Personaje</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    placeholder="Ej: Kaelen, Lyra, Sensei Takeshi..."
                    className="w-full text-xs font-medium p-3 rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-titulo font-semibold"
                    required
                  />
                </div>

                {/* Rol Narrativo */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-titulo flex items-center gap-1">
                    <span>Rol en la Historia</span>
                  </label>
                  <select
                    name="rol"
                    value={form.rol}
                    onChange={handleChange}
                    className="w-full text-xs font-medium p-3 rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-titulo font-bold cursor-pointer"
                  >
                    {ROLES.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Descripción Física y Rasgos */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-titulo">
                  Descripción Física y Rasgos Clave
                </label>
                <textarea
                  rows={3}
                  name="descripcion_fisica"
                  value={form.descripcion_fisica}
                  onChange={handleChange}
                  placeholder="Silueta, peinado, color de ojos, cicatrices o marcas distintivas..."
                  className="w-full text-xs font-medium p-3 rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
                />
              </div>

              {/* Vestimenta y Accesorios */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-titulo">
                  Vestimenta, Uniforme y Armas
                </label>
                <textarea
                  rows={2}
                  name="ropa_tipica"
                  value={form.ropa_tipica}
                  onChange={handleChange}
                  placeholder="Ropa habitual, gabardina, armadura, katana de fuego, guantes entintados..."
                  className="w-full text-xs font-medium p-3 rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Personalidad y Actitud */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-titulo">
                    Personalidad y Actitud Dominante
                  </label>
                  <input
                    type="text"
                    name="personalidad"
                    value={form.personalidad}
                    onChange={handleChange}
                    placeholder="Ej: Impulsivo, leal, estratega frío, alegre..."
                    className="w-full text-xs font-medium p-3 rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Motivación / Objetivo */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-titulo">
                    Motivación u Objetivo
                  </label>
                  <input
                    type="text"
                    name="motivacion"
                    value={form.motivacion}
                    onChange={handleChange}
                    placeholder="Ej: Proteger a su gremio, descubrir la verdad..."
                    className="w-full text-xs font-medium p-3 rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

            </form>
          )}

          {/* ── PESTAÑA 2: GENERADOR DE RETRATO CON FIRMA VISUAL ── */}
          {pestanaActiva === 'retrato' && (
            <div className="space-y-5">
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                
                {/* Columna Izquierda: Configuración del Prompt y Aspect Ratio (7 cols) */}
                <div className="md:col-span-7 space-y-4">
                  
                  {/* Selector de Aspect Ratio */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-titulo flex items-center gap-1.5">
                      <Image className="w-4 h-4 text-purple-600" />
                      <span>Formato del Retrato</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: '1:1', label: '1:1 (Avatar Cuadrado)', desc: '1024x1024' },
                        { id: '3:4', label: '3:4 (Ficha Vertical)', desc: '768x1024' }
                      ].map((ar) => (
                        <button
                          key={ar.id}
                          type="button"
                          onClick={() => setAspectRatio(ar.id)}
                          className={`p-2.5 rounded-xl border-2 text-center transition-all cursor-pointer ${
                            aspectRatio === ar.id
                              ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 shadow-[2px_2px_0px_0px_rgba(147,51,234,0.85)] font-bold'
                              : 'border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.85)]'
                          }`}
                        >
                          <span className="block font-mono text-xs font-bold">{ar.label}</span>
                          <span className="block text-[10px] text-slate-500 dark:text-slate-400">{ar.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Prompt de Retrato compilado */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-titulo flex items-center gap-1">
                        <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Prompt del Retrato (Firma Visual)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setPromptRetrato(construirPromptSugerido())}
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        title="Restaurar prompt desde la ficha"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>[🔄 Recompilar desde Ficha]</span>
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      value={promptRetrato}
                      onChange={(e) => setPromptRetrato(e.target.value)}
                      placeholder="Prompt visual detallado para el render de FLUX.1 Dev..."
                      className="w-full text-xs font-mono font-medium p-3 rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Inyecta la descripción física, vestimenta y la Firma Visual activa del proyecto ({proyecto?.estilo_legendario || 'Firma Activa'}).
                    </p>
                  </div>

                  {/* Botón de Generación */}
                  <button
                    type="button"
                    onClick={handleGenerarRetrato}
                    disabled={generandoAvatar || (!form.nombre && !personajeEditar?.nombre)}
                    className="w-full py-3 px-4 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-titulo font-black text-xs shadow-[3px_3px_0px_0px_rgba(15,23,42,0.9)] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {generandoAvatar ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Generando retrato con FLUX.1 Dev...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>[✨ Generar Retrato con Firma Visual]</span>
                      </>
                    )}
                  </button>

                </div>

                {/* Columna Derecha: Visor de Retrato Generado (5 cols) */}
                <div className="md:col-span-5 flex flex-col items-center justify-center p-4 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 shadow-[2px_2px_0px_0px_rgba(15,23,42,0.85)] space-y-3">
                  
                  <div className={`w-full ${aspectRatio === '1:1' ? 'aspect-square max-w-[220px]' : 'aspect-[3/4] max-w-[200px]'} rounded-xl overflow-hidden border-2 border-slate-900 bg-slate-950 shadow-[3px_3px_0px_0px_rgba(15,23,42,0.9)] relative group`}>
                    <img
                      src={avatarDisplay}
                      alt={form.nombre || 'Retrato'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src = getDefaultAvatar(form.rol)
                      }}
                    />
                    <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-xs text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-slate-700">
                      {aspectRatio}
                    </div>
                  </div>

                  {avatarTemp ? (
                    <div className="w-full space-y-2">
                      <button
                        type="button"
                        onClick={handleAsignarAvatarOficial}
                        className="w-full py-2 px-2.5 rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-emerald-600 hover:bg-emerald-500 text-white font-titulo font-bold text-xs shadow-[2px_2px_0px_0px_rgba(15,23,42,0.85)] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5 text-amber-300" />
                        <span>[🌟 Asignar como Avatar Oficial]</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDescargarAvatar}
                        className="w-full py-1.5 px-2 rounded-lg border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-700 hover:bg-slate-100 text-slate-800 dark:text-slate-100 font-titulo font-bold text-xs shadow-[2px_2px_0px_0px_rgba(15,23,42,0.85)] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Descargar Retrato</span>
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 text-center">
                      Pulsa 'Generar Retrato' para crear la primera ilustración con la Firma Visual.
                    </p>
                  )}

                </div>

              </div>

            </div>
          )}

        </div>

        {/* Pie del Modal con Acciones de Guardado */}
        <div className="px-6 py-4 border-t-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onCerrar}
            className="py-2 px-4 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-titulo font-bold text-xs shadow-[2px_2px_0px_0px_rgba(15,23,42,0.85)] cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleGuardarFicha}
            disabled={guardando || !form.nombre.trim()}
            className="py-2.5 px-6 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-emerald-600 hover:bg-emerald-500 text-white font-titulo font-black text-xs shadow-[3px_3px_0px_0px_rgba(15,23,42,0.9)] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{guardando ? 'Guardando...' : (modoEdicion ? 'Guardar Cambios' : 'Crear Personaje')}</span>
          </button>
        </div>

      </div>
    </div>
  )
}