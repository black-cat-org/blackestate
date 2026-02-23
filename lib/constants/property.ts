import type { PropertyType, OperationType, PropertyStatus, Currency, SurfaceUnit } from "@/lib/types/property"

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  house: "Casa",
  apartment: "Departamento",
  land: "Terreno",
  commercial: "Local comercial",
  office: "Oficina",
  warehouse: "Depósito",
  cabin: "Cabaña",
  ph: "PH",
}

export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  venta: "Venta",
  alquiler: "Alquiler",
  temporal: "Alquiler temporal",
  anticretico: "Anticrético",
}

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  borrador: "Borrador",
  en_revision: "En revisión",
  activa: "Activa",
  pausada: "Pausada",
  vendida: "Vendida",
  alquilada: "Alquilada",
  rechazada: "Rechazada",
}

export const PROPERTY_STATUS_COLORS: Record<PropertyStatus, string> = {
  borrador: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  en_revision: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  activa: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  pausada: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  vendida: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  alquilada: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  rechazada: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
}

export const CURRENCY_LABELS: Record<Currency, string> = {
  USD: "USD",
  ARS: "ARS",
  BOB: "BOB",
  EUR: "EUR",
}

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: "US$",
  ARS: "$",
  BOB: "Bs.",
  EUR: "€",
}

export const SURFACE_UNIT_LABELS: Record<SurfaceUnit, string> = {
  m2: "m²",
  ft2: "ft²",
  ha: "ha",
  acres: "acres",
}

export const AMENITIES_OPTIONS = [
  { value: "pileta", label: "Pileta" },
  { value: "quincho", label: "Quincho" },
  { value: "parrilla", label: "Parrilla" },
  { value: "jardin", label: "Jardín" },
  { value: "terraza", label: "Terraza" },
  { value: "balcon", label: "Balcón" },
  { value: "laundry", label: "Lavadero" },
  { value: "gym", label: "Gimnasio" },
  { value: "seguridad", label: "Seguridad 24hs" },
  { value: "ascensor", label: "Ascensor" },
  { value: "calefaccion", label: "Calefacción" },
  { value: "aire_acondicionado", label: "Aire acondicionado" },
  { value: "agua_caliente", label: "Agua caliente" },
  { value: "gas_natural", label: "Gas natural" },
  { value: "sum", label: "SUM" },
  { value: "playroom", label: "Playroom" },
  { value: "solarium", label: "Solarium" },
  { value: "baulera", label: "Baulera" },
] as const

export const CONDITION_OPTIONS = [
  { value: "nueva", label: "A estrenar" },
  { value: "excelente", label: "Excelente" },
  { value: "buena", label: "Buena" },
  { value: "regular", label: "Regular" },
  { value: "a_reciclar", label: "A reciclar" },
] as const

export const ORIENTATION_OPTIONS = [
  { value: "norte", label: "Norte" },
  { value: "sur", label: "Sur" },
  { value: "este", label: "Este" },
  { value: "oeste", label: "Oeste" },
  { value: "noreste", label: "Noreste" },
  { value: "noroeste", label: "Noroeste" },
  { value: "sureste", label: "Sureste" },
  { value: "suroeste", label: "Suroeste" },
] as const

export const WIZARD_STEPS = [
  { id: 1, title: "Datos básicos", description: "Título, tipo y precio" },
  { id: 2, title: "Ubicación", description: "Dirección y coordenadas" },
  { id: 3, title: "Características", description: "Superficie y amenities" },
  { id: 4, title: "Media", description: "Fotos y videos" },
  { id: 5, title: "Resumen", description: "Revisión final" },
] as const
