import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search, PackageOpen, ClipboardList, ReceiptText } from 'lucide-react'
import { ReceiptSheet } from '../components/ReceiptSheet'
import { useStore } from '../lib/store'
import { settings, pantryList, fmtQty, setStock, stockOf, shoppingNeed, todayKey, addDays, diffDays } from '../lib/plan'
import { ING, INGREDIENTS, DEPTS } from '../data/ingredients'
import { Sheet, Stepper } from '../components/ui'

export default function Pantry() {
  useStore((s) => s.records)
  const [edit, setEdit] = useState(null)
  const [add, setAdd] = useState(false)
  const [inv, setInv] = useState(false)
  const [rcpt, setRcpt] = useState(false)
  const list = pantryList()
  const inStock = list.filter((p) => !ING[p.id]?.staple && p.qty > 0)
  const staples = INGREDIENTS.filter((i) => i.staple)
  const stMap = Object.fromEntries(list.map((p) => [p.id, p]))
  const groups = DEPTS.map(([d, n, e]) => [d, n, e, inStock.filter((p) => ING[p.id].dept === d)]).filter((g) => g[3].length)

  return (
    <div>
      <div className="eyebrow" style={{ marginTop: 10 }}>Что есть дома</div>
      <h1 className="h1" style={{ marginTop: 6 }}>Запасы</h1>
      <div className="small muted" style={{ marginTop: 6 }}>Покупки добавляются сюда сами, а когда отмечаешь «Съела» — продукты списываются.</div>

      <div className="row" style={{ marginTop: 16, gap: 10 }}>
        <motion.button whileTap={{ scale: 0.97 }} className="btn primary grow" onClick={() => setInv(true)}>
          <ClipboardList size={18} /> Отметить, что есть
        </motion.button>
        <motion.button whileTap={{ scale: 0.97 }} className="btn" onClick={() => setAdd(true)} aria-label="Добавить продукт">
          <Plus size={18} />
        </motion.button>
      </div>
      <motion.button whileTap={{ scale: 0.98 }} className="card row" style={{ marginTop: 12, gap: 12, width: '100%', textAlign: 'left' }} onClick={() => setRcpt(true)}>
        <ReceiptText size={22} color="var(--terra)" />
        <div className="grow">
          <div className="h3">Добавить из чека</div>
          <div className="tiny muted">Файл из «Проверки чеков» или текст электронного чека</div>
        </div>
      </motion.button>

      {groups.length === 0 && (
        <div className="card empty" style={{ marginTop: 16 }}>
          <PackageOpen size={34} style={{ opacity: 0.5 }} />
          <div style={{ marginTop: 8 }}>Пока пусто. Нажми «Отметить, что есть», чтобы не начинать с нуля.</div>
        </div>
      )}

      {groups.map(([d, name, e, items]) => (
        <div key={d}>
          <div className="sec-title"><span className="eyebrow">{e} {name}</span></div>
          <div className="list">
            {items.map((p) => (
              <button key={p.id} className="li" onClick={() => setEdit(p.id)}>
                <div className="grow">
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{ING[p.id].name}</div>
                </div>
                <div className="num" style={{ fontWeight: 800, color: 'var(--olive)' }}>{fmtQty(p.id, p.qty)}</div>
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="sec-title"><span className="eyebrow">🫒 Масла, специи, долгое хранение</span></div>
      <div className="card row wrap" style={{ gap: 8 }}>
        {staples.map((s) => {
          const have = stMap[s.id]?.have
          return (
            <button
              key={s.id}
              className={'chip' + (have ? ' on' : '')}
              style={have === false ? { boxShadow: 'inset 0 0 0 1.5px var(--terra)', color: 'var(--terra)' } : undefined}
              onClick={() => setStock(s.id, { have: !have })}
            >
              {s.name}
            </button>
          )
        })}
      </div>
      <div className="tiny muted" style={{ margin: '8px 6px' }}>Зелёное — есть дома. Нажми, если закончилось, — попадёт в список покупок.</div>

      <EditSheet id={edit} onClose={() => setEdit(null)} />
      <AddSheet open={add} onClose={() => setAdd(false)} onPick={(id) => { setAdd(false); setEdit(id) }} />
      <InventorySheet open={inv} onClose={() => setInv(false)} />
      <ReceiptSheet open={rcpt} onClose={() => setRcpt(false)} />
    </div>
  )
}

const stepOf = (id) => {
  const i = ING[id]
  if (i.unit === 'pc') return 1
  if (i.pack && i.pack <= 200) return Math.max(10, i.pack / 4)
  return 50
}

function EditSheet({ id, onClose }) {
  return (
    <Sheet open={!!id} onClose={onClose} title={id ? ING[id].name : ''}>
      {id && <EditBody id={id} onClose={onClose} />}
    </Sheet>
  )
}
function EditBody({ id, onClose }) {
  const [q, setQ] = useState(stockOf(id))
  const ing = ING[id]
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="row" style={{ justifyContent: 'center', padding: '8px 0' }}>
        <Stepper value={q} step={stepOf(id)} onChange={setQ} fmt={(v) => fmtQty(id, v) || '0'} />
      </div>
      {ing.pack && ing.unit !== 'pc' && (
        <div className="chips" style={{ justifyContent: 'center' }}>
          {[0.5, 1, 2].map((n) => (
            <button key={n} className="chip" onClick={() => setQ(ing.pack * n)}>{n === 0.5 ? 'половина' : `${n} ${ing.unitName || 'уп.'}`} · {ing.pack * n}</button>
          ))}
        </div>
      )}
      <div className="row">
        <button className="btn terra grow" onClick={() => { setStock(id, { qty: 0 }); onClose() }}>Закончилось</button>
        <button className="btn primary grow" onClick={() => { setStock(id, { qty: q }); onClose() }}>Сохранить</button>
      </div>
    </div>
  )
}

function AddSheet({ open, onClose, onPick }) {
  const [q, setQ] = useState('')
  const list = INGREDIENTS.filter((i) => !i.staple && i.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <Sheet open={open} onClose={onClose} title="Добавить в запасы">
      <div className="row" style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={17} style={{ position: 'absolute', left: 14, color: 'var(--muted)' }} />
        <input className="input" style={{ paddingLeft: 40 }} placeholder="Найти продукт" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="list">
        {list.map((i) => (
          <button key={i.id} className="li" onClick={() => onPick(i.id)}>
            <div className="grow">{i.name}</div>
            <span className="tiny muted">{stockOf(i.id) ? fmtQty(i.id, stockOf(i.id)) : ''}</span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}

// Быстрая инвентаризация: всё, что понадобится на ближайшую неделю
function InventorySheet({ open, onClose }) {
  useStore((s) => s.records)
  const st = settings()
  const today = todayKey()
  const from = diffDays(st.startDate, today) > 0 ? st.startDate : today
  const { items } = open ? shoppingNeed(from, addDays(from, 6), st) : { items: [] }
  const ids = items.map((i) => i.id)
  const groups = DEPTS.map(([d, n, e]) => [d, n, e, ids.filter((id) => ING[id].dept === d)]).filter((g) => g[3].length)
  return (
    <Sheet open={open} onClose={onClose} title="Что уже есть дома?">
      <div className="small muted" style={{ marginBottom: 14 }}>
        Здесь всё, что нужно на ближайшую неделю. Поставь примерное количество того, что уже лежит дома, — остальное попадёт в список покупок. Специи и масла — на вкладке «Запасы».
      </div>
      {groups.map(([d, name, e, list]) => (
        <div key={d} style={{ marginBottom: 14 }}>
          <div className="eyebrow" style={{ margin: '0 4px 8px' }}>{e} {name}</div>
          <div className="list">
            {list.map((id) => (
              <div key={id} className="li">
                <div className="grow small" style={{ fontWeight: 600, fontSize: 14.5 }}>{ING[id].name}</div>
                <Stepper value={stockOf(id)} step={stepOf(id)} onChange={(v) => setStock(id, { qty: v })} fmt={(v) => (v ? fmtQty(id, v) : 'нет')} />
              </div>
            ))}
          </div>
        </div>
      ))}
      <button className="btn primary block" onClick={onClose}>Готово</button>
    </Sheet>
  )
}
