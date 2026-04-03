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
