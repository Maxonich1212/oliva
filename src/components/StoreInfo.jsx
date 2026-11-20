import { ExternalLink } from 'lucide-react'
import { STORES, shopInfo } from '../data/shops'
import { ING } from '../data/ingredients'

export function StoreLinks({ id }) {
  const q = shopInfo(id)?.q || ING[id].name.toLowerCase()
  return (
    <div className="row wrap" style={{ gap: 8 }}>
      {STORES.map(([k, name, url]) => (
        <a key={k} className="chip" href={url(q)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          {name} <ExternalLink size={13} />
        </a>
      ))}
    </div>
  )
}

// Что искать на полке: примеры подходящих товаров и ловушки
export function StoreInfo({ id }) {
  const s = shopInfo(id)
  return (
    <div className="card stack" style={{ gap: 8 }}>
      <div className="h3">Что искать в магазине</div>
      <div className="small">Ищи: «{s?.q || ING[id].name.toLowerCase()}»</div>
      {s?.ex?.length > 0 && (
        <div className="small" style={{ color: 'var(--ink2)' }}>
          Подойдёт, например: {s.ex.join(' · ')}
        </div>
      )}
      {s?.avoid && <div className="small" style={{ color: 'var(--terra)' }}>Не бери: {s.avoid}</div>}
      <StoreLinks id={id} />
    </div>
  )
}
