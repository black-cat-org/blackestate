import type { ContactPreferredChannel } from "@/features/contacts/domain/contact.entity"

/**
 * User-facing labels for the `preferredChannel` union. The domain
 * type lives in English ("whatsapp" | "phone" | "email"); the Spanish
 * label dictionary is kept here so any UI surface that renders the
 * channel (badge, select, detail row) shares one source of truth.
 *
 * Adding a new channel to `ContactPreferredChannel` requires updating
 * this map — TypeScript's `Record<ContactPreferredChannel, string>`
 * makes the omission a compile error.
 */
export const PREFERRED_CHANNEL_LABELS: Record<ContactPreferredChannel, string> = {
  whatsapp: "WhatsApp",
  phone: "Llamada",
  email: "Correo",
}
