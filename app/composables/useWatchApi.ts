// Client side of the shelf watch API (server/api/watch/). The pages never see HTTP details: a failed call is a
// plain `{ ok: false }`, a rate limit (429) is told apart because the sheet says something else for it.

export interface WatchRequest {
  mediaId: string
  libraryIds: string[]
  email: string
  // Honeypot: a field people never see or fill. A bot that does gets a fake success
  website?: string
}

export type WatchResult = { ok: true } | { ok: false, reason: 'rate' | 'error' }

export type ConfirmStatus = 'ok' | 'active' | 'expired'
export type StopStatus = 'ok' | 'gone'

const statusOf = (error: any): number | undefined => error?.statusCode ?? error?.status ?? error?.response?.status

export async function subscribeToWatch(request: WatchRequest): Promise<WatchResult> {
  try {
    await $fetch('/api/watch', { method: 'POST', body: request })
    return { ok: true }
  } catch (error) {
    return { ok: false, reason: statusOf(error) === 429 ? 'rate' : 'error' }
  }
}

export async function confirmWatch(token: string): Promise<{ ok: true, status: ConfirmStatus } | { ok: false }> {
  try {
    const res = await $fetch<{ status: ConfirmStatus }>('/api/watch/confirm', { method: 'POST', body: { token } })
    return { ok: true, status: res.status }
  } catch {
    return { ok: false }
  }
}

export async function stopWatch(token: string): Promise<{ ok: true, status: StopStatus } | { ok: false }> {
  try {
    const res = await $fetch<{ status: StopStatus }>('/api/watch/stop', { method: 'POST', body: { token } })
    return { ok: true, status: res.status }
  } catch {
    return { ok: false }
  }
}
