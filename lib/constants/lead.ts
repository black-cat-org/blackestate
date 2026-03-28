import type { LeadStatus } from "@/lib/types/lead"

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  interesado: "Interesado",
  ganado: "Ganado",
  perdido: "Perdido",
  descartado: "Descartado",
}

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  nuevo: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  contactado: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  interesado: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  ganado: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  perdido: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  descartado: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
}

export const LEAD_STATUS_TRANSITIONS: Record<LeadStatus, { status: LeadStatus; label: string }[]> = {
  nuevo: [
    { status: "contactado", label: "Marcar contactado" },
    { status: "descartado", label: "Descartar" },
  ],
  contactado: [
    { status: "interesado", label: "Marcar interesado" },
    { status: "descartado", label: "Descartar" },
  ],
  interesado: [
    { status: "ganado", label: "Marcar como ganado" },
    { status: "perdido", label: "Marcar como perdido" },
    { status: "descartado", label: "Descartar" },
  ],
  ganado: [],
  perdido: [
    { status: "interesado", label: "Reabrir" },
  ],
  descartado: [
    { status: "nuevo", label: "Reabrir" },
  ],
}
