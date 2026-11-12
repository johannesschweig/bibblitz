// A small in-memory rate limiter. Enough because the site runs on one machine; a restart resets the counters.
export function createRateLimiter(max: number, windowMs: number) {
  const hits = new Map<string, number[]>()

  return {
    /** Counts a hit for the key and says whether it is still within the limit. */
    allow(key: string, now = Date.now()): boolean {
      const recent = (hits.get(key) ?? []).filter(t => now - t < windowMs)
      if (recent.length >= max) {
        hits.set(key, recent)
        return false
      }
      recent.push(now)
      hits.set(key, recent)
      // Keep the map small: drop keys whose hits are all old
      if (hits.size > 5000) {
        for (const [k, times] of hits) {
          if (times.every(t => now - t >= windowMs)) hits.delete(k)
        }
      }
      return true
    }
  }
}
