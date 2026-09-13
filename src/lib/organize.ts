import { collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore'
import { auth, db } from './firebase'

async function getUserData(collectionName: 'tasks' | 'focusSessions') {
  const user = auth.currentUser
  if (!user) throw new Error('אין משתמש מחובר')
  return getDocs(query(collection(db, collectionName), where('userId', '==', user.uid)))
}

export async function deleteTaskAndSessions(taskId: string) {
  const user = auth.currentUser
  if (!user) throw new Error('אין משתמש מחובר')

  const sessions = await getUserData('focusSessions')
  const related = sessions.docs.filter(snapshot => String(snapshot.data().task_id ?? '') === taskId)
  const running = related.some(snapshot => snapshot.data().status === 'running')
  if (running) throw new Error('אי אפשר למחוק משימה בזמן שהטיימר שלה פעיל')

  const refs = [doc(db, 'tasks', taskId), ...related.map(snapshot => snapshot.ref)]
  for (let i = 0; i < refs.length; i += 450) {
    const batch = writeBatch(db)
    refs.slice(i, i + 450).forEach(ref => batch.delete(ref))
    await batch.commit()
  }
}

export async function deleteProjectAndContents(projectId: string) {
  const user = auth.currentUser
  if (!user) throw new Error('אין משתמש מחובר')

  const [tasksSnapshot, sessionsSnapshot] = await Promise.all([
    getUserData('tasks'),
    getUserData('focusSessions')
  ])

  const relatedTasks = tasksSnapshot.docs.filter(snapshot => String(snapshot.data().project_id ?? '') === projectId)
  const taskIds = new Set(relatedTasks.map(snapshot => snapshot.id))
  const relatedSessions = sessionsSnapshot.docs.filter(snapshot => {
    const data = snapshot.data()
    return String(data.project_id ?? '') === projectId || taskIds.has(String(data.task_id ?? ''))
  })

  const running = relatedSessions.some(snapshot => snapshot.data().status === 'running')
  if (running) throw new Error('אי אפשר למחוק פרויקט בזמן שרץ בו טיימר פעיל')

  const refs = [
    doc(db, 'projects', projectId),
    ...relatedTasks.map(snapshot => snapshot.ref),
    ...relatedSessions.map(snapshot => snapshot.ref)
  ]

  for (let i = 0; i < refs.length; i += 450) {
    const batch = writeBatch(db)
    refs.slice(i, i + 450).forEach(ref => batch.delete(ref))
    await batch.commit()
  }
}

