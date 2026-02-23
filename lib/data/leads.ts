import type { Lead, PropertyVisit } from "@/lib/types/lead"

let leads: Lead[] = []
let visits: PropertyVisit[] = []

let leadCounter = 0
let visitCounter = 0

export async function createLead(data: Omit<Lead, "id" | "createdAt">): Promise<Lead> {
  const lead: Lead = {
    ...data,
    id: String(++leadCounter),
    createdAt: new Date().toISOString(),
  }
  leads = [lead, ...leads]
  return Promise.resolve(lead)
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
