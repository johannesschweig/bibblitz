export function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// The user's position is only the centre of their ZIP area, so exact figures would be false precision:
// below 1 km in steps of 100 m, up to 5 km in steps of 0.5 km, above in whole km (German decimal comma)
export function formatDistance(km: number): string {
  const meters = Math.round(km * 10) * 100
  if (km < 1 && meters < 1000) {
    return meters === 0 ? 'unter 100 m' : `${meters} m`
  }
  const rounded = km < 5 ? Math.round(km * 2) / 2 : Math.round(km)
  return `${String(rounded).replace('.', ',')} km`
}
