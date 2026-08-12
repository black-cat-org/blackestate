"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DealCreateDialog } from "./deal-create-dialog"
import type { Property } from "@/features/properties/domain/property.entity"

interface DealCreateButtonProps {
  properties: Property[]
  initialPropertyId?: string
}

/**
 * Page-header button that opens `DealCreateDialog`. Owns only the
 * dialog open state so the parent server page keeps the heading row
 * as RSC. Mirror of `InquiryCreateButton` / `PropertyCreateButton`.
 */
export function DealCreateButton({
  properties,
  initialPropertyId,
}: DealCreateButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-2 size-4" />
        Nuevo negocio
      </Button>
      <DealCreateDialog
        open={open}
        onOpenChange={setOpen}
        properties={properties}
        initialPropertyId={initialPropertyId}
      />
    </>
  )
}
