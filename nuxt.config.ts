import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  app: {
    head: {
      htmlAttrs: { lang: 'de' },
      // Default for the home page; every other page sets "<page> – BibBlitz" via useHead
      title: 'BibBlitz – Verfügbarkeit in Berliner Bibliotheken',
      meta: [
        { name: 'description', content: 'Finde Bücher, Hörbücher, Filme und Spiele in den Berliner Bibliotheken und sieh sofort, welche Bibliothek in deiner Nähe sie gerade verfügbar hat.' }
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }
      ],
      script: [
        {
          src: 'https://cloud.umami.is/script.js',
          'data-website-id': '67a667ea-94a2-4aa6-a4d6-edcee1bbb7ca',
          // Umami only tracks on these hostnames, so localhost and preview deployments never send data
          'data-domains': 'bibblitz.de,www.bibblitz.de',
          defer: true
        }
      ]
    }
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      cartoApiKey: process.env.CARTO_API_KEY
    }
  },
  modules: ['@pinia/nuxt', '@nuxt/icon'],
  // icons are bundled into the client and never fetched from the Iconify API (GDPR)
  icon: {
    clientBundle: { scan: true },
    fallbackToApi: false
  },
  nitro: {
    externals: {
      inline: ['axios', 'tough-cookie', 'axios-cookiejar-support', 'http-cookie-agent']
    }
  },
  css: ['./app/assets/style.css'],
  vite: {
    plugins: [
      tailwindcss()
    ]
  },
  typescript: {
    includeWorkspace: true
  }
})