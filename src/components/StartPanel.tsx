import { useEffect, useState } from 'react'
import type { Project, Task } from '../types'

export function StartPanel({ tasks, projects, onStart }: {
  tasks: Task[]
  projects: Project[]
  onStart: (args: { taskId: string; mode: 'fixed' | 'open'; plannedSeconds: number | null }) => void
}) {
  const [taskId, setTaskId] = useState(tasks[0]?.id ?? '')
  const [mode, setMode] = useState<'fixed' | 'open'>('open')
  const [minutes, setMinutes] = useState(45)
  const [custom, setCustom] = useState('')

  useEffect(() => {
    if (!tasks.some(t => t.id === taskId)) setTaskId(tasks[0]?.id ?? '')
  }, [tasks, taskId])

  const projectName = (id: string | null) => projects.find(p => p.id === id)?.name
  const effectiveMinutes = custom ? Math.max(1, Number(custom) || 1) : minutes

  return (
    <section className="card hero-card">
      <div className="eyebrow">FOCUS</div>
      <h2>על מה עובדים עכשיו?</h2>
      <select value={taskId} onChange={(e) => setTaskId(e.target.value)}>
        {tasks.map(task => (
          <option key={task.id} value={task.id}>
            {projectName(task.project_id) ? `${projectName(task.project_id)} · ` : ''}{task.title}
          </option>
        ))}
      </select>

      <div className="segmented">
        <button type="button" className={mode === 'open' ? 'active' : ''} onClick={() => setMode('open')}>לזרום</button>
        <button type="button" className={mode === 'fixed' ? 'active' : ''} onClick={() => setMode('fixed')}>זמן מוגדר</button>
      </div>

      {mode === 'fixed' && (
        <>
          <div className="chips">
            {[25, 45, 60, 90].map(value => (
              <button type="button" key={value} className={!custom && minutes === value ? 'active' : ''} onClick={() => { setMinutes(value); setCustom('') }}>{value} דק׳</button>
            ))}
          </div>
          <input inputMode="numeric" min="1" type="number" value={custom} onChange={e => setCustom(e.target.value)} placeholder="או זמן מותאם בדקות" />
        </>
      )}

      <button className="primary start-button" disabled={!taskId} onClick={() => onStart({
        taskId,
        mode,
        plannedSeconds: mode === 'fixed' ? effectiveMinutes * 60 : null
      })}>התחל עבודה</button>
    </section>
  )
}
