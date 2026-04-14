import type { LeadStatus } from "@/lib/types/lead"

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  interested: "Interesado",
  won: "Ganado",
  lost: "Perdido",
  discarded: "Descartado",
}

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  contacted: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  interested: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  won: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  lost: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  discarded: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
}

export const LEAD_STATUS_TRANSITIONS: Record<LeadStatus, { status: LeadStatus; label: string }[]> = {
  new: [
    { status: "contacted", label: "Marcar contactado" },
    { status: "discarded", label: "Descartar" },
  ],
  contacted: [
    { status: "interested", label: "Marcar interesado" },
    { status: "discarded", label: "Descartar" },
  ],
  interested: [
    { status: "won", label: "Marcar como ganado" },
    { status: "lost", label: "Marcar como perdido" },
    { status: "discarded", label: "Descartar" },
  ],
  won: [],
  lost: [
    { status: "interested", label: "Reabrir" },
  ],
  discarded: [
    { status: "new", label: "Reabrir" },
  ],
}
