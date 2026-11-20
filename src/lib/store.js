import { useSyncExternalStore } from 'react'
import { sb } from './supabase'

// Все данные — записи { id, kind, data, deleted, updated_at } в одной таблице.
// Локально — localStorage (источник правды для экрана), Supabase — синхронизация между устройствами.
// Конфликты: побеждает более поздний updated_at.

const LS = 'oliva:v1'
const load = () => {
  try {
    return JSON.parse(localStorage.getItem(LS)) || {}
  } catch {
    return {}
  }
}
const saved = load()

let state = {
  ready: false,
  user: null,
  offline: !!saved.offline, // режим без входа
  records: saved.records || {},
  sync: { status: 'idle', at: saved.syncAt || null, error: null },
  toast: null,
}
let dirty = new Set(saved.dirty || [])
let cursor = saved.cursor || null
let owner = saved.owner || null
const listeners = new Set()

function persist() {
  try {
    localStorage.setItem(
      LS,
      JSON.stringify({ records: state.records, dirty: [...dirty], cursor, owner, offline: state.offline, syncAt: state.sync.at }),
    )
  } catch {
    /* переполнение — данные всё равно в памяти и в облаке */
  }
}

function emit(patch) {
  state = { ...state, ...patch }
  for (const l of listeners) l()
}

export const getState = () => state
export function useStore(sel) {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => sel(state),
  )
}

// ───── чтение/запись ─────
export function get(id) {
  const r = state.records[id]
  return r && !r.deleted ? r.data : undefined
}
export function byKind(kind) {
  const out = []
  for (const r of Object.values(state.records)) if (r.kind === kind && !r.deleted) out.push(r)
  return out
}

export function put(id, kind, data) {
  const rec = { id, kind, data, deleted: false, updated_at: Date.now() }
  dirty.add(id)
  emit({ records: { ...state.records, [id]: rec } })
  persist()
  schedulePush()
}
export function patch(id, kind, part) {
  put(id, kind, { ...(get(id) || {}), ...part })
}
export function remove(id) {
  const r = state.records[id]
  if (!r) return
  dirty.add(id)
  emit({ records: { ...state.records, [id]: { ...r, deleted: true, updated_at: Date.now() } } })
  persist()
  schedulePush()
}
// Пакетная запись — одна перерисовка
export function putMany(list) {
  const recs = { ...state.records }
  const now = Date.now()
  for (const { id, kind, data, deleted } of list) {
    recs[id] = { id, kind, data: data ?? recs[id]?.data ?? {}, deleted: !!deleted, updated_at: now }
    dirty.add(id)
  }
  emit({ records: recs })
  persist()
  schedulePush()
}

export function toast(text, action) {
  emit({ toast: { text, action, at: Date.now() } })
  clearTimeout(toast.t)
  toast.t = setTimeout(() => emit({ toast: null }), action ? 5000 : 2600)
}
export const hideToast = () => emit({ toast: null })

// ───── синхронизация ─────
let timer = null
let running = null
function schedulePush() {
  if (!state.user) return
  clearTimeout(timer)
  timer = setTimeout(syncNow, 1200)
}

export async function syncNow() {
  if (!state.user) return
  if (running) return running
  running = (async () => {
    emit({ sync: { ...state.sync, status: 'syncing', error: null } })
    try {
      // push
      const ids = [...dirty]
      for (let i = 0; i < ids.length; i += 200) {
        const rows = ids
          .slice(i, i + 200)
          .map((id) => state.records[id])
          .filter(Boolean)
          .map((r) => ({ id: r.id, kind: r.kind, data: r.data, deleted: r.deleted, updated_at: r.updated_at }))
        if (rows.length) {
          const { error } = await sb.from('records').upsert(rows, { onConflict: 'user_id,id' })
          if (error) throw error
        }
        for (const r of rows) {
          // если за время отправки запись снова поменялась — оставляем грязной
          if (state.records[r.id]?.updated_at === r.updated_at) dirty.delete(r.id)
        }
      }
      // pull
      for (;;) {
        let q = sb.from('records').select('id,kind,data,deleted,updated_at,server_at').order('server_at').limit(1000)
        if (cursor) q = q.gt('server_at', cursor)
        const { data, error } = await q
        if (error) throw error
        if (!data.length) break
        const recs = { ...state.records }
        for (const r of data) {
          const mine = recs[r.id]
          if (!mine || (r.updated_at >= mine.updated_at && !dirty.has(r.id)) || r.updated_at > mine.updated_at) {
            recs[r.id] = { id: r.id, kind: r.kind, data: r.data, deleted: r.deleted, updated_at: Number(r.updated_at) }
            if (dirty.has(r.id) && r.updated_at > (mine?.updated_at || 0)) dirty.delete(r.id)
          }
        }
        cursor = data[data.length - 1].server_at
        emit({ records: recs })
        if (data.length < 1000) break
      }
      emit({ sync: { status: 'ok', at: Date.now(), error: null } })
    } catch (e) {
      emit({ sync: { ...state.sync, status: 'error', error: e.message || String(e) } })
    } finally {
      persist()
      running = null
    }
  })()
  return running
}

// ───── вход ─────
function setUser(user) {
  if (user && owner && owner !== user.id) {
    // на устройство зашёл другой аккаунт — начинаем с чистого листа
    state.records = {}
    dirty = new Set()
    cursor = null
  }
  if (user && !owner) {
    // данные, накопленные без входа, отправим в облако
    for (const id of Object.keys(state.records)) dirty.add(id)
  }
  if (user) owner = user.id
  emit({ user, ready: true, offline: user ? false : state.offline })
  persist()
  if (user) syncNow()
}

export function initAuth() {
  sb.auth.getSession().then(({ data }) => setUser(data.session?.user || null))
  sb.auth.onAuthStateChange((_e, session) => {
    const u = session?.user || null
    if ((u?.id || null) !== (state.user?.id || null)) setUser(u)
  })
  const kick = () => document.visibilityState === 'visible' && syncNow()
  document.addEventListener('visibilitychange', kick)
  window.addEventListener('online', kick)
  setInterval(kick, 60_000)
}

export async function signIn(email, password) {
  const { error } = await sb.auth.signInWithPassword({ email, password })
  if (error) throw error
}
export async function signUp(email, password) {
  const { data, error } = await sb.auth.signUp({ email, password })
  if (error) throw error
  if (!data.session) throw new Error('Проверь почту и подтверди адрес — или отключи «Confirm email» в Supabase')
}
export async function signOut() {
  await syncNow()
  await sb.auth.signOut()
}
export function goOffline() {
  emit({ offline: true })
  persist()
}
export function leaveOffline() {
  emit({ offline: false })
  persist()
}
