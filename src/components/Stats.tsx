import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { FocusSession, Project, StatsPeriod, Task } from '../types'
import { formatDuration, localDateKey, startOfMonth, startOfWeek } from '../lib/time'

const WEEKDAY_LABELS = ['יום א׳', 'יום ב׳', 'יום ג׳', 'יום ד׳', 'יום ה׳', 'יום ו׳', 'יום ש׳']

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
        label: period === 'month'
          ? String(d.getDate())
          : period === 'week'
            ? WEEKDAY_LABELS[d.getDay()]
            : 'היום',
        seconds: 0
      }
    })
    const map = new Map(rows.map(r => [r.key, r]))
    filtered.forEach(s => {
      const row = map.get(localDateKey(s.started_at))
      if (row) row.seconds += s.duration_seconds ?? 0
    })
    // Recharts lays categories out left-to-right. For a Hebrew weekly view,
    // reverse only the presentation order so Sunday is the rightmost tick.
    return period === 'week' ? [...rows].reverse() : rows
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

      <div className="chart-shell">
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 6, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="statsBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={1} />
                  <stop offset="100%" stopColor="var(--accent-soft)" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border-soft)" strokeDasharray="4 8" vertical={false} />
              <XAxis
                dataKey="label"
                interval={0}
                tickMargin={10}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--muted)', fontSize: 12, fontWeight: 750 }}
              />
              <YAxis
                tickFormatter={(v) => `${Math.round(v / 3600)}ש`}
                width={34}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--faint)', fontSize: 11 }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(125,211,252,.06)' }}
                formatter={(v) => [formatDuration(Number(v), false), 'זמן עבודה']}
                contentStyle={{
                  background: 'var(--surface-solid)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: '14px',
                  boxShadow: '0 12px 32px var(--shadow)',
                  color: 'var(--text)'
                }}
                labelStyle={{ color: 'var(--text-soft)', fontWeight: 800, marginBottom: 4 }}
              />
              <Bar
                dataKey="seconds"
                fill="url(#statsBarGradient)"
                radius={[9, 9, 5, 5]}
                maxBarSize={36}
                minPointSize={3}
                animationDuration={450}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
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
