import { isMaintenancePage, parseMaintenanceUntil } from '../../utils/maintenance';

// Lets the front end warn about a VÖBB maintenance window before anyone searches.
// Cached for a minute so a busy site does not hit voebb.de on every page view.
export default defineCachedEventHandler(async () => {
  try {
    const res = await $fetch.raw<string>('https://www.voebb.de/aDISWeb/app/prod00', {
      responseType: 'text',
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 3000
    });
    if (isMaintenancePage(res._data, res.url)) {
      return { maintenance: true, until: parseMaintenanceUntil(res._data) };
    }
  } catch {
    // Unreachable is not the same as maintenance: stay silent, the search shows its own error
  }
  return { maintenance: false };
}, { maxAge: 60 });
