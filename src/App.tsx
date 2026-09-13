import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { collection, getDocs, query, where } from 'firebase/firestore'
import './styles.css'
import { auth, db } from './lib/firebase'
import { deleteFocusSession, getRunningSession, startSession, stopSession } from './lib/sessions'
import type { FocusSession, Project, Task } from './types'
import { Timer } from './components/Timer'
import { StartPanel } from './components/StartPanel'
import { Stats } from './components/Stats'
import { History } from './components/History'
import { Auth } from './components/Auth'
import { TaskCreator } from './components/TaskCreator'
import { ProjectCreator } from './components/ProjectCreator'

function projectFromDoc(id: string, data: Record<string, unknown>): Project {
  return {
    id,
    name: String(data.name ?? ''),
    color: data.color == null ? null : String(data.color),
    created_at: data.created_at == null ? undefined : String(data.created_at)
  }
}

function taskFromDoc(id: string, data: Record<string, unknown>): Task {
  return {
    id,
    project_id: data.project_id == null ? null : String(data.project_id),
    title: String(data.title ?? ''),
    completed: Boolean(data.completed),
    created_at: data.created_at == null ? undefined : String(data.created_at)
  }
}

function sessionFromDoc(id: string, data: Record<string, unknown>): FocusSession {
  return {
    id,
    task_id: String(data.task_id ?? ''),
    project_id: data.project_id == null ? null : String(data.project_id),
    mode: data.mode === 'fixed' ? 'fixed' : 'open',
    planned_seconds: typeof data.planned_seconds === 'number' ? data.planned_seconds : null,
    started_at: String(data.started_at ?? ''),
    ended_at: data.ended_at == null ? null : String(data.ended_at),
    duration_seconds: typeof data.duration_seconds === 'number' ? data.duration_seconds : null,
    status: data.status === 'completed' ? 'completed' : data.status === 'cancelled' ? 'cancelled' : 'running'
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [running, setRunning] = useState<FocusSession | null>(null)
  const [history, setHistory] = useState<FocusSession[]>([])
  const [error, setError] = useState('')

  useEffect(() => onAuthStateChanged(auth, nextUser => {
    setUser(nextUser)
    setAuthReady(true)
  }), [])

  async function refresh() {
    if (!user) return
    try {
      setError('')
      const [projectSnap, taskSnap, sessionSnap, current] = await Promise.all([
        getDocs(query(collection(db, 'projects'), where('userId', '==', user.uid))),
        getDocs(query(collection(db, 'tasks'), where('userId', '==', user.uid))),
        getDocs(query(collection(db, 'focusSessions'), where('userId', '==', user.uid))),
        getRunningSession()
      ])

      const nextProjects = projectSnap.docs
        .map(d => projectFromDoc(d.id, d.data()))
        .sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))
      const nextTasks = taskSnap.docs
        .map(d => taskFromDoc(d.id, d.data()))
        .sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))
      const historyStart = new Date()
      historyStart.setFullYear(historyStart.getFullYear() - 1)
      const nextHistory = sessionSnap.docs
        .map(d => sessionFromDoc(d.id, d.data()))
        .filter(s => s.status === 'completed' && new Date(s.started_at) >= historyStart)
        .sort((a, b) => b.started_at.localeCompare(a.started_at))

      setProjects(nextProjects)
      setTasks(nextTasks)
      setHistory(nextHistory)
      setRunning(current)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה לא צפויה')
    }
  }

  useEffect(() => { void refresh() }, [user])

  if (!authReady) return null
  if (!user) return <Auth />

  const activeTasks = tasks.filter(t => !t.completed)
  const runningTask = running ? tasks.find(t => t.id === running.task_id) : undefined
  const runningProject = running?.project_id ? projects.find(p => p.id === running.project_id) : undefined

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">POMO</div>
          <h1>הזמן שלך. באמת.</h1>
          <p className="header-copy">בחר משימה, תתחיל לעבוד — ופומו כבר תזכור את כל השאר.</p>
        </div>
        <button className="link-button" onClick={() => void signOut(auth)}>יציאה</button>
      </header>

      {error && <div className="error">{error}</div>}

      {running ? (
        <Timer
          session={running}
          task={runningTask}
          project={runningProject}
          onStop={async () => {
            try {
              await stopSession(running)
              await refresh()
            } catch (e) { setError(e instanceof Error ? e.message : 'שגיאה') }
          }}
        />
      ) : activeTasks.length > 0 ? (
        <StartPanel
          tasks={activeTasks}
          projects={projects}
          onStart={async ({ taskId, mode, plannedSeconds }) => {
            try {
              setError('')
              const task = activeTasks.find(t => t.id === taskId)
              const session = await startSession({ taskId, projectId: task?.project_id, mode, plannedSeconds })
              setRunning(session)
            } catch (e) { setError(e instanceof Error ? e.message : 'שגיאה') }
          }}
        />
      ) : (
        <section className="card empty-state">
          <div className="eyebrow">START HERE</div>
          <h2>צור משימה ראשונה</h2>
          <p className="muted">אחרי שתיצור משימה יופיע כאן כפתור ההתחלה.</p>
        </section>
      )}

      <section className="card manage-card">
        <div className="section-head">
          <div><div className="eyebrow">ORGANIZE</div><h2>פרויקטים ומשימות</h2></div>
        </div>
        <ProjectCreator onCreated={() => void refresh()} />
        <TaskCreator projects={projects} onCreated={() => void refresh()} />
        {projects.length > 0 && (
          <div className="project-list">
            {projects.map(project => {
              const count = activeTasks.filter(t => t.project_id === project.id).length
              return <span className="project-chip" key={project.id}>{project.name}<small>{count}</small></span>
            })}
          </div>
        )}
      </section>

      <Stats sessions={history} tasks={tasks} projects={projects} />
      <History
        sessions={history}
        tasks={tasks}
        projects={projects}
        onDelete={async (sessionId) => {
          try {
            setError('')
            await deleteFocusSession(sessionId)
            setHistory(prev => prev.filter(session => session.id !== sessionId))
          } catch (e) {
            setError(e instanceof Error ? e.message : 'לא הצלחתי למחוק את זמן העבודה')
          }
        }}
      />
    </main>
  )
}
