import { useState } from 'react'
import { Search } from 'lucide-react'
import { Sheet } from './ui'
import { FODMAP } from '../data/fodmap'

const S = {
  ok: ['можно', 'var(--olive)'],
  lim: ['в меру', 'var(--honey)'],
  no: ['пока нет', 'var(--terra)'],
}
const CATS = ['Все', ...new Set(FODMAP.map((f) => f.cat))]

export function CheckerSheet({ open, onClose }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('Все')
  const n = q.trim().toLowerCase().replace(/ё/g, 'е')
  const list = FODMAP.filter((f) => (cat === 'Все' || f.cat === cat) && (!n || f.name.toLowerCase().replace(/ё/g, 'е').includes(n)))
  return (
    <Sheet open={open} onClose={onClose} title="Можно ли?">
      <div className="row" style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={17} style={{ position: 'absolute', left: 14, color: 'var(--muted)' }} />
        <input className="input" style={{ paddingLeft: 40 }} placeholder="Например, авокадо или кешью" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="chips" style={{ marginBottom: 12 }}>
        {CATS.map((c) => (
          <button key={c} className={'chip' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>
      <div className="list">
        {list.map((f) => (
          <div key={f.name} className="li" style={{ minHeight: 48 }}>
            <span style={{ width: 10, height: 10, borderRadius: 5, background: S[f.s][1], flex: 'none' }} />
            <div className="grow">
              <div style={{ fontSize: 15, fontWeight: 600 }}>{f.name}</div>
              {f.note && <div className="tiny muted">{f.note}</div>}
            </div>
            <span className="tiny" style={{ fontWeight: 800, color: S[f.s][1] }}>{S[f.s][0]}</span>
          </div>
        ))}
        {!list.length && <div className="empty small">Нет в справочнике. Если сомневаешься — лучше отложить до второго этапа.</div>}
      </div>
      <div className="tiny muted" style={{ margin: '12px 6px 0' }}>Это правила первого этапа (4 недели). После них многое из «пока нет» можно будет проверить и вернуть.</div>
    </Sheet>
  )
}
