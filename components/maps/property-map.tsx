"use client"

import { useEffect, useRef } from "react"
import { Map, useMap } from "@vis.gl/react-google-maps"
import { GoogleMapProvider } from "./google-map-provider"
import { generateApproximateZone } from "@/lib/utils/geo-zone"

interface PropertyMapProps {
  lat: number
  lng: number
  mode: "exact" | "approximate"
}

function ApproximateZoneLayer({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  const polygonRef = useRef<google.maps.Polygon | null>(null)

  useEffect(() => {
    if (!map) return

    const zone = generateApproximateZone({ lat, lng })

    polygonRef.current = new google.maps.Polygon({
      paths: zone,
      strokeColor: "#6366f1",
      strokeOpacity: 0.5,
      strokeWeight: 1.5,
      fillColor: "#6366f1",
      fillOpacity: 0.15,
      clickable: false,
    })

    polygonRef.current.setMap(map)

    return () => {
      polygonRef.current?.setMap(null)
    }
  }, [map, lat, lng])

  return null
}

function ExactMarkerLayer({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)

  useEffect(() => {
    if (!map) return

    async function createMarker() {
      const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary
      markerRef.current = new AdvancedMarkerElement({
        map,
        position: { lat, lng },
      })
    }

    createMarker()

    return () => {
      if (markerRef.current) {
        markerRef.current.map = null
      }
    }
  }, [map, lat, lng])

  return null
}

function PropertyMapInner({ lat, lng, mode }: PropertyMapProps) {
  return (
    <Map
      defaultCenter={{ lat, lng }}
      defaultZoom={mode === "approximate" ? 14 : 16}
      gestureHandling="cooperative"
      disableDefaultUI
      zoomControl
      mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}
      className="size-full rounded-lg"
    >
      {mode === "exact" ? (
        <ExactMarkerLayer lat={lat} lng={lng} />
      ) : (
        <ApproximateZoneLayer lat={lat} lng={lng} />
      )}
    </Map>
  )
}

export function PropertyMap(props: PropertyMapProps) {
  return (
    <GoogleMapProvider>
      <PropertyMapInner {...props} />
    </GoogleMapProvider>
  )
}
