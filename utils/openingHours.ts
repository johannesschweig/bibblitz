import type { Closure } from '../types/types'

export type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
export type WeekHours = Partial<Record<DayKey, string | null>> | null | undefined
export type OpenStatus = 'open-service' | 'open-no-service' | 'open' | 'closed' | 'closed-temporarily'
export type { Closure }

const DAY_KEYS: DayKey[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

// Day and minutes since midnight in Berlin, independent of the visitor's or server's timezone
export function berlinNow(date: Date = new Date()): { day: DayKey, minutes: number, date: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin', weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  return {
    day: get('weekday').toLowerCase() as DayKey,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
    date: `${get('year')}-${get('month')}-${get('day')}`
  }
}

export function isDayKey(value: string): value is DayKey {
  return DAY_KEYS.includes(value as DayKey)
}

// "10:00-19:30" → true when `minutes` lies in [start, end). Anything else ("Geschlossen", null) is closed.
export function isWithinRange(range: string | null | undefined, minutes: number): boolean {
  const match = range?.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/)
  if (!match) return false
  const start = Number(match[1]) * 60 + Number(match[2])
  const end = Number(match[3]) * 60 + Number(match[4])
  return minutes >= start && minutes < end
}

// The closure that covers `date` ("YYYY-MM-DD", Berlin), if any. ISO dates compare correctly as strings.
export function activeClosure(closures: Closure[] | null | undefined, date: string): Closure | null {
  return closures?.find(c => c.from <= date && (!c.to || date <= c.to)) ?? null
}

// Closures that have not ended and start within `withinDays` of `date` (the active one included), earliest first
export function upcomingClosures(closures: Closure[] | null | undefined, date: string, withinDays = 45): Closure[] {
  const limit = new Date(`${date}T00:00:00Z`)
  limit.setUTCDate(limit.getUTCDate() + withinDays)
  const last = limit.toISOString().slice(0, 10)
  return (closures ?? []).filter(c => (!c.to || c.to >= date) && c.from <= last).sort((a, b) => a.from.localeCompare(b.from))
}

// "2026-12-07" → "07.12.2026"
export function formatIsoDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

// "09.11.–07.12.2026", "09.12.2026" or "ab 14.12.2026" (open-ended)
export function formatClosure(c: Closure): string {
  if (!c.to) return `ab ${formatIsoDate(c.from)}`
  if (c.to === c.from) return formatIsoDate(c.from)
  return `${formatIsoDate(c.from).slice(0, 5)}.–${formatIsoDate(c.to)}`
}

// Service hours only matter when the library has any; opening hours decide whether it is open at all
export function getOpenStatus(openingHours: WeekHours, serviceHours: WeekHours, now: { day: DayKey, minutes: number, date?: string }, closures?: Closure[] | null): OpenStatus {
  if (now.date && activeClosure(closures, now.date)) return 'closed-temporarily'
  if (!isWithinRange(openingHours?.[now.day], now.minutes)) return 'closed'
  if (!serviceHours) return 'open'
  return isWithinRange(serviceHours[now.day], now.minutes) ? 'open-service' : 'open-no-service'
}
