import { useState } from 'react'
import { motion } from 'framer-motion'
import { signIn, signUp, goOffline } from '../lib/store'
import { Segmented } from '../components/ui'
import { Logo } from '../components/Logo'

export default function Auth() {
  const [mode, setMode] = useState('in')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      if (mode === 'in') await signIn(email.trim(), pass)
      else await signUp(email.trim(), pass)
    } catch (e) {
      const m = e.message || ''
      setErr(/Invalid login/i.test(m) ? 'Неверная почта или пароль' : /already registered/i.test(m) ? 'Такой аккаунт уже есть — войди' : /at least/i.test(m) ? 'Пароль — минимум 6 символов' : m)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="app" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100dvh', paddingBottom: 40 }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="stack" style={{ gap: 18 }}>
        <div style={{ textAlign: 'center' }}>
          <Logo size={76} />
          <h1 className="h1" style={{ marginTop: 14 }}>Олива</h1>
          <div className="small muted" style={{ marginTop: 6 }}>Меню, рецепты и покупки на 4 недели<br />Low FODMAP · забота о сердце · лёгкий вес</div>
        </div>
        <form className="card stack" style={{ gap: 12, padding: 18 }} onSubmit={submit}>
          <Segmented value={mode} onChange={setMode} options={[['in', 'Вход'], ['up', 'Регистрация']]} />
          <div className="field">
            <label>Почта</label>
            <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Пароль</label>
            <input className="input" type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={pass} onChange={(e) => setPass(e.target.value)} required minLength={6} />
          </div>
          {err && <div className="small" style={{ color: 'var(--terra)' }}>{err}</div>}
          <button className="btn primary block" disabled={busy}>{busy ? '…' : mode === 'in' ? 'Войти' : 'Создать аккаунт'}</button>
        </form>
        <button className="btn ghost" onClick={goOffline}>Попробовать без входа</button>
      </motion.div>
    </div>
  )
}
