// Dev only: the latest mail the shelf watch "sent" (to an address, or the latest one). The mail preview page
// shows it, so the flow can be clicked through without a mail account. A 404 in production.
import { latestOutboxMail } from '../../utils/watchMailer'

export default defineEventHandler((event) => {
  if (!import.meta.dev) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  const to = getQuery(event).to
  const mail = latestOutboxMail(typeof to === 'string' ? to : undefined)
  if (!mail) throw createError({ statusCode: 404, statusMessage: 'No mail yet' })
  return mail
})
