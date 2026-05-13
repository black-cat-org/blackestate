"use client"

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  onConfirm: () => void | Promise<void>
  confirming?: boolean
  confirmLabel?: string
  confirmingLabel?: string
  cancelLabel?: string
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirming = false,
  confirmLabel = "Eliminar",
  confirmingLabel = "Eliminando…",
  cancelLabel = "Cancelar",
}: DeleteConfirmDialogProps) {
  // Block ESC, overlay click, and the X button while the mutation is in
  // flight. Without these, the user could dismiss the dialog mid-request
  // and leave the caller's `confirming` state orphaned (request still
  // running, dialog gone, no path to feedback).
  const blockDismissWhileConfirming = (event: Event) => {
    if (confirming) event.preventDefault()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={!confirming}
        onEscapeKeyDown={blockDismissWhileConfirming}
        onInteractOutside={blockDismissWhileConfirming}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={confirming}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? confirmingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
