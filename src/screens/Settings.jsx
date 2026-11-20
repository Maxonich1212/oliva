import { useState } from 'react'
import { CalendarPlus, LogOut, RefreshCw, Cloud } from 'lucide-react'
import { useStore, signOut, syncNow, leaveOffline } from '../lib/store'
import { settings, saveSettings, todayKey, diffDays, fmtDay } from '../lib/plan'
import { downloadIcs } from '../lib/ics'
import { Sheet, Stepper, Segmented } from '../components/ui'
import { SLOTS } from '../data/recipes'

export function SettingsSheet({ open, onClose, theme, setTheme }) {
  return (
    <Sheet open={open} onClose={onClose} title="Настройки">
      {open && <Body theme={theme} setTheme={setTheme} />}
    </Sheet>
  )
}

function Body({ theme, setTheme }) {
  useStore((s) => s.records)
  const user = useStore((s) => s.user)
  const sync = useStore((s) => s.sync)
  const st = settings()
  const [ics, setIcs] = useState({ meals: true, prep: true, weigh: true, shop: true })
  const setTime = (kind, slot, v) => saveSettings({ times: { ...st.times, [kind]: { ...st.times[kind], [slot]: v } } })
  const today = todayKey()
  const icsFrom = diffDays(st.startDate, today) > 0 ? st.startDate : today

  return (
    <div className="stack" style={{ gap: 18 }}>
      <Group title="Напоминания">
        <div className="small" style={{ color: 'var(--ink2)' }}>
          Добавлю события в календарь телефона — он сам напомнит о еде, о том, что подготовить вечером, о взвешивании и покупках. Выбери, что включить:
        </div>
        <div className="row wrap" style={{ gap: 8 }}>
          {[['meals', 'Приёмы пищи'], ['prep', 'Подготовка с вечера'], ['weigh', 'Взвешивание по пн'], ['shop', 'Покупки по сб']].map(([k, l]) => (
            <button key={k} className={'chip' + (ics[k] ? ' on' : '')} onClick={() => setIcs({ ...ics, [k]: !ics[k] })}>{l}</button>
          ))}
        </div>
        <button className="btn primary block" onClick={() => downloadIcs({ from: icsFrom, ...ics })}>
          <CalendarPlus size={18} /> Добавить в календарь (28 дней)
        </button>
        <div className="tiny muted">Откроется файл → «Добавить все». Время берётся из расписания ниже — если поменяешь его, добавь заново.</div>
      </Group>

      <Group title="Расписание">
        {[['wd', 'Будни'], ['we', 'Выходные']].map(([kind, label]) => (
          <div key={kind}>
            <div className="eyebrow" style={{ margin: '4px 2px 8px' }}>{label}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {SLOTS.map(([s, n]) => (
                <label key={s} className="field" style={{ gap: 4 }}>
                  <span className="tiny muted" style={{ fontWeight: 700 }}>{n}</span>
                  <input className="input" type="time" value={st.times[kind][s]} onChange={(e) => setTime(kind, s, e.target.value)} style={{ padding: '0 6px', height: 42, fontSize: 14 }} />
                </label>
              ))}
            </div>
          </div>
        ))}
      </Group>

      <Group title="Самочувствие">
        <div className="small" style={{ color: 'var(--ink2)' }}>Когда спрашивать «как живот» после отметки «Съела»</div>
        <Segmented value={st.feelMode} onChange={(v) => saveSettings({ feelMode: v })} options={[['every', 'После еды'], ['dinner', 'Только ужин'], ['off', 'Не спрашивать']]} />
      </Group>

      <Group title="Цели">
        <Row label="Рост"><Stepper value={st.height || 165} step={1} onChange={(v) => saveSettings({ height: v })} fmt={(v) => `${v} см`} /></Row>
        <Row label="Вес на старте"><Stepper value={st.startWeight || 70} step={0.5} onChange={(v) => saveSettings({ startWeight: v })} fmt={(v) => `${v} кг`} /></Row>
        <Row label="Цель"><Stepper value={st.goalWeight || 60} step={0.5} onChange={(v) => saveSettings({ goalWeight: v })} fmt={(v) => `${v} кг`} /></Row>
      </Group>

      <Group title="План">
        <div className="field">
          <label>Дата старта (первый день — понедельник)</label>
          <input className="input" type="date" value={st.startDate} onChange={(e) => e.target.value && saveSettings({ startDate: e.target.value })} />
        </div>
        <Row label="После 28 дней повторять меню">
          <Segmented value={st.repeat ? 'y' : 'n'} onChange={(v) => saveSettings({ repeat: v === 'y' })} options={[['y', 'Да'], ['n', 'Нет']]} />
        </Row>
      </Group>

      <Group title="Оформление">
        <Segmented value={theme} onChange={setTheme} options={[['system', 'Как в системе'], ['light', 'Светлая'], ['dark', 'Тёмная']]} />
      </Group>

      <Group title="Аккаунт">
        {user ? (
          <>
            <div className="row" style={{ gap: 10 }}>
              <Cloud size={18} color="var(--olive)" />
              <div className="grow">
                <div className="small" style={{ fontWeight: 700 }}>{user.email}</div>
                <div className="tiny muted">
                  {sync.status === 'error' ? `Ошибка синхронизации: ${sync.error}` : sync.at ? `Синхронизировано ${new Date(sync.at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}` : 'Синхронизация…'}
                </div>
              </div>
              <button className="icon-btn" onClick={syncNow} aria-label="Синхронизировать"><RefreshCw size={17} /></button>
            </div>
            <button className="btn ghost block" onClick={signOut}><LogOut size={17} /> Выйти</button>
          </>
        ) : (
          <>
            <div className="small muted">Сейчас данные хранятся только на этом устройстве. Войди, чтобы они сохранялись в облаке и были видны на других устройствах — всё, что уже отмечено, перенесётся.</div>
            <button className="btn primary block" onClick={leaveOffline}>Войти или создать аккаунт</button>
          </>
        )}
      </Group>
      <div className="tiny muted" style={{ textAlign: 'center' }}>Олива · старт {fmtDay(st.startDate)} · версия {__APP_VERSION__}</div>
    </div>
  )
}

const Group = ({ title, children }) => (
  <div>
    <div className="eyebrow" style={{ margin: '0 4px 8px' }}>{title}</div>
    <div className="card stack" style={{ gap: 12 }}>{children}</div>
  </div>
)
const Row = ({ label, children }) => (
  <div className="row between">
    <span className="small" style={{ fontWeight: 600 }}>{label}</span>
    {children}
  </div>
)
