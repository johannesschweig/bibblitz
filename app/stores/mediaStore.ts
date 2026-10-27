import { defineStore } from 'pinia';
import { useItemCacheStore } from './itemCacheStore';
import { useVoebbStatusStore } from './voebbStatusStore';

export const useMediaStore = defineStore('media', {
  state: () => ({
    searchIds: [] as string[],
    lastQuery: '',
    nextPageToken: null as string | null,
    hasMore: false,
    loadingMore: false,
    currentPage: 1,
    // Active filters, applied by VÖBB (see /api/search). Their values are the fixed lists in utils/filterOptions.ts.
    languages: [] as string[],
    mediaTypes: [] as string[],
  }),

  actions: {
    async executeSearch(query: string, filters: { languages?: string[]; mediaTypes?: string[] } = {}) {
      this.searchIds = [];
      this.nextPageToken = null;
      this.hasMore = false;
      this.currentPage = 1;
      // The requested filters are active right away: if the request fails they stay, so "retry" uses them
      this.languages = filters.languages ?? [];
      this.mediaTypes = filters.mediaTypes ?? [];
      const itemCache = useItemCacheStore();

      const data: any = await $fetch('/api/search', {
        query: {
          q: query,
          ...(this.languages.length && { lang: this.languages.join(',') }),
          ...(this.mediaTypes.length && { type: this.mediaTypes.join(',') })
        }
      });
      const status = useVoebbStatusStore();

      if (data.maintenance) {
        status.report(data.until);
      } else if (data.success) {
        status.clear();
        // 1. Push basic data into the central cache right away
        data.results.forEach((item: any) => {
          itemCache.setBasicData({
            id: item.id,
            title: item.title,
            author: item.author,
            year: item.year,
            platform: item.platform,
            mediaType: item.mediaType || 'Unbekannt',
          });
        });

        // 2. Only store the IDs in this store
        this.searchIds = data.results.map((item: any) => item.id);
        this.lastQuery = query
        this.nextPageToken = data.token ?? null;
        this.hasMore = !!data.hasMore;
        // What the server applied: a value that is not on the filter page is dropped
        this.languages = data.appliedLanguages ?? [];
        this.mediaTypes = data.appliedMediaTypes ?? [];
      }
    },
    async loadMore() {
      if (!this.nextPageToken || this.loadingMore) return;
      const itemCache = useItemCacheStore();
      this.loadingMore = true;

      try {
        const data: any = await $fetch('/api/search', { query: { token: this.nextPageToken } });

        if (data.maintenance) {
          useVoebbStatusStore().report(data.until);
          this.hasMore = false;
        } else if (data.success) {
          data.results.forEach((item: any) => {
            itemCache.setBasicData({
              id: item.id,
              title: item.title,
              author: item.author,
              year: item.year,
              platform: item.platform,
              mediaType: item.mediaType || 'Unbekannt',
            });
          });

          // Don't append IDs that are already present (e.g. duplicates across pages)
          const newIds = data.results.map((item: any) => item.id).filter((id: string) => !this.searchIds.includes(id));
          this.searchIds = [...this.searchIds, ...newIds];
          this.nextPageToken = data.token ?? null;
          this.hasMore = !!data.hasMore;
          this.currentPage += 1;
        }
      } finally {
        this.loadingMore = false;
      }
    },
    clearSearch() {
      this.searchIds = []
      this.lastQuery = ''
      this.nextPageToken = null
      this.hasMore = false
      this.languages = []
      this.mediaTypes = []
    }

  }
});