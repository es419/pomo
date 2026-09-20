import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { collection, getDocs, query, where } from 'firebase/firestore'
import './styles.css'
import { auth, db } from './lib/firebase'
import { deleteFocusSession, getRunningSession, startSession, stopSession } from './lib/sessions'
import type { FocusSession, Project, StatsPeriod, Task } from './types'
import { Timer } from './components/Timer'
import { StartPanel } from './components/StartPanel'
import { Stats } from './components/Stats'
import { History } from './components/History'
import { Auth } from './components/Auth'
import { TaskCreator } from './components/TaskCreator'
import { ProjectCreator } from './components/ProjectCreator'
import { OrganizerList } from './components/OrganizerList'
import { NotificationSettings } from './components/NotificationSettings'
import { disableWeeklyNotifications, refreshWeeklyNotificationsRegistration } from './lib/notifications'
import { deleteProjectAndContents, deleteTaskAndSessions } from './lib/organize'
import { installFloatingKeyboardEditor } from './lib/floatingKeyboard'

type ThemeMode = 'light' | 'dark' | 'system'

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


function getInitialTab(): 'focus' | 'stats' | 'manage' {
  const params = new URLSearchParams(window.location.search)
  const tab = params.get('tab')
  return tab === 'stats' || tab === 'manage' ? tab : 'focus'
}

function getInitialStatsPeriod(): StatsPeriod {
  const period = new URLSearchParams(window.location.search).get('period')
  return period === 'day' || period === 'month' || period === 'week' ? period : 'week'
}

function getInitialTheme(): ThemeMode {
  const saved = localStorage.getItem('pomo-theme')
  return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system'
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [running, setRunning] = useState<FocusSession | null>(null)
  const [history, setHistory] = useState<FocusSession[]>([])
  const [error, setError] = useState('')
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme)
  const [activeTab, setActiveTab] = useState<'focus' | 'stats' | 'manage'>(getInitialTab)
  const [initialStatsPeriod] = useState<StatsPeriod>(getInitialStatsPeriod)
  const [splashDone, setSplashDone] = useState(false)

  useEffect(() => installFloatingKeyboardEditor(), [])

  useEffect(() => {
    const timer = window.setTimeout(() => setSplashDone(true), 1150)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => onAuthStateChanged(auth, nextUser => {
    setUser(nextUser)
    setAuthReady(true)
  }), [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const applyTheme = () => {
      const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme
      document.documentElement.dataset.theme = resolved
      document.documentElement.dataset.themeMode = theme
      document.documentElement.style.colorScheme = resolved
      const lightThemeMeta = document.querySelector<HTMLMetaElement>('#pomo-theme-light')
      const darkThemeMeta = document.querySelector<HTMLMetaElement>('#pomo-theme-dark')

      if (theme === 'system') {
        lightThemeMeta?.setAttribute('media', '(prefers-color-scheme: light)')
        darkThemeMeta?.setAttribute('media', '(prefers-color-scheme: dark)')
      } else {
        lightThemeMeta?.setAttribute('media', resolved === 'light' ? 'all' : 'not all')
        darkThemeMeta?.setAttribute('media', resolved === 'dark' ? 'all' : 'not all')
      }
    }

    localStorage.setItem('pomo-theme', theme)
    applyTheme()
    media.addEventListener('change', applyTheme)
    return () => media.removeEventListener('change', applyTheme)
  }, [theme])

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

  useEffect(() => {
    void refresh()
    if (user) void refreshWeeklyNotificationsRegistration()
  }, [user])

  async function handleSignOut() {
    try {
      await disableWeeklyNotifications()
    } finally {
      await signOut(auth)
    }
  }

  function selectTab(tab: 'focus' | 'stats' | 'manage') {
    setActiveTab(tab)
    const url = new URL(window.location.href)

    if (tab === 'focus') {
      url.searchParams.delete('tab')
    } else {
      url.searchParams.set('tab', tab)
    }

    if (tab !== 'stats') {
      url.searchParams.delete('period')
      url.searchParams.delete('source')
    }

    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  }

  if (!authReady || !splashDone) {
    return (
      <div className="splash-screen" role="status" aria-label="Pomo נטענת">
        <div className="splash-glow" />
        <img className="splash-logo" src={`${import.meta.env.BASE_URL}pwa-512x512-v9.png`} alt="" />
        <div className="splash-name">POMO</div>
        <div className="splash-loader"><span /></div>
      </div>
    )
  }
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
        <div className="topbar-actions">
          <div className="theme-switch" role="group" aria-label="ערכת נושא">
            <button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')} title="בהיר">☀️</button>
            <button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')} title="כהה">🌙</button>
            <button className={theme === 'system' ? 'active' : ''} onClick={() => setTheme('system')} title="מערכת">◐</button>
          </div>
          <button className="link-button" onClick={() => void handleSignOut()}>יציאה</button>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      <nav className="app-tabs" aria-label="ניווט ראשי">
        <button className={activeTab === 'focus' ? 'active' : ''} onClick={() => selectTab('focus')}>
          <span className="tab-icon">◷</span>
          <span>פוקוס</span>
        </button>
        <button className={activeTab === 'stats' ? 'active' : ''} onClick={() => selectTab('stats')}>
          <span className="tab-icon">▤</span>
          <span>סטטיסטיקות</span>
        </button>
        <button className={activeTab === 'manage' ? 'active' : ''} onClick={() => selectTab('manage')}>
          <span className="tab-icon">☷</span>
          <span>ניהול</span>
        </button>
      </nav>

      <section className="tab-viewport">
        {activeTab === 'focus' ? (
          <section className="focus-tab">
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
                <p className="muted">עבור לטאב ניהול, צור משימה — ואז היא תופיע כאן לבחירה.</p>
                <button className="primary" type="button" onClick={() => selectTab('manage')}>לניהול פרויקטים ומשימות</button>
              </section>
            )}
          </section>
        ) : activeTab === 'manage' ? (
          <section className="manage-tab">
          <section className="card manage-card">
            <div className="section-head">
              <div><div className="eyebrow">ORGANIZE</div><h2>פרויקטים ומשימות</h2></div>
            </div>
            <ProjectCreator onCreated={() => void refresh()} />
            <TaskCreator projects={projects} onCreated={() => void refresh()} />
            <OrganizerList
              projects={projects}
              tasks={activeTasks}
              onDeleteTask={async (task) => {
                const ok = window.confirm(`למחוק את המשימה “${task.title}”?\n\nגם היסטוריית זמן העבודה של המשימה תימחק.`)
                if (!ok) return
                try {
                  setError('')
                  await deleteTaskAndSessions(task.id)
                  await refresh()
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'לא הצלחתי למחוק את המשימה')
                }
              }}
              onDeleteProject={async (project) => {
                const taskCount = tasks.filter(task => task.project_id === project.id).length
                const ok = window.confirm(`למחוק את הפרויקט “${project.name}”?\n\n${taskCount ? `יימחקו גם ${taskCount} משימות וכל היסטוריית העבודה שלהן.` : 'כל היסטוריית העבודה המשויכת אליו תימחק.'}`)
                if (!ok) return
                try {
                  setError('')
                  await deleteProjectAndContents(project.id)
                  await refresh()
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'לא הצלחתי למחוק את הפרויקט')
                }
              }}
            />
          </section>
        </section>
        ) : (
          <section className="stats-tab">
            <div className="tab-heading stats-heading">
            <div className="stats-heading-copy">
              <div className="eyebrow">INSIGHTS</div>
              <h2>הסטטיסטיקות שלך</h2>
              <p className="muted">כל זמן העבודה, המגמות וההיסטוריה במקום אחד.</p>
            </div>
            <NotificationSettings />
          </div>
          <div className="stats-layout">
            <div className="stats-overview">
              <Stats sessions={history} tasks={tasks} projects={projects} initialPeriod={initialStatsPeriod} />
            </div>
            <div className="stats-history">
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
            </div>
          </div>
          </section>
        )}
      </section>
    </main>
  )
}
