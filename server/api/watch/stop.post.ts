// POST /api/watch/stop: switches a Wecker off and deletes the address. Called by the stop page when it opens, and
// by mail programs for the one-click unsubscribe (RFC 8058: a POST to the URL of the List-Unsubscribe header).
import { watchEnabled, getWatchDeps } from '../../utils/watchRuntime'
import { stopWatch } from '../../utils/watchService'

export default defineEventHandler(async (event) => {
  if (!watchEnabled(event)) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  const deps = getWatchDeps(event)
  if (!deps) throw createError({ statusCode: 503, statusMessage: 'Not configured' })

  const body = (await readBody(event).catch(() => undefined)) ?? {}
  const token = (typeof body === 'object' ? body.token : undefined) ?? getQuery(event).token
  return { ok: true, status: await stopWatch(deps, token) }
})
