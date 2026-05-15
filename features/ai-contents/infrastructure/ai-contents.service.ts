import type { AiContent } from "@/features/ai-contents/domain/ai-content.entity"

// MOCK: full. Hardcoded seed for the in-memory store while
// `features/ai-contents` is still pre-DB-persistence (R38d will swap
// this for a Drizzle adapter). Locations + terminology are LATAM
// neutral leaning Bolivia (Santa Cruz / La Paz / Cochabamba) instead
// of the previous Buenos Aires regionalisms ("Palermo CABA",
// "Cabildo 2200, Belgrano", "pileta") — product targets LATAM-wide
// with user in Bolivia. R38d (DB persistence) will replace this
// in-process array with proper seed scripts / fixtures.
const mockContents: AiContent[] = [
  {
    id: "1",
    propertyId: "1",
    propertyTitle: "Casa moderna en Equipetrol",
    type: "description",
    text: "Espectacular casa moderna de 3 plantas ubicada en el corazón de Equipetrol. Con 320 m² totales y 280 m² cubiertos, esta propiedad ofrece 4 dormitorios, 3 baños y cochera para 2 vehículos. Disfruta de amenities premium como piscina, área de parrilla, jardín y terraza. Orientación norte para máxima luminosidad. Una oportunidad única en una de las zonas más codiciadas de Santa Cruz.",
    createdAt: "2026-02-20T10:00:00Z",
  },
  {
    id: "2",
    propertyId: "1",
    propertyTitle: "Casa moderna en Equipetrol",
    type: "caption",
    platform: "instagram",
    text: "✨ Casa de ensueño en Equipetrol ✨\n\n🏠 3 plantas | 4 dorms | 3 baños\n📐 320 m² totales\n💰 US$ 450.000\n\n📍 Equipetrol, Santa Cruz\n\n#CasaEnEquipetrol #Equipetrol #InmobiliariaSantaCruz",
    createdAt: "2026-02-19T15:30:00Z",
  },
  {
    id: "3",
    propertyId: "1",
    propertyTitle: "Casa moderna en Equipetrol",
    type: "caption",
    platform: "facebook",
    text: "🏠 ¡Oportunidad única en Equipetrol!\n\nCasa moderna de 3 plantas con diseño contemporáneo.\n\n📐 320 m² totales | 280 m² cubiertos\n🛏️ 4 dormitorios | 🚿 3 baños\n🚗 Cochera para 2 vehículos\n\nAmenities: piscina, área de parrilla, jardín, terraza\n\n💰 US$ 450.000 (negociable)\n📍 Equipetrol, Santa Cruz\n\n¡Contáctanos para coordinar una visita! 📲",
    createdAt: "2026-02-18T14:00:00Z",
  },
  {
    id: "4",
    propertyId: "1",
    propertyTitle: "Casa moderna en Equipetrol",
    type: "hashtags",
    text: "#inmobiliaria #propiedades #bienesraices #inversion #hogar #realestate #CasaEnEquipetrol #Equipetrol #VentaCasa #SantaCruz",
    createdAt: "2026-02-17T09:00:00Z",
  },
  {
    id: "5",
    propertyId: "2",
    propertyTitle: "Departamento 2 dorms en Sopocachi",
    type: "caption",
    platform: "facebook",
    text: "🏢 ¡Nuevo departamento en alquiler en Sopocachi!\n\nLuminoso 2 dormitorios con balcón en el 8° piso. Edificio con amenities completos: gimnasio, seguridad 24hs, lavandería y ascensor.\n\n📍 Av. 6 de Agosto, Sopocachi (La Paz)\n💵 Bs 4.500/mes\n📐 55 m² totales\n\n¡No te lo pierdas! ¡Contáctanos para coordinar una visita! 📲",
    createdAt: "2026-02-18T11:00:00Z",
  },
]

let contents: AiContent[] = [...mockContents]
let counter = mockContents.length

export async function getAiContents(): Promise<AiContent[]> {
  return Promise.resolve([...contents])
}

export async function getAiContentsByProperty(propertyId: string): Promise<AiContent[]> {
  return Promise.resolve(contents.filter((c) => c.propertyId === propertyId))
}

export async function createAiContent(
  data: Omit<AiContent, "id" | "createdAt">
): Promise<AiContent> {
  const content: AiContent = {
    ...data,
    id: String(++counter),
    createdAt: new Date().toISOString(),
  }
  contents = [content, ...contents]
  return Promise.resolve(content)
}

export async function updateAiContent(
  id: string,
  data: Partial<Omit<AiContent, "id" | "createdAt">>
): Promise<AiContent> {
  const index = contents.findIndex((c) => c.id === id)
  if (index === -1) throw new Error("Content not found")
  contents[index] = { ...contents[index], ...data, updatedAt: new Date().toISOString() }
  return Promise.resolve(contents[index])
}

export async function markAsPublished(id: string, platform: AiContent["publishedTo"]): Promise<AiContent> {
  return updateAiContent(id, { publishedAt: new Date().toISOString(), publishedTo: platform })
}

export async function deleteAiContent(id: string): Promise<void> {
  contents = contents.filter((c) => c.id !== id)
  return Promise.resolve()
}

export async function deleteAiContentsByProperty(propertyId: string): Promise<void> {
  contents = contents.filter((c) => c.propertyId !== propertyId)
  return Promise.resolve()
}
