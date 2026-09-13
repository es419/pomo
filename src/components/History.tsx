import type { FocusSession, Project, Task } from '../types'
import { formatDuration } from '../lib/time'

type HistoryProps = {
  sessions: FocusSession[]
  tasks: Task[]
  projects: Project[]
  onDelete: (sessionId: string) => Promise<void>
}

export function History({ sessions, tasks, projects, onDelete }: HistoryProps) {
  const taskMap = new Map(tasks.map(t => [t.id, t]))
  const projectMap = new Map(projects.map(p => [p.id, p]))

  async function handleDelete(session: FocusSession) {
    const task = taskMap.get(session.task_id)
    const confirmed = window.confirm(
      `למחוק את זמן העבודה${task?.title ? ` של “${task.title}”` : ''}?\n\nהמחיקה תעדכן גם את הגרפים והסטטיסטיקות.`
    )
    if (!confirmed) return
    await onDelete(session.id)
  }

  return (
    <section className="card">
      <div className="section-head">
        <div><div className="eyebrow">HISTORY</div><h2>עבודות אחרונות</h2></div>
        <span className="muted">{sessions.length} sessions</span>
      </div>
      {sessions.length === 0 ? <p className="muted">עוד אין sessions שהושלמו.</p> : (
        <div className="history-list">
          {sessions.slice(0, 20).map(session => {
            const task = taskMap.get(session.task_id)
            const project = session.project_id ? projectMap.get(session.project_id) : undefined
            const start = new Date(session.started_at)
            const end = session.ended_at ? new Date(session.ended_at) : null
            return (
              <div className="history-row" key={session.id}>
                <div className="history-main">
                  <strong>{task?.title ?? 'משימה שנמחקה'}</strong>
                  <div className="muted row-meta">
                    {project?.name ? `${project.name} · ` : ''}
                    {new Intl.DateTimeFormat('he-IL', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(start)} · {new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' }).format(start)}{end ? `–${new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' }).format(end)}` : ''}
                  </div>
                </div>
                <div className="history-actions">
                  <div className="history-duration">{formatDuration(session.duration_seconds ?? 0, false)}</div>
                  <button
                    className="danger-link"
                    type="button"
                    aria-label="מחיקת זמן עבודה"
                    onClick={() => void handleDelete(session)}
                  >
                    מחק
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
