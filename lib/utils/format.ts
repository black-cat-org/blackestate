import { CURRENCY_SYMBOLS, SURFACE_UNIT_LABELS } from "@/lib/constants/property"
import type { CurrencyAmount, SurfaceArea } from "@/features/shared/domain/value-objects"

export function formatPrice(price: CurrencyAmount): string {
  const symbol = CURRENCY_SYMBOLS[price.currency]
  return `${symbol} ${price.amount.toLocaleString("es-AR")}`
}

export function formatSurface(area: SurfaceArea): string {
  return `${area.value.toLocaleString("es-AR")} ${SURFACE_UNIT_LABELS[area.unit]}`
}
