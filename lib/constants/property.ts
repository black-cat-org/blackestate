import type {
  Currency,
  OperationType,
  PropertyStatus,
  PropertyType,
  SurfaceUnit,
} from "@/lib/types/property";

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  house: "Casa",
  apartment: "Departamento",
  land: "Terreno",
  commercial: "Local comercial",
  office: "Oficina",
  warehouse: "Depósito",
  cabin: "Cabaña",
  ph: "PH",
};

export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  sale: "Venta",
  rent: "Alquiler",
  short_term: "Alquiler temporal",
  anticretico: "Anticrético",
};

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  draft: "Borrador",
  in_review: "En revisión",
  active: "Activa",
  paused: "Pausada",
  sold: "Vendida",
  rented: "Alquilada",
  rejected: "Rechazada",
};

export const PROPERTY_STATUS_COLORS: Record<PropertyStatus, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  in_review:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  paused:
    "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  sold: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  rented:
    "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  USD: "USD",
  BOB: "BOB",
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: "US$",
  BOB: "Bs",
};

export const SURFACE_UNIT_LABELS: Record<SurfaceUnit, string> = {
  m2: "m²",
  ha: "ha",
};

export const EQUIPMENT_OPTIONS = [
  { value: "air_conditioning", label: "Aire acondicionado" },
  { value: "hot_water", label: "Agua caliente" },
  { value: "natural_gas", label: "Gas natural" },
  { value: "equipped_kitchen", label: "Cocina equipada" },
  { value: "balcony", label: "Balcón" },
  { value: "terrace", label: "Terraza" },
  { value: "garden", label: "Jardín" },
  { value: "grill", label: "Parrillero" },
] as const;

export const AMENITIES_OPTIONS = [
  { value: "pool", label: "Piscina" },
  { value: "gym", label: "Gimnasio" },
  { value: "playroom", label: "Sala de juegos" },
  { value: "shared_grill", label: "Parrillero" },
  { value: "shared_garden", label: "Jardín" },
  { value: "laundry", label: "Lavandería" },
  { value: "elevator", label: "Ascensor" },
  { value: "security", label: "Seguridad 24hs" },
  { value: "storage", label: "Baulera" },
  { value: "common_areas", label: "Áreas comunes" },
] as const;

export const CONDITION_OPTIONS = [
  { value: "new", label: "A estrenar" },
  { value: "excellent", label: "Excelente" },
  { value: "good", label: "Buena" },
  { value: "fair", label: "Regular" },
  { value: "to_renovate", label: "A reciclar" },
] as const;

export const ORIENTATION_OPTIONS = [
  { value: "north", label: "Norte" },
  { value: "south", label: "Sur" },
  { value: "east", label: "Este" },
  { value: "west", label: "Oeste" },
  { value: "northeast", label: "Noreste" },
  { value: "northwest", label: "Noroeste" },
  { value: "southeast", label: "Sureste" },
  { value: "southwest", label: "Suroeste" },
] as const;

export const STATUS_TRANSITIONS: Record<
  PropertyStatus,
  { status: PropertyStatus; label: string }[]
> = {
  draft: [{ status: "in_review", label: "Enviar a revisión" }],
  in_review: [
    { status: "active", label: "Activar" },
    { status: "rejected", label: "Rechazar" },
  ],
  active: [
    { status: "paused", label: "Pausar" },
    { status: "sold", label: "Marcar como vendida" },
    { status: "rented", label: "Marcar como alquilada" },
  ],
  paused: [{ status: "active", label: "Reactivar" }],
  sold: [],
  rented: [],
  rejected: [{ status: "draft", label: "Volver a borrador" }],
};

export const WIZARD_STEPS = [
  { id: 1, title: "Datos", description: "Tipo, operación y precio" },
  { id: 2, title: "Ubicación", description: "Dirección y coordenadas" },
  { id: 3, title: "Características", description: "Superficie y amenidades" },
  { id: 4, title: "Multimedia", description: "Fotos y videos" },
  { id: 5, title: "Descripción", description: "Título y descripción con IA" },
  { id: 6, title: "Resumen", description: "Revisión final" },
] as const;
