import type { LeadStatus } from "@/lib/types/lead"

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  interesado: "Interesado",
  cerrado: "Cerrado",
  descartado: "Descartado",
}

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  nuevo: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  contactado: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  interesado: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  cerrado: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
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
    { status: "cerrado", label: "Cerrar" },
    { status: "descartado", label: "Descartar" },
  ],
  cerrado: [],
  descartado: [
    { status: "nuevo", label: "Reabrir" },
  ],
}
