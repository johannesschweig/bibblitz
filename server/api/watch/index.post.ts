// POST /api/watch: a visitor sets a Wecker. Validates, stores a pending watch, mails the confirmation.
import { watchEnabled, getWatchDeps, watchRateLimits, clientIp } from '../../utils/watchRuntime'
import { subscribe } from '../../utils/watchService'

export default defineEventHandler(async (event) => {
  if (!watchEnabled(event)) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  const deps = getWatchDeps(event)
  if (!deps) throw createError({ statusCode: 503, statusMessage: 'Not configured' })

  const body = (await readBody(event)) ?? {}
  // Honeypot: a hidden field that people never fill. Answer like a success, so bots learn nothing
  if (typeof body.website === 'string' && body.website !== '') return { ok: true }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!watchRateLimits.ip.allow(clientIp(event)) || (email && !watchRateLimits.email.allow(email))) {
    setResponseStatus(event, 429)
    return { ok: false, reason: 'rate' }
  }

  const result = await subscribe(deps, body)
  if (!result.ok) setResponseStatus(event, result.reason === 'invalid' ? 400 : 502)
  return result
})
