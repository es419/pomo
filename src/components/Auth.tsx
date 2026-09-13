import { FormEvent, useState } from 'react'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../lib/firebase'

export function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setMessage('')
    setLoading(true)
    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        await createUserWithEmailAndPassword(auth, email, password)
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'שגיאה בהתחברות')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="shell auth-shell">
      <section className="card">
        <div className="eyebrow">POMO</div>
        <h1>הזמן שלך, מסודר.</h1>
        <form onSubmit={submit}>
          <label>אימייל</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <label>סיסמה</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required />
          <button className="primary" type="submit" disabled={loading}>
            {loading ? 'רגע…' : mode === 'signin' ? 'התחבר' : 'צור חשבון'}
          </button>
        </form>
        {message && <p className="muted">{message}</p>}
        <button className="link-button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
          {mode === 'signin' ? 'אין לי חשבון' : 'כבר יש לי חשבון'}
        </button>
      </section>
    </main>
  )
}
