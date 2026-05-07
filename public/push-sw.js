self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload = {}
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Notifikácia', body: event.data.text() }
  }

  const title = payload.title || 'Notifikácia'
  const options = {
    body: payload.body || '',
    tag: payload.tag || 'catshow-notification',
    data: {
      ...(payload.data || {}),
      url: payload.url || payload?.data?.url || '/',
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetPath = event.notification?.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.focus()
          if ('navigate' in client && targetPath) {
            return client.navigate(targetPath)
          }
          return client
        }
      }
      return self.clients.openWindow(targetPath)
    }),
  )
})
