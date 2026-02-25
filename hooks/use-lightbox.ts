"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface UseLightboxOptions {
  total: number
}

export function useLightbox({ total }: UseLightboxOptions) {
  const [open, setOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  const openAt = useCallback((index: number) => {
    setCurrentIndex(index)
    setOpen(true)
  }, [])

  const goToPrevious = useCallback(() => {
    setCurrentIndex((i) => (i === 0 ? total - 1 : i - 1))
  }, [total])

  const goToNext = useCallback(() => {
    setCurrentIndex((i) => (i === total - 1 ? 0 : i + 1))
  }, [total])

  // Keyboard navigation
  useEffect(() => {
    if (!open || total <= 1) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        goToPrevious()
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        goToNext()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, total, goToPrevious, goToNext])

  // Touch/swipe handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchEndX.current = e.touches[0].clientX
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }, [])

  const onTouchEnd = useCallback(() => {
    const diff = touchStartX.current - touchEndX.current
    const threshold = 50
    if (Math.abs(diff) < threshold) return
    if (diff > 0) {
      goToNext()
    } else {
      goToPrevious()
    }
  }, [goToNext, goToPrevious])

  return {
    open,
    setOpen,
    currentIndex,
    openAt,
    goToPrevious,
    goToNext,
    swipeHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  }
}
