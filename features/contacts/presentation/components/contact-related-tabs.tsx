"use client"

import type { ReactNode } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ContactRelatedTabsProps {
  inquiriesCount: number
  dealsCount: number
  appointmentsCount: number
  /**
   * RSC subtrees rendered inside each tab. The parent (server) page
   * renders the list components and passes them in as nodes so they
   * keep their RSC nature — only the `Tabs` shell is client-side.
   * Mirror of the children-slot pattern used by shadcn primitives
   * across the project.
   */
  inquiriesSlot: ReactNode
  dealsSlot: ReactNode
  appointmentsSlot: ReactNode
}

export function ContactRelatedTabs({
  inquiriesCount,
  dealsCount,
  appointmentsCount,
  inquiriesSlot,
  dealsSlot,
  appointmentsSlot,
}: ContactRelatedTabsProps) {
  return (
    <Tabs defaultValue="inquiries" className="w-full">
      <TabsList>
        <TabsTrigger value="inquiries">
          Consultas{" "}
          <span className="ml-1 text-muted-foreground">({inquiriesCount})</span>
        </TabsTrigger>
        <TabsTrigger value="deals">
          Negocios{" "}
          <span className="ml-1 text-muted-foreground">({dealsCount})</span>
        </TabsTrigger>
        <TabsTrigger value="appointments">
          Citas{" "}
          <span className="ml-1 text-muted-foreground">
            ({appointmentsCount})
          </span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="inquiries" className="mt-4">
        {inquiriesSlot}
      </TabsContent>
      <TabsContent value="deals" className="mt-4">
        {dealsSlot}
      </TabsContent>
      <TabsContent value="appointments" className="mt-4">
        {appointmentsSlot}
      </TabsContent>
    </Tabs>
  )
}
