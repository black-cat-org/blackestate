import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
  APPOINTMENT_STATUS_BADGE_CLASSES,
  APPOINTMENT_STATUS_LABELS,
} from "@/lib/constants/bot"
import type { Appointment } from "@/features/appointments/domain/appointment.entity"

interface ContactAppointmentsListProps {
  appointments: Appointment[]
}

const dateFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

export function ContactAppointmentsList({
  appointments,
}: ContactAppointmentsListProps) {
  if (appointments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        Este contacto no tiene citas registradas.
      </p>
    )
  }

  return (
    <ul className="divide-y rounded-md border">
      {appointments.map((appointment) => (
        <li key={appointment.id} className="p-3">
          <Link
            href={`/dashboard/deals/${appointment.dealId}`}
            className="flex items-center justify-between gap-3 hover:opacity-80"
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
          </Link>
        </li>
      ))}
    </ul>
  )
}
