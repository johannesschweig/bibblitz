// The ntfy message after each timer run of the shelf watch: how many records were checked and whether a copy was
// free. For the owner's phone only. Counts and titles, never an e-mail address (not even masked). The topic is the
// only secret, same as the Pi jobs (docs/library-data.md): NUXT_WATCH_NTFY_TOPIC.
import type { RunReport } from './watchService'

export interface Notification {
  // ASCII only: it travels as an HTTP header
  title: string
  message: string
  // ntfy priority 1-5: 2 = low (no sound), 3 = default, 4 = high
  priority: 2 | 3 | 4
  tags: string[]
  // Opens when the notification is tapped
  click?: string
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
}

/** Quiet when nothing is free, loud when an alert went out or something broke. */
export function describeRunNotification(report: RunReport, siteUrl: string): Notification {
  const { sent } = report.summary
  const recordFailed = report.summary['record-failed']
  const sendFailed = report.summary['send-failed']

  const lines = [`${plural(report.records, 'title')} checked (${plural(report.watches, 'watch', 'watches')}).`]

  // One line per record, however many people watch it
  const alerts = new Map<string, { title: string, libraries: Set<string>, count: number }>()
  for (const result of report.results) {
    if (result.action !== 'sent') continue
    const entry = alerts.get(result.mediaId) ?? { title: result.title, libraries: new Set<string>(), count: 0 }
    entry.count++
    for (const library of result.libraries ?? []) entry.libraries.add(library)
    alerts.set(result.mediaId, entry)
  }
  if (sent === 0) {
    lines.push('Nothing free yet.')
  } else {
    lines.push(`${plural(sent, 'alert')} sent, a copy is free:`)
    for (const entry of alerts.values()) {
      const where = entry.libraries.size > 0 ? ` (${[...entry.libraries].join(', ')})` : ''
      lines.push(`- ${entry.title}${where}`)
    }
  }
  if (recordFailed > 0) lines.push(`${plural(recordFailed, 'watch', 'watches')} could not be checked (record failed to load).`)
  if (sendFailed > 0) lines.push(`${plural(sendFailed, 'alert mail')} failed to send, they stay for the next run.`)
  if (report.maintenance) lines.push('VÖBB is in maintenance, the run stopped early.')
  if (report.expiredRemoved > 0) lines.push(`${report.expiredRemoved} expired removed.`)

  const broken = sendFailed > 0 || report.maintenance
  const tags = sent > 0 ? ['bell'] : broken || recordFailed > 0 ? ['warning'] : ['white_check_mark']
  const headline = sent > 0 ? `${plural(sent, 'copy', 'copies')} free, ${plural(sent, 'alert')} sent` : `${report.records} checked, nothing free`
  const single = alerts.size === 1 ? [...alerts.keys()][0] : undefined

  return {
    title: `BibBlitz Wecker: ${headline}`,
    message: lines.join('\n'),
    priority: sent > 0 || sendFailed > 0 ? 4 : broken || recordFailed > 0 ? 3 : 2,
    tags,
    click: single ? `${siteUrl}/media/${single}` : undefined
  }
}

export function describeFailureNotification(error: unknown): Notification {
  return {
    title: 'BibBlitz Wecker: run failed',
    message: `The checker run failed: ${error instanceof Error ? error.message : String(error)}`,
    priority: 4,
    tags: ['rotating_light']
  }
}

export type SendNotification = (notification: Notification) => Promise<void>

/** Posts to https://ntfy.sh/<topic>. Throws when ntfy does not accept the message; the caller logs it. */
export function createNtfySender(topic: string, fetchImpl: typeof fetch = fetch): SendNotification {
  return async (notification) => {
    const headers: Record<string, string> = {
      Title: notification.title,
      Priority: String(notification.priority),
      Tags: notification.tags.join(',')
    }
    if (notification.click) headers.Click = notification.click
    const response = await fetchImpl(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
      method: 'POST',
      headers,
      body: notification.message,
      signal: AbortSignal.timeout(20000)
    })
    if (!response.ok) throw new Error(`ntfy answered ${response.status}`)
  }
}
