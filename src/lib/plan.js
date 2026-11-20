import { useStore, get, put, putMany, byKind } from './store'
import { ING } from '../data/ingredients'
import { REC } from '../data/recipes'
import { READY_BY } from '../data/ready'
import { planForDay, PLAN_DAYS } from '../data/menu'

// ───── даты (локальные, без часовых поясов) ─────
export const pad = (n) => String(n).padStart(2, '0')
export const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parseKey = (k) => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const addDays = (k, n) => {
  const d = parseKey(k)
  d.setDate(d.getDate() + n)
  return keyOf(d)
}
export const diffDays = (a, b) => Math.round((parseKey(a) - parseKey(b)) / 864e5)
export const todayKey = () => keyOf(new Date())
const WD = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']
const WD_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
export const fmtDay = (k) => {
  const d = parseKey(k)
  return `${d.getDate()} ${MON[d.getMonth()]}`
}
export const weekday = (k) => WD[parseKey(k).getDay()]
export const weekdayShort = (k) => WD_SHORT[parseKey(k).getDay()]
export const isWeekend = (k) => [0, 6].includes(parseKey(k).getDay())

// ───── настройки ─────
export const DEFAULTS = {
  startDate: '2026-11-23',
  repeat: true,
  times: {
    wd: { b: '07:00', l: '12:30', s: '16:00', d: '19:30' },
    we: { b: '10:00', l: '14:00', s: '17:00', d: '20:00' },
  },
  feelMode: 'every', // every | dinner | off
  height: null,
  startWeight: null,
  goalWeight: null,
  onboarded: false,
}
export const settings = () => ({ ...DEFAULTS, ...(get('settings') || {}) })
export const useSettings = () => useStore((s) => s.records.settings)
export function saveSettings(part) {
  put('settings', 'settings', { ...(get('settings') || {}), ...part })
}

// Номер дня плана (0..27) или null, если дата вне плана
export function dayIndex(k, st = settings()) {
  const n = diffDays(k, st.startDate)
  if (n < 0) return null
  if (n >= PLAN_DAYS && !st.repeat) return null
  return n
}
export const cycleOf = (n) => Math.floor(n / PLAN_DAYS) + 1

// ───── продукты/количества ─────
export const grams = (id, q) => (ING[id]?.unit === 'pc' ? q * ING[id].pw : q)
export function nutrition(amounts) {
  const t = { k: 0, p: 0, f: 0, c: 0 }
  for (const [id, q] of Object.entries(amounts)) {
    const i = ING[id]
    if (!i) continue
    const g = grams(id, q)
    t.k += (i.k * g) / 100
    t.p += (i.p * g) / 100
    t.f += (i.f * g) / 100
    t.c += (i.c * g) / 100
  }
  return t
}
export const baseAmounts = (rid) => Object.fromEntries((REC[rid]?.ing || []).map(([id, q]) => [id, q]))

export function fmtQty(id, q, { short } = {}) {
  const i = ING[id]
  if (!i) return ''
  if (q === 0) return 'по вкусу'
  if (i.unit === 'pc') {
    if (id === 'lemon' && q < 1) {
      const f = Math.max(0.25, Math.ceil(q * 4 - 1e-6) / 4)
      return `${f === 0.25 ? '¼' : f === 0.5 ? '½' : '¾'} лимона`
    }
    const v = Math.round(q * 4) / 4
    const s = v === 0.5 ? '½' : v === 0.25 ? '¼' : v === 0.75 ? '¾' : String(+v.toFixed(2)).replace('.', ',')
    return `${s} ${id === 'nori' ? 'лист' : short ? 'шт' : 'шт'}`
  }
  const u = i.unit === 'ml' ? 'мл' : 'г'
  const r = q >= 100 ? Math.round(q / 5) * 5 : Math.round(q)
  return `${r} ${u}`
}

// ───── приёмы пищи ─────
const mealId = (k, slot) => `meal:${k}:${slot}`
export const mealRec = (k, slot) => get(mealId(k, slot)) || {}

// Действующий рецепт ужина дня k (с учётом замены)
function dinnerEff(k, st) {
  const n = dayIndex(k, st)
  if (n == null) return null
  const r = mealRec(k, 'd')
  return r.recipe || planForDay(n % PLAN_DAYS).d
}

// Полное описание приёма пищи
export function meal(k, slot, st = settings()) {
  const n = dayIndex(k, st)
  if (n == null) return null
  const plan = planForDay(n % PLAN_DAYS)
  const rec = mealRec(k, slot)
  const times = isWeekend(k) ? st.times.we : st.times.wd
  let recipeId = rec.recipe || plan[slot]
  let leftover = false
  let leftoverFrom = null

  // обед — остаток вчерашнего ужина
  if (slot === 'l' && plan.lFrom === 'prev' && !rec.recipe && n > 0) {
    const yk = addDays(k, -1)
    const yd = dinnerEff(yk, st)
    const yrec = mealRec(yk, 'd')
    if (yd && REC[yd]?.batch && yrec.status !== 'skipped') {
      recipeId = yd
      leftover = true
      leftoverFrom = yk
    } else if (yd && !REC[yd]?.batch) {
      // вчера ужин заменили на блюдо без остатков — готовим запланированное отдельно
      recipeId = plan.l
    }
  }

  const ready = recipeId?.startsWith('r_') ? READY_BY[recipeId] : null
  const recipe = ready ? null : REC[recipeId]
  let amounts = recipe ? { ...baseAmounts(recipeId), ...(rec.amounts || {}) } : {}
  if (leftover && !rec.amounts) {
    const yrec = mealRec(leftoverFrom, 'd')
    if (yrec.amounts) amounts = { ...baseAmounts(recipeId), ...yrec.amounts }
  }
  const nut = ready ? { k: ready.k, p: ready.p, f: ready.f, c: ready.c } : nutrition(amounts)

  // ужин, у которого завтра будет обед-остаток → готовим ×2
  let portions = 1
  if (slot === 'd' && recipe?.batch) {
    const tk = addDays(k, 1)
    const tn = dayIndex(tk, st)
    if (tn != null && planForDay(tn % PLAN_DAYS).lFrom === 'prev') {
      const trec = mealRec(tk, 'l')
      if (!trec.recipe && trec.status !== 'skipped') portions = 2
    }
  }

  return {
    k, slot, n, time: times[slot], recipeId, recipe, ready, amounts, nut, portions,
    leftover, leftoverFrom, swapped: !!rec.recipe, planned: plan[slot],
    status: rec.status || null, custom: !!rec.amounts, rec,
  }
}

export function dayMeals(k, st = settings()) {
  if (dayIndex(k, st) == null) return null
  return ['b', 'l', 's', 'd'].map((s) => meal(k, s, st))
}
export function dayTotals(meals, onlyEaten) {
  const t = { k: 0, p: 0, f: 0, c: 0 }
  for (const m of meals || []) {
    if (!m || m.status === 'skipped') continue
    if (onlyEaten && m.status !== 'eaten') continue
    for (const x of 'kpfc') t[x] += m.nut[x]
  }
  return t
}

// Сколько продуктов уйдёт на этот приём пищи (для списания со склада)
function usageOf(m) {
  if (!m.recipe) return {}
  if (m.leftover) {
    const y = mealRec(m.leftoverFrom, 'd')
    if (y.status === 'eaten' && (y.cookedFor || []).includes(m.k)) return {}
  }
  const mult = m.slot === 'd' ? m.portions : 1
  const u = {}
  for (const [id, q] of Object.entries(m.amounts)) {
    if (!q || ING[id]?.staple) continue
    u[id] = q * mult
  }
  return u
}

const stockId = (id) => `pantry:${id}`
export const stockOf = (id) => get(stockId(id))?.qty || 0

export function setStatus(m, status) {
  const prev = m.rec
  const writes = []
  // откат прошлого списания
  const delta = {}
  for (const [id, q] of Object.entries(prev.used || {})) delta[id] = (delta[id] || 0) + q
  let used = null
  let cookedFor = null
  if (status === 'eaten') {
    used = {}
    // списываем только то, что реально есть в запасах — чтобы отмена не «нарисовала» лишнего
    for (const [id, q] of Object.entries(usageOf(m))) {
      const avail = stockOf(id) + (delta[id] || 0)
      const take = Math.min(avail, q)
      if (take > 0) {
        used[id] = Math.round(take * 100) / 100
        delta[id] = (delta[id] || 0) - take
      }
    }
    if (m.slot === 'd' && m.portions === 2) cookedFor = [addDays(m.k, 1)]
  }
  for (const [id, d] of Object.entries(delta)) {
    if (Math.abs(d) < 1e-9) continue
    const cur = get(stockId(id)) || {}
    writes.push({ id: stockId(id), kind: 'pantry', data: { ...cur, qty: Math.max(0, Math.round(((cur.qty || 0) + d) * 100) / 100) } })
  }
  writes.push({
    id: mealId(m.k, m.slot),
    kind: 'meal',
    data: { ...prev, status: status || null, used: used || undefined, cookedFor: cookedFor || undefined, at: Date.now() },
  })
  putMany(writes)
}

export function swapMeal(m, recipeId) {
  const prev = m.rec
  const data = { ...prev, recipe: recipeId === m.planned && !m.leftover ? undefined : recipeId, amounts: undefined }
  put(mealId(m.k, m.slot), 'meal', data)
}
export function setAmounts(m, amounts) {
  const base = m.recipe ? baseAmounts(m.recipeId) : {}
  const same = Object.keys(base).every((id) => Math.abs((amounts[id] ?? 0) - base[id]) < 1e-6)
  put(mealId(m.k, m.slot), 'meal', { ...m.rec, amounts: same ? undefined : amounts })
}

// ───── список покупок ─────
// Что нужно на даты [from..to] с учётом уже съеденного, остатков и запасов
export function shoppingNeed(from, to, st = settings()) {
  const need = {}
  const staples = new Set()
  const ready = []
  const days = diffDays(to, from)
  for (let i = 0; i <= days; i++) {
    const k = addDays(from, i)
    const ms = dayMeals(k, st)
    if (!ms) continue
    for (const m of ms) {
      if (m.status === 'eaten' || m.status === 'skipped') continue
      if (m.ready) {
        ready.push(m)
        continue
      }
      if (!m.recipe) continue
      if (m.leftover) {
        const y = mealRec(m.leftoverFrom, 'd')
        if (y.status === 'eaten' && (y.cookedFor || []).includes(m.k)) continue
        if (m.leftoverFrom >= from && y.status !== 'eaten') continue // посчитано в ужине ×2
      }
      const mult = m.slot === 'd' ? m.portions : 1
      for (const [id, q] of Object.entries(m.amounts)) {
        if (ING[id]?.staple) {
          staples.add(id)
          continue
        }
        if (!q) continue
        need[id] = (need[id] || 0) + q * mult
      }
    }
  }
  const items = []
  for (const [id, q] of Object.entries(need)) {
    const have = stockOf(id)
    items.push({ id, need: q, have, buy: Math.max(0, q - have) })
  }
  const stapleItems = [...staples].map((id) => ({ id, have: get(stockId(id))?.have }))
  return { items, staples: stapleItems, ready }
}

// Сколько предложить «купила»: округляем до упаковок
export function suggestBuy(id, q) {
  const i = ING[id]
  if (!i) return q
  if (i.unit === 'pc') return Math.ceil(q - 1e-6)
  if (i.pack && ['dairy', 'grain', 'nuts', 'sweet', 'can', 'fish'].includes(i.dept)) return Math.ceil(q / i.pack - 1e-6) * i.pack
  return Math.ceil(q / 50) * 50
}
export function packHint(id, q) {
  const i = ING[id]
  if (!i?.pack || i.unit === 'pc') return ''
  const n = q / i.pack
  if (n <= 0) return ''
  const u = i.unitName || 'уп.'
  const r = Math.ceil(n - 0.05)
  return `≈ ${r} ${u} по ${i.pack} ${i.unit === 'ml' ? 'мл' : 'г'}`
}

export function addStock(id, q) {
  const cur = get(stockId(id)) || {}
  put(stockId(id), 'pantry', { ...cur, qty: Math.max(0, Math.round(((cur.qty || 0) + q) * 100) / 100) })
}
export function setStock(id, data) {
  const cur = get(stockId(id)) || {}
  put(stockId(id), 'pantry', { ...cur, ...data })
}
export const pantryList = () => byKind('pantry').map((r) => ({ id: r.id.slice(7), ...r.data }))

// Что подготовить вечером к завтрашнему дню
export function prepFor(k, st = settings()) {
  const ms = dayMeals(k, st) || []
  const out = []
  for (const m of ms) {
    if (m.recipe?.prep && !m.leftover && m.status !== 'skipped') out.push({ text: m.recipe.prep, m })
  }
  return out
}
