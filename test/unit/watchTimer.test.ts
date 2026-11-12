import { describe, it, expect, vi, afterEach } from 'vitest'
import { startWatchTimer, describeRun, parseTimes, localClock } from '../../server/utils/watchTimer'
import type { RunReport } from '../../server/utils/watchService'

const report = (over: Partial<RunReport> = {}): RunReport => ({
  dry: false,
  expiredRemoved: 1,
  watches: 3,
  records: 2,
  maintenance: false,
  summary: { sent: 1, 'would-send': 0, waiting: 2, 'record-failed': 0, 'send-failed': 0 },
  results: [{ who: 'a***@b***.de', mediaId: '1', title: 'Secret title', action: 'sent' }],
  ...over
})

const MINUTE = 60 * 1000

// Winter (CET, UTC+1): 11:30 in Berlin is 10:30Z. Summer (CEST, UTC+2): 11:30 in Berlin is 09:30Z.
const winter = (time: string) => new Date(`2026-11-13T${time}:00Z`)

afterEach(() => vi.useRealTimers())

describe('parseTimes', () => {
  it('reads a list, pads, sorts and drops duplicates', () => {
    expect(parseTimes('16:30, 9:05,11:30,11:30')).toEqual(['09:05', '11:30', '16:30'])
  })

  it('treats an empty value or off as "no timer"', () => {
    expect(parseTimes('')).toEqual([])
    expect(parseTimes('  OFF ')).toEqual([])
  })

  it('rejects anything that is not a clock time', () => {
    expect(parseTimes('25:00')).toBeNull()
    expect(parseTimes('11:60')).toBeNull()
    expect(parseTimes('noon')).toBeNull()
    expect(parseTimes('11:30,')).toBeNull()
  })
})

describe('localClock', () => {
  it('reads the Berlin wall clock, winter and summer time', () => {
    expect(localClock(new Date('2026-11-13T10:30:00Z'), 'Europe/Berlin')).toEqual({ day: '2026-11-13', minutes: 11 * 60 + 30 })
    expect(localClock(new Date('2026-07-13T09:30:00Z'), 'Europe/Berlin')).toEqual({ day: '2026-07-13', minutes: 11 * 60 + 30 })
  })

  it('takes the date from Berlin, not from UTC', () => {
    expect(localClock(new Date('2026-11-13T23:30:00Z'), 'Europe/Berlin')).toEqual({ day: '2026-11-14', minutes: 30 })
  })
})

describe('describeRun', () => {
  it('logs counts only, never addresses or titles', () => {
    const line = describeRun(report())
    expect(line).toBe('[watch] run: 3 watches, 2 records, sent 1, waiting 2, failed 0, expired removed 1')
    expect(line).not.toContain('@')
    expect(line).not.toContain('Secret')
  })

  it('names a maintenance stop', () => {
    expect(describeRun(report({ maintenance: true }))).toContain('VÖBB in maintenance')
  })
})

describe('startWatchTimer', () => {
  it('runs each slot once a day at the Berlin time, not before', async () => {
    vi.useFakeTimers({ now: winter('10:00') }) // 11:00 in Berlin
    const run = vi.fn(async () => report())
    const stop = startWatchTimer({ run, times: ['11:30', '16:30'], firstDelayMs: 0, log: () => {} })

    await vi.advanceTimersByTimeAsync(29 * MINUTE)
    expect(run).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(2 * MINUTE) // 11:31
    expect(run).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(4 * 60 * MINUTE) // 15:31
    expect(run).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(60 * MINUTE) // 16:31
    expect(run).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(6 * 60 * MINUTE) // 22:31: nothing more today
    expect(run).toHaveBeenCalledTimes(2)
    stop()
  })

  it('runs again the next day', async () => {
    vi.useFakeTimers({ now: winter('10:29') }) // 11:29 in Berlin
    const run = vi.fn(async () => report())
    const stop = startWatchTimer({ run, times: ['11:30'], firstDelayMs: 0, log: () => {} })

    await vi.advanceTimersByTimeAsync(2 * MINUTE)
    expect(run).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(24 * 60 * MINUTE)
    expect(run).toHaveBeenCalledTimes(2)
    stop()
  })

  it('follows summer time: 11:30 Berlin is 09:30Z in July', async () => {
    vi.useFakeTimers({ now: new Date('2026-07-13T09:20:00Z') })
    const run = vi.fn(async () => report())
    const stop = startWatchTimer({ run, times: ['11:30'], firstDelayMs: 0, log: () => {} })

    await vi.advanceTimersByTimeAsync(9 * MINUTE)
    expect(run).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(2 * MINUTE)
    expect(run).toHaveBeenCalledTimes(1)
    stop()
  })

  it('catches up when it starts shortly after a slot, but skips a slot that is long past', async () => {
    vi.useFakeTimers({ now: winter('10:50') }) // 11:50 in Berlin, 20 min after the 11:30 slot
    const run = vi.fn(async () => report())
    const stop = startWatchTimer({ run, times: ['11:30'], firstDelayMs: 0, log: () => {} })
    await vi.advanceTimersByTimeAsync(MINUTE)
    expect(run).toHaveBeenCalledTimes(1)
    stop()

    vi.setSystemTime(winter('13:00')) // 14:00 in Berlin, 2.5 h after the slot
    const late = vi.fn(async () => report())
    const stopLate = startWatchTimer({ run: late, times: ['11:30'], firstDelayMs: 0, log: () => {} })
    await vi.advanceTimersByTimeAsync(MINUTE)
    expect(late).not.toHaveBeenCalled()
    stopLate()
  })

  it('never starts a run while the previous one is still going', async () => {
    vi.useFakeTimers({ now: winter('10:29') })
    let running = 0
    let peak = 0
    const run = vi.fn(async () => {
      running++
      peak = Math.max(peak, running)
      await new Promise(resolve => setTimeout(resolve, 5 * MINUTE))
      running--
      return report()
    })
    // Two slots one minute apart: the second is due while the first still runs
    const stop = startWatchTimer({ run, times: ['11:30', '11:31'], firstDelayMs: 0, log: () => {} })

    await vi.advanceTimersByTimeAsync(20 * MINUTE)
    expect(peak).toBe(1)
    expect(run).toHaveBeenCalledTimes(2)
    stop()
  })

  it('logs a failed run and keeps going', async () => {
    vi.useFakeTimers({ now: winter('10:29') })
    const lines: string[] = []
    const run = vi.fn()
      .mockRejectedValueOnce(new Error('supabase down'))
      .mockResolvedValue(report())
    const stop = startWatchTimer({ run, times: ['11:30', '11:35'], firstDelayMs: 0, log: line => lines.push(line) })

    await vi.advanceTimersByTimeAsync(10 * MINUTE)
    expect(lines[0]).toBe('[watch] run failed: supabase down')
    expect(lines[1]).toContain('[watch] run: 3 watches')
    stop()
  })

  it('notifies after a run with its report, and after a failed run with the error', async () => {
    vi.useFakeTimers({ now: winter('10:29') })
    const outcomes: unknown[] = []
    const run = vi.fn()
      .mockResolvedValueOnce(report())
      .mockRejectedValueOnce(new Error('supabase down'))
    const stop = startWatchTimer({
      run,
      times: ['11:30', '11:35'],
      firstDelayMs: 0,
      log: () => {},
      notify: async (outcome) => { outcomes.push(outcome) }
    })

    await vi.advanceTimersByTimeAsync(10 * MINUTE)
    expect(outcomes).toHaveLength(2)
    expect(outcomes[0]).toEqual({ report: report() })
    expect(outcomes[1]).toMatchObject({ error: expect.objectContaining({ message: 'supabase down' }) })
    stop()
  })

  it('logs a failing notification and keeps going', async () => {
    vi.useFakeTimers({ now: winter('10:29') })
    const lines: string[] = []
    const run = vi.fn(async () => report())
    const stop = startWatchTimer({
      run,
      times: ['11:30', '11:35'],
      firstDelayMs: 0,
      log: line => lines.push(line),
      notify: async () => { throw new Error('ntfy answered 429') }
    })

    await vi.advanceTimersByTimeAsync(10 * MINUTE)
    expect(run).toHaveBeenCalledTimes(2)
    expect(lines.filter(line => line === '[watch] notification failed: ntfy answered 429')).toHaveLength(2)
    stop()
  })

  it('stop() cancels everything', async () => {
    vi.useFakeTimers({ now: winter('10:29') })
    const run = vi.fn(async () => report())
    const stop = startWatchTimer({ run, times: ['11:30'], firstDelayMs: 0, log: () => {} })
    stop()
    await vi.advanceTimersByTimeAsync(10 * MINUTE)
    expect(run).not.toHaveBeenCalled()
  })
})
