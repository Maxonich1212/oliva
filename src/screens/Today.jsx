import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, ChevronLeft, ChevronRight, Check, Moon, Briefcase, ShoppingBasket, CloudOff, Cloud, RefreshCw } from 'lucide-react'
import { useStore, get, put } from '../lib/store'
import { settings, dayMeals, dayTotals, dayIndex, fmtDay, weekday, addDays, todayKey, parseKey, keyOf, weekdayShort, prepFor, setStatus, cycleOf, diffDays } from '../lib/plan'
import { PLAN_DAYS } from '../data/menu'
import { SLOT_NAME } from '../data/recipes'
import { MealSheet, markEaten } from '../components/MealSheet'
import { Macro } from '../components/ui'
import { feelId, FEELS } from '../components/FeelPrompt'

const cap = (s) => s[0].toUpperCase() + s.slice(1)
const mondayOf = (k) => {
  const d = parseKey(k)
  const wd = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - wd)
  return keyOf(d)
}

export default function Today({ day, setDay, openSettings, goShop }) {
  useStore((s) => s.records)
  const sync = useStore((s) => s.sync)
  const user = useStore((s) => s.user)
  const [sel, setSel] = useState(null)
  const st = settings()
  const meals = dayMeals(day, st)
  const n = dayIndex(day, st)
  const today = todayKey()
  const plan = dayTotals(meals)
  const eaten = dayTotals(meals, true)
  const tomorrow = addDays(day, 1)
  const prep = prepFor(tomorrow, st)
  const tMeals = dayMeals(tomorrow, st)
  const tDinner = tMeals?.[3]

  return (
    <div>
      <header className="row between" style={{ marginTop: 6 }}>
        <div className="eyebrow">
          {n == null
            ? diffDays(st.startDate, day) > 0
              ? `До старта ${diffDays(st.startDate, day)} дн.`
              : 'Вне плана'
            : `День ${(n % PLAN_DAYS) + 1} из ${PLAN_DAYS} · неделя ${Math.floor((n % PLAN_DAYS) / 7) + 1}${cycleOf(n) > 1 ? ` · круг ${cycleOf(n)}` : ''}`}
        </div>
        <div className="row" style={{ gap: 8 }}>
          <span title={sync.error || ''} className="muted" style={{ display: 'grid' }}>
            {!user ? <CloudOff size={17} /> : sync.status === 'syncing' ? <RefreshCw size={16} className="spin" /> : sync.status === 'error' ? <CloudOff size={17} color="var(--terra)" /> : <Cloud size={17} />}
          </span>
          <button className="icon-btn" onClick={openSettings} aria-label="Настройки">
            <Settings size={19} />
          </button>
        </div>
      </header>
      <h1 className="h1" style={{ marginTop: 6, fontSize: 27 }}>
        {day === today ? 'Сегодня' : day === addDays(today, 1) ? 'Завтра' : day === addDays(today, -1) ? 'Вчера' : cap(weekday(day))}
        <span style={{ color: 'var(--muted)', fontWeight: 500 }}>, {fmtDay(day)}</span>
      </h1>

      <WeekStrip day={day} setDay={setDay} st={st} />

      {!meals ? (
        <BeforeStart st={st} setDay={setDay} goShop={goShop} />
      ) : (
        <>
          <motion.div layout className="card" style={{ marginTop: 16 }}>
            <div className="row between" style={{ alignItems: 'flex-end' }}>
              <div>
                <div className="eyebrow">План на день</div>
                <div className="num" style={{ fontFamily: 'var(--serif)', fontSize: 34, fontWeight: 600, lineHeight: 1.1, marginTop: 4 }}>
                  {Math.round(plan.k)} <span className="small muted" style={{ fontFamily: 'var(--sans)' }}>ккал</span>
                </div>
              </div>
              <div className="small muted num" style={{ textAlign: 'right' }}>
                съедено
                <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: 16 }}>{Math.round(eaten.k)}</div>
              </div>
            </div>
            <div className="bar" style={{ margin: '12px 0 14px' }}>
              <motion.i initial={false} animate={{ width: `${Math.min(100, (eaten.k / Math.max(1, plan.k)) * 100)}%` }} />
            </div>
            <Macro nut={plan} />
          </motion.div>

          <div className="stack" style={{ marginTop: 14, gap: 10 }}>
            {meals.map((m) => (
              <MealCard key={m.slot} m={m} onOpen={() => setSel({ k: m.k, slot: m.slot })} />
            ))}
          </div>

          <Water day={day} />

          {(prep.length > 0 || tDinner?.portions === 2 || tMeals?.[1]?.recipe?.togo) && day >= today && (
            <div className="card flat" style={{ marginTop: 14 }}>
              <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                <Moon size={17} color="var(--euca)" />
                <div className="h3">Вечером — к завтра</div>
              </div>
              <div className="stack small" style={{ gap: 6 }}>
                {prep.map((p, i) => (
                  <div key={i}>• {p.text} <span className="muted">({SLOT_NAME[p.m.slot].toLowerCase()})</span></div>
                ))}
                {meals[3]?.portions === 2 && <div>• Ужин готовь на 2 порции — вторую в контейнер на обед</div>}
                {tMeals?.[1]?.recipe?.togo && tMeals[1].leftover && (
                  <div className="row" style={{ gap: 6 }}><Briefcase size={14} /> Утром не забудь контейнер с обедом</div>
                )}
              </div>
            </div>
          )}

          <FeelDay meals={meals} />
        </>
      )}
      <MealSheet sel={sel} onClose={() => setSel(null)} />
    </div>
  )
}

function MealCard({ m, onOpen }) {
  const it = m.recipe || m.ready
  const done = m.status === 'eaten'
  const skip = m.status === 'skipped'
  const feel = get(feelId(m.k, m.slot))
  return (
    <motion.div layout whileTap={{ scale: 0.985 }} className="card row" style={{ padding: 12, gap: 12, opacity: skip ? 0.55 : 1 }} onClick={onOpen}>
      <div className={'dish ' + m.slot} style={{ filter: done ? 'saturate(.6)' : 'none' }}>{it.emoji}</div>
      <div className="grow">
        <div className="row" style={{ gap: 6 }}>
          <span className="eyebrow" style={{ fontSize: 11 }}>{SLOT_NAME[m.slot]}</span>
          <span className="tiny muted num">{m.time}</span>
          {feel && <span style={{ fontSize: 12 }}>{FEELS[feel.score][1]}</span>}
        </div>
        <div style={{ fontWeight: 650, fontSize: 15, lineHeight: 1.3, marginTop: 2, textDecoration: skip ? 'line-through' : 'none' }}>{it.name}</div>
        <div className="tiny muted" style={{ marginTop: 3 }}>
          {Math.round(m.nut.k)} ккал · Б {Math.round(m.nut.p)}
          {m.leftover ? ' · из вчерашнего ужина' : m.recipe ? ` · ${m.recipe.time} мин` : ' · из магазина'}
          {m.slot === 'd' && m.portions === 2 ? ' · ×2 порции' : ''}
          {m.swapped ? ' · замена' : ''}
        </div>
      </div>
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={(e) => {
          e.stopPropagation()
          if (done) setStatus(m, null)
          else markEaten(m)
        }}
        aria-label="Съела"
        style={{
          width: 40, height: 40, borderRadius: 14, display: 'grid', placeItems: 'center', flex: 'none',
          background: done ? 'var(--olive)' : 'var(--card2)', color: done ? 'var(--card)' : 'var(--muted)',
          boxShadow: done ? 'none' : 'inset 0 0 0 1.5px var(--line)',
        }}
      >
        <Check size={20} strokeWidth={done ? 3 : 2} />
      </motion.button>
    </motion.div>
  )
}

function WeekStrip({ day, setDay, st }) {
  const mon = mondayOf(day)
  const today = todayKey()
  return (
    <div className="row" style={{ marginTop: 14, gap: 4 }}>
      <button className="icon-btn plain" style={{ width: 28 }} onClick={() => setDay(addDays(day, -7))} aria-label="Неделя назад">
        <ChevronLeft size={18} />
      </button>
      <div className="row grow" style={{ gap: 4 }}>
        {Array.from({ length: 7 }, (_, i) => {
          const k = addDays(mon, i)
          const ms = dayMeals(k, st)
          const eaten = ms ? ms.filter((m) => m.status === 'eaten').length : 0
          const on = k === day
          return (
            <motion.button
              key={k}
              whileTap={{ scale: 0.92 }}
              onClick={() => setDay(k)}
              style={{
                flex: 1, padding: '8px 0 7px', borderRadius: 16, position: 'relative',
                color: on ? 'var(--card)' : k === today ? 'var(--olive)' : 'var(--ink2)',
              }}
            >
              {on && <motion.span layoutId="daypill" style={{ position: 'absolute', inset: 0, background: 'var(--olive)', borderRadius: 16 }} transition={{ type: 'spring', damping: 30, stiffness: 400 }} />}
              <span style={{ position: 'relative', display: 'block' }}>
                <span className="tiny" style={{ fontWeight: 700, opacity: 0.75 }}>{weekdayShort(k)}</span>
                <span style={{ display: 'block', fontWeight: 800, fontSize: 16 }}>{parseKey(k).getDate()}</span>
                <span style={{ display: 'flex', gap: 2, justifyContent: 'center', marginTop: 3, height: 4 }}>
                  {ms && [0, 1, 2, 3].map((j) => (
                    <i key={j} style={{ width: 4, height: 4, borderRadius: 2, background: j < eaten ? (on ? 'var(--card)' : 'var(--olive)') : on ? 'rgba(255,255,255,.35)' : 'var(--line)' }} />
                  ))}
                </span>
              </span>
            </motion.button>
          )
        })}
      </div>
      <button className="icon-btn plain" style={{ width: 28 }} onClick={() => setDay(addDays(day, 7))} aria-label="Неделя вперёд">
        <ChevronRight size={18} />
      </button>
    </div>
  )
}

function BeforeStart({ st, setDay, goShop }) {
  return (
    <div className="card stack" style={{ marginTop: 16, gap: 14, padding: 20 }}>
      <div style={{ fontSize: 40 }}>🌱</div>
      <h2 className="h2">Старт — {weekday(st.startDate)}, {fmtDay(st.startDate)}</h2>
      <div className="small" style={{ color: 'var(--ink2)' }}>
        Перед стартом отметь в «Запасах», что уже есть дома, — и список покупок на первые дни посчитается сам.
      </div>
      <button className="btn primary" onClick={goShop}>
        <ShoppingBasket size={18} /> Список покупок на старт
      </button>
      <button className="btn" onClick={() => setDay(st.startDate)}>Посмотреть первый день</button>
    </div>
  )
}

// Вода: 8 стаканов по 250 мл — помогает при отёках и запорах
function Water({ day }) {
  const n = get('water:' + day)?.n || 0
  const set = (v) => put('water:' + day, 'water', { n: Math.max(0, Math.min(12, v)) })
  return (
    <div className="card" style={{ marginTop: 14, padding: 14 }}>
      <div className="row between">
        <div>
          <div className="h3">Вода</div>
          <div className="tiny muted num">{String(n * 0.25).replace('.', ',')} из 2 л</div>
        </div>
        <button className="btn ghost sm" onClick={() => set(n - 1)} disabled={!n}>−1</button>
      </div>
      <div className="row" style={{ gap: 6, marginTop: 10 }}>
        {Array.from({ length: 8 }, (_, i) => (
          <motion.button
            key={i}
            whileTap={{ scale: 0.8 }}
            onClick={() => set(i < n ? i : i + 1)}
            aria-label={`Стакан ${i + 1}`}
            style={{ flex: 1, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: i < n ? 'var(--euca-soft)' : 'var(--card2)', boxShadow: i < n ? 'none' : 'inset 0 0 0 1px var(--line)' }}
          >
            <motion.svg width="14" height="18" viewBox="0 0 14 18" initial={false} animate={{ scale: i < n ? 1 : 0.85, opacity: i < n ? 1 : 0.35 }}>
              <path d="M7 1 C7 1 1 8 1 11.5 A6 6 0 0 0 13 11.5 C13 8 7 1 7 1 Z" fill={i < n ? 'var(--euca)' : 'var(--muted)'} />
            </motion.svg>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

function FeelDay({ meals }) {
  const fs = meals.map((m) => get(feelId(m.k, m.slot))).filter(Boolean)
  if (!fs.length) return null
  const avg = fs.reduce((a, f) => a + f.score, 0) / fs.length
  const f = FEELS[Math.round(avg)]
  return (
    <div className="row muted small" style={{ justifyContent: 'center', marginTop: 16, gap: 6 }}>
      <span style={{ fontSize: 18 }}>{f[1]}</span> Самочувствие за день: {f[2].toLowerCase()}
    </div>
  )
}
