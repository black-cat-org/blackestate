/**
 * Generates an asymmetric, irregular polygon of 7-8 vertices around a center point.
 * The polygon covers an area equivalent to several city blocks (~300-500m radius)
 * with no regular angles, no equal sides, and no recognizable geometric shape.
 *
 * Uses a seeded approach based on coordinates so the same property always
 * produces the same polygon shape (deterministic).
 */

interface LatLng {
  lat: number
  lng: number
}

const VERTEX_COUNT = 8
const BASE_RADIUS_M = 400
const MIN_RADIUS_FACTOR = 0.55
const MAX_RADIUS_FACTOR = 1.45

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

function offsetLatLng(center: LatLng, distanceM: number, bearingDeg: number): LatLng {
  const R = 6371000
  const lat1 = (center.lat * Math.PI) / 180
  const lng1 = (center.lng * Math.PI) / 180
  const bearing = (bearingDeg * Math.PI) / 180
  const d = distanceM / R

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(bearing)
  )
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    )

  return {
    lat: (lat2 * 180) / Math.PI,
    lng: (lng2 * 180) / Math.PI,
  }
}

export function generateApproximateZone(center: LatLng): LatLng[] {
  const seed = Math.abs(Math.round(center.lat * 1e6) ^ Math.round(center.lng * 1e6))
  const rand = seededRandom(seed)

  // Shift the generation center 100-200m in a random direction
  // so the real coordinate is NOT at the centroid of the polygon
  const shiftDistance = 100 + rand() * 100
  const shiftBearing = rand() * 360
  const shiftedCenter = offsetLatLng(center, shiftDistance, shiftBearing)

  // Random angular offset so the polygon isn't aligned to cardinal directions
  const angularOffset = rand() * 360

  // Distribute vertices with irregular angular spacing
  const angles: number[] = []
  let accumulated = 0
  for (let i = 0; i < VERTEX_COUNT; i++) {
    const slice = 360 / VERTEX_COUNT
    const jitter = slice * 0.4 * (rand() - 0.5)
    accumulated += slice + jitter
    angles.push(accumulated)
  }

  // Normalize so they span exactly 360 degrees
  const scale = 360 / accumulated
  const normalizedAngles = angles.map((a) => (a * scale + angularOffset) % 360)

  return normalizedAngles.map((angle) => {
    const radiusFactor = MIN_RADIUS_FACTOR + rand() * (MAX_RADIUS_FACTOR - MIN_RADIUS_FACTOR)
    const distance = BASE_RADIUS_M * radiusFactor
    return offsetLatLng(shiftedCenter, distance, angle)
  })
}
