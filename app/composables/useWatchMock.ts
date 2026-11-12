// The mocked mails of the shelf watch (the "Mail öffnen" step, /watch/mail) only exist in dev.
// A composable instead of import.meta.dev inline, so the tests can switch it (see docs/shelf-watch.md).
export const useWatchMock = (): boolean => import.meta.dev
