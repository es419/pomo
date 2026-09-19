import { useEffect, useState } from 'react'
import {
  disableWeeklyNotifications,
  enableWeeklyNotifications,
  getNotificationCapability
} from '../lib/notifications'

type Capability = Awaited<ReturnType<typeof getNotificationCapability>>

export function NotificationSettings() {
  const [state, setState] = useState<Capability | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function refresh() {
    setState(await getNotificationCapability())
  }

  useEffect(() => { void refresh() }, [])

  async function toggle() {
    if (!state || busy) return
    setBusy(true)
    setMessage('')
    try {
      if (state.enabled) {
        await disableWeeklyNotifications()
        setMessage('ההתראה השבועית כובתה במכשיר הזה.')
      } else {
        await enableWeeklyNotifications()
        setMessage('מעולה. הסיכום השבועי יגיע בשבת ב־20:00.')
      }
      await refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'לא הצלחנו לעדכן את ההתראות')
    } finally {
      setBusy(false)
    }
  }

  if (!state) return null

  const blocked = state.permission === 'denied'
  const unavailable = !state.supported || !state.configured

  return (
    <section className="card notification-card">
      <div className="notification-copy">
        <div className="eyebrow">WEEKLY SUMMARY</div>
        <h2>סיכום שבועי בהתראה</h2>
        <p className="muted">
          בכל שבת ב־20:00 תקבל סיכום זמן וההתפלגות המובילה לפי הפרויקטים שלך.
          לחיצה על ההתראה תפתח ישר את הסטטיסטיקות השבועיות.
        </p>
        {state.needsHomeScreen && <p className="notification-hint">באייפון: יש להוסיף את Pomo למסך הבית ולפתוח אותה משם כדי להפעיל Web Push.</p>}
        {blocked && <p className="notification-hint">ההתראות חסומות כרגע בהגדרות הדפדפן/המכשיר.</p>}
        {!state.configured && <p className="notification-hint">החיבור ל־Web Push עדיין לא הוגדר בפריסה.</p>}
        {message && <p className="notification-status" role="status">{message}</p>}
      </div>

      <button
        className={state.enabled ? 'notification-toggle active' : 'notification-toggle'}
        type="button"
        disabled={busy || unavailable || blocked || state.needsHomeScreen}
        onClick={() => void toggle()}
        aria-pressed={state.enabled}
      >
        <span className="notification-toggle-dot" />
        <span>{busy ? 'מעדכן…' : state.enabled ? 'פעיל' : 'הפעל התראות'}</span>
      </button>
    </section>
  )
}
