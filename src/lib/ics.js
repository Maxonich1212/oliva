// Напоминания через календарь телефона: файл .ics с событиями и сигналами.
// Работает без сервера и пушей — iPhone/Android сами напомнят.
import { settings, addDays, dayMeals, prepFor, isWeekend, parseKey } from './plan'
import { PLAN_DAYS } from '../data/menu'
import { SLOT_NAME } from '../data/recipes'

const esc = (s) => String(s).replace(/[\\;,]/g, (c) => '\\' + c).replace(/\n/g, '\\n')
const dt = (k, hm) => k.replace(/-/g, '') + 'T' + hm.replace(':', '') + '00'
const plusMin = (hm, m) => {
  const [h, mi] = hm.split(':').map(Number)
  const t = h * 60 + mi + m
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

export function buildIcs({ from, days = PLAN_DAYS, meals = true, prep = true, weigh = true, shop = true }) {
  const st = settings()
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Oliva//RU', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Олива — питание', 'X-WR-TIMEZONE:Europe/Moscow']
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
  let n = 0
  const ev = (k, hm, dur, title, desc, alarmMin = 0) => {
    L.push(
      'BEGIN:VEVENT',
      `UID:oliva-${k}-${hm}-${n++}@oliva`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Europe/Moscow:${dt(k, hm)}`,
      `DTEND;TZID=Europe/Moscow:${dt(k, plusMin(hm, dur))}`,
      `SUMMARY:${esc(title)}`,
      desc ? `DESCRIPTION:${esc(desc)}` : null,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(title)}`, `TRIGGER:-PT${alarmMin}M`, 'END:VALARM',
      'END:VEVENT',
    )
  }
  for (let i = 0; i < days; i++) {
    const k = addDays(from, i)
    const ms = dayMeals(k, st)
    if (!ms) continue
    if (meals) {
      for (const m of ms) {
        const it = m.recipe || m.ready
        const what = m.leftover ? `${it.name} (из вчерашнего ужина)` : it.name
        ev(k, m.time, 30, `${it.emoji} ${SLOT_NAME[m.slot]}: ${what}`, m.slot === 'd' && m.portions === 2 ? 'Готовь 2 порции — вторая на обед завтра' : '', 0)
      }
    }
    if (prep) {
      const p = prepFor(addDays(k, 1), st)
      if (p.length) ev(k, '21:00', 10, '🌙 К завтра: ' + p.map((x) => x.text.toLowerCase()).join('; '), '', 0)
      const t = dayMeals(addDays(k, 1), st)
      if (t?.[1]?.leftover && !isWeekend(addDays(k, 1))) ev(addDays(k, 1), plusMin(t[0].time, 20), 5, '🍱 Возьми контейнер с обедом', '', 0)
    }
    if (weigh && parseKey(k).getDay() === 1) ev(k, plusMin(ms[0].time, -15), 5, '⚖️ Взвеситься (натощак)', 'Запиши вес во вкладке «Прогресс»', 0)
    if (shop && parseKey(k).getDay() === 6) ev(k, '12:00', 15, '🛒 Проверь список покупок на неделю', '', 0)
  }
  L.push('END:VCALENDAR')
  return L.filter(Boolean).join('\r\n')
}

export function downloadIcs(opts) {
  const text = buildIcs(opts)
  const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'oliva-napominaniya.ics'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
