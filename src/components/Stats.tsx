import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { FocusSession, Project, StatsPeriod, Task } from '../types'
import { formatDuration, localDateKey, startOfMonth, startOfWeek } from '../lib/time'

export function Stats({ sessions, tasks, projects, initialPeriod = 'week' }: { sessions: FocusSession[]; tasks: Task[]; projects: Project[]; initialPeriod?: StatsPeriod }) {
  const [period, setPeriod] = useState<StatsPeriod>(initialPeriod)

  const filtered = useMemo(() => {
    const now = new Date()
    let start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (period === 'week') start = startOfWeek(now)
    if (period === 'month') start = startOfMonth(now)
    return sessions.filter(s => new Date(s.started_at) >= start)
  }, [sessions, period])

  const total = filtered.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0)
  const avg = filtered.length ? Math.round(total / filtered.length) : 0

  const chartData = useMemo(() => {
    const count = period === 'day' ? 1 : period === 'week' ? 7 : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    const start = period === 'day' ? new Date() : period === 'week' ? startOfWeek() : startOfMonth()
    start.setHours(0, 0, 0, 0)
    const rows = Array.from({ length: count }, (_, i) => {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      return {
        key: localDateKey(d),
        label: period === 'month' ? String(d.getDate()) : new Intl.DateTimeFormat('he-IL', { weekday: 'short' }).format(d),
        seconds: 0
      }
    })
    const map = new Map(rows.map(r => [r.key, r]))
    filtered.forEach(s => {
      const row = map.get(localDateKey(s.started_at))
      if (row) row.seconds += s.duration_seconds ?? 0
    })
    return rows
  }, [filtered, period])

  const byTask = useMemo(() => {
    const totals = new Map<string, number>()
    filtered.forEach(s => totals.set(s.task_id, (totals.get(s.task_id) ?? 0) + (s.duration_seconds ?? 0)))
    return [...totals.entries()].map(([id, seconds]) => ({
      id,
      name: tasks.find(t => t.id === id)?.title ?? 'משימה שנמחקה',
      seconds
    })).sort((a, b) => b.seconds - a.seconds).slice(0, 6)
  }, [filtered, tasks])

  const byProject = useMemo(() => {
    const totals = new Map<string, number>()
    filtered.forEach(s => {
      const key = s.project_id ?? 'none'
      totals.set(key, (totals.get(key) ?? 0) + (s.duration_seconds ?? 0))
    })
    return [...totals.entries()].map(([id, seconds]) => ({
      id,
      name: id === 'none' ? 'ללא פרויקט' : projects.find(p => p.id === id)?.name ?? 'פרויקט שנמחק',
      seconds
    })).sort((a, b) => b.seconds - a.seconds).slice(0, 5)
  }, [filtered, projects])

  return (
    <section className="card">
      <div className="section-head">
        <div><div className="eyebrow">ANALYTICS</div><h2>סטטיסטיקות</h2></div>
        <div className="period-tabs">
          <button className={period === 'day' ? 'active' : ''} onClick={() => setPeriod('day')}>היום</button>
          <button className={period === 'week' ? 'active' : ''} onClick={() => setPeriod('week')}>שבוע</button>
          <button className={period === 'month' ? 'active' : ''} onClick={() => setPeriod('month')}>חודש</button>
        </div>
      </div>

      <div className="stat-grid">
        <div><span className="muted">זמן עבודה</span><strong>{formatDuration(total, false)}</strong></div>
        <div><span className="muted">Sessions</span><strong>{filtered.length}</strong></div>
        <div><span className="muted">ממוצע</span><strong>{formatDuration(avg, false)}</strong></div>
      </div>

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.18} />
            <XAxis dataKey="label" />
            <YAxis tickFormatter={(v) => `${Math.round(v / 3600)}ש`} width={34} />
            <Tooltip formatter={(v) => formatDuration(Number(v), false)} />
            <Bar dataKey="seconds" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="split-lists">
        <div>
          <h3>לפי משימה</h3>
          {byTask.length === 0 ? <p className="muted">אין נתונים</p> : byTask.map(row => <div className="rank-row" key={row.id}><span>{row.name}</span><strong>{formatDuration(row.seconds, false)}</strong></div>)}
        </div>
        <div>
          <h3>לפי פרויקט</h3>
          {byProject.length === 0 ? <p className="muted">אין נתונים</p> : byProject.map(row => <div className="rank-row" key={row.id}><span>{row.name}</span><strong>{formatDuration(row.seconds, false)}</strong></div>)}
        </div>
      </div>
    </section>
  )
}
