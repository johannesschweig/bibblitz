// Starts the timer of the shelf watch when the server boots (see server/utils/watchTimer.ts and docs/shelf-watch.md).
// Only in production, only with the feature flag on. Runs twice a day at the Berlin clock times in
// NUXT_WATCH_TIMER_TIMES (default 11:30,16:30; empty or "off" = no timer). With NUXT_WATCH_NTFY_TOPIC set, every
// run sends a message to ntfy (checked count, free copies).
import { getWatchDeps } from '../utils/watchRuntime'
import { runWatches } from '../utils/watchService'
import { createNtfySender, describeFailureNotification, describeRunNotification } from '../utils/watchNotify'
import { DEFAULT_TIMES, parseTimes, startWatchTimer } from '../utils/watchTimer'

export default defineNitroPlugin(() => {
  if (import.meta.dev || import.meta.prerender) return
  const config = useRuntimeConfig()
  if (String(config.public.watchEnabled) !== 'true') return

  const times = parseTimes(String(config.watch.timerTimes ?? DEFAULT_TIMES))
  if (times === null) {
    console.log(`[watch] timer not started: NUXT_WATCH_TIMER_TIMES "${config.watch.timerTimes}" is not a list like 11:30,16:30`)
    return
  }
  if (times.length === 0) {
    console.log('[watch] timer is off (NUXT_WATCH_TIMER_TIMES is empty or off)')
    return
  }
  if (!getWatchDeps()) {
    console.log('[watch] timer not started: the watch is not fully configured')
    return
  }

  // Optional: a message to the owner's phone after every run (NUXT_WATCH_NTFY_TOPIC, a Fly secret)
  const topic = String(config.watch.ntfyTopic ?? '').trim()
  const send = topic ? createNtfySender(topic) : undefined
  const siteUrl = (config.watch.siteUrl || 'https://www.bibblitz.de').replace(/\/$/, '')

  startWatchTimer({
    times,
    notify: send && (async outcome => send('report' in outcome ? describeRunNotification(outcome.report, siteUrl) : describeFailureNotification(outcome.error))),
    firstDelayMs: 2 * 60 * 1000,
    run: async () => {
      const deps = getWatchDeps()
      if (!deps) throw new Error('not configured')
      return runWatches(deps, { dry: false, pauseMs: 1000 })
    }
  })
  console.log(`[watch] timer started: runs at ${times.join(', ')} (Europe/Berlin), ntfy ${send ? 'on' : 'off'}`)
})
