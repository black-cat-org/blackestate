import { pgTable, text, integer, boolean, numeric, doublePrecision, real, timestamp, index } from "drizzle-orm/pg-core";
import { propertyTypeEnum, operationTypeEnum, propertyStatusEnum, currencyEnum, surfaceUnitEnum, propertyConditionEnum, orientationEnum } from "./enums";

export const properties = pgTable("properties", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull(),
  createdByUserId: text("created_by_user_id").notNull(),

  // Core
  title: text("title").notNull(),
  description: text("description").notNull(),
  shortDescription: text("short_description"),
  type: propertyTypeEnum("type").notNull(),
  operationType: operationTypeEnum("operation_type").notNull(),
  status: propertyStatusEnum("status").notNull().default("draft"),

  // Price
  priceAmount: numeric("price_amount", { precision: 14, scale: 2 }).notNull(),
  priceCurrency: currencyEnum("price_currency").notNull(),
  negotiable: boolean("negotiable").notNull().default(false),
  expensesAmount: numeric("expenses_amount", { precision: 14, scale: 2 }),
  expensesCurrency: currencyEnum("expenses_currency"),

  // Address
  addressStreet: text("address_street").notNull(),
  addressNumber: text("address_number"),
  addressFloor: text("address_floor"),
  addressApartment: text("address_apartment"),
  addressCity: text("address_city").notNull(),
  addressState: text("address_state").notNull(),
  addressCountry: text("address_country").notNull(),
  addressNeighborhood: text("address_neighborhood"),
  addressLat: doublePrecision("address_lat"),
  addressLng: doublePrecision("address_lng"),
  addressGoogleMapsUrl: text("address_google_maps_url"),

  // Surface
  totalAreaValue: real("total_area_value"),
  totalAreaUnit: surfaceUnitEnum("total_area_unit"),
  coveredAreaValue: real("covered_area_value"),
  coveredAreaUnit: surfaceUnitEnum("covered_area_unit"),

  // Features
  rooms: integer("rooms"),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  garages: integer("garages"),
  age: integer("age"),
  condition: propertyConditionEnum("condition"),
  orientation: orientationEnum("orientation"),

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
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
  index("properties_org_id_idx").on(t.organizationId),
  index("properties_status_idx").on(t.status),
  index("properties_org_status_idx").on(t.organizationId, t.status),
  index("properties_org_created_by_idx").on(t.organizationId, t.createdByUserId),
]);
