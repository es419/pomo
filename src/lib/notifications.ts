import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { deleteToken, getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging'
import { app, auth, db } from './firebase'

const ENABLED_KEY = 'pomo-weekly-notifications-enabled'
const DEVICE_DOC_KEY = 'pomo-weekly-notification-device-doc'
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY?.trim() ?? ''
const DEFAULT_STATS_URL = '/pomo/?tab=stats&period=week&source=weekly-notification'

let foregroundListenerReady = false

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
}

async function tokenHash(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

async function getServiceWorkerRegistration() {
  if (!('serviceWorker' in navigator)) throw new Error('הדפדפן לא תומך בהתראות של Pomo')
  return navigator.serviceWorker.ready
}

async function saveDevice(token: string) {
  const user = auth.currentUser
  if (!user) throw new Error('צריך להיות מחובר כדי להפעיל התראות')

  const hash = await tokenHash(token)
  const deviceDocId = `${user.uid}_${hash.slice(0, 40)}`
  const previousDocId = localStorage.getItem(DEVICE_DOC_KEY)

  if (previousDocId && previousDocId !== deviceDocId) {
    await deleteDoc(doc(db, 'notificationDevices', previousDocId)).catch(() => undefined)
  }

  await setDoc(doc(db, 'notificationDevices', deviceDocId), {
    userId: user.uid,
    token,
    enabled: true,
    platform: isIos() ? 'ios-web' : 'web',
    userAgent: navigator.userAgent.slice(0, 300),
    updatedAt: serverTimestamp()
  }, { merge: true })

  localStorage.setItem(DEVICE_DOC_KEY, deviceDocId)
  localStorage.setItem(ENABLED_KEY, 'true')
}

async function ensureForegroundListener() {
  if (foregroundListenerReady || !(await isSupported())) return
  foregroundListenerReady = true

  const messaging = getMessaging(app)
  onMessage(messaging, async payload => {
    const registration = await getServiceWorkerRegistration()
    const title = payload.data?.title || 'Pomo'
    const body = payload.data?.body || 'הסיכום השבועי שלך מוכן'
    const url = payload.data?.url || DEFAULT_STATS_URL

    await registration.showNotification(title, {
      body,
      icon: '/pomo/pwa-192x192.png',
      badge: '/pomo/pwa-192x192.png',
      tag: 'pomo-weekly-summary',
      data: { url }
    })
  })
}

export async function getNotificationCapability() {
  const supported = typeof Notification !== 'undefined' && await isSupported().catch(() => false)
  const permission = typeof Notification === 'undefined' ? 'default' : Notification.permission
  return {
    supported,
    configured: Boolean(VAPID_KEY),
    permission,
    enabled: localStorage.getItem(ENABLED_KEY) === 'true' && permission === 'granted',
    needsHomeScreen: supported && isIos() && !isStandalone()
  }
}

export async function enableWeeklyNotifications() {
  if (!(await isSupported())) throw new Error('הדפדפן הזה לא תומך בהתראות Web Push')
  if (!VAPID_KEY) throw new Error('חסר מפתח Web Push בהגדרות של Pomo')
  if (isIos() && !isStandalone()) throw new Error('באייפון צריך קודם להוסיף את Pomo למסך הבית ולפתוח אותה משם')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('לא ניתנה הרשאה להתראות')

  const registration = await getServiceWorkerRegistration()
  const messaging = getMessaging(app)
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration
  })

  if (!token) throw new Error('לא הצלחנו לרשום את המכשיר להתראות')

  await saveDevice(token)
  await ensureForegroundListener()
}

export async function disableWeeklyNotifications() {
  const deviceDocId = localStorage.getItem(DEVICE_DOC_KEY)
  if (deviceDocId) await deleteDoc(doc(db, 'notificationDevices', deviceDocId)).catch(() => undefined)

  if (await isSupported().catch(() => false)) {
    await deleteToken(getMessaging(app)).catch(() => false)
  }

  localStorage.removeItem(DEVICE_DOC_KEY)
  localStorage.removeItem(ENABLED_KEY)
}

export async function refreshWeeklyNotificationsRegistration() {
  if (localStorage.getItem(ENABLED_KEY) !== 'true') return
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  if (!(await isSupported().catch(() => false)) || !VAPID_KEY) return

  try {
    const registration = await getServiceWorkerRegistration()
    const messaging = getMessaging(app)
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    })
    if (token) await saveDevice(token)
    await ensureForegroundListener()
  } catch {
    // A stale registration should never block the rest of the app.
  }
}
