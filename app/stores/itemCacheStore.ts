// stores/itemCacheStore.ts
import { defineStore } from 'pinia';
import type { MediaItem } from '../../types/types';

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

    // Fetches the details unless they are already cached
    async fetchDetails(id: string) {
      // 1. Availability already cached? -> return it directly
      if (this.items[id]?.availability) {
        return this.items[id];
      }

      // 2. Fetch for this ID already in flight? -> wait for it
      if (this.fetching[id]) {
        await this.fetching[id];
        return this.items[id];
      }

      // 3. Cache miss: fetch data from the API
      this.fetching[id] = $fetch('/api/detail', { query: { id } })
        .then((response: any) => {
          if (response.success && response.data) {
            // Merge the data into the cache
            this.items[id] = { ...this.items[id], ...response.data };
          }
        })
        .finally(() => {
          this.fetching[id] = null; // Reset fetching status
        });

      await this.fetching[id];
      return this.items[id];
    }
  }
});