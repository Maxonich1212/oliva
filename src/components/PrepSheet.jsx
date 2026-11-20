import { motion } from 'framer-motion'
import { Sheet, CheckDot } from './ui'
import { useStore, get, put } from '../lib/store'
import { prepMonday, prepTasks } from '../lib/prep'
import { fmtDay, addDays } from '../lib/plan'

export function usePrep() {
  useStore((s) => s.records)
  const monday = prepMonday()
  const tasks = prepTasks(monday)
  const done = get('prep:' + monday)?.done || {}
  const left = tasks.filter((t) => !done[t.id])
  return { monday, tasks, done, left, minutes: left.reduce((a, t) => a + t.min, 0) }
}

export function PrepSheet({ open, onClose }) {
  return (
    <Sheet open={open} onClose={onClose} title="Заготовки">
      {open && <Body />}
    </Sheet>
  )
}

function Body() {
  const { monday, tasks, done, minutes } = usePrep()
  const toggle = (id) => put('prep:' + monday, 'prep', { done: { ...done, [id]: !done[id] } })
  const total = tasks.reduce((a, t) => a + t.min, 0)
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="small muted">
        Неделя {fmtDay(monday)} – {fmtDay(addDays(monday, 6))}. Сделай это за один заход в выходные — в будни останется только разогреть и собрать.
      </div>
      {tasks.length ? (
        <>
          <div className="card row between" style={{ padding: 14 }}>
            <div>
              <div className="h3">{minutes ? `Осталось ≈ ${minutes} мин` : 'Всё готово 🌿'}</div>
              <div className="tiny muted">{tasks.length - Object.values(done).filter(Boolean).length} из {tasks.length} задач</div>
            </div>
            <div className="bar" style={{ width: 110 }}>
              <motion.i initial={false} animate={{ width: `${total ? ((total - minutes) / total) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="list">
            {tasks.map((t) => (
              <button key={t.id} className="li" style={{ alignItems: 'flex-start' }} onClick={() => toggle(t.id)}>
                <span style={{ marginTop: 2 }}><CheckDot on={!!done[t.id]} /></span>
                <div className="grow">
                  <div style={{ fontWeight: 650, fontSize: 15, color: done[t.id] ? 'var(--muted)' : 'var(--ink)', textDecoration: done[t.id] ? 'line-through' : 'none' }}>
                    {t.emoji} {t.title}
                  </div>
                  {!done[t.id] && <div className="tiny muted" style={{ marginTop: 3 }}>{t.detail}</div>}
                </div>
                <span className="tiny muted num" style={{ flex: 'none' }}>{t.min} мин</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="card empty">На эту неделю заготавливать нечего.</div>
      )}
    </div>
  )
}
