"use client"

import { Shield, ShieldAlert, UserX, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/**
 * Acknowledgement dialog for membership-change events that the user
 * MUST see — promotion, demotion, and removal. We use a modal instead
 * of a toast because the user is likely not staring at the screen when
 * the event arrives, and these changes alter their workflow (sidebar
 * options change, redirects happen, sometimes sign-out). Toasts auto-
 * dismiss after a few seconds and are easy to miss.
 *
 * Design constraints:
 *   - Cannot be closed by Esc, click-outside, or X button. The single
 *     "Aceptar" button is the only path forward — guarantees the user
 *     read the message before the post-ack action runs (router.refresh,
 *     org switch, or sign-out).
 *   - Variant-driven copy + icon: each event type has a tailored
 *     wording so the user understands exactly what changed.
 *   - Reusable: lives in `components/` (not a feature folder) because
 *     it is used by the cross-cutting realtime listener mounted in the
 *     dashboard layout.
 */

export type MembershipChangeVariant =
  | { type: "role_changed_admin"; organizationName: string }
  | { type: "role_changed_agent"; organizationName: string }
  | { type: "removed_with_fallback"; organizationName: string; fallbackOrganizationName: string }
  | { type: "removed_no_fallback"; organizationName: string }

interface VariantCopy {
  icon: LucideIcon
  iconClassName: string
  title: string
  description: string
  /**
   * Label shown on the Aceptar button while the post-acknowledge action
   * runs. Variant-specific so the user sees exactly what is happening
   * (org switch, sign-out) instead of a generic "Procesando..." that is
   * misleading — the membership mutation itself already completed when
   * the broadcast arrived; the click only triggers the navigation hop.
   * `null` keeps the button label as "Aceptar" (used for role changes
   * where the only post-ack action is a near-instant router.refresh).
   */
  pendingLabel: string | null
}

function copyFor(variant: MembershipChangeVariant): VariantCopy {
  switch (variant.type) {
    case "role_changed_admin":
      return {
        icon: ShieldAlert,
        iconClassName: "text-primary",
        title: "Tu rol cambió",
        description: `Se te promovió a Administrador en ${variant.organizationName}. Ahora puedes invitar miembros, cambiar roles y configurar la organización.`,
        pendingLabel: null,
      }
    case "role_changed_agent":
      return {
        icon: Shield,
        iconClassName: "text-muted-foreground",
        title: "Tu rol cambió",
        description: `Tu rol en ${variant.organizationName} cambió a Agente. Algunas opciones de gestión ya no estarán disponibles para ti.`,
        pendingLabel: null,
      }
    case "removed_with_fallback":
      return {
        icon: UserX,
        iconClassName: "text-destructive",
        title: "Acceso revocado",
        description: `Fuiste removido de ${variant.organizationName}. Te llevaremos a ${variant.fallbackOrganizationName}, donde sigues siendo miembro.`,
        pendingLabel: `Cambiando a ${variant.fallbackOrganizationName}...`,
      }
    case "removed_no_fallback":
      return {
        icon: UserX,
        iconClassName: "text-destructive",
        title: "Acceso revocado",
        description: `Fuiste removido de ${variant.organizationName}. Esta era tu única organización: cerraremos tu sesión.`,
        pendingLabel: "Cerrando sesión...",
      }
  }
}

export interface MembershipChangeDialogProps {
  variant: MembershipChangeVariant | null
  onAcknowledge: () => void
  /** When true, disables the Aceptar button and shows a spinner-friendly label. */
  isPending?: boolean
}

export function MembershipChangeDialog({
  variant,
  onAcknowledge,
  isPending = false,
}: MembershipChangeDialogProps) {
  const open = variant !== null
  const copy = variant ? copyFor(variant) : null

  return (
    <Dialog
      open={open}
      // No-op: the dialog is dismissed only by the explicit Aceptar
      // click. Esc and click-outside are blocked at the content level.
      onOpenChange={() => {}}
    >
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {copy && (
          <>
            <DialogHeader>
              <div
                aria-hidden="true"
                className="mb-2 flex size-10 items-center justify-center rounded-full bg-muted"
              >
                <copy.icon className={cn("size-5", copy.iconClassName)} />
              </div>
              <DialogTitle>{copy.title}</DialogTitle>
              <DialogDescription className="font-medium text-foreground">
                {copy.description}
              </DialogDescription>
            </DialogHeader>
            {/*
             * sr-only instruction so screen reader users understand
             * why Esc / outside-click do not dismiss the dialog. The
             * Radix Dialog announces title + description automatically;
             * this extra sentence is read after them. Sighted users
             * see the same constraint visually (no X button + the
             * single Aceptar action).
             */}
            <span className="sr-only">
              Este aviso es obligatorio. Presiona el botón Aceptar para continuar.
            </span>
            <DialogFooter>
              <Button onClick={onAcknowledge} disabled={isPending}>
                {isPending && copy.pendingLabel ? copy.pendingLabel : "Aceptar"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
