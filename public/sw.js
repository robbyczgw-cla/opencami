/**
 * OpenCami Service Worker
 * Provides offline caching and PWA support.
 *
 * Strategies:
 * - Cache-first for static assets (images, fonts)
 * - StaleWhileRevalidate for JS/CSS bundles
 * - Network-first for API calls
 * - Network-only for WebSocket connections
 * - Network-first for navigation (HTML pages)
 */

const CACHE_NAME = 'opencami-v2'
const STATIC_CACHE = 'opencami-static-v2'
const API_CACHE = 'opencami-api-v2'

// Assets to precache on install
const PRECACHE_URLS = [
  '/',
  '/favicon.svg',
  '/manifest.json',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon-180x180.png',
]

// Install: precache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, STATIC_CACHE, API_CACHE]
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => !currentCaches.includes(name))
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  )
})

// Helper: is this a static asset request?
function isStaticAsset(url) {
  return /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|eot)$/i.test(url.pathname)
}

// Helper: is this a JS/CSS bundle?
function isBundle(url) {
  return /\.(?:js|css)$/i.test(url.pathname) && url.pathname.includes('/assets/')
}

// Helper: is this an API call?
function isApiCall(url) {
  return url.pathname.startsWith('/api/')
}

// Helper: is this a WebSocket request?
function isWebSocket(request) {
  return request.headers.get('Upgrade') === 'websocket'
}

// Helper: is this a navigation request?
function isNavigation(request) {
  return request.mode === 'navigate'
}

// Fetch handler with strategy routing
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Skip non-HTTP(S) requests
  if (!url.protocol.startsWith('http')) return

  // Network-only for WebSocket upgrade requests
  if (isWebSocket(event.request)) return

  // Cache-first for static assets
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached
          return fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone())
            }
            return response
          })
        })
      )
    )
    return
  }

  // Cache-first for hashed JS/CSS bundles (Vite adds content hashes)
  if (isBundle(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached
          return fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone())
            }
            return response
          })
        })
      )
    )
    return
  }

  // Network-only for SSE streams (never cache — cloning a stream breaks it)
  if (url.pathname === '/api/stream') {
    event.respondWith(fetch(event.request))
    return
  }

  // Network-first for API calls
  if (isApiCall(url)) {
    event.respondWith(
      caches.open(API_CACHE).then((cache) =>
        fetch(event.request)
          .then((response) => {
            // Never cache streaming/SSE responses
            const ct = response.headers.get('content-type') || ''
            if (response.ok && !ct.includes('event-stream')) {
              cache.put(event.request, response.clone())
            }
            return response
          })
          .catch(() => cache.match(event.request))
      )
    )
    return
  }

  // Network-first for navigation (HTML pages)
  if (isNavigation(event.request)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        fetch(event.request)
          .then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone())
            }
            return response
          })
          .catch(() => cache.match(event.request) || cache.match('/'))
      )
    )
    return
  }
})

// Listen for skip waiting message from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
