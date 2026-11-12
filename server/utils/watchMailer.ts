// Sending the mails of the shelf watch: Brevo's transactional API in production; in dev without a key the mails
// go into an in-memory outbox that the dev preview page (/watch/mail) shows, so the whole flow works without
// any account. See docs/shelf-watch.md.

export interface OutgoingMail {
  to: string
  subject: string
  html: string
  text: string
  // One-click unsubscribe (RFC 8058): a URL that accepts a POST
  unsubscribeUrl?: string
}

export type SendMail = (mail: OutgoingMail) => Promise<void>

export interface BrevoConfig {
  apiKey: string
  fromEmail: string
  fromName: string
  replyTo: string
}

export function createBrevoSender(config: BrevoConfig): SendMail {
  return async (mail) => {
    const body: Record<string, unknown> = {
      sender: { name: config.fromName, email: config.fromEmail },
      replyTo: { email: config.replyTo },
      to: [{ email: mail.to }],
      subject: mail.subject,
      htmlContent: mail.html,
      textContent: mail.text
    }
    const send = (payload: Record<string, unknown>) => $fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': config.apiKey, accept: 'application/json', 'content-type': 'application/json' },
      body: payload,
      timeout: 10000
    })

    if (!mail.unsubscribeUrl) {
      await send(body)
      return
    }
    // Brevo documents only non-standard custom headers, so List-Unsubscribe may be refused: try it, and on a
    // rejected request send the mail without (the link in the mail body is the unsubscribe that always works)
    try {
      await send({
        ...body,
        headers: { 'List-Unsubscribe': `<${mail.unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
      })
    } catch (error: any) {
      if (error?.statusCode !== 400) throw error
      console.warn('[watch] Brevo refused the List-Unsubscribe header, sending without it')
      await send(body)
    }
  }
}

export interface OutboxMail extends OutgoingMail {
  at: string
}

const outbox: OutboxMail[] = []

/** Dev only: keeps the last mails in memory instead of sending them. */
export function createOutboxSender(): SendMail {
  return async (mail) => {
    outbox.unshift({ ...mail, at: new Date().toISOString() })
    outbox.length = Math.min(outbox.length, 20)
  }
}

export function latestOutboxMail(to?: string): OutboxMail | undefined {
  return to ? outbox.find(mail => mail.to === to.trim().toLowerCase()) : outbox[0]
}
