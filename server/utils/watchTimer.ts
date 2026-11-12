// The timer of the shelf watch: calls the checker at fixed clock times (Berlin), from inside the server. The site
// runs on one always-on Fly machine (fly.toml), so there is exactly one timer. It wakes up every half minute and
// asks "is a slot due that has not run yet today?" instead of computing one long delay, so a clock change (DST),
// a slow run or a restart cannot throw it off. The next look only happens after the current run has ended, so two
// runs never overlap, and an error never stops the timer.
import type { RunReport } from './watchService'

export const DEFAULT_TIMES = '11:30,16:30'
const TIME_ZONE = 'Europe/Berlin'

export interface WatchTimerOptions {
  run: () => Promise<RunReport>
  // Clock times as 'HH:MM' (see parseTimes), each runs once a day
  times: string[]
  timeZone?: string
  // How late after a slot a run may still start: a restart shortly after a slot catches up, a late one skips it
  graceMs?: number
  // How often the timer looks at the clock
  pollMs?: number
  // Wait before the first look, so a deploy does not hit voebb.de during the rollout
  firstDelayMs?: number
  now?: () => Date
  log?: (line: string) => void
  // Called after every run with its report, or with the error when it failed. Its own failure is only logged.
  notify?: (outcome: { report: RunReport } | { error: unknown }) => Promise<void>
}

/**
 * Parses 'HH:MM,HH:MM'. Returns [] for an empty value or 'off' (no timer), null when something is not a valid time.
 * The result is sorted and without duplicates.
 */
export function parseTimes(raw: string): string[] | null {
  const text = raw.trim().toLowerCase()
  if (text === '' || text === 'off') return []
  const times: string[] = []
  for (const part of text.split(',')) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(part.trim())
    if (!match) return null
    const hours = Number(match[1])
    const minutes = Number(match[2])
    if (hours > 23 || minutes > 59) return null
    times.push(`${String(hours).padStart(2, '0')}:${match[2]}`)
  }
  return [...new Set(times)].sort()
}

/** Date ('YYYY-MM-DD') and minutes since midnight on the wall clock of a time zone. */
export function localClock(date: Date, timeZone: string): { day: string, minutes: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(date).map(part => [part.type, part.value])
  )
  return { day: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) }
}

/** One log line per run, counts only (the report's results hold masked addresses, they stay out of the logs). */
export function describeRun(report: RunReport): string {
  const { sent, waiting } = report.summary
  const failed = report.summary['record-failed'] + report.summary['send-failed']
  const maintenance = report.maintenance ? ', VÖBB in maintenance, stopped' : ''
  return `[watch] run: ${report.watches} watches, ${report.records} records, sent ${sent}, waiting ${waiting}, failed ${failed}, expired removed ${report.expiredRemoved}${maintenance}`
}

/** Starts the timer and returns a function that stops it. */
export function startWatchTimer(options: WatchTimerOptions): () => void {
  const log = options.log ?? console.log
  const now = options.now ?? (() => new Date())
  const timeZone = options.timeZone ?? TIME_ZONE
  const graceMinutes = (options.graceMs ?? 60 * 60 * 1000) / 60000
  const pollMs = options.pollMs ?? 30 * 1000
  const slots = options.times.map((label) => {
    const [hours = 0, minutes = 0] = label.split(':').map(Number)
    return { label, minutes: hours * 60 + minutes }
  })

  let timer: ReturnType<typeof setTimeout> | undefined
  let stopped = false
  // Slots that already ran today; reset when the day changes
  let ranDay = ''
  const ran = new Set<string>()

  const schedule = (delayMs: number) => {
    if (stopped) return
    timer = setTimeout(tick, delayMs)
    // A pending timer must not keep the process alive on shutdown
    timer.unref?.()
  }

  async function tick() {
    const clock = localClock(now(), timeZone)
    if (clock.day !== ranDay) {
      ranDay = clock.day
      ran.clear()
    }
    const due = slots.find(slot => !ran.has(slot.label) && clock.minutes >= slot.minutes && clock.minutes - slot.minutes < graceMinutes)
    if (due) {
      ran.add(due.label)
      let outcome: { report: RunReport } | { error: unknown }
      try {
        const report = await options.run()
        log(describeRun(report))
        outcome = { report }
      } catch (error) {
        log(`[watch] run failed: ${error instanceof Error ? error.message : String(error)}`)
        outcome = { error }
      }
      try {
        await options.notify?.(outcome)
      } catch (error) {
        log(`[watch] notification failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    schedule(pollMs)
  }

  schedule(options.firstDelayMs ?? pollMs)
  return () => {
    stopped = true
    if (timer) clearTimeout(timer)
  }
}
