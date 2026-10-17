import { defineStore } from 'pinia';

// Whether VÖBB is currently switched off for maintenance. Set by /api/status on page load and by
// the search/detail responses, cleared again as soon as one of them succeeds.
export const useVoebbStatusStore = defineStore('voebbStatus', {
  state: () => ({
    maintenance: false,
    // End of the maintenance window as shown on VÖBB's page, e.g. "19.10.2026, 08:00 Uhr"
    until: undefined as string | undefined
  }),

  actions: {
    report(until?: string) {
      this.maintenance = true;
      this.until = until;
    },

    clear() {
      this.maintenance = false;
      this.until = undefined;
    },

    async check() {
      try {
        const status = await $fetch<{ maintenance: boolean; until?: string }>('/api/status');
        // Never clears: a search that already failed with maintenance may arrive before this answer
        // (cached for a minute). A successful search or detail fetch clears the flag.
        if (status.maintenance) this.report(status.until);
      } catch {
        // No answer says nothing about VÖBB: keep the current state
      }
    }
  }
});
