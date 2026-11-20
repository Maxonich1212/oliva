import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sun, CalendarDays, ShoppingBasket, Refrigerator, TrendingUp } from 'lucide-react'
import { useStore } from './lib/store'
import { todayKey, settings, saveSettings, shoppingNeed, addDays, diffDays } from './lib/plan'
import Today from './screens/Today'
import Plan from './screens/Plan'
import Shop from './screens/Shop'
import Pantry from './screens/Pantry'
import Progress from './screens/Progress'
import Auth from './screens/Auth'
import Welcome from './screens/Welcome'
import { SettingsSheet } from './screens/Settings'
import { Toast } from './components/ui'
import { FeelPrompt } from './components/FeelPrompt'
import { PrepSheet } from './components/PrepSheet'
import { scheduleQueueSync, syncQueue } from './lib/push'

const TABS = [
  ['today', 'Сегодня', Sun],
  ['plan', 'Меню', CalendarDays],
  ['shop', 'Покупки', ShoppingBasket],
  ['pantry', 'Запасы', Refrigerator],
  ['progress', 'Прогресс', TrendingUp],
]

const readTheme = () => {
  try {
    return localStorage.getItem('oliva:theme') || 'system'
  } catch {
    return 'system'
  }
}

export default function App() {
  const ready = useStore((s) => s.ready)
  const user = useStore((s) => s.user)
  const offline = useStore((s) => s.offline)
  const records = useStore((s) => s.records)
  const [prepOpen, setPrepOpen] = useState(false)
  const [tab, setTab] = useState('today')
  const [day, setDay] = useState(todayKey())
  const [setOpen, setSetOpen] = useState(false)
  const [theme, setThemeS] = useState(readTheme)
  const shopCount = useMemo(() => {
    if (!ready) return 0
    const st = settings()
    const today = todayKey()
    const from = diffDays(st.startDate, today) > 0 ? st.startDate : today
    let span = 2
    try {
      span = JSON.parse(localStorage.getItem('oliva:span')) ?? 2
    } catch {
      /* по умолчанию 3 дня */
    }
    return shoppingNeed(from, addDays(from, span), st).items.filter((i) => i.buy > 0.01).length
  }, [records, ready, tab])

  useEffect(() => {
    const el = document.documentElement
    if (theme === 'system') el.removeAttribute('data-theme')
    else el.setAttribute('data-theme', theme)
    try {
      localStorage.setItem('oliva:theme', theme)
    } catch {
      /* ничего */
    }
  }, [theme])

  // в полночь «сегодня» сдвигается
  useEffect(() => {
    let last = todayKey()
    const t = setInterval(() => {
      const now = todayKey()
      if (now !== last) {
        setDay((d) => (d === last ? now : d))
        last = now
      }
    }, 60_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [tab])

  // очередь push-напоминаний пересчитывается после любых изменений и раз в 30 минут
  useEffect(() => {
    if (user) scheduleQueueSync()
  }, [records, user])
  useEffect(() => {
    const t = setInterval(() => syncQueue(true), 30 * 60_000)
    return () => clearInterval(t)
  }, [])

  // переходы из уведомлений: ?day=…, ?feel=день:приём, ?tab=…, ?prep=1
  useEffect(() => {
    const apply = (href) => {
      const u = new URL(href, location.href)
      const p = u.searchParams
      if (p.get('day')) {
        setDay(p.get('day'))
        setTab('today')
      }
      if (p.get('tab')) setTab(p.get('tab'))
      if (p.get('prep')) setPrepOpen(true)
      if (p.get('feel')) {
        const [k, slot] = p.get('feel').split(':')
        setDay(k)
        setTab('today')
        setTimeout(() => window.dispatchEvent(new CustomEvent('oliva:feel', { detail: { k, slot } })), 600)
      }
      if ([...p.keys()].length) history.replaceState(null, '', location.pathname)
    }
    if (ready) apply(location.href)
    const onMsg = (e) => e.data?.type === 'open' && apply(e.data.url)
    navigator.serviceWorker?.addEventListener('message', onMsg)
    return () => navigator.serviceWorker?.removeEventListener('message', onMsg)
  }, [ready])

  if (!ready) return <div style={{ minHeight: '100dvh' }} />
  if (!user && !offline) return <Auth />
  if (!settings().onboarded) return <Welcome onDone={(goPantry) => { saveSettings({ onboarded: true }); if (goPantry) setTab('pantry') }} />

  const openDay = (k) => {
    setDay(k)
    setTab('today')
  }

  return (
    <div className="app">
      <AnimatePresence mode="wait" initial={false}>
        <motion.main key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
          {tab === 'today' && <Today day={day} setDay={setDay} openSettings={() => setSetOpen(true)} goShop={() => setTab('shop')} />}
          {tab === 'plan' && <Plan openDay={openDay} />}
          {tab === 'shop' && <Shop />}
          {tab === 'pantry' && <Pantry />}
          {tab === 'progress' && <Progress />}
        </motion.main>
      </AnimatePresence>

      <div className="tabbar-fade" />
      <nav className="tabbar">
        {TABS.map(([id, label, Icon]) => {
          const on = tab === id
          return (
            <motion.button
              key={id}
              className={'tab' + (on ? ' on' : '')}
              whileTap={{ scale: 0.9 }}
              aria-label={label}
              onClick={() => {
                if (id === 'today' && tab === 'today') setDay(todayKey())
                navigator.vibrate?.(8)
                setTab(id)
              }}
            >
              {on && <motion.span layoutId="tabpill" className="pill" transition={{ type: 'spring', damping: 26, stiffness: 320 }} />}
              <motion.span
                key={on ? 'on' : 'off'}
                initial={on ? { scale: 0.6, rotate: -12 } : false}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 12, stiffness: 400 }}
                style={{ display: 'grid' }}
              >
                <Icon size={22} strokeWidth={on ? 2.4 : 2} />
              </motion.span>
              <AnimatePresence initial={false}>
                {on && (
                  <motion.span
                    className="label"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
              {id === 'shop' && !on && shopCount > 0 && (
                <motion.span className="badge" initial={{ scale: 0 }} animate={{ scale: 1 }} key={shopCount}>
                  {shopCount > 99 ? '99+' : shopCount}
                </motion.span>
              )}
            </motion.button>
          )
        })}
      </nav>
      <SettingsSheet open={setOpen} onClose={() => setSetOpen(false)} theme={theme} setTheme={setThemeS} />
      <FeelPrompt />
      <PrepSheet open={prepOpen} onClose={() => setPrepOpen(false)} />
      <Toast />
    </div>
  )
}
