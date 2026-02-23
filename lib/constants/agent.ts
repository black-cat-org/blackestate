export const AGENT_CONFIG = {
  name: "Black Estate",
  phone: "5491112345678",
  whatsappMessage: (propertyTitle: string, propertyId: string) =>
    `Hola! Me interesa la propiedad "${propertyTitle}" (Ref: ${propertyId}). ¿Podrían darme más información?`,
} as const
