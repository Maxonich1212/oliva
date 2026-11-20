import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Sprout, Leaf, ChevronRight, Search, CircleHelp } from 'lucide-react'
import { CheckerSheet } from '../components/Checker'
import { PrepSheet, usePrep } from '../components/PrepSheet'
import { useStore } from '../lib/store'
import { settings, dayMeals, addDays, fmtDay, weekdayShort, todayKey, dayTotals, nutrition, baseAmounts, fmtQty, dayIndex } from '../lib/plan'
import { PLAN_DAYS } from '../data/menu'
import { RECIPES, SLOTS } from '../data/recipes'
import { ING } from '../data/ingredients'
import { Sheet, Macro } from '../components/ui'
import { Reintro, Principles } from './Guide'

export default function Plan({ openDay }) {
  useStore((s) => s.records)
  const st = settings()
  const today = todayKey()
  const [lib, setLib] = useState(false)
  const [guide, setGuide] = useState(null)
  const prep = usePrep()
  const n0 = dayIndex(today, st)
  const cycleStart = n0 != null ? addDays(st.startDate, Math.floor(n0 / PLAN_DAYS) * PLAN_DAYS) : st.startDate
  const [week, setWeek] = useState(n0 != null ? Math.floor((n0 % PLAN_DAYS) / 7) : 0)

  return (
    <div>
      <div className="eyebrow" style={{ marginTop: 10 }}>Low FODMAP · 4 недели</div>
      <h1 className="h1" style={{ marginTop: 6 }}>Меню</h1>

      <div className="row" style={{ marginTop: 16, gap: 10 }}>
        <motion.button whileTap={{ scale: 0.97 }} className="card grow row" style={{ padding: 14, gap: 10 }} onClick={() => setLib(true)}>
          <BookOpen size={20} color="var(--olive)" />
          <div className="grow" style={{ textAlign: 'left' }}>
            <div className="h3">Рецепты</div>
            <div className="tiny muted">{RECIPES.length} блюд</div>
          </div>
        </motion.button>
        <motion.button whileTap={{ scale: 0.97 }} className="card grow row" style={{ padding: 14, gap: 10 }} onClick={() => setGuide('p')}>
          <Leaf size={20} color="var(--terra)" />
          <div className="grow" style={{ textAlign: 'left' }}>
            <div className="h3">Принципы</div>
            <div className="tiny muted">что можно и почему</div>
          </div>
        </motion.button>
      </div>

      <motion.button whileTap={{ scale: 0.98 }} className="card row" style={{ marginTop: 10, gap: 12, width: '100%', textAlign: 'left', padding: 14 }} onClick={() => setGuide('prep')}>
        <span style={{ fontSize: 20 }}>🧺</span>
        <div className="grow">
          <div className="h3">Заготовки на неделю</div>
          <div className="tiny muted">{prep.left.length ? `${prep.left.length} задач · ≈ ${prep.minutes} мин в выходные` : 'всё заготовлено'}</div>
        </div>
        <ChevronRight size={18} className="muted" />
      </motion.button>
      <motion.button whileTap={{ scale: 0.98 }} className="card row" style={{ marginTop: 10, gap: 12, width: '100%', textAlign: 'left', padding: 14 }} onClick={() => setGuide('c')}>
        <CircleHelp size={20} color="var(--euca)" />
        <div className="grow">
          <div className="h3">Можно ли?</div>
          <div className="tiny muted">Проверить продукт: можно, в меру или пока нет</div>
        </div>
        <ChevronRight size={18} className="muted" />
      </motion.button>

      <div className="chips" style={{ marginTop: 18 }}>
        {[0, 1, 2, 3].map((w) => (
          <button key={w} className={'chip' + (week === w ? ' on' : '')} onClick={() => setWeek(w)}>
            Неделя {w + 1}
          </button>
        ))}
      </div>

      <div className="stack" style={{ marginTop: 12, gap: 10 }}>
        {Array.from({ length: 7 }, (_, i) => {
          const k = addDays(cycleStart, week * 7 + i)
          const ms = dayMeals(k, st)
          if (!ms) return null
          const t = dayTotals(ms)
          const isToday = k === today
          return (
            <motion.button
              key={k}
              whileTap={{ scale: 0.985 }}
              className="card"
              style={{ textAlign: 'left', padding: 14, boxShadow: isToday ? 'var(--shadow), inset 0 0 0 2px var(--olive)' : undefined }}
              onClick={() => openDay(k)}
            >
              <div className="row between">
                <div className="row" style={{ gap: 8 }}>
                  <span style={{ fontWeight: 800 }}>{weekdayShort(k)}, {fmtDay(k)}</span>
                  {isToday && <span className="tag">сегодня</span>}
                </div>
                <span className="tiny muted num">{Math.round(t.k)} ккал</span>
              </div>
              <div className="stack" style={{ gap: 5, marginTop: 10 }}>
                {ms.map((m) => (
                  <div key={m.slot} className="row small" style={{ gap: 8, opacity: m.status === 'skipped' ? 0.5 : 1 }}>
                    <span style={{ width: 22, textAlign: 'center' }}>{(m.recipe || m.ready).emoji}</span>
                    <span className="grow" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: m.status === 'eaten' ? 'var(--muted)' : 'var(--ink)' }}>
                      {(m.recipe || m.ready).name}
                    </span>
                    {m.status === 'eaten' && <span style={{ color: 'var(--olive)', fontWeight: 800 }}>✓</span>}
                  </div>
                ))}
              </div>
            </motion.button>
          )
        })}
      </div>

      <motion.button whileTap={{ scale: 0.98 }} className="card row" style={{ marginTop: 16, gap: 12, width: '100%', textAlign: 'left' }} onClick={() => setGuide('r')}>
        <Sprout size={22} color="var(--olive)" />
        <div className="grow">
          <div className="h3">После 4 недель: возвращаем продукты</div>
          <div className="tiny muted">План второго этапа по группам FODMAP</div>
        </div>
        <ChevronRight size={18} className="muted" />
      </motion.button>

      <RecipeLibrary open={lib} onClose={() => setLib(false)} />
      <CheckerSheet open={guide === 'c'} onClose={() => setGuide(null)} />
      <PrepSheet open={guide === 'prep'} onClose={() => setGuide(null)} />
      <Sheet open={guide === 'r'} onClose={() => setGuide(null)} title="Второй этап">
        <Reintro />
      </Sheet>
      <Sheet open={guide === 'p'} onClose={() => setGuide(null)} title="Принципы питания">
        <Principles />
      </Sheet>
    </div>
  )
}

export function RecipeLibrary({ open, onClose }) {
  const [q, setQ] = useState('')
  const [slot, setSlot] = useState('all')
  const [cur, setCur] = useState(null)
  const list = RECIPES.filter((r) => (slot === 'all' ? true : slot === 'base' ? r.base : r.slot.includes(slot)) && r.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <Sheet open={open && !cur} onClose={onClose} title="Рецепты">
        <div className="row" style={{ position: 'relative', marginBottom: 12 }}>
          <Search size={17} style={{ position: 'absolute', left: 14, color: 'var(--muted)' }} />
          <input className="input" style={{ paddingLeft: 40 }} placeholder="Найти блюдо" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="chips" style={{ marginBottom: 12 }}>
          {[['all', 'Все'], ...SLOTS.map(([k, n]) => [k, n]), ['base', 'Основы']].map(([k, n]) => (
            <button key={k} className={'chip' + (slot === k ? ' on' : '')} onClick={() => setSlot(k)}>{n}</button>
          ))}
        </div>
        <div className="list">
          {list.map((r) => {
            const nut = nutrition(baseAmounts(r.id))
            return (
              <button key={r.id} className="li" onClick={() => setCur(r)}>
                <div className={'dish ' + (r.slot[0] || '')} style={{ width: 44, height: 44, fontSize: 23, borderRadius: 15 }}>{r.emoji}</div>
                <div className="grow">
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{r.name}</div>
                  <div className="tiny muted">{r.base ? 'основа' : `${Math.round(nut.k)} ккал · ${r.time} мин`}</div>
                </div>
              </button>
            )
          })}
        </div>
      </Sheet>
      <Sheet open={!!cur} onClose={() => setCur(null)}>
        {cur && <RecipeView r={cur} />}
      </Sheet>
    </>
  )
}

function RecipeView({ r }) {
  const am = baseAmounts(r.id)
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="row" style={{ gap: 14 }}>
        <div className={'dish lg ' + (r.slot[0] || '')}>{r.emoji}</div>
        <div>
          <h2 className="h2">{r.name}</h2>
          <div className="tiny muted" style={{ marginTop: 4 }}>{r.time} мин · на 1 порцию</div>
        </div>
      </div>
      {!r.base && <div className="card"><Macro nut={nutrition(am)} big /></div>}
      <div className="list">
        {Object.entries(am).map(([id, q]) => (
          <div key={id} className="li" style={{ minHeight: 44, padding: '10px 16px' }}>
            <div className="grow">{ING[id].name}</div>
            <div className="small num" style={{ fontWeight: 700 }}>{fmtQty(id, q)}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <ol className="steps">
          {r.steps.map((s, i) => <li key={i} style={{ fontSize: 14.5 }}><span>{s}</span></li>)}
        </ol>
      </div>
      {r.why && <div className="card flat small">{r.why}</div>}
    </div>
  )
}
