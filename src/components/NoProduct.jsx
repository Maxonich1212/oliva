import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sheet } from './ui'
import { useStore, toast } from '../lib/store'
import { affectedBy, suggestDish, subIngredient, swapMeal, SUBS, stockOf, fmtDay, weekdayShort, fmtQty } from '../lib/plan'
import { ING } from '../data/ingredients'
import { REC, SLOT_NAME } from '../data/recipes'
import { StoreLinks } from './StoreInfo'

// «Нет продукта»: показывает блюда, где он нужен, и предлагает замену продукта или блюда целиком
export function NoProductSheet({ id, onClose }) {
  return (
    <Sheet open={!!id} onClose={onClose} title={id ? `Нет: ${ING[id].name.toLowerCase()}` : ''}>
      {id && <Body id={id} onClose={onClose} />}
    </Sheet>
  )
}

function Body({ id, onClose }) {
  useStore((s) => s.records)
  const [picked, setPicked] = useState({})
  const meals = affectedBy(id)
  const subs = (SUBS[id] || []).filter((x) => ING[x])
  const sugg = Object.fromEntries(meals.map((m) => [m.k + m.slot, suggestDish(m, id)]))

  if (!meals.length)
    return (
      <div className="stack" style={{ gap: 12 }}>
        <div className="small">В меню на ближайшую неделю этот продукт больше не нужен — ничего менять не надо.</div>
        <button className="btn primary block" onClick={onClose}>Хорошо</button>
      </div>
    )

  const applySub = (to) => {
    for (const m of meals) subIngredient(m, id, to)
    toast(`Заменила на «${ING[to].name.toLowerCase()}» в ${meals.length} ${meals.length === 1 ? 'блюде' : 'блюдах'}`)
    onClose()
  }
  const applyDishes = () => {
    let n = 0
    for (const m of meals) {
      const rid = picked[m.k + m.slot] ?? sugg[m.k + m.slot]?.id
      if (rid) {
        swapMeal(m, rid)
        n++
      }
    }
    toast(`Заменено блюд: ${n}`)
    onClose()
  }

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="small muted">Нужен в {meals.length} {meals.length === 1 ? 'блюде' : 'блюдах'} на ближайшую неделю. Выбери, как поступить:</div>

      {subs.length > 0 && (
        <div className="card stack" style={{ gap: 10 }}>
          <div className="h3">Заменить продукт — блюда останутся</div>
          <div className="row wrap" style={{ gap: 8 }}>
            {subs.map((s) => (
              <motion.button key={s} whileTap={{ scale: 0.95 }} className="chip" onClick={() => applySub(s)}>
                {ING[s].name}
                {stockOf(s) > 0 && <span className="tiny" style={{ color: 'var(--olive)', fontWeight: 800 }}>· есть дома</span>}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      <div className="card stack" style={{ gap: 10 }}>
        <div className="h3">Или заменить блюда</div>
        <div className="stack" style={{ gap: 10 }}>
          {meals.map((m) => {
            const key = m.k + m.slot
            const s = sugg[key]
            const cur = picked[key] ?? s?.id
            return (
              <div key={key}>
                <div className="tiny muted">{weekdayShort(m.k)}, {fmtDay(m.k)} · {SLOT_NAME[m.slot].toLowerCase()} · нужно {fmtQty(id, m.amounts[id] * (m.slot === 'd' ? m.portions : 1))}</div>
                <div className="small" style={{ textDecoration: 'line-through', color: 'var(--muted)' }}>{m.recipe.name}</div>
                {cur && (
                  <div className="small" style={{ fontWeight: 650 }}>
                    → {REC[cur].emoji} {REC[cur].name}
                    {s && cur === s.id && <span className="tiny" style={{ color: s.miss ? 'var(--terra)' : 'var(--olive)', fontWeight: 800 }}> · {s.miss ? `докупить ${s.miss}` : 'всё есть дома'}</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <button className="btn primary block" onClick={applyDishes}>Заменить блюда</button>
      </div>

      <div className="card stack" style={{ gap: 8 }}>
        <div className="h3">Поискать в других магазинах</div>
        <StoreLinks id={id} />
      </div>
    </div>
  )
}
