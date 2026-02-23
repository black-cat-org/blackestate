import type { Lead, PropertyVisit } from "@/lib/types/lead"

const mockLeads: Lead[] = [
  {
    id: "1",
    propertyId: "1",
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
