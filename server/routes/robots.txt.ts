// server/routes/robots.txt.ts
export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'text/plain')
  return `User-agent: *
Allow: /
Disallow: /watch/

Sitemap: https://bibblitz.de/sitemap.xml`
})