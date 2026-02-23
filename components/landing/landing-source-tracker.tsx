"use client"

import { useEffect, useRef } from "react"
import { trackVisitAction } from "@/app/p/[id]/actions"

interface LandingSourceTrackerProps {
  propertyId: string
  source: string | null
}

export function LandingSourceTracker({ propertyId, source }: LandingSourceTrackerProps) {
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current) return
    tracked.current = true
    trackVisitAction(propertyId, source)
  }, [propertyId, source])

  return null
}
