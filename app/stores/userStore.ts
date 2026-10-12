import { defineStore } from 'pinia'
import berlinZips from '~/assets/berlinZipCodes.json'

const LOCAL_ZIP_KEY = 'bibblitz_zip'

export const useUserStore = defineStore('user', {
  state: () => ({
    userZip: (import.meta.client ? localStorage.getItem(LOCAL_ZIP_KEY) : null) || '10178',
    userCoords: { lat: 52.5219, lon: 13.4132 },
    userZipDefault: true,
    showAuthModal: false,
  }),
  actions: {
    async fetchUserData() {
      const savedZip = localStorage.getItem(LOCAL_ZIP_KEY)
      if (savedZip) this.saveLocation(savedZip)
    },

    // Returns whether the ZIP was saved (only Berlin ZIPs from berlinZipCodes.json)
    saveLocation(zipCode: string): boolean {
      const cleanZip = zipCode.trim()
      if (!cleanZip) return false

      const lookup = berlinZips as Record<string, { lat: number; lon: number }>
      if (!lookup[cleanZip]) return false

      this.userZip = cleanZip
      this.userCoords = { lat: lookup[cleanZip].lat, lon: lookup[cleanZip].lon }
      this.userZipDefault = false

      localStorage.setItem(LOCAL_ZIP_KEY, cleanZip)
      return true
    },
  }
})