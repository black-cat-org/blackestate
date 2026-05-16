import { Badge } from "@/components/ui/badge"
import {
  APPOINTMENT_STATUS_BADGE_CLASSES,
  APPOINTMENT_STATUS_LABELS,
} from "@/lib/constants/bot"
import type { Appointment } from "@/features/appointments/domain/appointment.entity"

interface DealAppointmentsListProps {
  appointments: Appointment[]
}

const dateFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

/**
 * RSC read-only appointment list rendered under the deal detail. The
 * mutable list with status transitions lives in `/dashboard/appointments`
 * (the AppointmentCard component) — this is a passive summary that
 * surfaces the appointments scheduled against a single deal. Mirror of
 * `ContactAppointmentsList` (R39) — same layout, locale, and badge
 * tokens for cross-feature consistency.
 */
export function DealAppointmentsList({ appointments }: DealAppointmentsListProps) {
  if (appointments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        Este negocio no tiene citas registradas.
      </p>
    )
  }

  return (
    <ul className="divide-y rounded-md border">
      {appointments.map((appointment) => (
        <li
          key={appointment.id}
          className="flex items-center justify-between gap-3 p-3"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={APPOINTMENT_STATUS_BADGE_CLASSES[appointment.status]}
              >
                {APPOINTMENT_STATUS_LABELS[appointment.status]}
              </Badge>
              <span className="truncate text-sm font-medium">
                {appointment.propertyTitle}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {dateFormatter.format(new Date(appointment.date))} · {appointment.time}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}
