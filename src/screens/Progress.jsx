import { useState } from 'react'
import { motion } from 'framer-motion'
import { AnimatePresence } from 'framer-motion'
import { Scale, FlaskConical, Plus, TrendingDown, TrendingUp, FileText } from 'lucide-react'
import { Report } from '../components/Report'
import { useStore, byKind, put, remove } from '../lib/store'
import { settings, todayKey, addDays, dayMeals, fmtDay, diffDays, dayIndex, parseKey } from '../lib/plan'
import { PLAN_DAYS } from '../data/menu'
import { REC } from '../data/recipes'
import { Sheet, Stepper } from '../components/ui'
import { FEELS, FEEL_COLOR } from '../components/FeelPrompt'

const LABS = [
  ['chol', 'Холестерин общий', 'ммоль/л', null, 5.2],
  ['tg', 'Триглицериды', 'ммоль/л', null, 1.7],
  ['hdl', 'ЛПВП («хороший»)', 'ммоль/л', 1.2, null],
  ['ldl', 'ЛПНП', 'ммоль/л', null, 3.0],
  ['glu', 'Глюкоза', 'ммоль/л', 3.9, 6.0],
  ['ins', 'Инсулин', 'мкЕд/мл', 2.6, 24.9],
]

export default function Progress() {
  useStore((s) => s.records)
  const st = settings()
  const today = todayKey()
  const [wOpen, setWOpen] = useState(false)
  const [lOpen, setLOpen] = useState(false)
  const [rep, setRep] = useState(false)

  const body = byKind('body').map((r) => ({ k: r.id.slice(5), ...r.data })).filter((b) => b.kg).sort((a, b) => (a.k < b.k ? -1 : 1))
  const startW = st.startWeight || body[0]?.kg || 0
  const goalW = st.goalWeight || startW
  const cur = body.length ? body[body.length - 1].kg : startW
  const lost = startW - cur
  const goalSpan = Math.max(0.1, startW - goalW)
  const bmi = st.height ? cur / (st.height / 100) ** 2 : null

  // соблюдение плана
  const startN = dayIndex(today, st)
  let planned = 0, eaten = 0, swaps = 0
  const days = []
  if (startN != null || diffDays(today, st.startDate) >= 0) {
    const nDays = Math.min(PLAN_DAYS, diffDays(today, st.startDate) + 1)
    for (let i = 0; i < Math.max(0, nDays); i++) {
      const k = addDays(st.startDate, i)
      const ms = dayMeals(k, st) || []
      const fs = byKind('feel').filter((r) => r.id.startsWith(`feel:${k}:`))
      const avg = fs.length ? fs.reduce((a, r) => a + r.data.score, 0) / fs.length : null
      days.push({ k, avg })
      if (k < today) planned += 4
      for (const m of ms) {
        if (m.status === 'eaten') eaten++
        if (m.swapped) swaps++
      }
    }
  }

  // блюда-подозреваемые
  const per = {}
  for (const r of byKind('feel')) {
    const [, k, slot] = r.id.split(':')
    const ms = dayMeals(k, st)
    const m = ms?.find((x) => x.slot === slot)
    if (!m?.recipe) continue
    ;(per[m.recipeId] ||= []).push(r.data.score)
  }
  const sus = Object.entries(per)
    .map(([id, s]) => ({ id, n: s.length, avg: s.reduce((a, b) => a + b, 0) / s.length }))
    .filter((x) => x.avg >= 1.5)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5)

  const labs = byKind('lab').map((r) => ({ k: r.id.slice(4), ...r.data })).sort((a, b) => (a.k < b.k ? 1 : -1))
  const daysLeft = diffDays(addDays(st.startDate, PLAN_DAYS), today)

  return (
    <div>
      <div className="eyebrow" style={{ marginTop: 10 }}>Прогресс</div>
      <h1 className="h1" style={{ marginTop: 6 }}>Метрики</h1>

      {/* Вес */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="row between">
          <div className="row" style={{ gap: 8 }}>
            <Scale size={18} color="var(--olive)" />
            <div className="h3">Вес</div>
          </div>
          <button className="btn sm primary" onClick={() => setWOpen(true)}><Plus size={16} /> Записать</button>
        </div>
        <div className="row" style={{ alignItems: 'flex-end', gap: 14, marginTop: 12 }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 40, fontWeight: 600, lineHeight: 1 }} className="num">
            {cur ? cur.toFixed(1).replace('.', ',') : '—'}
            <span className="small muted" style={{ fontFamily: 'var(--sans)' }}> кг</span>
          </div>
          {body.length > 0 && (
            <span className={'tag' + (lost < 0 ? ' terra' : '')} style={{ marginBottom: 6 }}>
              {lost >= 0 ? <TrendingDown size={13} /> : <TrendingUp size={13} />} {lost >= 0 ? '−' : '+'}{Math.abs(lost).toFixed(1).replace('.', ',')} кг
            </span>
          )}
        </div>
        <div className="bar" style={{ marginTop: 14 }}>
          <motion.i initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, (lost / goalSpan) * 100))}%` }} />
        </div>
        <div className="row between tiny muted" style={{ marginTop: 6 }}>
          <span>старт {startW || '—'} кг</span>
          <span>{bmi ? `ИМТ ${bmi.toFixed(1).replace('.', ',')}` : ''}</span>
          <span>цель {st.goalWeight || '—'} кг</span>
        </div>
        {body.length >= 2 && <WeightChart body={body} goal={goalW} />}
        {body.length < 2 && <div className="tiny muted" style={{ marginTop: 12 }}>Взвешивайся раз в неделю, утром натощак — график появится после второй записи.</div>}
      </div>

      {/* Соблюдение */}
      <div className="row" style={{ gap: 10, marginTop: 12 }}>
        <Stat big={days.length ? `${Math.min(days.length, PLAN_DAYS)}` : '0'} label={`из ${PLAN_DAYS} дней`} />
        <Stat big={planned ? `${Math.round((eaten / planned) * 100)}%` : '—'} label="приёмов по плану" />
        <Stat big={daysLeft > 0 ? daysLeft : '✓'} label={daysLeft > 0 ? 'дней до 2 этапа' : 'этап 1 пройден'} />
      </div>

      {/* Самочувствие */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="h3">Живот по дням</div>
        <div className="tiny muted">Средняя оценка после еды</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginTop: 12 }}>
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => <div key={d} className="tiny muted" style={{ textAlign: 'center' }}>{d}</div>)}
          {Array.from({ length: PLAN_DAYS }, (_, i) => {
            const k = addDays(st.startDate, i)
            const d = days.find((x) => x.k === k)
            const c = d?.avg == null ? null : FEEL_COLOR[Math.round(d.avg)]
            return (
              <div key={k} title={fmtDay(k)} style={{ aspectRatio: '1', borderRadius: 9, background: c || 'var(--bg2)', opacity: c ? 0.9 : 1, display: 'grid', placeItems: 'center', fontSize: 11, color: c ? '#fff' : 'var(--muted)', fontWeight: 700, boxShadow: k === today ? 'inset 0 0 0 2px var(--ink)' : 'none' }}>
                {parseKey(k).getDate()}
              </div>
            )
          })}
        </div>
        <div className="row wrap" style={{ gap: 10, marginTop: 10 }}>
          {FEELS.map(([s, e, l]) => (
            <span key={s} className="tiny row" style={{ gap: 4 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: FEEL_COLOR[s] }} />{l}</span>
          ))}
        </div>
        {sus.length > 0 && (
          <>
            <div className="divider" />
            <div className="h3">Чаще всего после них дискомфорт</div>
            <div className="stack small" style={{ gap: 6, marginTop: 8 }}>
              {sus.map((x) => (
                <div key={x.id} className="row between">
                  <span>{REC[x.id]?.emoji} {REC[x.id]?.name}</span>
                  <span className="muted">{x.n} раз</span>
                </div>
              ))}
            </div>
            <div className="tiny muted" style={{ marginTop: 8 }}>Попробуй уменьшить порцию или заменить — и покажи врачу.</div>
          </>
        )}
      </div>

      {/* Анализы */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="row between">
          <div className="row" style={{ gap: 8 }}>
            <FlaskConical size={18} color="var(--terra)" />
            <div className="h3">Анализы</div>
          </div>
          <button className="btn sm" onClick={() => setLOpen(true)}><Plus size={16} /> Добавить</button>
        </div>
        {!labs.length && <div className="small muted" style={{ marginTop: 10 }}>Внеси последние анализы, а через 1,5–3 месяца — новые: здесь будет видно, как изменились цифры.</div>}
        {labs.length > 0 && (
          <div className="stack" style={{ gap: 8, marginTop: 12 }}>
            <div className="tiny muted">{fmtDay(labs[0].k)} {parseKey(labs[0].k).getFullYear()}{labs[1] ? ` · сравнение с ${fmtDay(labs[1].k)}` : ''}</div>
            {LABS.filter(([id]) => labs[0][id] != null).map(([id, name, unit, lo, hi]) => {
              const v = labs[0][id]
              const p = labs[1]?.[id]
              const bad = (hi != null && v > hi) || (lo != null && v < lo)
              return (
                <div key={id} className="row between small">
                  <span>{name}</span>
                  <span className="row" style={{ gap: 8 }}>
                    {p != null && <span className="tiny muted">{p} →</span>}
                    <b style={{ color: bad ? 'var(--terra)' : 'var(--olive)' }} className="num">{v}</b>
                    <span className="tiny muted" style={{ width: 54 }}>{unit}</span>
                  </span>
                </div>
              )
            })}
            <button className="tiny muted" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={() => confirm('Удалить эту запись анализов?') && remove('lab:' + labs[0].k)}>Удалить последнюю запись</button>
          </div>
        )}
      </div>

      <motion.button whileTap={{ scale: 0.98 }} className="card row" style={{ marginTop: 12, gap: 12, width: '100%', textAlign: 'left' }} onClick={() => setRep(true)}>
        <FileText size={20} color="var(--olive)" />
        <div className="grow">
          <div className="h3">Отчёт для врача</div>
          <div className="tiny muted">Вес, самочувствие, подозрительные блюда, анализы — распечатать или PDF</div>
        </div>
      </motion.button>
      <AnimatePresence>{rep && <Report onClose={() => setRep(false)} />}</AnimatePresence>

      <WeightSheet open={wOpen} onClose={() => setWOpen(false)} last={cur} />
      <LabSheet open={lOpen} onClose={() => setLOpen(false)} />
    </div>
  )
}

const Stat = ({ big, label }) => (
  <div className="card grow" style={{ padding: 14 }}>
    <div className="num" style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 600 }}>{big}</div>
    <div className="tiny muted">{label}</div>
  </div>
)

function WeightChart({ body, goal }) {
  const W = 320, H = 110, P = 8
  const vals = body.map((b) => b.kg)
  const min = Math.min(goal, ...vals) - 0.5
  const max = Math.max(...vals) + 0.5
  const t0 = parseKey(body[0].k).getTime()
  const t1 = Math.max(parseKey(body[body.length - 1].k).getTime(), t0 + 864e5)
  const x = (k) => P + ((parseKey(k).getTime() - t0) / (t1 - t0)) * (W - 2 * P)
  const y = (v) => P + ((max - v) / (max - min)) * (H - 2 * P)
  const d = body.map((b, i) => `${i ? 'L' : 'M'}${x(b.k).toFixed(1)},${y(b.kg).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', marginTop: 14, overflow: 'visible' }}>
      <line x1={P} x2={W - P} y1={y(goal)} y2={y(goal)} stroke="var(--sage)" strokeDasharray="4 4" />
      <text x={W - P} y={y(goal) - 4} textAnchor="end" fontSize="10" fill="var(--muted)">цель</text>
      <motion.path d={d} fill="none" stroke="var(--olive)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }} />
      {body.map((b) => <circle key={b.k} cx={x(b.k)} cy={y(b.kg)} r="3.5" fill="var(--card)" stroke="var(--olive)" strokeWidth="2" />)}
    </svg>
  )
}

function WeightSheet({ open, onClose, last }) {
  return (
    <Sheet open={open} onClose={onClose} title="Записать вес">
      {open && <WeightBody onClose={onClose} last={last} />}
    </Sheet>
  )
}
function WeightBody({ onClose, last }) {
  const [kg, setKg] = useState(last || 70)
  const [waist, setWaist] = useState('')
  const k = todayKey()
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="small muted">{fmtDay(k)} · утром, после туалета, до еды</div>
      <div className="row" style={{ justifyContent: 'center' }}>
        <Stepper value={kg} step={0.1} onChange={setKg} fmt={(v) => `${v.toFixed(1).replace('.', ',')} кг`} />
      </div>
      <div className="field">
        <label>Талия, см (необязательно)</label>
        <input className="input" inputMode="decimal" value={waist} onChange={(e) => setWaist(e.target.value)} placeholder="например, 82" />
      </div>
      <button className="btn primary block" onClick={() => { put('body:' + k, 'body', { kg: Math.round(kg * 10) / 10, waist: parseFloat(waist.replace(',', '.')) || undefined }); onClose() }}>Сохранить</button>
    </div>
  )
}

function LabSheet({ open, onClose }) {
  return (
    <Sheet open={open} onClose={onClose} title="Анализы">
      {open && <LabBody onClose={onClose} />}
    </Sheet>
  )
}
function LabBody({ onClose }) {
  const [date, setDate] = useState(todayKey())
  const [v, setV] = useState({})
  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="field">
        <label>Дата сдачи</label>
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      {LABS.map(([id, name, unit, lo, hi]) => (
        <div className="field" key={id}>
          <label>{name}, {unit} <span className="muted" style={{ fontWeight: 500 }}>· норма {lo != null ? `от ${lo}` : ''}{lo != null && hi != null ? ' ' : ''}{hi != null ? `до ${hi}` : ''}</span></label>
          <input className="input" inputMode="decimal" value={v[id] || ''} onChange={(e) => setV({ ...v, [id]: e.target.value })} />
        </div>
      ))}
      <button
        className="btn primary block"
        onClick={() => {
          const data = {}
          for (const [id] of LABS) {
            const n = parseFloat(String(v[id] || '').replace(',', '.'))
            if (!isNaN(n)) data[id] = n
          }
          if (Object.keys(data).length) put('lab:' + date, 'lab', data)
          onClose()
        }}
      >
        Сохранить
      </button>
    </div>
  )
}
