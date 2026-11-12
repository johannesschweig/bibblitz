// POST /api/watch/run?dry=1: the checker. Looks at every active Wecker and mails the ones that are due.
// Protected by the header x-watch-secret. `dry=1` only reports what would be sent. Run it by hand for now:
//   curl -X POST -H "x-watch-secret: $SECRET" "https://www.bibblitz.de/api/watch/run?dry=1"
import { timingSafeEqual } from 'node:crypto'
import { getWatchDeps } from '../../utils/watchRuntime'
import { runWatches } from '../../utils/watchService'

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export default defineEventHandler(async (event) => {
  const runSecret = useRuntimeConfig(event).watch.runSecret || (import.meta.dev ? 'dev-run-secret' : '')
  // No secret configured: the checker is simply not there
  if (!runSecret) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  if (!sameSecret(getRequestHeader(event, 'x-watch-secret') ?? '', runSecret)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const deps = getWatchDeps(event)
  if (!deps) throw createError({ statusCode: 503, statusMessage: 'Not configured' })

  const dry = getQuery(event).dry === '1'
  return runWatches(deps, { dry, pauseMs: 1000 })
})
