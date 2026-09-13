import { FormEvent, useState } from 'react'
import { addDoc, collection } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

export function ProjectCreator({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    const clean = name.trim()
    if (!clean) return
    const user = auth.currentUser
    if (!user) throw new Error('אין משתמש מחובר')

    await addDoc(collection(db, 'projects'), {
      userId: user.uid,
      name: clean,
      color: null,
      created_at: new Date().toISOString()
    })
    setName('')
    onCreated()
  }

  return (
    <form className="mini-form" onSubmit={submit}>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="מקצוע / פרויקט חדש…" />
      <button className="secondary" type="submit">הוסף פרויקט</button>
    </form>
  )
}
