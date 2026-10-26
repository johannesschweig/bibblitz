// stores/itemCacheStore.ts
import { defineStore } from 'pinia';
import type { MediaItem } from '../../types/types';
import { useVoebbStatusStore } from './voebbStatusStore';
import { createLimiter } from '../../utils/limiter';

// A results page asks for the availability of every visible row at once. VÖBB answers about 1.5 s
// per request when fetched one by one, but with 9 in parallel about half run into the 4.5 s timeout
// of /api/detail. 3 at a time had no failures in a test of 12 requests (4 at a time already had one).
const MAX_PARALLEL_ROW_FETCHES = 3;
const limitRowFetches = createLimiter(MAX_PARALLEL_ROW_FETCHES);
// Row fetches that wait for a free slot, so the same row is not queued twice
const queuedRows = new Map<string, Promise<unknown>>();

export const useItemCacheStore = defineStore('itemCache', {
  state: () => ({
    // A dictionary/record that stores media by ID
    items: {} as Record<string, MediaItem>,
    // Prevents the same ID from being fetched several times concurrently (race conditions)
    fetching: {} as Record<string, Promise<any> | null>
  }),

  actions: {
    // Optional: pre-fill basic data from the search results
    setBasicData(item: MediaItem) {
      if (!this.items[item.id]) {
        this.items[item.id] = { ...item };
      }
    },

    // Fetches the details unless they are already cached.
    // `queued` is for result rows (many at once): they wait for a free slot. Pages the user is
    // waiting on (detail, library) fetch right away and are not held up by the row queue.
    async fetchDetails(id: string, { queued = false }: { queued?: boolean } = {}) {
      // 1. Availability already cached? -> return it directly
      if (this.items[id]?.availability) {
        return this.items[id];
      }

      // 2. Fetch for this ID already running? -> wait for it
      if (this.fetching[id]) {
        await this.fetching[id];
        return this.items[id];
      }

      // 3. Cache miss: fetch data from the API
      if (queued) {
        if (!queuedRows.has(id)) {
          const waiting = limitRowFetches(() => {
            // A page fetch may have loaded this row while it waited
            if (this.items[id]?.availability) return Promise.resolve();
            return this.fetching[id] ?? this.runFetch(id);
          }).finally(() => queuedRows.delete(id));
          queuedRows.set(id, waiting);
        }
        await queuedRows.get(id);
      } else {
        await this.runFetch(id);
      }
      return this.items[id];
    },

    runFetch(id: string) {
      this.fetching[id] = $fetch('/api/detail', { query: { id } })
        .then((response: any) => {
          if (response.maintenance) {
            useVoebbStatusStore().report(response.until);
          } else if (response.success && response.data) {
            useVoebbStatusStore().clear();
            // Merge the data into the cache. The search result's author and year win: the detail
            // page only knows the author from the title and has no year.
            const known = this.items[id]
            this.items[id] = {
              ...known,
              ...response.data,
              author: known?.author ?? response.data.author,
              year: known?.year ?? response.data.year,
              platform: known?.platform ?? response.data.platform
            };
          }
        })
        .finally(() => {
          this.fetching[id] = null; // Reset fetching status
        });
      return this.fetching[id] as Promise<void>;
    }
  }
});
