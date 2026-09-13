import { addDoc, collection, deleteDoc, doc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { auth, db } from './firebase'
import { secondsBetween } from './time'
import type { FocusSession, SessionMode } from '../types'

function asSession(id: string, data: Record<string, unknown>): FocusSession {
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

export async function getRunningSession(): Promise<FocusSession | null> {
  const user = auth.currentUser
  if (!user) return null

  const snapshot = await getDocs(query(collection(db, 'focusSessions'), where('userId', '==', user.uid)))
  const running = snapshot.docs
    .map(d => asSession(d.id, d.data()))
    .filter(s => s.status === 'running')
    .sort((a, b) => b.started_at.localeCompare(a.started_at))

  return running[0] ?? null
}

export async function startSession(input: {
  taskId: string
  projectId?: string | null
  mode: SessionMode
  plannedSeconds?: number | null
}) {
  const existing = await getRunningSession()
  if (existing) throw new Error('כבר קיים טיימר פעיל')

  const user = auth.currentUser
  if (!user) throw new Error('אין משתמש מחובר')

  const payload = {
    userId: user.uid,
    task_id: input.taskId,
    project_id: input.projectId ?? null,
    mode: input.mode,
    planned_seconds: input.mode === 'fixed' ? input.plannedSeconds ?? null : null,
    started_at: new Date().toISOString(),
    ended_at: null,
    duration_seconds: null,
    status: 'running'
  }

  const ref = await addDoc(collection(db, 'focusSessions'), payload)
  return asSession(ref.id, payload)
}

export async function stopSession(session: FocusSession) {
  const user = auth.currentUser
  if (!user) throw new Error('אין משתמש מחובר')

  const endedAt = new Date()
  const duration = secondsBetween(session.started_at, endedAt.getTime())
  const changes = {
    ended_at: endedAt.toISOString(),
    duration_seconds: duration,
    status: 'completed'
  } as const

  await updateDoc(doc(db, 'focusSessions', session.id), changes)
  return { ...session, ...changes } as FocusSession
}


export async function deleteFocusSession(sessionId: string) {
  const user = auth.currentUser
  if (!user) throw new Error('אין משתמש מחובר')

  await deleteDoc(doc(db, 'focusSessions', sessionId))
}
