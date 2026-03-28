const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""

interface AddressFields {
  country?: string
  state?: string
  city?: string
  neighborhood?: string
  street?: string
}

/**
 * Reverse geocodes lat/lng into address components using Google Maps Geocoding API.
 * Returns only the fields it could resolve.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<AddressFields> {
  if (!API_KEY) return {}

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=es&key=${API_KEY}`
  const res = await fetch(url)
  if (!res.ok) return {}

  const data = await res.json()
  if (data.status !== "OK" || !data.results?.length) return {}

  const components: Array<{ long_name: string; short_name: string; types: string[] }> =
    data.results[0].address_components

  const find = (type: string) =>
    components.find((c) => c.types.includes(type))?.long_name

  return {
    country: find("country"),
    state: find("administrative_area_level_1"),
    city:
      find("locality") ||
      find("administrative_area_level_2") ||
      find("sublocality_level_1"),
    neighborhood:
      find("neighborhood") ||
      find("sublocality") ||
      find("sublocality_level_1"),
    street: find("route"),
  }
}
