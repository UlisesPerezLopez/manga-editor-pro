// BackupModal.jsx
// Módulo de Copias de Seguridad (Backup & Restore) para exportar e importar proyectos completos (.mepbackup / JSON) con Lucide React.

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Save,
  FolderUp,
  FolderDown,
  UploadCloud,
  FileArchive,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  Users,
  BookOpen,
  ArrowLeft,
  PackageCheck
} from 'lucide-react'
import { projectsAPI, chaptersAPI, charactersAPI } from '../../services/api'
import Modal from '../UI/Modal'
import Spinner from '../UI/Spinner'

export default function BackupModal({
  abierto,
  onCerrar,
  proyectoInicial = null,
  onRestauracionExitosa = null
}) {
  const { t } = useTranslation()

  // Pestaña activa: 'exportar' | 'importar'
  const [pestana, setPestana] = useState('exportar')

  // Lista de proyectos disponibles para exportar
  const [proyectos, setProyectos] = useState([])
  const [proyectoIdExportar, setProyectoIdExportar] = useState(
    proyectoInicial?.id || ''
  )

  // Estados de proceso
  const [procesando, setProcesando] = useState(false)
  const [mensajeEstado, setMensajeEstado] = useState('')
  const [progreso, setProgreso] = useState(0) // 0-100
  const [error, setError] = useState(null)
  const [exito, setExito] = useState(null)

  // Datos del archivo seleccionado para importar
  const [datosImportar, setDatosImportar] = useState(null)
  const [nombreArchivo, setNombreArchivo] = useState('')
  const fileInputRef = useRef(null)

  // Cargar proyectos si no se pasa proyecto inicial
  useEffect(() => {
    if (abierto) {
      setError(null)
      setExito(null)
      setDatosImportar(null)
      setNombreArchivo('')

      if (!proyectoInicial) {
        projectsAPI.listar()
          .then(res => {
            const list = res.data || []
            setProyectos(list)
            if (list.length > 0 && !proyectoIdExportar) {
              setProyectoIdExportar(list[0].id)
            }
          })
          .catch(() => {})
      } else {
        setProyectoIdExportar(proyectoInicial.id)
      }
    }
  }, [abierto, proyectoInicial])

  // ─── 1. EXPORTAR BACKUP COMPLETO ──────────────────────────────────────────

  const handleExportar = async () => {
    const pId = proyectoInicial?.id || parseInt(proyectoIdExportar)
    if (!pId) {
      setError('Selecciona un proyecto válido')
      return
    }

    setProcesando(true)
    setError(null)
    setExito(null)
    setMensajeEstado(t('backup.exporting') || 'Empaquetando backup...')
    setProgreso(20)

    try {
      // 1. Obtener detalles del proyecto
      const respProy = await projectsAPI.obtener(pId)
      const proyectoData = respProy.data
      setProgreso(40)

      // 2. Obtener capítulos y páginas
      const respCaps = await chaptersAPI.listar(pId)
      const capitulosData = respCaps.data || []
      setProgreso(60)

      // 3. Obtener personajes
      const respPers = await charactersAPI.listar(pId)
      const personajesData = respPers.data || []
      setProgreso(80)

      // Construir paquete de backup estructurado
      const backupPackage = {
        mep_version: '2.0.0',
        backup_date: new Date().toISOString(),
        brand: 'MEP — Manga Editor Pro',
        proyecto: proyectoData,
        capitulos: capitulosData,
        personajes: personajesData
      }

      // Convertir a Blob y descargar
      const jsonStr = JSON.stringify(backupPackage, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      const fechaStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const nombreLimpio = (proyectoData.nombre || 'proyecto').replace(/\s+/g, '_')
      const fileName = `${nombreLimpio}_backup_${fechaStr}.mepbackup`

      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setProgreso(100)
      setExito(`${t('backup.exportSuccess') || 'Backup exportado'}: ${fileName}`)
    } catch (err) {
      console.error('Error al exportar backup:', err)
      setError(err.response?.data?.detail || err.message || 'Error al compilar el backup')
    } finally {
      setProcesando(false)
      setMensajeEstado('')
    }
  }

  // ─── 2. SELECCIONAR Y VALIDAR ARCHIVO DE IMPORTACIÓN ───────────────────────

  const procesarTextoBackup = (contenidoTexto, nombre) => {
    setError(null)
    setExito(null)
    try {
      const data = JSON.parse(contenidoTexto)

      // Validación estricta de esquema
      if (!data.proyecto || !data.proyecto.nombre) {
        throw new Error('El archivo no contiene la estructura requerida de proyecto MEP')
      }

      setDatosImportar(data)
      setNombreArchivo(nombre)
    } catch (err) {
      setError(`${t('backup.restoreError') || 'Error de restauración'}: ${err.message}`)
      setDatosImportar(null)
      setNombreArchivo('')
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evento) => {
      procesarTextoBackup(evento.target.result, file.name)
    }
    reader.onerror = () => setError('Error al leer el archivo')
    reader.readAsText(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evento) => {
      procesarTextoBackup(evento.target.result, file.name)
    }
    reader.onerror = () => setError('Error al leer el archivo')
    reader.readAsText(file)
  }

  // ─── 3. RESTAURAR PROYECTO HACIA LA BASE DE DATOS ──────────────────────────

  const handleRestaurar = async () => {
    if (!datosImportar || !datosImportar.proyecto) return

    setProcesando(true)
    setError(null)
    setExito(null)
    setProgreso(10)
    setMensajeEstado(t('backup.restoring') || 'Iniciando restauración...')

    try {
      const pOrig = datosImportar.proyecto
      const nombreRestaurado = `${pOrig.nombre} (Restaurado)`

      // 1. Crear Proyecto en backend
      const respProy = await projectsAPI.crear({
        nombre: nombreRestaurado,
        formato_lectura: pOrig.formato_lectura || 'manga',
        modo_creacion: pOrig.modo_creacion || 'propio',
        estilo_legendario: pOrig.estilo_legendario || null
      })
      const nuevoProyecto = respProy.data
      setProgreso(30)

      // 2. Reconstruir Capítulos y Páginas
      const capitulos = datosImportar.capitulos || []
      setMensajeEstado(t('backup.restoringChapters') || 'Restaurando capítulos...')

      for (let i = 0; i < capitulos.length; i++) {
        const c = capitulos[i]
        const respCap = await chaptersAPI.crearCapitulo(nuevoProyecto.id, {
          numero: c.numero,
          titulo: c.titulo,
          sinopsis: c.sinopsis
        })
        const nuevoCap = respCap.data

        const paginas = c.paginas || []
        for (const p of paginas) {
          const respPag = await chaptersAPI.crearPagina(nuevoProyecto.id, nuevoCap.id, {
            numero: p.numero,
            formato: p.formato || 'manga_b6',
            layout_template: p.layout_template || 'custom'
          })
          const nuevaPag = respPag.data

          // Guardar estado del canvas si existía
          if (p.canvas_json) {
            await chaptersAPI.guardarCanvas(nuevoProyecto.id, nuevaPag.id, {
              canvas_json: p.canvas_json,
              layout_template: p.layout_template || 'custom'
            })
          }
        }
        setProgreso(30 + Math.round(((i + 1) / capitulos.length) * 40))
      }

      // 3. Reconstruir Personajes
      const personajes = datosImportar.personajes || []
      setMensajeEstado(t('backup.restoringCharacters') || 'Restaurando personajes...')

      for (let j = 0; j < personajes.length; j++) {
        const per = personajes[j]
        await charactersAPI.crear(nuevoProyecto.id, {
          nombre: per.nombre,
          rol: per.rol || 'protagonista',
          arquetipo: per.arquetipo,
          personalidad: per.personalidad,
          descripcion_fisica: per.descripcion_fisica,
          rasgos_visuales_clave: per.rasgos_visuales_clave,
          prompt_ia: per.prompt_ia
        })
        setProgreso(70 + Math.round(((j + 1) / personajes.length) * 30))
      }

      setProgreso(100)
      setExito(`${t('backup.restoreSuccess') || 'Proyecto restaurado exitosamente'}: "${nombreRestaurado}"`)

      if (onRestauracionExitosa) {
        onRestauracionExitosa(nuevoProyecto)
      }
    } catch (err) {
      console.error('Error durante la restauración:', err)
      setError(err.response?.data?.detail || err.message || 'Error al restaurar proyecto')
    } finally {
      setProcesando(false)
      setMensajeEstado('')
    }
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Copias de Seguridad (Backup & Restore)"
      ancho="max-w-2xl"
    >
      <div className="space-y-5">
        
        {/* Selector de Pestañas */}
        <div className="flex bg-rdc-card p-1 rounded-xl border border-rdc-border text-xs font-titulo">
          <button
            onClick={() => { setPestana('exportar'); setError(null); setExito(null) }}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              pestana === 'exportar'
                ? 'bg-rdc-accent text-white font-bold shadow-xs'
                : 'text-rdc-muted hover:text-rdc-text'
            }`}
          >
            <FolderUp className="w-4 h-4" /> {t('backup.exportTitle') || 'Exportar Backup'}
          </button>
          <button
            onClick={() => { setPestana('importar'); setError(null); setExito(null) }}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              pestana === 'importar'
                ? 'bg-rdc-accent text-white font-bold shadow-xs'
                : 'text-rdc-muted hover:text-rdc-text'
            }`}
          >
            <FolderDown className="w-4 h-4" /> {t('backup.importTitle') || 'Importar / Restaurar'}
          </button>
        </div>

        {/* ── PESTAÑA 1: EXPORTAR BACKUP ──────────────────────────────────── */}
        {pestana === 'exportar' && (
          <div className="space-y-4">
            <p className="text-rdc-muted text-xs leading-relaxed font-titulo">
              {t('backup.exportDesc') || 'Descarga un archivo .mepbackup con el proyecto íntegro, capas vectoriales del canvas, estructura de capítulos y directorio de personajes.'}
            </p>

            {!proyectoInicial && proyectos.length > 0 && (
              <div>
                <label className="block text-rdc-muted text-xs mb-1.5 font-titulo">
                  {t('backup.selectProjectToBackup') || 'Seleccionar Proyecto:'}
                </label>
                <select
                  value={proyectoIdExportar}
                  onChange={(e) => setProyectoIdExportar(e.target.value)}
                  disabled={procesando}
                  className="w-full bg-rdc-card border border-rdc-border rounded-xl px-3 py-2 text-rdc-text text-xs focus:outline-none focus:border-rdc-accent font-titulo"
                >
                  {proyectos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.formato_lectura === 'manga' ? 'Manga' : 'Cómic'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="bg-rdc-secondary border border-rdc-border rounded-2xl p-4 text-xs space-y-2.5">
              <h5 className="font-titulo font-bold text-rdc-text flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-rdc-accent" />
                Contenido del paquete .mepbackup:
              </h5>
              <ul className="text-rdc-muted space-y-1.5 pl-6 list-disc">
                <li>Metadatos completos del proyecto y formato de lectura.</li>
                <li>Estructura completa de Capítulos y Páginas.</li>
                <li>Estados vectoriales y capas del Canvas Fabric.js.</li>
                <li>Fichas técnicas de personajes y prompts maestros de IA.</li>
              </ul>
            </div>

            <button
              onClick={handleExportar}
              disabled={procesando}
              className="w-full bg-rdc-accent hover:bg-rdc-accent-hover text-white font-titulo font-semibold py-3 px-4 rounded-xl transition-all shadow-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <FolderUp className="w-4 h-4" /> {t('backup.exportBtn') || 'Exportar Archivo .mepbackup'}
            </button>
          </div>
        )}

        {/* ── PESTAÑA 2: IMPORTAR / RESTAURAR BACKUP ───────────────────────── */}
        {pestana === 'importar' && (
          <div className="space-y-4">
            <p className="text-rdc-muted text-xs leading-relaxed font-titulo">
              {t('backup.importDesc') || 'Restaura una obra desde un archivo .mepbackup o .json estructurado previamente generado.'}
            </p>

            {/* Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-rdc-border hover:border-rdc-accent rounded-2xl p-6 text-center cursor-pointer transition-all bg-rdc-card/50 hover:bg-rdc-card flex flex-col items-center justify-center gap-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".mepbackup,.json"
                onChange={handleFileChange}
                className="hidden"
              />
              <UploadCloud className="w-10 h-10 text-rdc-muted group-hover:text-rdc-accent transition-colors" />
              <p className="font-titulo text-xs text-rdc-text font-semibold">
                {nombreArchivo ? `${t('backup.fileSelected') || 'Archivo seleccionado:'} ${nombreArchivo}` : (t('backup.dragDrop') || 'Arrastra tu archivo aquí o haz clic')}
              </p>
              <span className="text-[11px] text-rdc-accent underline font-titulo">
                {t('backup.selectFile') || 'Examinar archivos (.mepbackup)'}
              </span>
            </div>

            {/* Resumen del archivo cargado */}
            {datosImportar && datosImportar.proyecto && (
              <div className="bg-rdc-card border border-emerald-500/40 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between text-emerald-400 font-titulo font-bold">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Backup válido detectado
                  </span>
                  <span className="text-[10px] bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-500/40">
                    MEP v{datosImportar.mep_version || '2.0'}
                  </span>
                </div>
                <p className="text-rdc-text font-semibold text-sm font-titulo">
                  {datosImportar.proyecto.nombre}
                </p>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-rdc-border text-[11px] text-rdc-muted font-titulo">
                  <div>Capítulos: <strong className="text-rdc-text">{datosImportar.capitulos?.length || 0}</strong></div>
                  <div>Personajes: <strong className="text-rdc-text">{datosImportar.personajes?.length || 0}</strong></div>
                  <div>Formato: <strong className="text-rdc-text capitalize">{datosImportar.proyecto.formato_lectura}</strong></div>
                </div>

                <button
                  onClick={handleRestaurar}
                  disabled={procesando}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-titulo font-bold py-2.5 px-4 rounded-xl transition-all shadow-md text-xs mt-3 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${procesando ? 'animate-spin' : ''}`} /> Restaurar en Base de Datos
                </button>
              </div>
            )}
          </div>
        )}

        {/* Barra de progreso / Mensaje de proceso */}
        {procesando && (
          <div className="space-y-2 bg-rdc-secondary p-3.5 rounded-xl border border-rdc-border text-xs">
            <div className="flex items-center justify-between font-titulo">
              <span className="text-rdc-text font-semibold">{mensajeEstado}</span>
              <span className="text-rdc-accent font-bold">{progreso}%</span>
            </div>
            <div className="w-full bg-rdc-card h-2 rounded-full overflow-hidden">
              <div
                className="bg-rdc-accent h-full transition-all duration-300 rounded-full"
                style={{ width: `${progreso}%` }}
              />
            </div>
          </div>
        )}

        {/* Alertas de Error y Éxito */}
        {error && (
          <div className="bg-rdc-error/20 border border-rdc-error text-rdc-error rounded-xl p-3.5 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {exito && (
          <div className="bg-emerald-500/20 border border-emerald-500 text-emerald-400 rounded-xl p-3.5 text-xs font-titulo flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{exito}</span>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-rdc-border">
          <button
            onClick={onCerrar}
            disabled={procesando}
            className="bg-rdc-card hover:bg-rdc-border text-rdc-text font-titulo px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t('nav.back') || 'Cerrar'}
          </button>
        </div>

      </div>
    </Modal>
  )
}
