// server/routes/sitemap.xml.ts
import libraryData from '~/assets/libraries.json'

export default defineEventHandler((event) => {
  const baseUrl = 'https://bibblitz.de'
  
  const libraryUrls = libraryData.map(lib => `
  <url>
    <loc>${baseUrl}/library/${lib.id}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/libraries</loc>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${baseUrl}/imprint</loc>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${baseUrl}/data-privacy</loc>
    <priority>0.3</priority>
  </url>${libraryUrls}
</urlset>`

  setHeader(event, 'Content-Type', 'application/xml')
  return xml
})