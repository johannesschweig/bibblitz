// Runs at most `max` async tasks at the same time, the rest wait in FIFO order.
// VÖBB answers slowly or not at all when many detail pages are scraped at once (see itemCacheStore).
export function createLimiter(max: number) {
  let active = 0;
  const waiting: Array<() => void> = [];

  return async function limit<T>(task: () => Promise<T>): Promise<T> {
    if (active < max) {
      active++;
    } else {
      // The finishing task hands its slot over, so `active` never exceeds `max`
      await new Promise<void>(resolve => waiting.push(resolve));
    }
    try {
      return await task();
    } finally {
      const next = waiting.shift();
      if (next) next();
      else active--;
    }
  };
}
