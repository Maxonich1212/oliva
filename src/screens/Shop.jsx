import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Share2, ChevronDown, RotateCcw, ShoppingBag, X, ReceiptText, CircleHelp } from 'lucide-react'
import { CheckerSheet } from '../components/Checker'
import { NoProductSheet } from '../components/NoProduct'
import { StoreInfo } from '../components/StoreInfo'
import { ReceiptSheet } from '../components/ReceiptSheet'
import { useStore, get, put, remove, byKind, toast } from '../lib/store'
import { settings, shoppingNeed, todayKey, addDays, fmtQty, suggestBuy, packHint, addStock, setStock, fmtDay, diffDays } from '../lib/plan'
import { ING, DEPTS } from '../data/ingredients'
import { Sheet, Stepper, CheckDot } from '../components/ui'

const PERIODS = [
  [0, 'Сегодня'],
  [1, 'Сегодня + завтра'],
  [2, '3 дня'],
  [6, 'Неделя'],
  [13, '2 недели'],
]
const lsGet = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? d
  } catch {
    return d
  }
}
const lsSet = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {
    /* не страшно */
  }
}

export default function Shop() {
  useStore((s) => s.records)
  const st = settings()
  const today = todayKey()
  const [span, setSpan] = useState(() => lsGet('oliva:span', 2))
  const [buy, setBuy] = useState(null)
  const [showEnough, setShowEnough] = useState(false)
  const [extra, setExtra] = useState('')
  const [rcpt, setRcpt] = useState(false)
  const [chk, setChk] = useState(false)
  const [noId, setNoId] = useState(null)
  const from = diffDays(st.startDate, today) > 0 ? st.startDate : today
  const to = addDays(from, span)
  const { items, staples, ready } = shoppingNeed(from, to, st)
  const logId = `bought:${today}`
  const log = get(logId) || {}
  const extras = byKind('extra').sort((a, b) => (a.data.at || 0) - (b.data.at || 0))

  const toBuy = items.filter((i) => i.buy > 0.01)
  const enough = items.filter((i) => i.buy <= 0.01)
  const missingStaples = staples.filter((s) => s.have === false)
  const unknownStaples = staples.filter((s) => s.have === undefined)
  const groups = DEPTS.map(([d, name, e]) => [d, name, e, toBuy.filter((i) => ING[i.id].dept === d)]).filter((g) => g[3].length)
  const total = toBuy.length + missingStaples.length + extras.filter((x) => !x.data.done).length

  const markBought = (id, qty) => {
    addStock(id, qty)
    put(logId, 'bought', { ...log, [id]: (log[id] || 0) + qty })
    toast(`${ING[id].name}: +${fmtQty(id, qty)}`, { label: 'Отменить', fn: () => undo(id, qty) })
  }
  const undo = (id, qty) => {
    addStock(id, -qty)
    const l = get(logId) || {}
    const left = (l[id] || 0) - qty
    const nl = { ...l }
    if (left > 0.01) nl[id] = left
    else delete nl[id]
    put(logId, 'bought', nl)
  }

  const share = async () => {
    const lines = [`Покупки на ${fmtDay(from)}${span ? ` – ${fmtDay(to)}` : ''}:`]
    for (const [, name, , list] of groups) {
      lines.push('', name + ':')
      for (const i of list) lines.push(`• ${ING[i.id].name} — ${fmtQty(i.id, suggestBuy(i.id, i.buy))}`)
    }
    if (missingStaples.length) lines.push('', 'Ещё:', ...missingStaples.map((s) => `• ${ING[s.id].name}`))
    const ex = extras.filter((x) => !x.data.done)
    if (ex.length) lines.push(...ex.map((x) => `• ${x.data.name}`))
    const text = lines.join('\n')
    try {
      if (navigator.share) await navigator.share({ text })
      else {
        await navigator.clipboard.writeText(text)
        toast('Список скопирован')
      }
    } catch {
      /* отменили */
    }
  }

  return (
    <div>
      <div className="row between" style={{ marginTop: 10 }}>
        <div className="eyebrow">{fmtDay(from)}{span ? ` – ${fmtDay(to)}` : ''}</div>
        <div className="row" style={{ gap: 8 }}>
          <button className="icon-btn" onClick={() => setChk(true)} aria-label="Можно ли?">
            <CircleHelp size={18} />
          </button>
          <button className="icon-btn" onClick={() => setRcpt(true)} aria-label="Добавить из чека">
            <ReceiptText size={18} />
          </button>
          <button className="icon-btn" onClick={share} aria-label="Поделиться списком">
            <Share2 size={18} />
          </button>
        </div>
      </div>
      <h1 className="h1" style={{ marginTop: 6 }}>Покупки</h1>
      <div className="small muted" style={{ marginTop: 6 }}>
        {total ? `Докупить: ${total} ${plural(total, 'позиция', 'позиции', 'позиций')}` : 'Всё есть — можно никуда не ходить 🌿'}
      </div>

      <div className="chips" style={{ marginTop: 14 }}>
        {PERIODS.map(([v, l]) => (
          <button key={v} className={'chip' + (span === v ? ' on' : '')} onClick={() => { setSpan(v); lsSet('oliva:span', v) }}>
            {l}
          </button>
        ))}
      </div>

      {unknownStaples.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="h3">Проверь, есть ли дома</div>
          <div className="tiny muted" style={{ marginBottom: 10 }}>Масла, специи и то, что хранится долго, — отмечаешь один раз.</div>
          <div className="stack" style={{ gap: 8 }}>
            {unknownStaples.map((s) => (
              <div key={s.id} className="row between">
                <span className="small" style={{ fontWeight: 600 }}>{ING[s.id].name}</span>
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn sm" onClick={() => setStock(s.id, { have: true })}>Есть</button>
                  <button className="btn sm terra" onClick={() => setStock(s.id, { have: false })}>Купить</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence initial={false}>
        {groups.map(([d, name, e, list]) => (
          <motion.div key={d} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}>
            <div className="sec-title">
              <span className="eyebrow">{e} {name}</span>
            </div>
            <div className="list">
              <AnimatePresence initial={false}>
                {list.map((i) => (
                  <motion.div key={i.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: 40, height: 0 }} className="li" onClick={() => setBuy(i)}>
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={(ev) => {
                        ev.stopPropagation()
                        markBought(i.id, suggestBuy(i.id, i.buy))
                      }}
                      aria-label="Купила"
                    >
                      <CheckDot on={false} />
                    </motion.button>
                    <div className="grow">
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{ING[i.id].name}</div>
                      <div className="tiny muted">
                        нужно {fmtQty(i.id, i.need)}
                        {i.have > 0 ? ` · дома ${fmtQty(i.id, i.have)}` : ''}
                        {ING[i.id].frozenOk ? ' · можно замороженное' : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="num" style={{ fontWeight: 800 }}>{fmtQty(i.id, suggestBuy(i.id, i.buy))}</div>
                      <div className="tiny muted">{packHint(i.id, suggestBuy(i.id, i.buy))}</div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {missingStaples.length > 0 && (
        <>
          <div className="sec-title"><span className="eyebrow">🫒 Закончилось</span></div>
          <div className="list">
            {missingStaples.map((s) => (
              <div key={s.id} className="li" onClick={() => { setStock(s.id, { have: true }); toast(`${ING[s.id].name} — куплено`) }}>
                <CheckDot on={false} />
                <div className="grow" style={{ fontWeight: 600 }}>{ING[s.id].name}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {ready.length > 0 && (
        <>
          <div className="sec-title"><span className="eyebrow">🛍 Готовое из магазина</span></div>
          <div className="list">
            {ready.map((m) => (
              <div key={m.k + m.slot} className="li">
                <ShoppingBag size={18} color="var(--honey)" />
                <div className="grow">
                  <div style={{ fontWeight: 600 }}>{m.ready.name}</div>
                  <div className="tiny muted">{fmtDay(m.k)} · {m.ready.buy}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="sec-title"><span className="eyebrow">✏️ Своё</span></div>
      <div className="list">
        {extras.map((x) => (
          <div key={x.id} className="li" onClick={() => put(x.id, 'extra', { ...x.data, done: !x.data.done })}>
            <CheckDot on={x.data.done} />
            <div className="grow" style={{ fontWeight: 600, textDecoration: x.data.done ? 'line-through' : 'none', color: x.data.done ? 'var(--muted)' : 'var(--ink)' }}>{x.data.name}</div>
            <button className="icon-btn plain" style={{ width: 30, height: 30 }} onClick={(e) => { e.stopPropagation(); remove(x.id) }} aria-label="Удалить"><X size={16} /></button>
          </div>
        ))}
        <form
          className="li"
          onSubmit={(e) => {
            e.preventDefault()
            if (!extra.trim()) return
            put('extra:' + crypto.randomUUID(), 'extra', { name: extra.trim(), at: Date.now() })
            setExtra('')
          }}
        >
          <Plus size={20} color="var(--muted)" />
          <input className="grow" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Добавить своё (вода, кофе…)" style={{ border: 0, outline: 0, background: 'transparent', fontSize: 15 }} />
        </form>
      </div>

      {Object.keys(log).length > 0 && (
        <>
          <div className="sec-title"><span className="eyebrow">✅ Купила сегодня</span></div>
          <div className="list">
            {Object.entries(log).map(([id, q]) => (
              <div key={id} className="li">
                <CheckDot on />
                <div className="grow" style={{ color: 'var(--muted)' }}>{ING[id]?.name} · {fmtQty(id, q)}</div>
                <button className="btn ghost sm" onClick={() => undo(id, q)}><RotateCcw size={14} /> Отменить</button>
              </div>
            ))}
          </div>
        </>
      )}

      {enough.length > 0 && (
        <>
          <button className="sec-title" style={{ width: 'calc(100% - 8px)' }} onClick={() => setShowEnough(!showEnough)}>
            <span className="eyebrow">🏡 Хватает дома · {enough.length}</span>
            <motion.span animate={{ rotate: showEnough ? 180 : 0 }} className="muted"><ChevronDown size={18} /></motion.span>
          </button>
          <AnimatePresence>
            {showEnough && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                <div className="list">
                  {enough.map((i) => (
                    <div key={i.id} className="li">
                      <CheckDot on />
                      <div className="grow">{ING[i.id].name}</div>
                      <div className="tiny muted num">нужно {fmtQty(i.id, i.need)} · есть {fmtQty(i.id, i.have)}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      <ReceiptSheet open={rcpt} onClose={() => setRcpt(false)} />
      <CheckerSheet open={chk} onClose={() => setChk(false)} />
      <BuySheet item={buy} onClose={() => setBuy(null)} onBuy={(q) => { markBought(buy.id, q); setBuy(null) }} onNo={() => { const id = buy.id; setBuy(null); setTimeout(() => setNoId(id), 250) }} />
      <NoProductSheet id={noId} onClose={() => setNoId(null)} />
    </div>
  )
}

function BuySheet({ item, onClose, onBuy, onNo }) {
  return (
    <Sheet open={!!item} onClose={onClose} title={item ? ING[item.id].name : ''}>
      {item && <BuyBody item={item} onBuy={onBuy} onNo={onNo} />}
    </Sheet>
  )
}
function BuyBody({ item, onBuy, onNo }) {
  const ing = ING[item.id]
  const sug = suggestBuy(item.id, item.buy)
  const [q, setQ] = useState(sug)
  const step = ing.unit === 'pc' ? 1 : ing.pack && ing.pack <= 200 ? ing.pack / 2 : 50
  const opts = useMemo(() => {
    const o = [[Math.ceil(item.buy * (ing.unit === 'pc' ? 1 : 1)), 'ровно сколько нужно']]
    if (ing.pack && ing.unit !== 'pc') for (const n of [1, 2, 3]) o.push([ing.pack * n, `${n} ${ing.unitName || 'уп.'}`])
    return o
  }, [item, ing])
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="small muted">
        Нужно на выбранные дни {fmtQty(item.id, item.need)}{item.have > 0 ? `, дома уже ${fmtQty(item.id, item.have)}` : ''}. Сколько купила?
      </div>
      {ing.lf && <div className="card flat small">{ing.lf}</div>}
      <div className="chips">
        {opts.map(([v, l]) => (
          <button key={l} className={'chip' + (q === v ? ' on' : '')} onClick={() => setQ(v)}>{l}</button>
        ))}
      </div>
      <div className="row" style={{ justifyContent: 'center' }}>
        <Stepper value={q} step={step} onChange={setQ} fmt={(v) => fmtQty(item.id, v)} />
      </div>
      <button className="btn primary block" onClick={() => onBuy(q)} disabled={q <= 0}>Купила {fmtQty(item.id, q)}</button>
      <button className="btn terra block" onClick={onNo}>Нет в магазине — заменить</button>
      <StoreInfo id={item.id} />
    </div>
  )
}

export function plural(n, one, few, many) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few
  return many
}
