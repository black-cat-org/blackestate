import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import "dayjs/locale/es"

dayjs.extend(relativeTime)
dayjs.locale("es")

export function formatRelativeTime(timestamp: string): string {
  return dayjs(timestamp).fromNow()
}
