// Wires the real dependencies of the shelf watch (Supabase, Brevo, the site URL) from the runtime config.
// Production needs all of them; dev falls back to memory and an outbox, so the flow works without any account.
import type { H3Event } from 'h3'
import { createRateLimiter } from './watchRateLimit'
import { createMemoryStore, createSupabaseStore, type WatchStore } from './watchStore'
import { createBrevoSender, createOutboxSender, type SendMail } from './watchMailer'
import { fetchRecord } from './recordFetch'
import type { WatchDeps } from './watchService'

const HOUR = 60 * 60 * 1000
// Per address and per visitor: enough for a typo or two, not for mailing a stranger over and over
export const watchRateLimits = {
  ip: createRateLimiter(10, HOUR),
  email: createRateLimiter(3, HOUR)
}

const devStore = createMemoryStore()
const devSender = createOutboxSender()
let supabase: { key: string, store: WatchStore } | undefined
let brevo: { key: string, send: SendMail } | undefined

/** The feature is on in dev and in production only with NUXT_PUBLIC_WATCH_ENABLED=true. */
export function watchEnabled(event?: H3Event): boolean {
  return import.meta.dev || String(useRuntimeConfig(event).public.watchEnabled) === 'true'
}

/** Null when something is not configured: the routes then answer 503 instead of half working. The timer calls it without an event. */
export function getWatchDeps(event?: H3Event): WatchDeps | null {
  const config = useRuntimeConfig(event).watch
  const dev = import.meta.dev

  let store: WatchStore | undefined
  if (config.supabaseUrl && config.supabaseServiceKey) {
    const key = `${config.supabaseUrl}|${config.supabaseServiceKey}`
    if (supabase?.key !== key) supabase = { key, store: createSupabaseStore(config.supabaseUrl, config.supabaseServiceKey) }
    store = supabase.store
  } else if (dev) {
    store = devStore
  }

  let sendMail: SendMail | undefined
  if (config.brevoApiKey) {
    const key = `${config.brevoApiKey}|${config.mailFrom}`
    if (brevo?.key !== key) {
      brevo = { key, send: createBrevoSender({ apiKey: config.brevoApiKey, fromEmail: config.mailFrom, fromName: config.mailFromName, replyTo: 'info@bibblitz.de' }) }
    }
    sendMail = brevo.send
  } else if (dev) {
    sendMail = devSender
  }

  const secret = config.secret || (dev ? 'dev-secret' : '')
  if (!store || !sendMail || !secret) return null

  const siteUrl = (config.siteUrl || (dev && event ? getRequestURL(event).origin : 'https://www.bibblitz.de')).replace(/\/$/, '')
  return { store, sendMail, fetchRecord, secret, siteUrl }
}

/** Fly sets Fly-Client-IP; the forwarded header is the fallback behind other proxies. */
export function clientIp(event: H3Event): string {
  return getRequestHeader(event, 'fly-client-ip') || getRequestIP(event, { xForwardedFor: true }) || 'unknown'
}
