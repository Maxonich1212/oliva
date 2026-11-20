import { useState } from 'react'
import { motion } from 'framer-motion'
import { Logo } from '../components/Logo'
import { settings, saveSettings, fmtDay, weekday } from '../lib/plan'

const POINTS = [
  ['🌿', 'Low FODMAP на 4 недели', 'чтобы ушло вздутие'],
  ['🐟', 'Рыба, оливковое масло, овёс', 'против высоких триглицеридов и холестерина'],
  ['⚖️', '4 приёма пищи, ~1450 ккал', 'ровный инсулин и около −0,5 кг в неделю'],
  ['🍱', 'Ужин на 2 порции', 'вторая — обед на работу завтра'],
  ['🛒', 'Покупки считаются сами', 'с учётом того, что уже есть дома'],
]

export default function Welcome({ onDone }) {
  const st = settings()
  const [b, setB] = useState({ height: st.height || '', startWeight: st.startWeight || '', goalWeight: st.goalWeight || '' })
  const done = (p) => {
    const num = (v) => parseFloat(String(v).replace(',', '.')) || null
    saveSettings({ height: num(b.height), startWeight: num(b.startWeight), goalWeight: num(b.goalWeight) })
    onDone(p)
  }
  return (
    <div className="app" style={{ paddingBottom: 40 }}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stack" style={{ gap: 18, marginTop: 28 }}>
        <Logo size={64} />
        <div>
          <h1 className="h1">Привет! Это твоё меню на месяц</h1>
          <div className="small muted" style={{ marginTop: 8 }}>Старт — {weekday(st.startDate)}, {fmtDay(st.startDate)}. Дату можно поменять в настройках.</div>
        </div>
        <div className="stack" style={{ gap: 10 }}>
          {POINTS.map(([e, t, d], i) => (
            <motion.div key={t} className="card row" style={{ gap: 14, padding: 14 }} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 * i }}>
              <span style={{ fontSize: 26 }}>{e}</span>
              <div>
                <div className="h3">{t}</div>
                <div className="tiny muted">{d}</div>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="card stack" style={{ gap: 10 }}>
          <div className="h3">Немного о тебе</div>
          <div className="row" style={{ gap: 8 }}>
            {[['height', 'Рост, см'], ['startWeight', 'Вес, кг'], ['goalWeight', 'Цель, кг']].map(([k, l]) => (
              <label key={k} className="field grow" style={{ gap: 4 }}>
                <span className="tiny muted" style={{ fontWeight: 700 }}>{l}</span>
                <input className="input" inputMode="decimal" value={b[k]} onChange={(e) => setB({ ...b, [k]: e.target.value })} />
              </label>
            ))}
          </div>
          <div className="tiny muted">Хранится только в твоём аккаунте — нужно для графика веса.</div>
        </div>
        <div className="small" style={{ color: 'var(--ink2)' }}>Сначала отметь, что уже есть дома, — тогда в списке покупок будет только то, чего не хватает.</div>
        <button className="btn primary block" onClick={() => done(true)}>Отметить запасы</button>
        <button className="btn ghost block" onClick={() => done(false)}>Сразу к меню</button>
      </motion.div>
    </div>
  )
}
