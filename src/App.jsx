import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sun, CalendarDays, ShoppingBasket, Refrigerator, TrendingUp } from 'lucide-react'
import { useStore } from './lib/store'
import { todayKey, settings, saveSettings } from './lib/plan'
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
  useStore((s) => s.records.settings)
  const [tab, setTab] = useState('today')
  const [day, setDay] = useState(todayKey())
  const [setOpen, setSetOpen] = useState(false)
  const [theme, setThemeS] = useState(readTheme)

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

      <nav className="tabbar">
        {TABS.map(([id, label, Icon]) => (
          <button
            key={id}
            className={'tab' + (tab === id ? ' on' : '')}
            onClick={() => {
              if (id === 'today' && tab === 'today') setDay(todayKey())
              setTab(id)
            }}
          >
            {tab === id && <motion.span layoutId="tabpill" className="pill" transition={{ type: 'spring', damping: 30, stiffness: 380 }} />}
            <Icon size={21} strokeWidth={tab === id ? 2.3 : 1.9} />
            {label}
          </button>
        ))}
      </nav>
      <SettingsSheet open={setOpen} onClose={() => setSetOpen(false)} theme={theme} setTheme={setThemeS} />
      <FeelPrompt />
      <Toast />
    </div>
  )
}
