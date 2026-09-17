// indexedDbService.js
// Capa de persistencia local offline de alta disponibilidad con IndexedDB nativo.
// Gestiona ObjectStores para borradores de canvas, caché de imágenes y sincronización reactiva con FastAPI.

const DB_NOMBRE = 'MEP_Offline_DB'
const DB_VERSION = 1

// Nombres de ObjectStores
export const STORES = {
  DRAFTS: 'mep_drafts',
  ASSETS: 'mep_assets_cache',
  PROJECTS: 'mep_projects_cache'
}

let dbInstancia = null

/**
 * Abre o inicializa la base de datos IndexedDB local
 */
export async function abrirDB() {
  if (dbInstancia) return dbInstancia

  return new Promise((resolve, reject) => {
    const peticion = indexedDB.open(DB_NOMBRE, DB_VERSION)

    peticion.onupgradeneeded = (evento) => {
      const db = evento.target.result

      // 1. Store de borradores de canvas (auto-guardado offline)
      if (!db.objectStoreNames.contains(STORES.DRAFTS)) {
        const storeBorradores = db.createObjectStore(STORES.DRAFTS, { keyPath: 'draftKey' })
        storeBorradores.createIndex('id_proyecto', 'id_proyecto', { unique: false })
        storeBorradores.createIndex('sincronizado', 'sincronizado', { unique: false })
        storeBorradores.createIndex('timestamp', 'timestamp', { unique: false })
      }

      // 2. Store de caché de imágenes y assets pesados
      if (!db.objectStoreNames.contains(STORES.ASSETS)) {
        const storeAssets = db.createObjectStore(STORES.ASSETS, { keyPath: 'assetId' })
        storeAssets.createIndex('id_proyecto', 'id_proyecto', { unique: false })
        storeAssets.createIndex('timestamp', 'timestamp', { unique: false })
      }

      // 3. Store de proyectos para consulta offline
      if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
        db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' })
      }
    }

    peticion.onsuccess = (evento) => {
      dbInstancia = evento.target.result
      resolve(dbInstancia)
    }

    peticion.onerror = (evento) => {
      console.error('Error al abrir IndexedDB:', evento.target.error)
      reject(evento.target.error)
    }
  })
}

// ─── GESTIÓN DE BORRADORES DE PÁGINAS (DRAFTS) ──────────────────────────────

/**
 * Guarda un borrador local del canvas en IndexedDB
 */
export async function guardarBorradorLocal(idProyecto, idPagina, canvasJSON, extraMeta = {}) {
  try {
    const db = await abrirDB()
    const draftKey = `p_${idProyecto}_pag_${idPagina}`

    const registro = {
      draftKey,
      id_proyecto: parseInt(idProyecto),
      id_pagina: parseInt(idPagina),
      canvas_json: typeof canvasJSON === 'string' ? JSON.parse(canvasJSON) : canvasJSON,
      timestamp: Date.now(),
      sincronizado: false,
      extraMeta
    }

    return new Promise((resolve, reject) => {
      const transaccion = db.transaction([STORES.DRAFTS], 'readwrite')
      const store = transaccion.objectStore(STORES.DRAFTS)
      const req = store.put(registro)

      req.onsuccess = () => {
        // Notificar al sistema de cambio en estado offline
        window.dispatchEvent(new CustomEvent('mep:draft-saved', { detail: { draftKey, timestamp: registro.timestamp } }))
        resolve(registro)
      }
      req.onerror = (e) => reject(e.target.error)
    })
  } catch (err) {
    console.error('Error al guardar borrador en IndexedDB:', err)
    return null
  }
}

/**
 * Obtiene el borrador local de una página
 */
export async function obtenerBorradorLocal(idProyecto, idPagina) {
  try {
    const db = await abrirDB()
    const draftKey = `p_${idProyecto}_pag_${idPagina}`

    return new Promise((resolve, reject) => {
      const transaccion = db.transaction([STORES.DRAFTS], 'readonly')
      const store = transaccion.objectStore(STORES.DRAFTS)
      const req = store.get(draftKey)

      req.onsuccess = () => resolve(req.result || null)
      req.onerror = (e) => reject(e.target.error)
    })
  } catch (err) {
    console.error('Error al obtener borrador de IndexedDB:', err)
    return null
  }
}

/**
 * Marca un borrador como sincronizado exitosamente con el backend
 */
export async function marcarBorradorSincronizado(idProyecto, idPagina) {
  try {
    const db = await abrirDB()
    const draftKey = `p_${idProyecto}_pag_${idPagina}`

    return new Promise((resolve, reject) => {
      const transaccion = db.transaction([STORES.DRAFTS], 'readwrite')
      const store = transaccion.objectStore(STORES.DRAFTS)
      const req = store.get(draftKey)

      req.onsuccess = () => {
        if (req.result) {
          req.result.sincronizado = true
          store.put(req.result)
        }
        resolve(true)
      }
      req.onerror = (e) => reject(e.target.error)
    })
  } catch (err) {
    console.error('Error al marcar sincronizado:', err)
    return false
  }
}

/**
 * Lista todos los borradores no sincronizados
 */
export async function listarBorradoresPendientes() {
  try {
    const db = await abrirDB()
    return new Promise((resolve, reject) => {
      const transaccion = db.transaction([STORES.DRAFTS], 'readonly')
      const store = transaccion.objectStore(STORES.DRAFTS)
      const pendientes = []

      const req = store.openCursor()
      req.onsuccess = (e) => {
        const cursor = e.target.result
        if (cursor) {
          if (!cursor.value.sincronizado) {
            pendientes.push(cursor.value)
          }
          cursor.continue()
        } else {
          resolve(pendientes)
        }
      }
      req.onerror = (e) => reject(e.target.error)
    })
  } catch (err) {
    console.error('Error al listar pendientes:', err)
    return []
  }
}

/**
 * Cuenta la cantidad de borradores pendientes de sincronización
 */
export async function contarBorradoresPendientes() {
  const lista = await listarBorradoresPendientes()
  return lista.length
}

// ─── CACHÉ DE ASSETS E IMÁGENES PESADAS ──────────────────────────────────────

/**
 * Guarda una imagen pesada en caché IndexedDB para acceso instantáneo
 */
export async function cachearAsset(assetId, idProyecto, dataUrl) {
  try {
    const db = await abrirDB()
    return new Promise((resolve, reject) => {
      const transaccion = db.transaction([STORES.ASSETS], 'readwrite')
      const store = transaccion.objectStore(STORES.ASSETS)
      const req = store.put({
        assetId,
        id_proyecto: parseInt(idProyecto) || 0,
        dataUrl,
        timestamp: Date.now()
      })
      req.onsuccess = () => resolve(true)
      req.onerror = (e) => reject(e.target.error)
    })
  } catch (err) {
    return false
  }
}

/**
 * Obtiene una imagen de la caché local de IndexedDB
 */
export async function obtenerAssetCache(assetId) {
  try {
    const db = await abrirDB()
    return new Promise((resolve, reject) => {
      const transaccion = db.transaction([STORES.ASSETS], 'readonly')
      const store = transaccion.objectStore(STORES.ASSETS)
      const req = store.get(assetId)
      req.onsuccess = () => resolve(req.result?.dataUrl || null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

// ─── SINCRONIZACIÓN AUTOMÁTICA HACIA BACKEND FASTAPI ────────────────────────

/**
 * Sincroniza todos los borradores locales pendientes cuando hay conexión
 */
export async function sincronizarBorradoresConServidor(apiGuardarCallback) {
  if (!navigator.onLine) return { sincronizados: 0, fallidos: 0 }

  const pendientes = await listarBorradoresPendientes()
  if (pendientes.length === 0) return { sincronizados: 0, fallidos: 0 }

  let exitosos = 0
  let errores = 0

  for (const item of pendientes) {
    try {
      if (apiGuardarCallback) {
        await apiGuardarCallback(item.id_proyecto, item.id_pagina, item.canvas_json)
      }
      await marcarBorradorSincronizado(item.id_proyecto, item.id_pagina)
      exitosos++
    } catch (err) {
      console.warn(`No se pudo sincronizar borrador ${item.draftKey}:`, err)
      errores++
    }
  }

  // Notificar al sistema
  window.dispatchEvent(new CustomEvent('mep:sync-completed', {
    detail: { exitosos, errores, total: pendientes.length }
  }))

  return { sincronizados: exitosos, fallidos: errores }
}

// Listener global para auto-sincronizar al recuperar conexión a internet
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('🌐 Conexión reestablecida: Verificando borradores offline en IndexedDB...')
    // La sincronización real puede ser disparada por el store o el OnlineBadge
    window.dispatchEvent(new CustomEvent('mep:online-sync-requested'))
  })
}

export default {
  abrirDB,
  guardarBorradorLocal,
  obtenerBorradorLocal,
  marcarBorradorSincronizado,
  listarBorradoresPendientes,
  contarBorradoresPendientes,
  cachearAsset,
  obtenerAssetCache,
  sincronizarBorradoresConServidor
}
