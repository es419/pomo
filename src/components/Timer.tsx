import { useEffect, useMemo, useState } from 'react'
import type { FocusSession, Project, Task } from '../types'
import { formatDuration, secondsBetween } from '../lib/time'

export function Timer({ session, task, project, onStop }: {
  session: FocusSession
  task?: Task
  project?: Project
  onStop: () => void
}) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const elapsed = secondsBetween(session.started_at, now)
  const remaining = useMemo(() => {
    if (session.mode !== 'fixed' || !session.planned_seconds) return null
    return session.planned_seconds - elapsed
  }, [elapsed, session])

  return (
    <section className="card timer-card">
      <div className="eyebrow">עובד עכשיו</div>
      {project && <div className="project-pill">{project.name}</div>}
      <h2 className="timer-task">{task?.title ?? 'משימה'}</h2>
      {remaining === null ? (
        <div className="timer">{formatDuration(elapsed)}</div>
      ) : remaining >= 0 ? (
        <>
          <div className="timer">{formatDuration(remaining)}</div>
          <div className="muted">עבדת {formatDuration(elapsed)}</div>
        </>
      ) : (
        <>
          <div className="timer">+{formatDuration(Math.abs(remaining))}</div>
          <div className="muted">מעבר ליעד · סה״כ {formatDuration(elapsed)}</div>
        </>
      )}
      <div className="started-at">התחלה: {new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' }).format(new Date(session.started_at))}</div>
      <button className="stop" onClick={onStop}>סיום עבודה</button>
    </section>
  )
}
