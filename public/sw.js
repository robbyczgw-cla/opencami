// Service worker disabled — unregister self immediately
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', () => {
  self.registration.unregister()
  self.clients.matchAll().then(clients => clients.forEach(c => c.navigate(c.url)))
})
