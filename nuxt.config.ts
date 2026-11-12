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
    // Shelf watch (docs/shelf-watch.md), server only. Set as Fly secrets / .env: NUXT_WATCH_SUPABASE_URL,
    // NUXT_WATCH_SUPABASE_SERVICE_KEY, NUXT_WATCH_BREVO_API_KEY, NUXT_WATCH_SECRET (signs the links in the mails),
    // NUXT_WATCH_RUN_SECRET (protects the checker), optional NUXT_WATCH_MAIL_FROM, NUXT_WATCH_MAIL_FROM_NAME, NUXT_WATCH_SITE_URL,
    // NUXT_WATCH_TIMER_TIMES (Berlin clock times of the daily checker runs in production, default 11:30,16:30; empty or off = no timer),
    // NUXT_WATCH_NTFY_TOPIC (topic on ntfy.sh for the message after each run; the topic is the secret, empty = no message)
    watch: {
      supabaseUrl: '',
      supabaseServiceKey: '',
      brevoApiKey: '',
      mailFrom: 'wecker@bibblitz.de',
      mailFromName: 'BibBlitz',
      secret: '',
      runSecret: '',
      siteUrl: '',
      timerTimes: '11:30,16:30',
      ntfyTopic: ''
    },
    public: {
      cartoApiKey: process.env.CARTO_API_KEY,
      // Shelf watch (docs/shelf-watch.md): off in production until NUXT_PUBLIC_WATCH_ENABLED=true; always on in dev
      watchEnabled: false
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