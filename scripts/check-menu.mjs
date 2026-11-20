// Проверка меню: КБЖУ по дням, все ли ингредиенты есть в справочнике.
import { ING } from '../src/data/ingredients.js'
import { REC } from '../src/data/recipes.js'
import { planForDay, PLAN_DAYS } from '../src/data/menu.js'

const grams = (id, q) => (ING[id].unit === 'pc' ? q * ING[id].pw : q)
function nut(rid) {
  const r = REC[rid]
  if (!r) throw new Error('нет рецепта ' + rid)
  const t = { k: 0, p: 0, f: 0, c: 0 }
  for (const [id, q] of r.ing) {
    if (!ING[id]) throw new Error(`нет продукта ${id} в ${rid}`)
    const g = grams(id, q)
    for (const x of 'kpfc') t[x] += (ING[id][x] * g) / 100
  }
  return t
}
for (const r of Object.values(REC)) nut(r.id)

const per = {}
for (const r of Object.values(REC)) {
  const n = nut(r.id)
  per[r.id] = n
}
console.log('Рецепты:')
for (const [id, n] of Object.entries(per)) console.log(id.padEnd(20), Math.round(n.k), 'Б', Math.round(n.p), 'Ж', Math.round(n.f), 'У', Math.round(n.c))
console.log('\nДни:')
let sum = { k: 0, p: 0, f: 0, c: 0 }
for (let d = 0; d < PLAN_DAYS; d++) {
  const p = planForDay(d)
  const t = { k: 0, p: 0, f: 0, c: 0 }
  for (const s of 'blsd') for (const x of 'kpfc') t[x] += per[p[s]][x]
  for (const x of 'kpfc') sum[x] += t[x]
  console.log(String(d + 1).padStart(2), Math.round(t.k), 'Б', Math.round(t.p), 'Ж', Math.round(t.f), 'У', Math.round(t.c), ' ', p.b, p.l, p.s, p.d)
}
console.log('Средн.', ...Object.values(sum).map((v) => Math.round(v / PLAN_DAYS)))
