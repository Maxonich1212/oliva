// Обновления приложения без переустановки иконки.
// Проверяем version.json при запуске, при возвращении в приложение и раз в 30 минут.
// Если версия на сайте новее — показываем плашку «Обновить»; нажатие перезагружает приложение уже с новыми файлами.
import { useSyncExternalStore } from 'react'

let state = { available: false, checking: false, remote: null }
const subs = new Set()
const set = (p) => {
  state = { ...state, ...p }
  subs.forEach((f) => f())
}
export const useUpdate = () => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => state)

export async function checkUpdate() {
  if (!import.meta.env.PROD) return false
  set({ checking: true })
  try {
    const r = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' })
    const { v } = await r.json()
    const reg = await navigator.serviceWorker?.getRegistration()
    reg?.update().catch(() => {})
    const available = !!v && v !== __APP_VERSION__
    set({ available, remote: v, checking: false })
    return available
  } catch {
    set({ checking: false })
    return false
  }
}

export async function applyUpdate() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) {
      await reg.update().catch(() => {})
      reg.waiting?.postMessage({ type: 'skip-waiting' })
    }
  } catch {
    /* перезагрузим и так */
  }
  // страница грузится «сначала из сети», поэтому после перезагрузки откроется новая версия
  setTimeout(() => location.reload(), 300)
}

export function startUpdateChecks() {
  if (!import.meta.env.PROD) return
  checkUpdate()
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && checkUpdate())
  setInterval(checkUpdate, 30 * 60_000)
  // если новый сервис-воркер включился сам — тоже предлагаем обновиться
  navigator.serviceWorker?.addEventListener('controllerchange', () => set({ available: true }))
}
