import type { Lead, PropertyVisit } from "@/lib/types/lead"
import type { Property } from "@/lib/types/property"
import { PROPERTY_TYPE_LABELS } from "@/lib/constants/property"

const mockLeads: Lead[] = [
  {
    id: "1",
    propertyId: "1",
    propertyTitle: "Casa moderna en Palermo",
    source: "facebook",
    status: "nuevo",
    name: "María López",
    phone: "+54 11 5555-1234",
    email: "maria.lopez@gmail.com",
    message: "Hola, me interesa mucho esta propiedad. ¿Podrían coordinar una visita para este fin de semana?",
    wantsOffers: true,
    createdAt: "2026-02-20T14:30:00Z",
  },
  {
    id: "2",
    propertyId: "1",
    propertyTitle: "Casa moderna en Palermo",
    source: "instagram",
    status: "contactado",
    name: "Carlos Rodríguez",
    phone: "+54 11 4444-5678",
    email: "carlos.rodriguez@hotmail.com",
    message: "Busco algo similar para mi familia. ¿Tienen otras opciones en la zona?",
    propertyTypeSought: "Casa",
    budget: "USD 400.000 - 500.000",
    zoneOfInterest: "Palermo / Belgrano",
    wantsOffers: true,
    createdAt: "2026-02-18T09:15:00Z",
  },
  {
    id: "3",
    propertyId: "2",
    propertyTitle: "Departamento 2 amb en Belgrano",
    source: "facebook",
    status: "interesado",
    name: "Ana Martínez",
    phone: "+54 11 6666-9012",
    email: "ana.martinez@yahoo.com",
    message: "Me encanta el departamento. ¿El precio es negociable?",
    wantsOffers: false,
    createdAt: "2026-02-15T11:45:00Z",
  },
  {
    id: "4",
    propertyId: "3",
    propertyTitle: "Terreno en Pilar Centro",
    source: "whatsapp",
    status: "nuevo",
    name: "Roberto Fernández",
    phone: "+54 11 7777-3456",
    email: "roberto.fernandez@gmail.com",
    propertyTypeSought: "Terreno",
    budget: "USD 80.000 - 120.000",
    zoneOfInterest: "Pilar",
    wantsOffers: true,
    createdAt: "2026-02-21T16:20:00Z",
  },
  {
    id: "5",
    propertyId: "5",
    propertyTitle: "PH reciclado en Villa Crespo",
    source: "instagram",
    status: "cerrado",
    name: "Laura Gómez",
    phone: "+54 11 8888-7890",
    email: "laura.gomez@outlook.com",
    message: "Ya coordinamos todo. Muchas gracias por la atención.",
    wantsOffers: false,
    createdAt: "2026-01-28T10:00:00Z",
  },
  {
    id: "6",
    propertyId: "4",
    propertyTitle: "Local comercial en Microcentro",
    source: "tiktok",
    status: "descartado",
    name: "Diego Herrera",
    phone: "+54 11 3333-2222",
    email: "diego.herrera@gmail.com",
    message: "Vi el video del local. ¿Cuál es la superficie?",
    wantsOffers: false,
    createdAt: "2026-02-10T08:30:00Z",
  },
  {
    id: "7",
    propertyId: "2",
    propertyTitle: "Departamento 2 amb en Belgrano",
    source: "facebook",
    status: "nuevo",
    name: "Valentina Ruiz",
    phone: "+54 11 2222-4444",
    email: "valentina.ruiz@gmail.com",
    message: "Quiero agendar una visita lo antes posible.",
    propertyTypeSought: "Departamento",
    budget: "USD 150.000 - 200.000",
    zoneOfInterest: "Belgrano / Núñez",
    wantsOffers: true,
    createdAt: "2026-02-22T07:45:00Z",
  },
  {
    id: "8",
    propertyId: "6",
    propertyTitle: "Oficina premium en Puerto Madero",
    source: null,
    status: "contactado",
    name: "Martín Sosa",
    phone: "+54 11 1111-5555",
    email: "martin.sosa@empresa.com",
    message: "Estoy buscando oficina para mi equipo de 15 personas. ¿Tienen algo disponible?",
    propertyTypeSought: "Oficina",
    budget: "USD 2.000/mes",
    wantsOffers: true,
    createdAt: "2026-02-17T13:00:00Z",
  },
]

let leads: Lead[] = [...mockLeads]
let visits: PropertyVisit[] = []

let leadCounter = mockLeads.length
let visitCounter = 0

export async function createLead(data: Omit<Lead, "id" | "createdAt" | "status">): Promise<Lead> {
  const lead: Lead = {
    ...data,
    status: "nuevo",
    id: String(++leadCounter),
    createdAt: new Date().toISOString(),
  }
  leads = [lead, ...leads]
  return Promise.resolve(lead)
}

export async function getLeadById(id: string): Promise<Lead | undefined> {
  return Promise.resolve(leads.find((l) => l.id === id))
}

export async function updateLead(id: string, data: Partial<Lead>): Promise<Lead> {
  const index = leads.findIndex((l) => l.id === id)
  if (index === -1) throw new Error("Lead not found")
  leads[index] = { ...leads[index], ...data }
  return Promise.resolve(leads[index])
}

export async function deleteLead(id: string): Promise<void> {
  leads = leads.filter((l) => l.id !== id)
  return Promise.resolve()
}

export async function getLeads(): Promise<Lead[]> {
  return Promise.resolve([...leads])
}

export async function getLeadsByProperty(propertyId: string): Promise<Lead[]> {
  return Promise.resolve(leads.filter((l) => l.propertyId === propertyId))
}

export async function trackVisit(propertyId: string, source: string | null): Promise<PropertyVisit> {
  const visit: PropertyVisit = {
    id: String(++visitCounter),
    propertyId,
    source,
    timestamp: new Date().toISOString(),
  }
  visits = [visit, ...visits]
  return Promise.resolve(visit)
}

export async function getVisitsByProperty(propertyId: string): Promise<PropertyVisit[]> {
  return Promise.resolve(visits.filter((v) => v.propertyId === propertyId))
}

/**
 * Finds properties that match a lead's preferences automatically.
 * Matches based on: property type, budget range, zone of interest, and operation type.
 * Excludes the property the lead originally came from.
 */
export function getSuggestedProperties(lead: Lead, allProperties: Property[]): Property[] {
  const active = allProperties.filter(
    (p) => p.status === "activa" && p.id !== lead.propertyId
  )

  if (active.length === 0) return []

  // Parse budget range (e.g. "USD 400.000 - 500.000" or "USD 2.000/mes")
  const budgetRange = parseBudgetRange(lead.budget)

  // Match property type label to PropertyType
  const soughtType = lead.propertyTypeSought
    ? Object.entries(PROPERTY_TYPE_LABELS).find(
        ([, label]) => label.toLowerCase() === lead.propertyTypeSought!.toLowerCase()
      )?.[0]
    : undefined

  // Zone keywords
  const zoneKeywords = lead.zoneOfInterest
    ? lead.zoneOfInterest.split(/[\/,]/).map((z) => z.trim().toLowerCase()).filter(Boolean)
    : []

  // Score each property
  const scored = active.map((p) => {
    let score = 0

    // Type match
    if (soughtType && p.type === soughtType) score += 3

    // Budget match
    if (budgetRange) {
      const amount = p.price.amount
      if (amount >= budgetRange.min && amount <= budgetRange.max) {
        score += 3
      } else if (amount >= budgetRange.min * 0.8 && amount <= budgetRange.max * 1.2) {
        score += 1 // Close to budget
      }
    }

    // Zone match
    if (zoneKeywords.length > 0) {
      const propZone = [
        p.address.neighborhood,
        p.address.city,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      for (const keyword of zoneKeywords) {
        if (propZone.includes(keyword)) {
          score += 2
          break
        }
      }
    }

    // Same operation type as origin property (if we don't have explicit preferences)
    // This is a weaker signal
    if (score === 0) {
      score += 0.5 // Base relevance for being active
    }

    return { property: p, score }
  })

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((s) => s.property)
}

function parseBudgetRange(budget?: string): { min: number; max: number } | null {
  if (!budget) return null

  // Remove currency prefix and normalize
  const cleaned = budget
    .replace(/USD|ARS|EUR|BOB/gi, "")
    .replace(/\/mes/gi, "")
    .replace(/\./g, "")
    .replace(/,/g, "")
    .trim()

  // Try range: "400000 - 500000"
  const rangeMatch = cleaned.match(/(\d+)\s*-\s*(\d+)/)
  if (rangeMatch) {
    return { min: Number(rangeMatch[1]), max: Number(rangeMatch[2]) }
  }

  // Single number
  const singleMatch = cleaned.match(/(\d+)/)
  if (singleMatch) {
    const val = Number(singleMatch[1])
    return { min: val * 0.8, max: val * 1.2 }
  }

  return null
}
