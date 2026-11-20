import { AnimatePresence, motion, useDragControls } from 'framer-motion'
import { Minus, Plus, Check } from 'lucide-react'
import { useEffect } from 'react'
import { useStore, hideToast } from '../lib/store'

// Нижняя шторка: свайп вниз закрывает
export function Sheet({ open, onClose, children, title, right }) {
  const drag = useDragControls()
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 340 }}
            drag="y"
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => (i.offset.y > 110 || i.velocity.y > 600) && onClose()}
          >
            <div className="sheet-grab" onPointerDown={(e) => drag.start(e)} />
            {title && (
              <div className="row between" style={{ padding: '2px 16px 10px' }} onPointerDown={(e) => drag.start(e)}>
                <h2 className="h2">{title}</h2>
                {right}
              </div>
            )}
            <div className="sheet-body">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export function Toast() {
  const t = useStore((s) => s.toast)
  return (
    <AnimatePresence>
      {t && (
        <motion.div
          key={t.at}
          className="toast"
          initial={{ opacity: 0, y: 16, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 16, x: '-50%' }}
        >
          <span>{t.text}</span>
          {t.action && (
            <button
              onClick={() => {
                t.action.fn()
                hideToast()
              }}
            >
              {t.action.label}
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Stepper({ value, onChange, step = 10, min = 0, fmt = (v) => v }) {
  return (
    <div className="stepper">
      <button onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))} aria-label="Меньше">
        <Minus size={16} />
      </button>
      <span>{fmt(value)}</span>
      <button onClick={() => onChange(+(value + step).toFixed(2))} aria-label="Больше">
        <Plus size={16} />
      </button>
    </div>
  )
}

export function CheckDot({ on }) {
  return (
    <span className={'check' + (on ? ' on' : '')}>
      <AnimatePresence>
        {on && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} style={{ display: 'grid' }}>
            <Check size={16} strokeWidth={3} />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

export function Macro({ nut, big }) {
  const r = (v) => Math.round(v)
  const items = [
    ['ккал', nut.k, 'var(--ink)'],
    ['белки', nut.p, 'var(--olive)'],
    ['жиры', nut.f, 'var(--honey)'],
    ['углев.', nut.c, 'var(--terra)'],
  ]
  return (
    <div className="row" style={{ gap: big ? 18 : 12 }}>
      {items.map(([l, v, c]) => (
        <div key={l} style={{ minWidth: 0 }}>
          <div className="num" style={{ fontWeight: 800, fontSize: big ? 20 : 15, color: c }}>
            {r(v)}
          </div>
          <div className="tiny muted">{l}</div>
        </div>
      ))}
    </div>
  )
}

export function Segmented({ value, options, onChange }) {
  return (
    <div className="row" style={{ background: 'var(--card2)', borderRadius: 999, padding: 4, boxShadow: 'inset 0 0 0 1px var(--line)', gap: 0 }}>
      {options.map(([v, l]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          style={{ flex: 1, height: 34, borderRadius: 999, fontWeight: 700, fontSize: 13.5, position: 'relative', color: value === v ? 'var(--ink)' : 'var(--muted)' }}
        >
          {value === v && (
            <motion.span layoutId={'seg' + options.map((o) => o[0]).join()} style={{ position: 'absolute', inset: 0, background: 'var(--card)', borderRadius: 999, boxShadow: 'var(--shadow)' }} />
          )}
          <span style={{ position: 'relative' }}>{l}</span>
        </button>
      ))}
    </div>
  )
}
