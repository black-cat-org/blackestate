/**
 * Extracts lat/lng coordinates from a Google Maps URL.
 * Supports formats:
 * - https://www.google.com/maps/place/.../@-34.5875,-58.4262,...
 * - https://maps.google.com/?q=-34.5875,-58.4262
 * - https://www.google.com/maps?q=-34.5875,-58.4262
 * - https://maps.app.goo.gl/... (not parseable client-side)
 */
export function extractCoordsFromGoogleMapsUrl(
  url: string
): { lat: number; lng: number } | null {
  if (!url) return null

  // Pattern 1: /@lat,lng in the URL path
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) }
  }

  // Pattern 2: ?q=lat,lng or &q=lat,lng
  const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
  if (qMatch) {
    return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) }
  }

  // Pattern 3: ll=lat,lng
  const llMatch = url.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
  if (llMatch) {
    return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) }
  }

  return null
}
