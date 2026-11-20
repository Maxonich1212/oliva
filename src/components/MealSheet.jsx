import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { AnimatePresence } from 'framer-motion'
import { Clock, Repeat2, Check, X, SlidersHorizontal, RotateCcw, Briefcase, Snowflake, Info, ShoppingBag, ChevronLeft, ChefHat } from 'lucide-react'
import { CookMode } from './CookMode'
import { Sheet, Stepper, Macro } from './ui'
import { ING } from '../data/ingredients'
import { RECIPES, REC, SLOT_NAME } from '../data/recipes'
import { READY, LABEL_TIPS } from '../data/ready'
import { meal, replaceEverywhere, originalOf, missingFor, setStatus, swapMeal, setAmounts, fmtQty, nutrition, stockOf, settings, fmtDay, weekday, addDays, baseAmounts } from '../lib/plan'
import { toast, useStore } from '../lib/store'

export const askFeel = (m) => {
  const st = settings()
  if (st.feelMode === 'off') return
  if (st.feelMode === 'dinner' && m.slot !== 'd') return
  window.dispatchEvent(new CustomEvent('oliva:feel', { detail: { k: m.k, slot: m.slot } }))
}

export function markEaten(m) {
  setStatus(m, 'eaten')
  askFeel(m)
}

export function MealSheet({ sel, onClose }) {
  const [mode, setMode] = useState('view') // view | edit | swap
  useStore((s) => s.records)
  const last = useRef(null)
  const fresh = sel ? meal(sel.k, sel.slot) : null
  if (fresh) last.current = fresh
  const m = fresh || last.current
  const open = !!sel
  useEffect(() => {
    document.querySelector('.sheet-body')?.scrollTo({ top: 0 })
  }, [mode])
  const [cook, setCook] = useState(false)
  return (
    <>
    <Sheet open={open} onClose={() => { setMode('view'); onClose() }}>
      {m && mode === 'view' && <View m={m} setMode={setMode} onClose={onClose} onCook={() => setCook(true)} />}
      {m && mode === 'edit' && <Edit m={m} back={() => setMode('view')} />}
      {m && mode === 'swap' && <Swap m={m} back={() => setMode('view')} />}
    </Sheet>
    <AnimatePresence>
      {cook && m?.recipe && (
        <CookMode
          m={m}
          onClose={() => setCook(false)}
          onDone={() => {
            setCook(false)
            if (m.status !== 'eaten') markEaten(m)
            onClose()
          }}
        />
      )}
    </AnimatePresence>
    </>
  )
}

function View({ m, setMode, onClose, onCook }) {
  const r = m.recipe
  const ready = m.ready
  const cookMult = m.slot === 'd' ? m.portions : 1
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
        <div className={'dish lg ' + m.slot}>{(r || ready).emoji}</div>
        <div className="grow">
          <div className="eyebrow">
            {SLOT_NAME[m.slot]} · {m.time}
          </div>
          <h2 className="h2" style={{ marginTop: 4 }}>
            {(r || ready).name}
          </h2>
          <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
            {r?.time != null && (
              <span className="tag euca">
                <Clock size={12} /> {r.active ? `${r.active} мин активно` : `${r.time} мин`}
              </span>
            )}
            {m.leftover && <span className="tag">из вчерашнего ужина</span>}
            {m.slot === 'l' && r?.togo && <span className="tag honey"><Briefcase size={12} /> с собой</span>}
            {m.swapped && <span className="tag terra">замена</span>}
            {m.custom && <span className="tag terra">своя граммовка</span>}
            {ready && <span className="tag honey"><ShoppingBag size={12} /> из магазина</span>}
          </div>
        </div>
      </div>

      <div className="card">
        <Macro nut={m.nut} big />
      </div>

      {m.leftover && (
        <div className="card flat row" style={{ gap: 12 }}>
          <span style={{ fontSize: 22 }}>🍱</span>
          <div className="small">Это вторая порция ужина за {fmtDay(m.leftoverFrom)}. Достань контейнер из холодильника — готовить ничего не нужно.</div>
        </div>
      )}
      {cookMult === 2 && (
        <div className="card flat row" style={{ gap: 12 }}>
          <span style={{ fontSize: 22 }}>👩‍🍳</span>
          <div className="small">
            Готовь <b>2 порции</b>: вторую разложи в контейнер — это обед на {weekday(addDays(m.k, 1))}. Ниже количества уже на 2 порции.
          </div>
        </div>
      )}

      {ready && (
        <div className="card stack" style={{ gap: 8 }}>
          <div className="h3">Что купить</div>
          <div className="small">{ready.buy}</div>
          {ready.note && <div className="small muted">{ready.note}</div>}
          <div className="divider" style={{ margin: '6px 0' }} />
          <div className="h3">Читай состав</div>
          {LABEL_TIPS.map((t) => (
            <div key={t} className="small muted">• {t}</div>
          ))}
        </div>
      )}

      {r && (
        <>
          <div>
            <div className="row between" style={{ margin: '4px 4px 10px' }}>
              <div className="h3">Ингредиенты {cookMult === 2 ? '· на 2 порции' : ''}</div>
              <button className="btn ghost sm" onClick={() => setMode('edit')} disabled={m.status === 'eaten'}>
                <SlidersHorizontal size={15} /> Граммовка
              </button>
            </div>
            <div className="list">
              {Object.entries(m.amounts).map(([id, q]) => {
                const ing = ING[id]
                const need = q * cookMult
                const have = ing.staple ? null : stockOf(id)
                const enough = have != null && have >= need - 1e-6
                return (
                  <div className="li" key={id} style={{ minHeight: 46, padding: '10px 16px' }}>
                    <span
                      title={enough ? 'Есть дома' : ''}
                      style={{ width: 8, height: 8, borderRadius: 4, flex: 'none', background: ing.staple ? 'var(--line)' : enough ? 'var(--olive)' : 'var(--terra)', opacity: ing.staple ? 1 : 0.85 }}
                    />
                    <div className="grow">
                      <div style={{ fontSize: 15 }}>{ing.name}</div>
                      {ing.lf && <div className="tiny muted">{ing.lf}</div>}
                    </div>
                    <div className="num small" style={{ fontWeight: 700, color: 'var(--ink2)' }}>
                      {fmtQty(id, need)}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="tiny muted" style={{ margin: '8px 6px 0' }}>
              <span style={{ color: 'var(--olive)' }}>●</span> есть дома · <span style={{ color: 'var(--terra)' }}>●</span> нужно купить
            </div>
          </div>

          {r.prep && !m.leftover && (
            <div className="card flat row" style={{ gap: 12 }}>
              <Snowflake size={20} color="var(--euca)" />
              <div className="small">Накануне вечером: {r.prep.toLowerCase()}.</div>
            </div>
          )}

          {!m.leftover && (
            <div>
              <div className="h3" style={{ margin: '4px 4px 12px' }}>Как готовить</div>
              <div className="card">
                <ol className="steps">
                  {r.steps.map((s, i) => (
                    <li key={i} className="small" style={{ fontSize: 14.5 }}>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
          {r.why && (
            <div className="card flat row" style={{ gap: 12, alignItems: 'flex-start' }}>
              <Info size={18} color="var(--olive)" style={{ flex: 'none', marginTop: 2 }} />
              <div className="small">{r.why}</div>
            </div>
          )}
        </>
      )}

      <div className="stack" style={{ gap: 10, marginTop: 4 }}>
        {r && !m.leftover && m.status !== 'eaten' && (
          <button className="btn terra block" onClick={onCook}>
            <ChefHat size={18} /> Готовить пошагово
          </button>
        )}
        {m.status !== 'eaten' ? (
          <button className="btn primary block" onClick={() => { markEaten(m); onClose() }}>
            <Check size={18} /> Съела
          </button>
        ) : (
          <button className="btn block" onClick={() => setStatus(m, null)}>
            <RotateCcw size={16} /> Отменить «съела»
          </button>
        )}
        <div className="row">
          <button className="btn grow" onClick={() => setMode('swap')} disabled={m.status === 'eaten'}>
            <Repeat2 size={17} /> Заменить
          </button>
          {m.status !== 'skipped' ? (
            <button className="btn grow" onClick={() => { setStatus(m, 'skipped'); toast('Отметила как пропущенный'); onClose() }}>
              <X size={17} /> Пропустить
            </button>
          ) : (
            <button className="btn grow" onClick={() => setStatus(m, null)}>
              <RotateCcw size={16} /> Вернуть
            </button>
          )}
        </div>
        {m.status === 'eaten' && <div className="tiny muted" style={{ textAlign: 'center' }}>Продукты списаны из запасов. Отмена вернёт их обратно.</div>}
      </div>
    </div>
  )
}

function Edit({ m, back }) {
  const [am, setAm] = useState(m.amounts)
  const base = baseAmounts(m.recipeId)
  const nut = nutrition(am)
  const scale = (f) => setAm(Object.fromEntries(Object.entries(base).map(([id, q]) => [id, ING[id].unit === 'pc' ? Math.round(q * f * 4) / 4 : Math.round(q * f)])))
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="row">
        <button className="icon-btn plain" onClick={back}><ChevronLeft /></button>
        <h2 className="h2">Своя граммовка</h2>
      </div>
      <div className="small muted">Приготовила меньше или больше — поменяй количество. КБЖУ, списание из запасов и список покупок пересчитаются. {m.portions === 2 && 'Количества — на 1 порцию.'}</div>
      <div className="card"><Macro nut={nut} big /></div>
      <div className="chips">
        {[0.5, 0.75, 1, 1.25, 1.5].map((f) => (
          <button key={f} className="chip" onClick={() => scale(f)}>{f === 1 ? 'как в рецепте' : `×${String(f).replace('.', ',')}`}</button>
        ))}
      </div>
      <div className="list">
        {Object.entries(am).map(([id, q]) => {
          const ing = ING[id]
          if (ing.staple && !ing.k) return null
          const step = ing.unit === 'pc' ? (ing.pw > 50 ? 0.5 : 1) : q >= 100 ? 10 : 5
          return (
            <div className="li" key={id}>
              <div className="grow small" style={{ fontSize: 14.5 }}>{ing.name}</div>
              <Stepper value={q} step={step} onChange={(v) => setAm({ ...am, [id]: v })} fmt={(v) => fmtQty(id, v, { short: true })} />
            </div>
          )
        })}
      </div>
      <div className="row">
        <button className="btn grow" onClick={() => setAm(base)}><RotateCcw size={16} /> Сбросить</button>
        <button className="btn primary grow" onClick={() => { setAmounts(m, am); toast('Граммовка сохранена'); back() }}>Сохранить</button>
      </div>
    </div>
  )
}

function Swap({ m, back }) {
  const [byStock, setByStock] = useState(false)
  const [everywhere, setEverywhere] = useState(false)
  const mult = m.slot === 'd' ? m.portions : 1
  const list = useMemo(() => {
    const target = m.nut.k
    const recs = RECIPES.filter((r) => r.slot.includes(m.slot) && r.id !== m.recipeId)
      .map((r) => ({ r, nut: nutrition(baseAmounts(r.id)), miss: missingFor(r.id, mult) }))
      .sort((a, b) => (byStock ? a.miss - b.miss : 0) || Math.abs(a.nut.k - target) - Math.abs(b.nut.k - target))
    return recs
  }, [m, byStock, mult])
  const baseId = m.leftover ? null : m.swapped ? null : m.recipeId
  const ready = READY.filter((r) => r.slot.includes(m.slot))
  const pick = (id) => {
    if (everywhere && baseId && !id.startsWith('r_')) {
      replaceEverywhere(originalOf(baseId) || baseId, id)
      toast('Заменила во всех днях плана')
      back()
      return
    }
    swapMeal(m, id)
    toast(m.slot === 'd' && m.portions === 2 && !REC[id]?.batch ? 'Заменила. Завтрашний обед приготовишь отдельно' : 'Блюдо заменено')
    back()
  }
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="row">
        <button className="icon-btn plain" onClick={back}><ChevronLeft /></button>
        <h2 className="h2">Заменить {SLOT_NAME[m.slot].toLowerCase()}</h2>
      </div>
      {(m.swapped || m.leftover) && m.planned !== m.recipeId && (
        <button className="btn block" onClick={() => pick(m.planned)}>
          <RotateCcw size={16} /> Вернуть по плану: {REC[m.planned]?.name}
        </button>
      )}
      {m.slot === 'd' && m.portions === 2 && <div className="small muted">Завтрашний обед поменяется вместе с ужином — это его вторая порция.</div>}
      {baseId && originalOf(baseId) && (
        <button className="btn block" onClick={() => { replaceEverywhere(originalOf(baseId), originalOf(baseId)); toast('Вернула исходное блюдо в план'); back() }}>
          <RotateCcw size={16} /> Вернуть во всём плане: {REC[originalOf(baseId)]?.name}
        </button>
      )}
      <div className="chips">
        <button className={'chip' + (byStock ? ' on' : '')} onClick={() => setByStock(!byStock)}>🏡 Из того, что есть дома</button>
        {baseId && <button className={'chip' + (everywhere ? ' on' : '')} onClick={() => setEverywhere(!everywhere)}>Заменить во всём плане</button>}
      </div>
      {everywhere && <div className="small muted">«{m.recipe?.name}» больше не появится в меню — везде будет выбранное блюдо.</div>}
      <div className="eyebrow" style={{ margin: '6px 4px 0' }}>Приготовить другое</div>
      <div className="list">
        {list.map(({ r, nut, miss }) => (
          <motion.button whileTap={{ scale: 0.98 }} className="li" key={r.id} onClick={() => pick(r.id)}>
            <div className={'dish ' + m.slot} style={{ width: 44, height: 44, fontSize: 23, borderRadius: 15 }}>{r.emoji}</div>
            <div className="grow">
              <div style={{ fontSize: 15, fontWeight: 600 }}>{r.name}</div>
              <div className="tiny muted">{Math.round(nut.k)} ккал · Б {Math.round(nut.p)} · {r.time} мин{r.batch && m.slot === 'd' ? ' · на 2 дня' : ''}</div>
              <div className="tiny" style={{ fontWeight: 700, color: miss ? 'var(--terra)' : 'var(--olive)' }}>{miss ? `не хватает: ${miss}` : 'всё есть дома'}</div>
            </div>
          </motion.button>
        ))}
      </div>
      <div className="eyebrow" style={{ margin: '10px 4px 0' }}>Купить готовое</div>
      <div className="list">
        {ready.map((r) => (
          <motion.button whileTap={{ scale: 0.98 }} className="li" key={r.id} onClick={() => pick(r.id)}>
            <div className="dish" style={{ width: 44, height: 44, fontSize: 23, borderRadius: 15 }}>{r.emoji}</div>
            <div className="grow">
              <div style={{ fontSize: 15, fontWeight: 600 }}>{r.name}</div>
              <div className="tiny muted">≈ {r.k} ккал · Б {r.p} · {r.buy}</div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
