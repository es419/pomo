import { FormEvent, useState } from 'react'
import { addDoc, collection } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import type { Project } from '../types'

export function TaskCreator({ projects, onCreated }: { projects: Project[]; onCreated: () => void }) {
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    const clean = title.trim()
    if (!clean) return
    const user = auth.currentUser
    if (!user) throw new Error('אין משתמש מחובר')

    await addDoc(collection(db, 'tasks'), {
      userId: user.uid,
      title: clean,
      project_id: projectId || null,
      completed: false,
      created_at: new Date().toISOString()
    })
    setTitle('')
    onCreated()
  }

  return (
    <form className="task-form" onSubmit={submit}>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="משימה חדשה…" />
      <select value={projectId} onChange={e => setProjectId(e.target.value)} aria-label="פרויקט">
        <option value="">ללא פרויקט</option>
        {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
      </select>
      <button className="primary inline-primary" type="submit">הוסף משימה</button>
    </form>
  )
}
