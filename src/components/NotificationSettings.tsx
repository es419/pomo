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
  const [open, setOpen] = useState(false)

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
    <div className="notification-settings">
      <button
        className={state.enabled ? 'notification-trigger active' : 'notification-trigger'}
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-label="הגדרות סיכום שבועי"
      >
        <svg className="notification-bell" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
        <span>{state.enabled ? 'סיכום שבועי פעיל' : 'סיכום שבועי'}</span>
        <svg className={open ? 'notification-chevron open' : 'notification-chevron'} viewBox="0 0 20 20" aria-hidden="true">
          <path d="m5 7.5 5 5 5-5" />
        </svg>
      </button>

      {open && (
        <section className="notification-popover" aria-label="הגדרות סיכום שבועי">
          <div className="notification-popover-head">
            <div>
              <div className="eyebrow">WEEKLY SUMMARY</div>
              <h3>סיכום שבועי בהתראה</h3>
            </div>
            <button className="notification-close" type="button" onClick={() => setOpen(false)} aria-label="סגור">×</button>
          </div>

          <p className="muted">
            בכל שבת ב־20:00 תקבל סיכום זמן והפרויקטים המובילים. לחיצה על ההתראה תפתח ישר את הסטטיסטיקות השבועיות.
          </p>

          {state.needsHomeScreen && <p className="notification-hint">באייפון: יש להוסיף את Pomo למסך הבית ולפתוח אותה משם כדי להפעיל Web Push.</p>}
          {blocked && <p className="notification-hint">ההתראות חסומות כרגע בהגדרות הדפדפן/המכשיר.</p>}
          {!state.configured && <p className="notification-hint">החיבור ל־Web Push עדיין לא הוגדר בפריסה.</p>}
          {message && <p className="notification-status" role="status">{message}</p>}

          <button
            className={state.enabled ? 'notification-toggle active' : 'notification-toggle'}
            type="button"
            disabled={busy || unavailable || blocked || state.needsHomeScreen}
            onClick={() => void toggle()}
            aria-pressed={state.enabled}
          >
            <span className="notification-toggle-dot" />
            <span>{busy ? 'מעדכן…' : state.enabled ? 'פעיל — לחץ לכיבוי' : 'הפעל התראות'}</span>
          </button>
        </section>
      )}
    </div>
  )
}
