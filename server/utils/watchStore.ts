// Storage of the shelf watch. One interface, two implementations: Supabase (production) and memory (dev without
// keys, and the tests). Table: migrations/001_bibblitz_watches.sql. Only the server touches it, with the secret key.
import { createClient } from '@supabase/supabase-js'

export type WatchStatus = 'pending' | 'active'

export interface WatchRow {
  id: string
  email: string
  mediaId: string
  mediaTitle: string
  libraryIds: string[]
  status: WatchStatus
  createdAt: string
  confirmedAt: string | null
  expiresAt: string
  lastCheckedAt: string | null
}

export interface UpsertPending {
  email: string
  mediaId: string
  mediaTitle: string
  libraryIds: string[]
  expiresAt: string
}

export interface WatchStore {
  /** New pending watch, or the existing one for this address and record: its libraries and title are updated, an active one stays active */
  upsertPending(input: UpsertPending): Promise<{ row: WatchRow, created: boolean }>
  findById(id: string): Promise<WatchRow | null>
  activate(id: string, expiresAt: string, now: string): Promise<void>
  /** False when there was nothing to delete */
  deleteById(id: string): Promise<boolean>
  /** Removes pending links past their 24 h and active watches past their end; returns how many */
  deleteExpired(now: string): Promise<number>
  listActive(): Promise<WatchRow[]>
  markChecked(ids: string[], now: string): Promise<void>
  /** A real query: keeps a free Supabase project from being paused for inactivity */
  ping(): Promise<void>
}

export function createMemoryStore(): WatchStore & { rows: Map<string, WatchRow> } {
  const rows = new Map<string, WatchRow>()
  const clone = (row: WatchRow): WatchRow => ({ ...row, libraryIds: [...row.libraryIds] })

  return {
    rows,
    async upsertPending(input) {
      const existing = [...rows.values()].find(r => r.email === input.email && r.mediaId === input.mediaId)
      if (existing) {
        existing.libraryIds = [...input.libraryIds]
        existing.mediaTitle = input.mediaTitle
        if (existing.status === 'pending') existing.expiresAt = input.expiresAt
        return { row: clone(existing), created: false }
      }
      const row: WatchRow = {
        id: crypto.randomUUID(),
        email: input.email,
        mediaId: input.mediaId,
        mediaTitle: input.mediaTitle,
        libraryIds: [...input.libraryIds],
        status: 'pending',
        createdAt: new Date().toISOString(),
        confirmedAt: null,
        expiresAt: input.expiresAt,
        lastCheckedAt: null
      }
      rows.set(row.id, row)
      return { row: clone(row), created: true }
    },
    async findById(id) {
      const row = rows.get(id)
      return row ? clone(row) : null
    },
    async activate(id, expiresAt, now) {
      const row = rows.get(id)
      if (row) Object.assign(row, { status: 'active', confirmedAt: now, expiresAt })
    },
    async deleteById(id) {
      return rows.delete(id)
    },
    async deleteExpired(now) {
      let n = 0
      for (const [id, row] of rows) {
        if (row.expiresAt < now) {
          rows.delete(id)
          n++
        }
      }
      return n
    },
    async listActive() {
      return [...rows.values()].filter(r => r.status === 'active').map(clone)
    },
    async markChecked(ids, now) {
      for (const id of ids) {
        const row = rows.get(id)
        if (row) row.lastCheckedAt = now
      }
    },
    async ping() {}
  }
}

const TABLE = 'bibblitz_watches'

interface DbRow {
  id: string
  email: string
  media_id: string
  media_title: string
  library_ids: string[]
  status: WatchStatus
  created_at: string
  confirmed_at: string | null
  expires_at: string
  last_checked_at: string | null
}

const fromDb = (r: DbRow): WatchRow => ({
  id: r.id,
  email: r.email,
  mediaId: r.media_id,
  mediaTitle: r.media_title,
  libraryIds: r.library_ids,
  status: r.status,
  createdAt: r.created_at,
  confirmedAt: r.confirmed_at,
  expiresAt: r.expires_at,
  lastCheckedAt: r.last_checked_at
})

export function createSupabaseStore(url: string, secretKey: string): WatchStore {
  // No session: this is a server-side client with the secret key, nothing is stored in a browser
  const db = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })

  function check<T>(result: { data: T, error: { message: string } | null }): T {
    if (result.error) throw new Error(`watch store: ${result.error.message}`)
    return result.data
  }

  return {
    async upsertPending(input) {
      const found = check(await db.from(TABLE).select('*').eq('email', input.email).eq('media_id', input.mediaId).maybeSingle<DbRow>())
      if (found) {
        const patch: Partial<DbRow> = { library_ids: input.libraryIds, media_title: input.mediaTitle }
        if (found.status === 'pending') patch.expires_at = input.expiresAt
        const updated = check(await db.from(TABLE).update(patch).eq('id', found.id).select('*').single<DbRow>())
        return { row: fromDb(updated), created: false }
      }
      const inserted = check(await db.from(TABLE).insert({
        email: input.email,
        media_id: input.mediaId,
        media_title: input.mediaTitle,
        library_ids: input.libraryIds,
        status: 'pending',
        expires_at: input.expiresAt
      }).select('*').single<DbRow>())
      return { row: fromDb(inserted), created: true }
    },
    async findById(id) {
      const row = check(await db.from(TABLE).select('*').eq('id', id).maybeSingle<DbRow>())
      return row ? fromDb(row) : null
    },
    async activate(id, expiresAt, now) {
      check(await db.from(TABLE).update({ status: 'active', confirmed_at: now, expires_at: expiresAt }).eq('id', id))
    },
    async deleteById(id) {
      const deleted = check(await db.from(TABLE).delete().eq('id', id).select('id'))
      return (deleted?.length ?? 0) > 0
    },
    async deleteExpired(now) {
      const deleted = check(await db.from(TABLE).delete().lt('expires_at', now).select('id'))
      return deleted?.length ?? 0
    },
    async listActive() {
      const rows = check(await db.from(TABLE).select('*').eq('status', 'active').order('created_at').returns<DbRow[]>())
      return (rows ?? []).map(fromDb)
    },
    async markChecked(ids, now) {
      if (ids.length === 0) return
      check(await db.from(TABLE).update({ last_checked_at: now }).in('id', ids))
    },
    async ping() {
      check(await db.from(TABLE).select('id', { count: 'exact', head: true }))
    }
  }
}
