// service-worker.js
// Service Worker PWA para MEP — Manga Editor Pro (Offline First & Asset Caching).

const CACHE_NAME = 'mep-cache-v2.0'

const ASSETS_STATICOS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icons.svg'
]

// Instalación: Precarga de assets críticos
self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 [PWA] Precargando assets estáticos en caché...')
      return cache.addAll(ASSETS_STATICOS).catch((err) => {
        console.warn('⚠️ [PWA] Algunos assets no pudieron ser precargados:', err)
      })
    })
  )
  self.skipWaiting()
})

// Activación: Limpieza de versiones obsoletas
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('🧹 [PWA] Eliminando caché antigua:', key)
            return caches.delete(key)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Interceptación de peticiones (Fetch)
self.addEventListener('fetch', (evento) => {
  const url = new URL(evento.request.url)

  // 1. Ignorar llamadas a APIs de backend o websockets
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/auth') || url.pathname.startsWith('/projects') || url.port === '8000') {
    return
  }

  // 2. Estrategia CacheFirst para fuentes, iconos e imágenes estáticas
  if (
    evento.request.destination === 'font' ||
    evento.request.destination === 'image' ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2')
  ) {
    evento.respondWith(
      caches.match(evento.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse

        return fetch(evento.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone()
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(evento.request, responseToCache)
              })
            }
            return networkResponse
          })
          .catch(() => cachedResponse)
      })
    )
    return
  }

  // 3. Estrategia NetworkFirst para HTML y bundles JS con fallback a caché
  evento.respondWith(
    fetch(evento.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(evento.request, responseToCache)
          })
        }
        return networkResponse
      })
      .catch(() => {
        return caches.match(evento.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse
          if (evento.request.destination === 'document') {
            return caches.match('/index.html')
          }
        })
      })
  )
})
