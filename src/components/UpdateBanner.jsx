import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { useUpdate, applyUpdate } from '../lib/update'

// Плашка сверху: «Вышло обновление — Обновить»
export function UpdateBanner() {
  const { available } = useUpdate()
  return (
    <AnimatePresence>
      {available && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 300 }}
          style={{ position: 'fixed', top: 'calc(env(safe-area-inset-top) + 10px)', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 80, pointerEvents: 'none' }}
        >
          <div className="row" style={{ pointerEvents: 'auto', gap: 10, background: 'var(--bar)', color: 'var(--bar-pill)', padding: '8px 8px 8px 16px', borderRadius: 999, boxShadow: '0 10px 30px rgba(40,30,10,.3)', maxWidth: 'calc(100% - 24px)' }}>
            <motion.span animate={{ rotate: [0, 15, -10, 0] }} transition={{ repeat: Infinity, duration: 2.4 }} style={{ display: 'grid' }}>
              <Sparkles size={17} />
            </motion.span>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Вышло обновление</span>
            <button onClick={applyUpdate} style={{ background: 'var(--bar-pill)', color: 'var(--bar-pill-ink)', fontWeight: 800, fontSize: 14, padding: '7px 14px', borderRadius: 999 }}>
              Обновить
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
