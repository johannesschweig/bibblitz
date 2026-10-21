export type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
export type WeekHours = Partial<Record<DayKey, string | null>> | null | undefined
export type OpenStatus = 'open-service' | 'open-no-service' | 'open' | 'closed'

const DAY_KEYS: DayKey[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

// Day and minutes since midnight in Berlin, independent of the visitor's or server's timezone
export function berlinNow(date: Date = new Date()): { day: DayKey, minutes: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin', weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(date)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  return {
    day: get('weekday').toLowerCase() as DayKey,
    minutes: Number(get('hour')) * 60 + Number(get('minute'))
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

// Service hours only matter when the library has any; opening hours decide whether it is open at all
export function getOpenStatus(openingHours: WeekHours, serviceHours: WeekHours, now: { day: DayKey, minutes: number }): OpenStatus {
  if (!isWithinRange(openingHours?.[now.day], now.minutes)) return 'closed'
  if (!serviceHours) return 'open'
  return isWithinRange(serviceHours[now.day], now.minutes) ? 'open-service' : 'open-no-service'
}
