import { motion } from 'framer-motion'
import { X, Printer } from 'lucide-react'
import { byKind } from '../lib/store'
import { settings, addDays, dayMeals, fmtDay, todayKey, diffDays, parseKey } from '../lib/plan'
import { PLAN_DAYS } from '../data/menu'
import { REC, SLOT_NAME } from '../data/recipes'
import { FEELS } from './FeelPrompt'

const LABS = [
  ['chol', 'Холестерин общий'], ['tg', 'Триглицериды'], ['hdl', 'ЛПВП'], ['ldl', 'ЛПНП'], ['glu', 'Глюкоза'], ['ins', 'Инсулин'],
]
const yr = (k) => `${fmtDay(k)} ${parseKey(k).getFullYear()}`

// Сводка для врача: открывается поверх приложения, печатается или сохраняется в PDF
export function Report({ onClose }) {
  const st = settings()
  const today = todayKey()
  const last = diffDays(today, st.startDate) >= 0 ? addDays(st.startDate, Math.min(PLAN_DAYS, diffDays(today, st.startDate) + 1) - 1) : st.startDate
  const nDays = diffDays(today, st.startDate) >= 0 ? Math.max(0, diffDays(last, st.startDate) + 1) : 0

  const body = byKind('body').map((r) => ({ k: r.id.slice(5), ...r.data })).filter((b) => b.kg).sort((a, b) => (a.k < b.k ? -1 : 1))
  const feels = byKind('feel').map((r) => {
    const [, k, slot] = r.id.split(':')
    return { k, slot, ...r.data }
  })
  const labs = byKind('lab').map((r) => ({ k: r.id.slice(4), ...r.data })).sort((a, b) => (a.k < b.k ? -1 : 1))

  let planned = 0, eaten = 0, skipped = 0
  const weeks = []
  for (let i = 0; i < nDays; i++) {
    const k = addDays(st.startDate, i)
    const ms = dayMeals(k, st) || []
    for (const m of ms) {
      planned++
      if (m.status === 'eaten') eaten++
      if (m.status === 'skipped') skipped++
    }
    const w = Math.floor(i / 7)
    const f = feels.filter((x) => x.k === k)
    weeks[w] ||= { sum: 0, n: 0, bad: 0 }
    for (const x of f) {
      weeks[w].sum += x.score
      weeks[w].n++
      if (x.score >= 2) weeks[w].bad++
    }
  }
  const tags = {}
  for (const f of feels) for (const t of f.tags || []) tags[t] = (tags[t] || 0) + 1
  const per = {}
  for (const f of feels) {
    const m = dayMeals(f.k, st)?.find((x) => x.slot === f.slot)
    if (m?.recipe) (per[m.recipeId] ||= []).push(f.score)
  }
  const sus = Object.entries(per).map(([id, s]) => ({ id, n: s.length, avg: s.reduce((a, b) => a + b, 0) / s.length })).filter((x) => x.avg >= 1.5).sort((a, b) => b.avg - a.avg)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="report">
      <div className="report-bar no-print">
        <button className="icon-btn" onClick={onClose} aria-label="Закрыть"><X size={19} /></button>
        <button className="btn primary sm" onClick={() => window.print()}><Printer size={16} /> Печать / PDF</button>
      </div>
      <div className="report-page">
        <h1 className="h2">Дневник питания: Low FODMAP</h1>
        <p className="small muted">{nDays ? `Период: ${yr(st.startDate)} — ${yr(last)} (${nDays} дн.)` : `План начнётся ${yr(st.startDate)}`} · 4 приёма пищи, ~1450 ккал/сут</p>

        <h3 className="h3">Соблюдение плана</h3>
        <p className="small">Приёмов пищи по плану: {planned}, отмечено съеденными: {eaten} ({planned ? Math.round((eaten / planned) * 100) : 0}%), пропущено: {skipped}.</p>

        <h3 className="h3">Вес</h3>
        {body.length ? (
          <p className="small">
            {st.startWeight ? `Старт: ${st.startWeight} кг. ` : ''}
            {body.map((b) => `${fmtDay(b.k)} — ${b.kg} кг${b.waist ? ` (талия ${b.waist} см)` : ''}`).join('; ')}.
            {st.startWeight ? ` Итого: ${(body[body.length - 1].kg - st.startWeight).toFixed(1)} кг.` : ''}
          </p>
        ) : <p className="small muted">Нет записей.</p>}

        <h3 className="h3">Самочувствие ЖКТ после еды</h3>
        <p className="tiny muted">Шкала: 0 — легко, 1 — чуть-чуть, 2 — вздутие, 3 — сильно.</p>
        <table className="rtable">
          <thead><tr><th>Неделя</th><th>Оценок</th><th>Средняя</th><th>Со вздутием (≥2)</th></tr></thead>
          <tbody>
            {weeks.map((w, i) => (
              <tr key={i}><td>{i + 1}</td><td>{w.n}</td><td>{w.n ? (w.sum / w.n).toFixed(1) : '—'}</td><td>{w.n ? w.bad : '—'}</td></tr>
            ))}
          </tbody>
        </table>
        {Object.keys(tags).length > 0 && <p className="small">Жалобы: {Object.entries(tags).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t.toLowerCase()} — ${n}`).join(', ')}.</p>}
        {sus.length > 0 && (
          <p className="small">Чаще дискомфорт после: {sus.map((x) => `${REC[x.id].name} (${x.n} раз, ср. ${x.avg.toFixed(1)})`).join('; ')}.</p>
        )}
        {feels.length > 0 && (
          <details className="small no-print-hide">
            <summary>Все отметки ({feels.length})</summary>
            {feels.sort((a, b) => (a.k + a.slot < b.k + b.slot ? -1 : 1)).map((f) => (
              <div key={f.k + f.slot}>{fmtDay(f.k)}, {SLOT_NAME[f.slot].toLowerCase()}: {FEELS[f.score][2].toLowerCase()}{f.tags?.length ? ` (${f.tags.join(', ').toLowerCase()})` : ''}</div>
            ))}
          </details>
        )}

        <h3 className="h3">Анализы</h3>
        {labs.length ? (
          <table className="rtable">
            <thead><tr><th>Показатель</th>{labs.map((l) => <th key={l.k}>{fmtDay(l.k)} {parseKey(l.k).getFullYear()}</th>)}</tr></thead>
            <tbody>
              {LABS.filter(([id]) => labs.some((l) => l[id] != null)).map(([id, name]) => (
                <tr key={id}><td>{name}</td>{labs.map((l) => <td key={l.k}>{l[id] ?? '—'}</td>)}</tr>
              ))}
            </tbody>
          </table>
        ) : <p className="small muted">Не внесены.</p>}
        <p className="tiny muted" style={{ marginTop: 18 }}>Сформировано в приложении «Олива» {yr(today)}.</p>
      </div>
    </motion.div>
  )
}
