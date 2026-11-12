// Shelf watch is shown in dev and behind NUXT_PUBLIC_WATCH_ENABLED=true in production (see docs/shelf-watch.md)
export const useWatchEnabled = (): boolean => {
  const config = useRuntimeConfig()
  return import.meta.dev || String(config.public.watchEnabled) === 'true'
}
