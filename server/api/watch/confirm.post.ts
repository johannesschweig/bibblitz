// POST /api/watch/confirm: the confirmation page calls this when it opens (the link in the mail leads there).
import { watchEnabled, getWatchDeps } from '../../utils/watchRuntime'
import { confirmWatch } from '../../utils/watchService'

export default defineEventHandler(async (event) => {
  if (!watchEnabled(event)) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  const deps = getWatchDeps(event)
  if (!deps) throw createError({ statusCode: 503, statusMessage: 'Not configured' })

  const body = (await readBody(event).catch(() => undefined)) ?? {}
  const token = body.token ?? getQuery(event).token
  return { ok: true, status: await confirmWatch(deps, token) }
})
