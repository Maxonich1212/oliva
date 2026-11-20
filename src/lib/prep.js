// Заготовки на неделю: что сделать заранее в выходные, чтобы в будни готовить меньше.
import { settings, dayMeals, addDays, parseKey, keyOf, todayKey, weekdayShort, fmtQty, diffDays } from './plan'
import { ING } from '../data/ingredients'
import { SLOT_NAME } from '../data/recipes'

const GRAINS = {
  buckwheat: ['Гречку', 2.5, 15, '1 часть крупы на 2 части воды, 15 минут'],
  rice: ['Рис', 3, 20, '1 : 2, 20 минут под крышкой'],
  quinoa: ['Киноа', 3, 15, 'промыть, 1 : 2, 15 минут'],
}

// Понедельник недели заготовок: в сб/вс — ближайший, в будни — текущий
export function prepMonday(k = todayKey()) {
  const d = parseKey(k)
  const wd = d.getDay()
  if (wd === 6) d.setDate(d.getDate() + 2)
  else if (wd === 0) d.setDate(d.getDate() + 1)
  else d.setDate(d.getDate() - (wd - 1))
  return keyOf(d)
}

export function prepTasks(monday, st = settings()) {
  const today = todayKey()
  const from = diffDays(today, monday) > 0 ? today : monday
  const days = []
  for (let i = 0; i < 7; i++) {
    const k = addDays(monday, i)
    if (k < from) continue
    const ms = dayMeals(k, st)
    if (ms) days.push({ k, ms: ms.filter((m) => m.status !== 'eaten' && m.status !== 'skipped') })
  }
  if (!days.length) return []
  const near = (n) => days.filter((d) => diffDays(d.k, from) < n)
  const tasks = []
  const cooking = (m) => m.recipe && !m.leftover

  // 1. Разморозка: рыба и мясо для ужинов первых двух дней
  const thaw = {}
  for (const d of near(2)) for (const m of d.ms) {
    if (!cooking(m) || m.slot !== 'd') continue
    for (const [id, q] of Object.entries(m.amounts)) {
      if (q && ING[id]?.frozenOk && ['fish', 'meat'].includes(ING[id].dept)) {
        ;(thaw[id] ||= { q: 0, days: [] }).q += q * m.portions
        thaw[id].days.push(weekdayShort(d.k).toLowerCase())
      }
    }
  }
  for (const [id, t] of Object.entries(thaw))
    tasks.push({ id: 'thaw-' + id, emoji: '❄️', title: `Разморозить: ${ING[id].name.toLowerCase()} ${fmtQty(id, t.q)}`, detail: `Из морозилки в холодильник — к ужину (${t.days.join(', ')}). Если покупала охлаждённое — пропусти.`, min: 2 })

  // 2. Крупы на 3 дня
  const grains = {}
  for (const d of near(3)) for (const m of d.ms) {
    if (!cooking(m)) continue
    const mult = m.slot === 'd' ? m.portions : 1
    for (const g of Object.keys(GRAINS)) {
      const q = m.amounts[g]
      if (q) {
        ;(grains[g] ||= { q: 0, for: [] }).q += q * mult
        grains[g].for.push(`${weekdayShort(d.k).toLowerCase()} ${SLOT_NAME[m.slot].toLowerCase()}`)
      }
    }
  }
  for (const [g, v] of Object.entries(grains)) {
    const [name, yieldK, min, how] = GRAINS[g]
    const dry = Math.round(v.q / 5) * 5
    tasks.push({ id: 'grain-' + g, emoji: '🍚', title: `Сварить ${name.toLowerCase()}: ${dry} г сухой`, detail: `≈ ${Math.round((dry * yieldK) / 10) * 10} г готовой, ${how}. Хранить в контейнере в холодильнике до 3 дней. Пойдёт на: ${[...new Set(v.for)].join('; ')}.`, min })
  }

  // 3. Яйца вкрутую на неделю
  let eggs = 0
  for (const d of days) for (const m of d.ms) if (cooking(m) && ['egg_snack', 'buckwheat_egg'].includes(m.recipeId)) eggs += m.amounts.egg || 0
  if (eggs) tasks.push({ id: 'eggs', emoji: '🥚', title: `Сварить ${Math.ceil(eggs)} ${Math.ceil(eggs) < 5 ? 'яйца' : 'яиц'} вкрутую`, detail: '9 минут после закипания, сразу в холодную воду. Хранятся в скорлупе до 5 дней.', min: 12 })

  // 4. Чесночное масло на 4 дня
  let oil = 0
  for (const d of near(4)) for (const m of d.ms) if (cooking(m) && m.amounts.garlic_oil) oil += m.amounts.garlic_oil * (m.slot === 'd' ? m.portions : 1)
  if (oil) tasks.push({ id: 'garlic-oil', emoji: '🧄', title: 'Сделать чесночное масло', detail: `Нужно ≈ ${Math.max(30, Math.ceil(oil / 10) * 10)} мл на ближайшие дни. Рецепт — «Чесночное масло» в разделе «Рецепты». Хранить в холодильнике до 4 дней.`, min: 10 })

  // 5. Выпечка и десерты
  const cnt = (rid, list = days) => list.reduce((a, d) => a + d.ms.filter((m) => cooking(m) && m.recipeId === rid).length, 0)
  const cookies = cnt('oat_cookies')
  if (cookies) tasks.push({ id: 'cookies', emoji: '🍪', title: `Испечь овсяное печенье: ${cookies} ${cookies === 1 ? 'порция' : 'порции'}`, detail: 'Умножь рецепт на количество порций. Хранить в закрытой банке до 4 дней.', min: 25 })
  const pc = cnt('panna_cotta', near(3))
  if (pc) tasks.push({ id: 'panna', emoji: '🍮', title: `Сделать панна-котту: ${pc} ${pc === 1 ? 'порция' : 'порции'}`, detail: 'Застывает 3–4 часа, в холодильнике хранится 3 дня.', min: 15 })

  // 6. Овощи для перекусов
  const sticks = cnt('cheese_carrot', near(4))
  if (sticks) tasks.push({ id: 'carrot', emoji: '🥕', title: `Нарезать морковные палочки: ${sticks} ${sticks === 1 ? 'перекус' : 'перекуса'}`, detail: 'Храни в банке с холодной водой — 4 дня останутся хрустящими.', min: 7 })

  // 7. Контейнеры для обедов на работу
  const togo = days.filter((d) => ![0, 6].includes(parseKey(d.k).getDay()) && d.ms.some((m) => m.slot === 'l')).length
  if (togo) tasks.push({ id: 'boxes', emoji: '🍱', title: `Подготовить ${togo} ${togo < 5 ? 'контейнера' : 'контейнеров'} для обедов`, detail: 'Обед — вторая порция вчерашнего ужина: разложи её сразу после готовки, пока тёплая.', min: 3 })

  return tasks
}
