// Links in the mails carry a token `<watch id>.<signature>`. The signature is an HMAC of the id with a server
// secret, so nothing token-like is stored: a leaked database gives nobody working links, and the server can still
// rebuild the link of a watch (e.g. for the alert mail) from its id.
import { createHmac, timingSafeEqual } from 'node:crypto'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function sign(secret: string, id: string): string {
  return createHmac('sha256', secret).update(`bibblitz-watch:${id}`).digest('base64url')
}

export function makeWatchToken(secret: string, id: string): string {
  return `${id}.${sign(secret, id)}`
}

/** The watch id when the token is genuine, otherwise null (malformed, forged or signed with another secret). */
export function verifyWatchToken(secret: string, token: unknown): string | null {
  if (typeof token !== 'string' || token.length > 200 || !secret) return null
  const dot = token.indexOf('.')
  if (dot < 0) return null
  const id = token.slice(0, dot)
  if (!UUID.test(id)) return null
  const given = Buffer.from(token.slice(dot + 1))
  const expected = Buffer.from(sign(secret, id))
  return given.length === expected.length && timingSafeEqual(given, expected) ? id : null
}
