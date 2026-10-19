import { useEffect, useState, useSyncExternalStore } from "react"
import { supabase } from "./supabase"
import {
  getAllWorkouts, getAllRuns, saveWorkout, saveRun, deleteWorkout, deleteRun,
  serializeWorkout, deserializeWorkout, serializeRun, deserializeRun,
  onDbChange, emitDbChange,
} from "./db"

// Local-first sync: IndexedDB stays the source of truth for the UI and works
// offline. When signed in, changes are pushed to Supabase and a full two-way
// merge runs on sign-in, app start, reconnect and when the app regains focus.
// Conflicts: newest version wins. Deletes are soft (deleted_at) so other
// devices learn about them instead of resurrecting the row.

type Table = "workouts" | "runs"

interface RemoteRow {
  id: string
  data: Record<string, unknown>
  updated_at: string
  deleted_at: string | null
}

interface Adapter<T> {
  table: Table
  getLocal: () => Promise<T[]>
  id: (item: T) => string
  version: (item: T) => number
  toRow: (item: T) => { data: Record<string, unknown>; updated_at: string }
  fromRow: (data: Record<string, unknown>) => T
  saveLocal: (item: T) => Promise<void>
  deleteLocal: (id: string) => Promise<void>
}

const workoutAdapter: Adapter<Awaited<ReturnType<typeof getAllWorkouts>>[number]> = {
  table: "workouts",
  getLocal: getAllWorkouts,
  id: (w) => w.id,
  version: (w) => (w.updatedAt ?? w.createdAt).getTime(),
  toRow: (w) => ({ data: serializeWorkout(w), updated_at: (w.updatedAt ?? w.createdAt).toISOString() }),
  fromRow: deserializeWorkout,
  saveLocal: (w) => saveWorkout(w, { silent: true }),
  deleteLocal: (id) => deleteWorkout(id, { silent: true }),
}

const runAdapter: Adapter<Awaited<ReturnType<typeof getAllRuns>>[number]> = {
  table: "runs",
  getLocal: getAllRuns,
  id: (r) => r.id,
  version: (r) => (r.endedAt ?? r.startedAt).getTime(),
  toRow: (r) => ({ data: serializeRun(r), updated_at: (r.endedAt ?? r.startedAt).toISOString() }),
  fromRow: deserializeRun,
  saveLocal: (r) => saveRun(r, { silent: true }),
  deleteLocal: (id) => deleteRun(id, { silent: true }),
}

// ---------------------------------------------------------------------------
// Status store
// ---------------------------------------------------------------------------

export interface SyncState {
  configured: boolean
  email: string | null
  status: "idle" | "syncing" | "error"
  lastSynced: Date | null
  error: string | null
}

let userId: string | null = null
let state: SyncState = {
  configured: supabase !== null,
  email: null,
  status: "idle",
  lastSynced: null,
  error: null,
}
const stateListeners = new Set<() => void>()

function setState(patch: Partial<SyncState>) {
  state = { ...state, ...patch }
  stateListeners.forEach((l) => l())
}

export function useSync(): SyncState {
  return useSyncExternalStore(
    (cb) => { stateListeners.add(cb); return () => stateListeners.delete(cb) },
    () => state,
  )
}

/** Bumps whenever a sync pulled changes into IndexedDB, so pages can reload. */
export function useDataVersion(): number {
  const [version, setVersion] = useState(0)
  useEffect(() => onDbChange((c) => { if (c.type === "merged") setVersion((v) => v + 1) }), [])
  return version
}

// ---------------------------------------------------------------------------
// Pending deletes (survive offline / reloads until the remote confirms)
// ---------------------------------------------------------------------------

const PENDING_KEY = "pt-pending-deletes"

function readPending(): { table: Table; id: string }[] {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) ?? "[]") } catch { return [] }
}

function writePending(list: { table: Table; id: string }[]) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(list))
}

async function flushPending() {
  if (!supabase || !userId) return
  const pending = readPending()
  for (const table of ["workouts", "runs"] as const) {
    const ids = pending.filter((p) => p.table === table).map((p) => p.id)
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200)
      const { error } = await supabase
        .from(table)
        .update({ deleted_at: new Date().toISOString() })
        .in("id", chunk)
      if (error) throw error
      writePending(readPending().filter((p) => !(p.table === table && chunk.includes(p.id))))
    }
  }
}

function queueDelete(table: Table, ids: string[]) {
  const pending = readPending()
  writePending([...pending, ...ids.map((id) => ({ table, id }))])
  if (userId) flushPending().catch(() => { /* retried on next sync */ })
}

// ---------------------------------------------------------------------------
// Push / merge
// ---------------------------------------------------------------------------

async function upsertRows<T>(a: Adapter<T>, items: T[]) {
  if (!supabase || !userId || items.length === 0) return
  for (let i = 0; i < items.length; i += 500) {
    const rows = items.slice(i, i + 500).map((item) => ({
      user_id: userId,
      id: a.id(item),
      ...a.toRow(item),
      deleted_at: null,
    }))
    const { error } = await supabase.from(a.table).upsert(rows, { onConflict: "user_id,id" })
    if (error) throw error
  }
}

async function fetchRemote(table: Table): Promise<RemoteRow[]> {
  if (!supabase) return []
  const rows: RemoteRow[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from(table)
      .select("id,data,updated_at,deleted_at")
      .order("id")
      .range(from, from + 999)
    if (error) throw error
    rows.push(...(data as RemoteRow[]))
    if (data.length < 1000) return rows
  }
}

/** Returns true if local data changed. */
async function mergeTable<T>(a: Adapter<T>): Promise<boolean> {
  const [remote, local] = await Promise.all([fetchRemote(a.table), a.getLocal()])
  const pendingIds = new Set(readPending().filter((p) => p.table === a.table).map((p) => p.id))
  const localById = new Map(local.map((item) => [a.id(item), item]))
  const remoteIds = new Set<string>()
  const toPush: T[] = []
  let changed = false

  for (const row of remote) {
    remoteIds.add(row.id)
    if (pendingIds.has(row.id)) continue
    const mine = localById.get(row.id)

    if (row.deleted_at) {
      if (mine) { await a.deleteLocal(row.id); changed = true }
      continue
    }
    try {
      if (!mine) {
        await a.saveLocal(a.fromRow(row.data))
        changed = true
      } else if (Date.parse(row.updated_at) > a.version(mine)) {
        await a.saveLocal(a.fromRow(row.data))
        changed = true
      } else if (Date.parse(row.updated_at) < a.version(mine)) {
        toPush.push(mine)
      }
    } catch (e) {
      console.warn(`Skipping unreadable remote ${a.table} row ${row.id}`, e)
    }
  }

  for (const [id, item] of localById) {
    if (!remoteIds.has(id) && !pendingIds.has(id)) toPush.push(item)
  }
  await upsertRows(a, toPush)
  return changed
}

let syncing = false
let rerun = false

export async function syncNow(): Promise<void> {
  if (!supabase || !userId) return
  if (syncing) { rerun = true; return }
  syncing = true
  setState({ status: "syncing", error: null })
  try {
    await flushPending()
    const a = await mergeTable(workoutAdapter)
    const b = await mergeTable(runAdapter)
    setState({ status: "idle", lastSynced: new Date() })
    if (a || b) emitDbChange({ type: "merged" })
  } catch (e) {
    setState({ status: "error", error: e instanceof Error ? e.message : String(e) })
  } finally {
    syncing = false
    if (rerun) { rerun = false; void syncNow() }
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function signIn(email: string, password: string): Promise<string | null> {
  if (!supabase) return "Sync isn't configured."
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return error?.message ?? null
}

/** Returns an error, or an info message when email confirmation is required. */
export async function signUp(email: string, password: string): Promise<{ error?: string; info?: string }> {
  if (!supabase) return { error: "Sync isn't configured." }
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return { error: error.message }
  if (!data.session) return { info: "Check your email to confirm your account, then sign in." }
  return {}
}

export async function signOut() {
  await supabase?.auth.signOut()
}

// ---------------------------------------------------------------------------
// Wiring (call once at startup)
// ---------------------------------------------------------------------------

let lastTrigger = 0
function syncSoon() {
  if (Date.now() - lastTrigger < 30_000) return
  lastTrigger = Date.now()
  void syncNow()
}

export function initSync() {
  if (!supabase) return

  supabase.auth.onAuthStateChange((_event, session) => {
    userId = session?.user.id ?? null
    setState({ email: session?.user.email ?? null, ...(session ? {} : { status: "idle", lastSynced: null }) })
    if (session) void syncNow()
  })

  window.addEventListener("online", () => void syncNow())
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") syncSoon()
  })

  onDbChange((c) => {
    if (!userId) return
    const failed = () => { /* offline: the next full sync reconciles it */ }
    switch (c.type) {
      case "workout-saved": upsertRows(workoutAdapter, [c.workout]).catch(failed); break
      case "run-saved": upsertRows(runAdapter, [c.run]).catch(failed); break
      case "workout-deleted": queueDelete("workouts", [c.id]); break
      case "runs-cleared": queueDelete("runs", c.ids); break
    }
  })
}
