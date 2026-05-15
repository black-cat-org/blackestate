import type { AiContent } from "@/features/ai-contents/domain/ai-content.entity"
import type { IAiContentRepository } from "@/features/ai-contents/domain/ai-content.repository"
import type { SessionContext } from "@/features/shared/domain/session-context"

// MOCK: full. Hardcoded seed for the in-memory store while
// `features/ai-contents` is still pre-DB-persistence (R38d will swap
// this for a Drizzle adapter). Locations + terminology are LATAM
// neutral leaning Bolivia (Santa Cruz / La Paz / Cochabamba) — see
// R38e commit for the regionalism cleanup that landed this content.
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
    text: "🏢 ¡Nuevo departamento en alquiler en Sopocachi!\n\nLuminoso 2 dormitorios con balcón en el 8° piso. Edificio con amenities completos: gimnasio, seguridad 24/7, lavandería y ascensor.\n\n📍 Av. 6 de Agosto, Sopocachi (La Paz)\n💵 Bs 4.500/mes\n📐 55 m² totales\n\n¡No te lo pierdas! ¡Contáctanos para coordinar una visita! 📲",
    createdAt: "2026-02-18T11:00:00Z",
  },
]

/**
 * In-memory adapter for `IAiContentRepository`. Process-global state;
 * **ignores `ctx` entirely** because there is no per-org isolation
 * yet — every caller sees the same shared array. This is a
 * documented pre-MVP scaffolding hazard tracked as:
 *
 *   - R38b: wire `getSessionContext()` at the presentation
 *     boundary (so the ctx is honest by the time it reaches here),
 *   - R38d: replace this entire class with `DrizzleAiContentRepository`
 *     that uses `withRLS(ctx, ...)` and enforces org boundaries at
 *     the DB layer.
 *
 * Do not depend on this adapter in production. The class exists to
 * complete the Clean Architecture shape (R38c) so R38d is a 1:1
 * adapter swap with zero interface churn upstream.
 *
 * The `_ctx: SessionContext` parameter convention signals "param is
 * intentionally unused" — `argsIgnorePattern: "^_"` in
 * `eslint.config.mjs` covers it without needing an inline
 * `eslint-disable-next-line` comment per method.
 */
export class InMemoryAiContentRepository implements IAiContentRepository {
  private contents: AiContent[] = [...mockContents]
  private counter = mockContents.length

  async findAll(_ctx: SessionContext): Promise<AiContent[]> {
    return [...this.contents]
  }

  async findByProperty(_ctx: SessionContext, propertyId: string): Promise<AiContent[]> {
    return this.contents.filter((c) => c.propertyId === propertyId)
  }

  async create(
    _ctx: SessionContext,
    data: Omit<AiContent, "id" | "createdAt">,
  ): Promise<AiContent> {
    const content: AiContent = {
      ...data,
      id: String(++this.counter),
      createdAt: new Date().toISOString(),
    }
    this.contents = [content, ...this.contents]
    return content
  }

  async update(
    _ctx: SessionContext,
    id: string,
    data: Partial<Omit<AiContent, "id" | "createdAt">>,
  ): Promise<AiContent> {
    const index = this.contents.findIndex((c) => c.id === id)
    if (index === -1) throw new Error("Content not found")
    const updated = {
      ...this.contents[index],
      ...data,
      updatedAt: new Date().toISOString(),
    }
    this.contents[index] = updated
    return updated
  }

  async delete(_ctx: SessionContext, id: string): Promise<void> {
    this.contents = this.contents.filter((c) => c.id !== id)
  }

  async deleteByProperty(_ctx: SessionContext, propertyId: string): Promise<void> {
    this.contents = this.contents.filter((c) => c.propertyId !== propertyId)
  }
}
