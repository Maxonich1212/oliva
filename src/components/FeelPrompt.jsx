import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { put, get } from '../lib/store'

export const FEELS = [
  [0, '😌', 'Легко'],
  [1, '🙂', 'Чуть-чуть'],
  [2, '😕', 'Вздутие'],
  [3, '😣', 'Сильно'],
]
export const FEEL_TAGS = ['Газы', 'Тяжесть', 'Боль', 'Урчание', 'Изжога', 'Отрыжка', 'Сонливость', 'Голод']
const AFTER = { b: 'завтрака', l: 'обеда', s: 'полдника', d: 'ужина' }
export const FEEL_COLOR = ['var(--olive)', 'var(--sage)', 'var(--honey)', 'var(--terra)']

export const feelId = (k, slot) => `feel:${k}:${slot}`

// Маленькая карточка над нижним меню: один тап — и готово
export function FeelPrompt() {
  const [ask, setAsk] = useState(null)
  const [score, setScore] = useState(null)
  const [tags, setTags] = useState([])
  const [done, setDone] = useState(false)
  const idle = useRef(null)

  useEffect(() => {
    const on = (e) => {
      setAsk(e.detail)
      const prev = get(feelId(e.detail.k, e.detail.slot))
      setScore(prev?.score ?? null)
      setTags(prev?.tags || [])
      setDone(false)
    }
    window.addEventListener('oliva:feel', on)
    return () => window.removeEventListener('oliva:feel', on)
  }, [])

  // если не трогать — сама уберётся
  useEffect(() => {
    clearTimeout(idle.current)
    if (ask && score == null) idle.current = setTimeout(() => setAsk(null), 15000)
    return () => clearTimeout(idle.current)
  }, [ask, score])

  const save = (s, t) => {
    put(feelId(ask.k, ask.slot), 'feel', { score: s, tags: t, at: Date.now() })
  }
  const choose = (s) => {
    setScore(s)
    save(s, tags)
    if (s === 0) finish()
  }
  const finish = () => {
    setDone(true)
    setTimeout(() => setAsk(null), 1100)
  }

  return (
    <AnimatePresence>
      {ask && (
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          style={{
            position: 'fixed', left: '50%', x: '-50%', bottom: 'calc(env(safe-area-inset-bottom) + 86px)',
            width: 'min(528px, calc(100% - 24px))', zIndex: 35,
          }}
        >
          <div className="card" style={{ boxShadow: '0 12px 40px rgba(40,30,10,.18)', padding: 16 }}>
            <AnimatePresence mode="wait">
              {done ? (
                <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="row" style={{ justifyContent: 'center', height: 74, gap: 10 }}>
                  <motion.span initial={{ rotate: -30, scale: 0.5 }} animate={{ rotate: 0, scale: 1 }} style={{ fontSize: 30 }}>🌿</motion.span>
                  <span style={{ fontWeight: 700 }}>Записала. Спасибо!</span>
                </motion.div>
              ) : (
                <motion.div key="ask" exit={{ opacity: 0 }}>
                  <div className="row between" style={{ marginBottom: 12 }}>
                    <div className="h3">Как живот после {AFTER[ask.slot]}?</div>
                    <button className="small muted" onClick={() => setAsk(null)} style={{ fontWeight: 700 }}>Позже</button>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    {FEELS.map(([s, e, l]) => (
                      <motion.button
                        key={s}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => choose(s)}
                        style={{
                          flex: 1, padding: '10px 0 8px', borderRadius: 16,
                          background: score === s ? 'var(--olive-soft)' : 'var(--card2)',
                          boxShadow: score === s ? `inset 0 0 0 2px ${FEEL_COLOR[s]}` : 'none',
                        }}
                      >
                        <motion.div animate={{ scale: score === s ? 1.18 : 1 }} style={{ fontSize: 26 }}>{e}</motion.div>
                        <div className="tiny" style={{ fontWeight: 700, color: 'var(--ink2)' }}>{l}</div>
                      </motion.button>
                    ))}
                  </div>
                  <AnimatePresence>
                    {score > 0 && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} style={{ overflow: 'hidden' }}>
                        <div className="row wrap" style={{ gap: 6, marginTop: 12 }}>
                          {FEEL_TAGS.map((t) => {
                            const on = tags.includes(t)
                            return (
                              <button
                                key={t}
                                className={'chip' + (on ? ' on' : '')}
                                style={{ height: 30, fontSize: 13 }}
                                onClick={() => {
                                  const nt = on ? tags.filter((x) => x !== t) : [...tags, t]
                                  setTags(nt)
                                  save(score, nt)
                                }}
                              >
                                {t}
                              </button>
                            )
                          })}
                        </div>
                        <button className="btn primary block sm" style={{ marginTop: 12 }} onClick={finish}>Готово</button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
