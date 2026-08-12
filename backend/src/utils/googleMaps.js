function looksConfigured(key) {
  if (!key) return false;
  if (key === 'your_google_maps_key_here') return false;
  return key.length > 10;
}

// A separate, unrestricted server-side key is best practice (the browser key should be
// HTTP-referrer restricted and can't be used server-side). Falls back to the browser key
// so a single key still works while testing.
export const googleMapsServerKey = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
export const googleMapsConfigured = looksConfigured(googleMapsServerKey);

if (!googleMapsConfigured) {
  console.log('ℹ Google Maps not configured (no real GOOGLE_MAPS_SERVER_KEY) — ETAs will use a flat zone estimate.');
}

export async function getDistanceMatrix(origin, destination) {
  const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
  url.searchParams.set('origins', origin);
  url.searchParams.set('destinations', destination);
  url.searchParams.set('key', googleMapsServerKey);

  const res = await fetch(url);
  const data = await res.json();

  const element = data?.rows?.[0]?.elements?.[0];
  if (!element || element.status !== 'OK') {
    throw new Error(`Distance Matrix lookup failed: ${element?.status || data.status}`);
  }

  return {
    distance_text: element.distance.text,
    distance_meters: element.distance.value,
    duration_text: element.duration.text,
    duration_minutes: Math.round(element.duration.value / 60),
  };
}
