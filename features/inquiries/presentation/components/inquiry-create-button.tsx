"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InquiryCreateDialog } from "./inquiry-create-dialog"
import type { Property } from "@/features/properties/domain/property.entity"

interface InquiryCreateButtonProps {
  properties: Property[]
  initialPropertyId?: string
}

/**
 * Page-header button that opens `InquiryCreateDialog`. Owns only the
 * dialog open state so the parent server page can keep the heading row
 * in RSC. Mirror of the `PropertyCreateButton` / `ContactCreateButton`
 * pattern: a tiny "use client" island scoped to interactivity.
 */
export function InquiryCreateButton({
  properties,
  initialPropertyId,
}: InquiryCreateButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-2 size-4" />
        Nueva consulta
      </Button>
      <InquiryCreateDialog
        open={open}
        onOpenChange={setOpen}
        properties={properties}
        initialPropertyId={initialPropertyId}
      />
    </>
  )
}
