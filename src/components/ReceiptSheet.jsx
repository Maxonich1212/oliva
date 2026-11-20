import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileJson, ClipboardPaste, ChevronLeft, ChevronDown, AlertTriangle } from 'lucide-react'
import { Sheet, Stepper, CheckDot } from './ui'
import { parseJson, parseText, analyze } from '../lib/receipt'
import { INGREDIENTS, ING } from '../data/ingredients'
import { fmtQty, addStock, setStock, todayKey } from '../lib/plan'
import { get, put, toast } from '../lib/store'

const CHOICES = INGREDIENTS.filter((i) => !['salt', 'pepper', 'paprika', 'turmeric', 'cumin', 'curry', 'cinnamon', 'herbs', 'baking_powder', 'garlic_oil'].includes(i.id)).sort((a, b) =>
  a.name.localeCompare(b.name, 'ru'),
)

export function ReceiptSheet({ open, onClose }) {
  return (
    <Sheet open={open} onClose={onClose} title="Добавить из чека">
      {open && <Body onClose={onClose} />}
    </Sheet>
  )
}

function Body({ onClose }) {
  const [rows, setRows] = useState(null)
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const [showOther, setShowOther] = useState(false)
  const file = useRef(null)

  const load = (raw) => {
    setErr('')
    try {
      let parsed
      const t = raw.trim()
      if (t.startsWith('{') || t.startsWith('[')) parsed = parseJson(t)
      else parsed = parseText(t)
      if (!parsed.length) throw new Error('Не нашла позиций в чеке')
      setRows(analyze(parsed))
    } catch (e) {
      setErr(e instanceof SyntaxError ? 'Файл не похож на чек из «Проверки чеков»' : e.message)
    }
  }

  if (!rows)
    return (
      <div className="stack" style={{ gap: 14 }}>
        <div className="small" style={{ color: 'var(--ink2)' }}>
          Продукты из чека сами попадут в запасы — по одному вводить не нужно. Подойдёт любой из способов:
        </div>
        <motion.button whileTap={{ scale: 0.98 }} className="card row" style={{ gap: 12, textAlign: 'left' }} onClick={() => file.current?.click()}>
          <FileJson size={24} color="var(--olive)" style={{ flex: 'none' }} />
          <div>
            <div className="h3">Файл из «Проверки чеков»</div>
            <div className="tiny muted">Приложение ФНС: сканируешь QR-код на чеке → открываешь чек → «Поделиться» → JSON</div>
          </div>
        </motion.button>
        <input
          ref={file}
          type="file"
          accept=".json,.txt,application/json,text/plain"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (f) load(await f.text())
            e.target.value = ''
          }}
        />
        <div className="card stack" style={{ gap: 10 }}>
          <div className="row" style={{ gap: 12 }}>
            <ClipboardPaste size={22} color="var(--terra)" style={{ flex: 'none' }} />
            <div>
              <div className="h3">Текст электронного чека</div>
              <div className="tiny muted">Из письма, СМС-ссылки или приложения Пятёрочки, Магнита, Ленты, доставки — скопируй и вставь</div>
            </div>
          </div>
          <textarea className="input" style={{ height: 140, padding: 12, resize: 'vertical' }} value={text} onChange={(e) => setText(e.target.value)} placeholder={'ФИЛЕ ГРУДКИ ЦБ 1КГ\n0.734 x 399.99 = 293.59\nТВОРОГ БЕЗЛАКТ. 180Г  2 x 109.99'} />
          <div className="row">
            {navigator.clipboard?.readText && (
              <button
                className="btn grow sm"
                onClick={async () => {
                  try {
                    const t = await navigator.clipboard.readText()
                    setText(t)
                    if (t.trim()) load(t)
                  } catch {
                    setErr('Нет доступа к буферу — вставь текст вручную')
                  }
                }}
              >
                Вставить из буфера
              </button>
            )}
            <button className="btn primary grow sm" disabled={!text.trim()} onClick={() => load(text)}>Разобрать</button>
          </div>
        </div>
        {err && <div className="small" style={{ color: 'var(--terra)' }}>{err}</div>}
      </div>
    )

  const found = rows.filter((r) => r.id)
  const other = rows.filter((r) => !r.id && !r.skip)
  const chosen = rows.filter((r) => r.on && r.id && r.qty > 0)
  const upd = (key, part) =>
    setRows(rows.map((r) => {
      if (r.key !== key) return r
      const n = { ...r, ...part }
      if ('id' in part && part.id) {
        const ing = ING[part.id]
        n.on = true
        n.qty = ing.unit === 'pc' ? Math.max(1, Math.round(r.quantity || 1)) : r.byWeight ? Math.round((r.quantity || 1) * 1000) : ing.pack ? ing.pack * (r.quantity || 1) : 100
      }
      return n
    }))

  const save = () => {
    const logId = `bought:${todayKey()}`
    const log = { ...(get(logId) || {}) }
    for (const r of chosen) {
      if (ING[r.id].staple) setStock(r.id, { have: true })
      else addStock(r.id, r.qty)
      log[r.id] = (log[r.id] || 0) + r.qty
    }
    put(logId, 'bought', log)
    toast(`В запасы добавлено: ${chosen.length}`)
    onClose()
  }

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="row">
        <button className="icon-btn plain" onClick={() => setRows(null)}><ChevronLeft /></button>
        <div className="small muted">Распознала {found.length} из {rows.filter((r) => !r.skip).length}. Проверь количество — и в запасы.</div>
      </div>
      <div className="list">
        {found.map((r) => (
          <Row key={r.key} r={r} upd={upd} />
        ))}
      </div>

      {other.length > 0 && (
        <>
          <button className="row between" style={{ padding: '0 4px' }} onClick={() => setShowOther(!showOther)}>
            <span className="eyebrow">Не из меню · {other.length}</span>
            <motion.span animate={{ rotate: showOther ? 180 : 0 }} className="muted"><ChevronDown size={18} /></motion.span>
          </button>
          <AnimatePresence>
            {showOther && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                <div className="tiny muted" style={{ margin: '0 4px 8px' }}>Если это продукт из меню — выбери его, и он добавится.</div>
                <div className="list">
                  {other.map((r) => (
                    <Row key={r.key} r={r} upd={upd} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      <button className="btn primary block" disabled={!chosen.length} onClick={save}>
        Добавить в запасы · {chosen.length}
      </button>
    </div>
  )
}

function Row({ r, upd }) {
  const ing = r.id && ING[r.id]
  const step = !ing ? 1 : ing.unit === 'pc' ? 1 : r.qty >= 500 ? 50 : 10
  return (
    <div className="li" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 8 }}>
      <div className="row" style={{ width: '100%', alignItems: 'flex-start' }}>
        {r.id && (
          <button onClick={() => upd(r.key, { on: !r.on })} style={{ marginTop: 2 }}>
            <CheckDot on={r.on} />
          </button>
        )}
        <div className="grow">
          <div className="tiny muted" style={{ textTransform: 'lowercase' }}>{r.name}</div>
          <select
            value={r.id || ''}
            onChange={(e) => upd(r.key, { id: e.target.value || null, on: !!e.target.value })}
            style={{ border: 0, background: 'transparent', fontWeight: 650, fontSize: 15, padding: 0, marginTop: 2, maxWidth: '100%', color: r.id ? 'var(--ink)' : 'var(--muted)' }}
          >
            <option value="">— не продукт меню —</option>
            {CHOICES.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          {r.warn.map((w) => (
            <div key={w} className="tiny row" style={{ gap: 4, color: 'var(--terra)', marginTop: 2 }}><AlertTriangle size={12} /> {w}</div>
          ))}
        </div>
      </div>
      {r.id && r.on && (
        <div className="row" style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Stepper value={r.qty} step={step} onChange={(v) => upd(r.key, { qty: v })} fmt={(v) => fmtQty(r.id, v)} />
        </div>
      )}
    </div>
  )
}
