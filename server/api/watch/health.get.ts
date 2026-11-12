// GET /api/watch/health: runs a real query against the store. A cron job on the Pi calls it daily, which keeps a
// free Supabase project from being paused for inactivity, and tells us when the store is unreachable.
import { watchEnabled, getWatchDeps } from '../../utils/watchRuntime'

export default defineEventHandler(async (event) => {
  if (!watchEnabled(event)) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  const deps = getWatchDeps(event)
  if (!deps) throw createError({ statusCode: 503, statusMessage: 'Not configured' })
  try {
    await deps.store.ping()
  } catch (error) {
    console.error('[watch] health check failed:', (error as Error).message)
    throw createError({ statusCode: 503, statusMessage: 'Store unreachable' })
  }
  return { ok: true }
})
