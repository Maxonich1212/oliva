// Push-уведомления.
// Клиент сам рассчитывает, о чём и когда напомнить на 7 дней вперёд, и кладёт это в таблицу push_queue.
// Каждую минуту pg_cron отправляет созревшие напоминания через edge-функцию `push`.
// После любой отметки очередь пересчитывается — поэтому напоминание о еде, которую уже отметила, не придёт.
import { sb } from './supabase'
import { getState } from './store'
import { get } from './store'
import { settings, saveSettings, todayKey, addDays, dayMeals, prepFor, isWeekend, parseKey, shoppingNeed, fmtDay } from './plan'
import { prepMonday, prepTasks } from './prep'
import { SLOT_NAME } from '../data/recipes'
import { ING } from '../data/ingredients'

export const VAPID_PUBLIC = 'BHXyfMkEBxVF0RrLs_MoMYMpfiqG85nNk8cVNlj9isp-kMdmPJeif9IikA4WpJt9389lP1UoXoanle4bSY-KFSA'

export const PUSH_TYPES = [
  ['meals', 'Приёмы пищи', 'в своё время, если ещё не отмечено'],
  ['feel', '«Как живот?»', 'через час после еды'],
  ['prep', 'Подготовка с вечера', '21:00 — разморозить, замочить чиа'],
  ['togo', 'Обед с собой', 'утром в будни'],
  ['water', 'Вода', '11:00, 14:30, 17:30 — если пьёшь мало'],
  ['shop', 'Покупки', '18:00 — если на завтра чего-то не хватает'],
  ['check', 'Итог дня', '21:30 — если что-то не отмечено'],
  ['weigh', 'Взвешивание', 'по понедельникам утром'],
  ['batch', 'День заготовок', 'в субботу в 11:00'],
]
export const pushPrefs = () => ({ ...Object.fromEntries(PUSH_TYPES.map(([k]) => [k, true])), ...(settings().push || {}) })

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const standalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone

export function pushSupport() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    if (isIOS() && !standalone()) return 'install'
    return 'unsupported'
  }
  if (isIOS() && !standalone()) return 'install'
  return Notification.permission // default | granted | denied
}

const b64 = (s) => {
  const p = '='.repeat((4 - (s.length % 4)) % 4)
  const raw = atob((s + p).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export async function enablePush() {
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('Уведомления запрещены в настройках телефона')
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID_PUBLIC) })
  const j = sub.toJSON()
  const { error } = await sb.from('push_subs').upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, ua: navigator.userAgent.slice(0, 200) }, { onConflict: 'endpoint' })
  if (error) throw error
  saveSettings({ pushOn: true })
  await syncQueue(true)
}

export async function disablePush() {
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await sb.from('push_subs').delete().eq('endpoint', sub.endpoint)
      await sub.unsubscribe()
    }
  } catch {
    /* уже отписаны */
  }
  saveSettings({ pushOn: false })
  await sb.from('push_queue').delete().is('sent_at', null)
}

export async function testPush() {
  const { error } = await sb.from('push_queue').insert({ id: 'test-' + Date.now(), at: new Date().toISOString(), title: '🌿 Олива', body: 'Уведомления работают!', url: './', tag: 'test' })
  if (error) throw error
}

// ───── расчёт напоминаний ─────
const at = (k, hm, plusMin = 0) => {
  const [h, m] = hm.split(':').map(Number)
  const d = parseKey(k)
  d.setHours(h, m + plusMin, 0, 0)
  return d
}

export function buildQueue() {
  const st = settings()
  const pr = pushPrefs()
  const now = Date.now()
  const today = todayKey()
  const out = []
  const add = (id, when, title, body, url = './', tag) => {
    if (when.getTime() > now + 20_000) out.push({ id, at: when.toISOString(), title, body, url, tag: tag || id.split(':')[0] })
  }
  for (let i = 0; i < 7; i++) {
    const k = addDays(today, i)
    const ms = dayMeals(k, st)
    if (!ms) continue
    const times = isWeekend(k) ? st.times.we : st.times.wd

    for (const m of ms) {
      const it = m.recipe || m.ready
      if (pr.meals && !m.status) {
        add(`meal:${k}:${m.slot}`, at(k, m.time), `${it.emoji} ${SLOT_NAME[m.slot]} · ${m.time}`, m.leftover ? `${it.name} — из вчерашнего ужина` : `${it.name}${m.slot === 'd' && m.portions === 2 ? ' · готовь 2 порции' : ''}`, `./?day=${k}`)
      }
      if (pr.feel && st.feelMode !== 'off' && m.status === 'eaten' && m.rec.at && !get(`feel:${k}:${m.slot}`) && (st.feelMode !== 'dinner' || m.slot === 'd')) {
        const after = { b: 'завтрака', l: 'обеда', s: 'полдника', d: 'ужина' }[m.slot]
        add(`feel:${k}:${m.slot}`, new Date(m.rec.at + 60 * 60_000), `Как живот после ${after}?`, 'Одно касание — и записано', `./?feel=${k}:${m.slot}`)
      }
    }

    // вечерняя подготовка к завтра
    if (pr.prep) {
      const tk = addDays(k, 1)
      const p = prepFor(tk, st)
      const extra = ms[3]?.portions === 2 && !ms[3].status ? ['вторую порцию ужина — в контейнер'] : []
      const items = [...p.map((x) => x.text.toLowerCase()), ...extra]
      if (items.length) add(`prep:${k}`, at(k, '21:00'), '🌙 Подготовь к завтра', items.join('; '), `./?day=${tk}`)
    }
    // обед с собой (будни)
    if (pr.togo && !isWeekend(k) && ms[1]?.leftover && !ms[1].status) add(`togo:${k}`, at(k, times.b, 25), '🍱 Возьми обед с собой', ms[1].recipe.name, `./?day=${k}`)
    // вода
    if (pr.water) {
      const n = get('water:' + k)?.n || 0
      ;[['11:00', 2], ['14:30', 4], ['17:30', 6]].forEach(([hm, need], j) => {
        if (n < need) add(`water:${k}:${j}`, at(k, hm), '💧 Стакан воды', need === 2 ? 'Начни день с воды — меньше отёков' : `Пора ещё стакан: цель — 8 в день`, `./?day=${k}`)
      })
    }
    // покупки на завтра
    if (pr.shop) {
      const tk = addDays(k, 1)
      const need = shoppingNeed(tk, tk, st).items.filter((x) => x.buy > 0.01)
      if (need.length) add(`shop:${k}`, at(k, '18:00'), '🛒 На завтра не хватает', need.slice(0, 5).map((x) => ING[x.id].name.split(' (')[0].toLowerCase()).join(', ') + (need.length > 5 ? ` и ещё ${need.length - 5}` : ''), './?tab=shop')
    }
    // итог дня
    if (pr.check && ms.some((m) => !m.status)) add(`check:${k}`, at(k, '21:30'), '✓ Отметь, что съела сегодня', 'Так запасы и список покупок останутся точными', `./?day=${k}`)
    // взвешивание по понедельникам
    if (pr.weigh && parseKey(k).getDay() === 1 && !get('body:' + k)) add(`weigh:${k}`, at(k, times.b, -15), '⚖️ Взвешивание', 'Утром натощак — запиши во вкладке «Прогресс»', './?tab=progress')
    // день заготовок
    if (pr.batch && parseKey(k).getDay() === 6) {
      const mon = prepMonday(k)
      const done = get('prep:' + mon)?.done || {}
      const left = prepTasks(mon, st).filter((t) => !done[t.id])
      if (left.length) add(`batch:${k}`, at(k, '11:00'), '🧺 День заготовок', `${left.length} задач · ≈ ${left.reduce((a, t) => a + t.min, 0)} мин — неделя с ${fmtDay(mon)} станет проще`, './?prep=1')
    }
  }
  return out
}

let timer = null
let last = ''
export function scheduleQueueSync() {
  clearTimeout(timer)
  timer = setTimeout(() => syncQueue(), 4000)
}

export async function syncQueue(force) {
  const s = getState()
  if (!s.user || !settings().pushOn) return
  const rows = buildQueue()
  const sig = JSON.stringify(rows)
  if (!force && sig === last) return
  try {
    const del = await sb.from('push_queue').delete().is('sent_at', null)
    if (del.error) throw del.error
    if (rows.length) {
      const ins = await sb.from('push_queue').upsert(rows, { onConflict: 'user_id,id' })
      if (ins.error) throw ins.error
    }
    last = sig
  } catch (e) {
    console.warn('push queue', e.message || e)
  }
}
