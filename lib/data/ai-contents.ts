import type { AiContent } from "@/lib/types/ai-content"

const mockContents: AiContent[] = [
  {
    id: "1",
    propertyId: "1",
    propertyTitle: "Casa moderna en Palermo",
    type: "descripcion",
    text: "Espectacular casa moderna de 3 plantas ubicada en el corazón de Palermo. Con 320 m² totales y 280 m² cubiertos, esta propiedad ofrece 4 dormitorios, 3 baños y cochera para 2 vehículos. Disfrute de amenities premium como pileta, quincho con parrilla, jardín y terraza. Orientación norte para máxima luminosidad. Una oportunidad única en una de las zonas más codiciadas de Buenos Aires.",
    createdAt: "2026-02-20T10:00:00Z",
  },
  {
    id: "2",
    propertyId: "1",
    propertyTitle: "Casa moderna en Palermo",
    type: "caption",
    platform: "instagram",
    text: "✨ Casa de ensueño en Palermo ✨\n\n🏠 3 plantas | 4 dorms | 3 baños\n📐 320 m² totales\n💰 US$ 450.000\n\n📍 Palermo, CABA\n\n#CasaEnPalermo #Palermo #InmobiliariaBuenosAires",
    createdAt: "2026-02-19T15:30:00Z",
  },
  {
    id: "3",
    propertyId: "1",
    propertyTitle: "Casa moderna en Palermo",
    type: "caption",
    platform: "facebook",
    text: "🏠 ¡Oportunidad única en Palermo!\n\nCasa moderna de 3 plantas con diseño contemporáneo.\n\n📐 320 m² totales | 280 m² cubiertos\n🛏️ 4 dormitorios | 🚿 3 baños\n🚗 Cochera para 2 vehículos\n\nAmenities: pileta, quincho, parrilla, jardín, terraza\n\n💰 US$ 450.000 (negociable)\n📍 Palermo, CABA\n\n¡Contactanos para coordinar una visita! 📲",
    createdAt: "2026-02-18T14:00:00Z",
  },
  {
    id: "4",
    propertyId: "1",
    propertyTitle: "Casa moderna en Palermo",
    type: "hashtags",
    text: "#inmobiliaria #propiedades #bienesraices #inversion #hogar #realestate #CasaEnPalermo #Palermo #VentaCasa #BuenosAires",
    createdAt: "2026-02-17T09:00:00Z",
  },
  {
    id: "5",
    propertyId: "2",
    propertyTitle: "Departamento 2 amb en Belgrano",
    type: "caption",
    platform: "facebook",
    text: "🏢 ¡Nuevo departamento en alquiler en Belgrano!\n\nLuminoso 2 ambientes con balcón en el 8° piso. Edificio con amenities completos: gimnasio, seguridad 24hs, lavadero y ascensor.\n\n📍 Cabildo 2200, Belgrano\n💵 $ 650.000/mes\n📐 55 m² totales\n\n¡No te lo pierdas! Contactanos para coordinar una visita 📲",
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
