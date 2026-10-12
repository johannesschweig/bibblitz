import { defineStore } from 'pinia';
import { useItemCacheStore } from './itemCacheStore';

export const useMediaStore = defineStore('media', {
  state: () => ({
    searchIds: [] as string[],
    lastQuery: '',
    nextPageToken: null as string | null,
    hasMore: false,
    loadingMore: false,
    currentPage: 1,
  }),

  actions: {
    async executeSearch(query: string) {
      this.searchIds = [];
      this.nextPageToken = null;
      this.hasMore = false;
      this.currentPage = 1;
      const itemCache = useItemCacheStore();

      const data: any = await $fetch('/api/search', { query: { q: query } });

      if (data.success) {
        // 1. Push basic data into the central cache right away
        data.results.forEach((item: any) => {
          itemCache.setBasicData({
            id: item.id,
            title: item.title,
            author: item.author || 'Unbekannter Autor',
            mediaType: item.mediaType || 'Unbekannt',
          });
        });

        // 2. Only store the IDs in this store
        this.searchIds = data.results.map((item: any) => item.id);
        this.lastQuery = query
        this.nextPageToken = data.token ?? null;
        this.hasMore = !!data.hasMore;
      }
    },
    async loadMore() {
      if (!this.nextPageToken || this.loadingMore) return;
      const itemCache = useItemCacheStore();
      this.loadingMore = true;

      try {
        const data: any = await $fetch('/api/search', { query: { token: this.nextPageToken } });

        if (data.success) {
          data.results.forEach((item: any) => {
            itemCache.setBasicData({
              id: item.id,
              title: item.title,
              author: item.author || 'Unbekannter Autor',
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
    }

  }
});