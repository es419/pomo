/// <reference lib="webworker" />
import { initializeApp } from 'firebase/app'
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw'
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

const firebaseConfig = {
  apiKey: 'AIzaSyCwQwhDSWovCW-014xIqh8w61XMxTU5Fzk',
  authDomain: 'pomo-f1093.firebaseapp.com',
  projectId: 'pomo-f1093',
  storageBucket: 'pomo-f1093.firebasestorage.app',
  messagingSenderId: '1072582087109',
  appId: '1:1072582087109:web:466d89293400be2161fbac'
}

const WEEKLY_STATS_PATH = '/pomo/?tab=stats&period=week&source=weekly-notification'

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

const firebaseApp = initializeApp(firebaseConfig)
const messaging = getMessaging(firebaseApp)

onBackgroundMessage(messaging, payload => {
  const title = payload.data?.title || 'Pomo'
  const body = payload.data?.body || 'הסיכום השבועי שלך מוכן'
  const url = payload.data?.url || WEEKLY_STATS_PATH

  return self.registration.showNotification(title, {
    body,
    icon: '/pomo/pwa-192x192-v8.png',
    badge: '/pomo/pwa-192x192-v8.png',
    tag: 'pomo-weekly-summary',
    renotify: true,
    dir: 'rtl',
    lang: 'he',
    data: { url }
  })
})

self.addEventListener('notificationclick', event => {
  event.notification.close()

  const requestedUrl = event.notification.data?.url || WEEKLY_STATS_PATH
  const targetUrl = new URL(requestedUrl, self.location.origin).href

  event.waitUntil((async () => {
    const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })

    for (const client of windowClients) {
      if ('navigate' in client) await client.navigate(targetUrl)
      if ('focus' in client) await client.focus()
      return
    }

    await self.clients.openWindow(targetUrl)
  })())
})
