import { pgTable, text, integer, boolean, real, timestamp } from "drizzle-orm/pg-core";

export const properties = pgTable("properties", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull(),

  // Core
  title: text("title").notNull(),
  description: text("description").notNull(),
  shortDescription: text("short_description"),
  type: text("type").notNull(), // house, apartment, land, commercial, office, warehouse, cabin, ph
  operationType: text("operation_type").notNull(), // venta, alquiler, temporal, anticretico
  status: text("status").notNull().default("borrador"), // borrador, en_revision, activa, pausada, vendida, alquilada, rechazada

  // Price
  priceAmount: real("price_amount").notNull(),
  priceCurrency: text("price_currency").notNull(), // USD, BOB
  negotiable: boolean("negotiable").notNull().default(false),
  expensesAmount: real("expenses_amount"),
  expensesCurrency: text("expenses_currency"),

  // Address
  addressStreet: text("address_street").notNull(),
  addressNumber: text("address_number"),
  addressFloor: text("address_floor"),
  addressApartment: text("address_apartment"),
  addressCity: text("address_city").notNull(),
  addressState: text("address_state").notNull(),
  addressCountry: text("address_country").notNull(),
  addressNeighborhood: text("address_neighborhood"),
  addressLat: real("address_lat"),
  addressLng: real("address_lng"),
  addressGoogleMapsUrl: text("address_google_maps_url"),

  // Surface
  totalAreaValue: real("total_area_value"),
  totalAreaUnit: text("total_area_unit"), // m2, ha
  coveredAreaValue: real("covered_area_value"),
  coveredAreaUnit: text("covered_area_unit"),

  // Features
  rooms: integer("rooms"),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  garages: integer("garages"),
  age: integer("age"),
  condition: text("condition"), // nueva, excelente, buena, regular, a_reciclar
  orientation: text("orientation"), // norte, sur, este, oeste, noreste, noroeste, sureste, suroeste

  // Arrays
  amenities: text("amenities").array().notNull().default([]),

  // Settings
  hideExactLocation: boolean("hide_exact_location").notNull().default(true),

  // Media
  photos: text("photos").array().notNull().default([]),
  videoUrl: text("video_url"),
  virtualTourUrl: text("virtual_tour_url"),
  blueprints: text("blueprints").array().notNull().default([]),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
