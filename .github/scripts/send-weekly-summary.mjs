import { sign } from 'node:crypto'

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'pomo-f1093'
const TIME_ZONE = 'Asia/Jerusalem'
const APP_URL = process.env.POMO_APP_URL || 'https://es419.github.io/pomo/'
const SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT_JSON

if (!SERVICE_ACCOUNT_JSON) {
  throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON secret')
}

const serviceAccount = JSON.parse(SERVICE_ACCOUNT_JSON)

function base64url(input) {
  return Buffer.from(input).toString('base64url')
}

async function getGoogleAccessToken() {
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }))
  const unsigned = `${header}.${payload}`
  const signature = sign('RSA-SHA256', Buffer.from(unsigned), serviceAccount.private_key).toString('base64url')
  const assertion = `${unsigned}.${signature}`

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion
  })

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body
  })

  if (!response.ok) throw new Error(`OAuth failed: ${response.status} ${await response.text()}`)
  const json = await response.json()
  return json.access_token
}

function decodeValue(value = {}) {
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return Number(value.doubleValue)
  if ('booleanValue' in value) return Boolean(value.booleanValue)
  if ('timestampValue' in value) return value.timestampValue
  if ('nullValue' in value) return null
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeValue)
  if ('mapValue' in value) return decodeFields(value.mapValue.fields || {})
  return undefined
}

function decodeFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]))
}

function decodeDocument(document) {
  return {
    name: document.name,
    id: document.name.split('/').pop(),
    ...decodeFields(document.fields || {})
  }
}

async function runQuery(accessToken, collectionId, userId) {
  const structuredQuery = { from: [{ collectionId }] }
  if (userId) {
    structuredQuery.where = {
      fieldFilter: {
        field: { fieldPath: 'userId' },
        op: 'EQUAL',
        value: { stringValue: userId }
      }
    }
  }

  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ structuredQuery })
    }
  )

  if (!response.ok) throw new Error(`Firestore query failed: ${response.status} ${await response.text()}`)
  const rows = await response.json()
  return rows.filter(row => row.document).map(row => decodeDocument(row.document))
}

function dateKeyInTimeZone(value) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date(value))
  const map = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${map.year}-${map.month}-${map.day}`
}

function currentWeekStartKey() {
  const now = new Date()
  const todayKey = dateKeyInTimeZone(now)
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, weekday: 'short' }).format(now)
  const weekdayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday)
  const anchor = new Date(`${todayKey}T12:00:00Z`)
  anchor.setUTCDate(anchor.getUTCDate() - Math.max(weekdayIndex, 0))
  return anchor.toISOString().slice(0, 10)
}

function formatDuration(seconds) {
  const safe = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  return hours > 0 ? `${hours} ש׳ ${minutes} דק׳` : `${minutes} דק׳`
}

function compactName(name, maxLength = 16) {
  const text = String(name || 'ללא פרויקט').trim() || 'ללא פרויקט'
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text
}

function buildSummary(sessions, projects) {
  const weekStart = currentWeekStartKey()
  const today = dateKeyInTimeZone(new Date())
  const projectNames = new Map(projects.map(project => [project.id, project.name]))

  const weekly = sessions.filter(session => {
    if (session.status !== 'completed' || !session.started_at) return false
    const key = dateKeyInTimeZone(session.started_at)
    return key >= weekStart && key <= today
  })

  const totalSeconds = weekly.reduce((sum, session) => sum + Number(session.duration_seconds || 0), 0)
  const projectTotals = new Map()

  for (const session of weekly) {
    const projectId = session.project_id || 'none'
    projectTotals.set(projectId, (projectTotals.get(projectId) || 0) + Number(session.duration_seconds || 0))
  }

  const projectsByTime = [...projectTotals.entries()]
    .map(([id, seconds]) => ({
      id,
      name: id === 'none' ? 'ללא פרויקט' : projectNames.get(id) || 'פרויקט שנמחק',
      seconds
    }))
    .sort((a, b) => b.seconds - a.seconds)

  if (totalSeconds <= 0) {
    return {
      totalSeconds: 0,
      body: 'השבוע לא נרשם זמן פוקוס. לחיצה תפתח את הסטטיסטיקות.'
    }
  }

  const breakdown = projectsByTime.slice(0, 3).map(project => {
    const percentage = Math.round((project.seconds / totalSeconds) * 100)
    return `${compactName(project.name)} ${percentage}%`
  })

  return {
    totalSeconds,
    body: `${formatDuration(totalSeconds)}${breakdown.length ? ` • ${breakdown.join(' • ')}` : ''}`
  }
}

function statsUrl() {
  const url = new URL(APP_URL)
  url.searchParams.set('tab', 'stats')
  url.searchParams.set('period', 'week')
  url.searchParams.set('source', 'weekly-notification')
  return url.href
}

async function sendPush(accessToken, token, summary) {
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      message: {
        token,
        data: {
          title: '📊 הסיכום השבועי שלך',
          body: summary.body,
          url: statsUrl(),
          kind: 'weekly-summary'
        },
        webpush: {
          headers: {
            Urgency: 'normal',
            TTL: '86400'
          }
        }
      }
    })
  })

  const text = await response.text()
  if (!response.ok) return { ok: false, status: response.status, body: text }
  return { ok: true, status: response.status, body: text }
}

async function deleteDevice(accessToken, documentName) {
  const response = await fetch(`https://firestore.googleapis.com/v1/${documentName}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${accessToken}` }
  })
  return response.ok || response.status === 404
}

function looksLikeDeadRegistration(result) {
  if (result.ok) return false
  return result.status === 404 || /UNREGISTERED|registration-token-not-registered|NOT_FOUND/i.test(result.body)
}

const accessToken = await getGoogleAccessToken()
const devices = (await runQuery(accessToken, 'notificationDevices')).filter(device => device.enabled && device.userId && device.token)
const byUser = new Map()

for (const device of devices) {
  if (!byUser.has(device.userId)) byUser.set(device.userId, [])
  byUser.get(device.userId).push(device)
}

let sent = 0
let failed = 0

for (const [userId, userDevices] of byUser.entries()) {
  const [sessions, projects] = await Promise.all([
    runQuery(accessToken, 'focusSessions', userId),
    runQuery(accessToken, 'projects', userId)
  ])
  const summary = buildSummary(sessions, projects)

  for (const device of userDevices) {
    const result = await sendPush(accessToken, device.token, summary)
    if (result.ok) {
      sent += 1
      continue
    }

    failed += 1
    console.error(`Push failed for ${device.id}: ${result.status} ${result.body}`)
    if (looksLikeDeadRegistration(result)) {
      await deleteDevice(accessToken, device.name)
    }
  }
}

console.log(`Weekly Pomo summary complete. Users: ${byUser.size}, sent: ${sent}, failed: ${failed}`)
