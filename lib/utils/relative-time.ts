import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import calendar from "dayjs/plugin/calendar"
import "dayjs/locale/es"

dayjs.extend(relativeTime)
dayjs.extend(calendar)
dayjs.locale("es")

/**
 * General relative time — "hace 5 minutos", "hace 2 horas", etc.
 */
export function formatRelativeTime(timestamp: string): string {
  return dayjs(timestamp).fromNow()
}

/**
 * Calendar-aware relative time — "hoy", "mañana", "ayer", "el viernes", etc.
 */
export function formatCalendarTime(timestamp: string): string {
  return dayjs(timestamp).calendar(undefined, {
    sameDay: "[hoy]",
    nextDay: "[mañana]",
    nextWeek: "dddd",
    lastDay: "[ayer]",
    lastWeek: "[el] dddd [pasado]",
    sameElse: "D [de] MMMM",
  })
}

/**
 * Calendar-aware date for inline natural-language sentences like
 * "vence hoy" / "vence el viernes" / "vence el 19 de mayo de 2026".
 * Differs from `formatCalendarTime` in that mid- and long-range outputs
 * already include the Spanish article "el", so the calling copy reads
 * cleanly across all branches without per-branch templating, and the
 * `sameElse` branch includes the year so "vence el 19 de mayo" is never
 * ambiguous across years.
 */
export function formatFriendlyDate(timestamp: string): string {
  return dayjs(timestamp).calendar(undefined, {
    sameDay: "[hoy]",
    nextDay: "[mañana]",
    nextWeek: "[el] dddd",
    lastDay: "[ayer]",
    lastWeek: "[el] dddd [pasado]",
    sameElse: "[el] D [de] MMMM [de] YYYY",
  })
}
