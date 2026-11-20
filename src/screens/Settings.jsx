import { useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { PUSH_TYPES, pushPrefs, pushSupport, enablePush, disablePush, testPush } from '../lib/push'
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
      <PushGroup user={user} st={st} />

      <Group title="Напоминания в календаре">
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
              {SLOTS.map(([s, n]) => (
                <label key={s} className="field" style={{ gap: 4 }}>
                  <span className="tiny muted" style={{ fontWeight: 700 }}>{n}</span>
                  <input className="input" type="time" value={st.times[kind][s]} onChange={(e) => setTime(kind, s, e.target.value)} style={{ padding: '0 4px', height: 42, fontSize: 13.5, minWidth: 0, textAlign: 'center' }} />
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

function PushGroup({ user, st }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const sup = pushSupport()
  const pr = pushPrefs()
  const on = st.pushOn && sup === 'granted'
  const run = async (fn, ok) => {
    setBusy(true)
    setMsg('')
    try {
      await fn()
      if (ok) setMsg(ok)
    } catch (e) {
      setMsg(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Group title="Уведомления">
      {!user ? (
        <div className="small muted">Уведомления работают после входа в аккаунт.</div>
      ) : sup === 'install' ? (
        <div className="small" style={{ color: 'var(--ink2)' }}>
          На iPhone уведомления работают только у приложения на экране «Домой»: Safari → «Поделиться» → «На экран Домой». Потом открой «Оливу» оттуда и включи здесь.
        </div>
      ) : sup === 'unsupported' ? (
        <div className="small muted">Этот браузер не поддерживает уведомления — используй напоминания в календаре ниже.</div>
      ) : sup === 'denied' ? (
        <div className="small" style={{ color: 'var(--terra)' }}>Уведомления запрещены. Разреши их в настройках телефона для «Оливы» и вернись сюда.</div>
      ) : (
        <>
          <div className="row between">
            <div className="row" style={{ gap: 10 }}>
              {on ? <Bell size={18} color="var(--olive)" /> : <BellOff size={18} color="var(--muted)" />}
              <span className="small" style={{ fontWeight: 700 }}>{on ? 'Включены' : 'Выключены'}</span>
            </div>
            {on ? (
              <button className="btn sm" disabled={busy} onClick={() => run(disablePush)}>Выключить</button>
            ) : (
              <button className="btn sm primary" disabled={busy} onClick={() => run(enablePush, 'Готово! Напоминания настроены на 7 дней вперёд')}>Включить</button>
            )}
          </div>
          {on && (
            <>
              <div className="stack" style={{ gap: 8 }}>
                {PUSH_TYPES.map(([k, name, hint]) => (
                  <button key={k} className="row between" style={{ textAlign: 'left' }} onClick={() => saveSettings({ push: { ...pr, [k]: !pr[k] } })}>
                    <span>
                      <span className="small" style={{ fontWeight: 650 }}>{name}</span>
                      <span className="tiny muted" style={{ display: 'block' }}>{hint}</span>
                    </span>
                    <span style={{ width: 44, height: 26, borderRadius: 13, background: pr[k] ? 'var(--olive)' : 'var(--line)', position: 'relative', flex: 'none', transition: 'background .2s' }}>
                      <span style={{ position: 'absolute', top: 3, left: pr[k] ? 21 : 3, width: 20, height: 20, borderRadius: 10, background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                    </span>
                  </button>
                ))}
              </div>
              <button className="btn block sm" disabled={busy} onClick={() => run(testPush, 'Тест отправлен — придёт в течение минуты')}>Прислать тестовое</button>
            </>
          )}
        </>
      )}
      {msg && <div className="tiny" style={{ color: 'var(--ink2)' }}>{msg}</div>}
    </Group>
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
