import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Timer, Check } from 'lucide-react'
import { ING } from '../data/ingredients'
import { fmtQty } from '../lib/plan'
import { CheckDot } from './ui'

// «12–14 минут» → 12, «1 час» → 60
export function stepMinutes(text) {
  const h = text.match(/(\d+)\s*час/)
  if (h) return parseInt(h[1]) * 60
  if (/\bчас\b/.test(text) && !/\d+\s*час/.test(text)) return 60
  const m = text.match(/(\d+)(?:\s*[–-]\s*(\d+))?\s*мин/)
  return m ? parseInt(m[1]) : null
}

let audioCtx = null
function beep() {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)()
    const t = audioCtx.currentTime
    for (let i = 0; i < 3; i++) {
      const o = audioCtx.createOscillator()
      const g = audioCtx.createGain()
      o.frequency.value = 880
      g.gain.setValueAtTime(0.0001, t + i * 0.35)
      g.gain.exponentialRampToValueAtTime(0.3, t + i * 0.35 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.35 + 0.25)
      o.connect(g).connect(audioCtx.destination)
      o.start(t + i * 0.35)
      o.stop(t + i * 0.35 + 0.3)
    }
  } catch {
    /* без звука */
  }
  navigator.vibrate?.([300, 150, 300, 150, 300])
}

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`

export function CookMode({ m, onClose, onDone }) {
  const r = m.recipe
  const mult = m.slot === 'd' ? m.portions : 1
  const [i, setI] = useState(0) // 0 — ингредиенты, дальше шаги
  const [got, setGot] = useState({})
  const [timers, setTimers] = useState([])
  const [, tick] = useState(0)
  const dir = useRef(1)

  useEffect(() => {
    let lock = null
    navigator.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {})
    const t = setInterval(() => tick((x) => x + 1), 1000)
    return () => {
      clearInterval(t)
      lock?.release?.()
    }
  }, [])

  // сработавшие таймеры
  useEffect(() => {
    const now = Date.now()
    let changed = false
    const nt = timers.map((t) => {
      if (!t.rang && t.end <= now) {
        changed = true
        beep()
        return { ...t, rang: true }
      }
      return t
    })
    if (changed) setTimers(nt)
  })

  const total = r.steps.length
  const go = (d) => {
    dir.current = d
    setI((x) => Math.max(0, Math.min(total, x + d)))
  }
  const step = i > 0 ? r.steps[i - 1] : null
  const mins = step ? stepMinutes(step) : null
  const startTimer = (min, label) => {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)() // разблокировать звук жестом
    setTimers((ts) => [...ts, { id: Date.now(), label, total: min * 60, end: Date.now() + min * 60_000 }])
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'var(--bg)', display: 'flex', flexDirection: 'column', padding: 'calc(env(safe-area-inset-top) + 12px) 16px calc(env(safe-area-inset-bottom) + 16px)' }}
    >
      <div style={{ maxWidth: 560, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div className="row between">
          <div className="row" style={{ gap: 10, minWidth: 0 }}>
            <span style={{ fontSize: 26 }}>{r.emoji}</span>
            <div className="small" style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Закрыть"><X size={19} /></button>
        </div>

        {/* прогресс */}
        <div className="row" style={{ gap: 4, marginTop: 14 }}>
          {Array.from({ length: total + 1 }, (_, j) => (
            <div key={j} style={{ flex: 1, height: 4, borderRadius: 2, background: j <= i ? 'var(--olive)' : 'var(--line)', transition: 'background .3s' }} />
          ))}
        </div>

        {/* таймеры */}
        {timers.length > 0 && (
          <div className="chips" style={{ marginTop: 12 }}>
            {timers.map((t) => {
              const left = Math.round((t.end - Date.now()) / 1000)
              return (
                <motion.button
                  key={t.id}
                  layout
                  animate={t.rang ? { scale: [1, 1.06, 1] } : {}}
                  transition={t.rang ? { repeat: Infinity, duration: 0.8 } : {}}
                  className="chip"
                  style={{ background: t.rang ? 'var(--terra)' : 'var(--card)', color: t.rang ? '#fff' : 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}
                  onClick={() => setTimers((ts) => ts.filter((x) => x.id !== t.id))}
                >
                  <Timer size={14} /> {t.rang ? 'Готово! ✕' : mmss(left)} · {t.label}
                </motion.button>
              )
            })}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', marginTop: 16, position: 'relative' }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 40 * dir.current }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 * dir.current }}
              transition={{ duration: 0.2 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.3}
              onDragEnd={(_, info) => {
                if (info.offset.x < -70) go(1)
                else if (info.offset.x > 70) go(-1)
              }}
            >
              {i === 0 ? (
                <div>
                  <div className="eyebrow">Собери продукты{mult === 2 ? ' · на 2 порции' : ''}</div>
                  <div className="list" style={{ marginTop: 12 }}>
                    {Object.entries(m.amounts).filter(([id, q]) => q > 0 || ING[id].staple).map(([id, q]) => (
                      <button key={id} className="li" onClick={() => setGot({ ...got, [id]: !got[id] })}>
                        <CheckDot on={!!got[id]} />
                        <div className="grow" style={{ fontSize: 16, color: got[id] ? 'var(--muted)' : 'var(--ink)' }}>{ING[id].name}</div>
                        <div className="num" style={{ fontWeight: 800 }}>{fmtQty(id, q * mult)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ paddingTop: 10 }}>
                  <div className="eyebrow">Шаг {i} из {total}</div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 26, lineHeight: 1.35, marginTop: 14, fontWeight: 500 }}>{step}</div>
                  {mins && (
                    <motion.button whileTap={{ scale: 0.95 }} className="btn terra" style={{ marginTop: 22 }} onClick={() => startTimer(mins, `шаг ${i}`)}>
                      <Timer size={18} /> Таймер {mins} мин
                    </motion.button>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="row" style={{ gap: 10, marginTop: 12 }}>
          <button className="btn" style={{ width: 56 }} onClick={() => go(-1)} disabled={i === 0} aria-label="Назад"><ChevronLeft /></button>
          {i < total ? (
            <button className="btn primary grow" onClick={() => go(1)}>
              {i === 0 ? 'Начать готовить' : 'Дальше'} <ChevronRight size={18} />
            </button>
          ) : (
            <button className="btn primary grow" onClick={onDone}>
              <Check size={18} /> Готово — отметить «Съела»
            </button>
          )}
        </div>
        <div className="tiny muted" style={{ textAlign: 'center', marginTop: 8 }}>Экран не погаснет, пока открыт этот режим. Листай свайпом.</div>
      </div>
    </motion.div>
  )
}
