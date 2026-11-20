// Офлайн-кэш: сеть в приоритете для страницы, кэш — для статики. Версия меняется при каждой сборке.
const CACHE = 'oliva-__BUILD__'
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'])))
  self.skipWaiting()
})
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url)
  if (e.request.method !== 'GET' || u.origin !== location.origin) return
  // файл версии — всегда из сети, иначе обновление не заметить
  if (u.pathname.endsWith('/version.json')) return
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put('./index.html', c)); return r }).catch(() => caches.match('./index.html')))
    return
  }
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => {
      if (r.ok) { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)) }
      return r
    })),
  )
})

// Push-уведомления
self.addEventListener('push', (e) => {
  let d = {}
  try {
    d = e.data ? e.data.json() : {}
  } catch {
    d = { title: 'Олива', body: e.data ? e.data.text() : '' }
  }
  e.waitUntil(
    self.registration.showNotification(d.title || 'Олива', {
      body: d.body || '',
      tag: d.tag || undefined,
      icon: './icon-192.png',
      badge: './icon-192.png',
      data: { url: d.url || './' },
    }),
  )
})
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = new URL(e.notification.data?.url || './', self.registration.scope).href
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.registration.scope)) {
          c.postMessage({ type: 'open', url })
          return c.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})

// приложение просит включить новую версию сразу
self.addEventListener('message', (e) => {
  if (e.data?.type === 'skip-waiting') self.skipWaiting()
})
