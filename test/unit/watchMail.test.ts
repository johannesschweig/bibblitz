// The two mails of the shelf watch: what they say, and that nothing from outside gets into the HTML unescaped.
import { describe, it, expect } from 'vitest'
import { confirmMail, alertMail, librariesPhrase, escapeHtml } from '../../utils/watchMail'

describe('librariesPhrase', () => {
  it.each([[1, 'in deiner Bibliothek'], [5, 'in einer deiner 5 Bibliotheken'], [0, 'in einer deiner Bibliotheken']])('%i -> %s', (n, text) => {
    expect(librariesPhrase(n)).toBe(text)
  })
})

describe('confirmMail', () => {
  const mail = confirmMail({ title: 'Die Wartenden', count: 5, confirmUrl: 'https://x.de/watch/confirm?token=a&id=1', stopUrl: 'https://x.de/watch/stop?token=a' })

  it('has the subject and a button that is the confirm link', () => {
    expect(mail.subject).toBe('Bitte bestätigen: Wecker für „Die Wartenden“')
    expect(mail.html).toContain('href="https://x.de/watch/confirm?token=a&amp;id=1"')
    expect(mail.html).toContain('Wecker bestätigen')
  })

  it('has the switch-off link in the footer, in the HTML and in the plain text', () => {
    expect(mail.html).toContain('Nicht mehr nötig?')
    expect(mail.html).toContain('href="https://x.de/watch/stop?token=a"')
    expect(mail.text).toContain('Wecker ausschalten: https://x.de/watch/stop?token=a')
    expect(mail.text).toContain('Wecker bestätigen: https://x.de/watch/confirm?token=a&id=1')
  })

  it('names no technical details', () => {
    expect(mail.text).not.toMatch(/\b(24|30)\b/)
  })
})

describe('alertMail', () => {
  const mail = alertMail({
    title: 'Die Wartenden',
    libraries: [{ name: 'Bibliothek am Wasserturm', shelfmark: 'Roman Must' }, { name: 'AGB', note: 'Nur im Lesesaal einsehbar' }],
    titleUrl: 'https://x.de/media/1?ref=wecker',
    stopUrl: 'https://x.de/watch/stop?token=a'
  })

  it('lists the libraries with Signatur and notes, and links to the title', () => {
    expect(mail.subject).toBe('Wecker: „Die Wartenden“ ist verfügbar')
    expect(mail.text).toContain('- Bibliothek am Wasserturm (Signatur: Roman Must)')
    expect(mail.text).toContain('- AGB (Nur im Lesesaal einsehbar)')
    expect(mail.html).toContain('href="https://x.de/media/1?ref=wecker"')
    expect(mail.html).toContain('Wir haben deine Adresse gelöscht.')
  })

  it('has the switch-off link too, every mail carries one', () => {
    expect(mail.html).toContain('href="https://x.de/watch/stop?token=a"')
  })
})

describe('escaping', () => {
  it('escapes titles and names, so a record cannot inject markup into a mail', () => {
    const evil = '<img src=x onerror="alert(1)">'
    const html = alertMail({ title: evil, libraries: [{ name: evil }], titleUrl: 'https://x.de/a?b=1&c=2', stopUrl: 'https://x.de/s' }).html
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;')
    expect(html).toContain('href="https://x.de/a?b=1&amp;c=2"')
  })

  it('escapeHtml handles the five characters', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;')
  })
})
