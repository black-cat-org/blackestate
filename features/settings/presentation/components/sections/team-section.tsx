"use client"

import { useEffect, useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { MoreHorizontal, UserPlus, Send, Shield, ShieldAlert, Trash2, UserX, XCircle, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { RoleBadge, type RoleBadgeTone } from "@/components/ui/role-badge"
import { formatFriendlyDate } from "@/lib/utils/relative-time"
import { updateMemberRoleAction, removeMemberAction } from "@/features/shared/presentation/member-actions"
import {
  sendInvitationAction,
  cancelInvitationAction,
  resendInvitationAction,
  deleteArchivedInvitationAction,
} from "@/features/shared/presentation/invitation-actions"
import type { TeamMember, TeamSeatInfo } from "@/features/shared/domain/member.entity"
import type {
  ArchivedInvitation,
  PendingInvitation,
  InvitableRole,
} from "@/features/shared/domain/invitation.entity"

const ROLE_LABELS: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  agent: "Agente",
}

/**
 * Visual tone mapping for the RoleBadge. Owner gets the filled primary
 * preset (special, unique role); admin and agent share the outline
 * "member" preset because in the UI hierarchy they are peer team
 * members the owner manages.
 */
const ROLE_TONE: Record<string, RoleBadgeTone> = {
  owner: "owner",
  admin: "member",
  agent: "member",
}

interface TeamSectionProps {
  data: {
    members: TeamMember[]
    invitations: PendingInvitation[]
    archivedInvitations: ArchivedInvitation[]
    seatInfo: TeamSeatInfo
    userRole: "owner" | "admin" | "agent"
  }
}

export function TeamSection({ data: initialData }: TeamSectionProps) {
  const [members, setMembers] = useState(initialData.members)
  const [invitations, setInvitations] = useState(initialData.invitations)
  const [archivedInvitations, setArchivedInvitations] = useState(
    initialData.archivedInvitations,
  )
  const [seatInfo, setSeatInfo] = useState(initialData.seatInfo)
  const { userRole } = initialData

  // Re-sync local state when the parent server component re-renders with
  // fresh data. Without this, after a `router.refresh()` triggered by an
  // out-of-band event (e.g. realtime membership change broadcast), the
  // server-fetched members/invitations/seatInfo would update upstream but
  // this component would keep showing the stale values it captured at
  // first mount. The deps reference the prop fields directly so React's
  // Object.is comparison reflects parent re-fetches; setting state to the
  // same content is cheap (React bails out of the render when JSX is
  // structurally equal).
  useEffect(() => {
    setMembers(initialData.members)
  }, [initialData.members])
  useEffect(() => {
    setInvitations(initialData.invitations)
  }, [initialData.invitations])
  useEffect(() => {
    setArchivedInvitations(initialData.archivedInvitations)
  }, [initialData.archivedInvitations])
  useEffect(() => {
    setSeatInfo(initialData.seatInfo)
  }, [initialData.seatInfo])

  const canManage = userRole === "owner" || userRole === "admin"
  const canChangeRoles = userRole === "owner"

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Equipo</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona los miembros de tu organización
          </p>
        </div>
        {/* Seat counter is admin/owner-only — agents don't manage capacity. */}
        {canManage && (
          <Badge variant="outline">
            {seatInfo.currentMembers} de {seatInfo.maxSeats} asientos
          </Badge>
        )}
      </div>

      <Separator />

      {canManage && (
        <InviteForm
          seatsAvailable={seatInfo.maxSeats - seatInfo.currentMembers}
          // `canManage` already restricts to "owner" | "admin", but
          // TypeScript cannot narrow `userRole` through the boolean
          // alias. The assertion documents the invariant the surrounding
          // guard guarantees; InviteForm's prop type is the source of
          // truth for what it accepts.
          userRole={userRole as "owner" | "admin"}
          members={members}
          pendingInvitations={invitations}
          onInviteSent={(inv) => setInvitations((prev) => [...prev, inv])}
        />
      )}

      <div className="space-y-3">
        <h4 className="text-sm font-medium">Miembros activos</h4>
        {members.map((m) => (
          <MemberRow
            key={m.id}
            member={m}
            userRole={userRole}
            canChangeRoles={canChangeRoles}
            canManage={canManage}
            onRoleChanged={(id, newRole) =>
              setMembers((prev) =>
                prev.map((x) => (x.id === id ? { ...x, role: newRole } : x)),
              )
            }
            onRemoved={(id) => {
              setMembers((prev) => prev.filter((x) => x.id !== id))
              setSeatInfo((prev) => ({ ...prev, currentMembers: prev.currentMembers - 1 }))
            }}
          />
        ))}
      </div>

      {invitations.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Invitaciones pendientes</h4>
            {invitations.map((inv) => (
              <InvitationRow
                key={inv.id}
                invitation={inv}
                canManage={canManage}
                onCancelled={(id) => setInvitations((prev) => prev.filter((x) => x.id !== id))}
              />
            ))}
          </div>
        </>
      )}

      {canManage && archivedInvitations.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Invitaciones rechazadas y expiradas</h4>
            {archivedInvitations.map((inv) => (
              <ArchivedInvitationRow
                key={inv.id}
                invitation={inv}
                pendingInvitations={invitations}
                onResent={(oldId, fresh) => {
                  // The resend action archives the old rejected row +
                  // creates a fresh pending one. Reflect both sides
                  // optimistically so the UI stays in sync without
                  // waiting for the next server refresh.
                  setArchivedInvitations((prev) => prev.filter((x) => x.id !== oldId))
                  setInvitations((prev) => [...prev, fresh])
                }}
                onDeleted={(id) =>
                  setArchivedInvitations((prev) => prev.filter((x) => x.id !== id))
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function InviteForm({
  seatsAvailable,
  userRole,
  members,
  pendingInvitations,
  onInviteSent,
}: {
  seatsAvailable: number
  // Narrowed to "owner" | "admin": this form is only rendered from
  // inside a `canManage` block. The narrower type prevents future
  // callers from mounting it for agents (who cannot invite at all) and
  // documents the role-gating invariant in the type system.
  userRole: "owner" | "admin"
  // Members + pending invitations are passed in so the form can detect
  // the duplicate-target cases CLIENT-side and skip the backend round
  // trip. The server action (`sendInvitationUseCase` → `hasPendingForEmail`
  // + `member` unique constraint) is still authoritative — this is UX
  // optimisation, not a security boundary. Stale local state (e.g. a
  // realtime rejection that hasn't arrived yet) would simply fall back
  // to the server-side error.
  members: TeamMember[]
  pendingInvitations: PendingInvitation[]
  onInviteSent: (inv: PendingInvitation) => void
}) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<InvitableRole>("agent")
  const [isPending, startTransition] = useTransition()

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()

    if (seatsAvailable <= 0) {
      toast.error("No hay asientos disponibles. Mejora tu plan para invitar más miembros.")
      return
    }

    // Pre-validation: compare against members + pending invitations using
    // normalised emails (trim + lowercase) — invitations are stored
    // lowercase by the repository, and members.email comes from auth
    // which is also lowercased by Supabase. Matching either case
    // short-circuits before any backend call so the user sees a
    // specific reason instead of the generic "Error al enviar".
    const normalized = email.trim().toLowerCase()
    if (members.some((m) => m.email.toLowerCase() === normalized)) {
      toast.error("Esta persona ya es miembro del equipo")
      return
    }
    if (pendingInvitations.some((inv) => inv.email.toLowerCase() === normalized)) {
      toast.error("Ya existe una invitación pendiente para esta persona")
      return
    }

    startTransition(async () => {
      try {
        const inv = await sendInvitationAction({ email, role })
        toast.success(`Invitación enviada a ${email}`)
        onInviteSent(inv)
        setEmail("")
      } catch {
        toast.error("Error al enviar la invitación")
      }
    })
  }

  return (
    <form onSubmit={handleInvite}>
      <Label htmlFor="invite-email">Invitar miembro</Label>
      <div className="mt-1.5 flex items-center gap-3">
        <Input
          id="invite-email"
          type="email"
          placeholder="email@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isPending}
          className="flex-1"
        />
        <div className="w-36">
          <Select value={role} onValueChange={(v) => setRole(v as InvitableRole)}>
            <SelectTrigger id="invite-role" disabled={isPending}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {userRole === "owner" && <SelectItem value="admin">Administrador</SelectItem>}
              <SelectItem value="agent">Agente</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          <span className="ml-1.5 hidden sm:inline">Invitar</span>
        </Button>
      </div>
    </form>
  )
}

function MemberRow({
  member,
  userRole,
  canChangeRoles,
  canManage,
  onRoleChanged,
  onRemoved,
}: {
  member: TeamMember
  userRole: "owner" | "admin" | "agent"
  canChangeRoles: boolean
  canManage: boolean
  onRoleChanged: (id: string, newRole: "admin" | "agent") => void
  onRemoved: (id: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false)

  const initials = (member.name ?? member.email)
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const isOwner = member.role === "owner"
  const canEditThis =
    canManage &&
    !isOwner &&
    !(userRole === "admin" && member.role === "admin")

  const handleRoleChange = (newRole: "admin" | "agent") => {
    startTransition(async () => {
      const result = await updateMemberRoleAction(member.id, newRole)
      if (result.error) {
        toast.error(result.error)
        return
      }
      onRoleChanged(member.id, newRole)
      toast.success(`Rol actualizado a ${ROLE_LABELS[newRole]}`)
    })
  }

  const confirmRemove = () => {
    // Wrap the actual removal in startTransition so the dropdown
    // spinner state still reflects the in-flight server action. The
    // dialog closes onConfirm via DeleteConfirmDialog's API.
    startTransition(async () => {
      const result = await removeMemberAction(member.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setConfirmRemoveOpen(false)
      onRemoved(member.id)
      toast.success("Miembro removido")
    })
  }

  return (
    <div className="flex items-center gap-3 rounded-md border p-3">
      <Avatar className="size-9">
        {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt={member.name} />}
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{member.name ?? member.email}</span>
          <RoleBadge tone={ROLE_TONE[member.role]}>{ROLE_LABELS[member.role]}</RoleBadge>
        </div>
        <p className="truncate text-xs text-muted-foreground">{member.email}</p>
      </div>
      {canEditThis && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canChangeRoles && member.role === "agent" && (
              <DropdownMenuItem onClick={() => handleRoleChange("admin")}>
                <ShieldAlert className="mr-2 size-4" />
                Promover a Administrador
              </DropdownMenuItem>
            )}
            {canChangeRoles && member.role === "admin" && (
              <DropdownMenuItem onClick={() => handleRoleChange("agent")}>
                <Shield className="mr-2 size-4" />
                Cambiar a Agente
              </DropdownMenuItem>
            )}
            {canChangeRoles && (member.role === "agent" || member.role === "admin") && (
              <DropdownMenuSeparator />
            )}
            <DropdownMenuItem
              onSelect={(e) => {
                // Prevent the dropdown from auto-closing before our
                // dialog mounts; manually open the confirm dialog so the
                // remove action is always behind an explicit Yes/No.
                e.preventDefault()
                setConfirmRemoveOpen(true)
              }}
              className="text-destructive"
            >
              <UserX className="mr-2 size-4" />
              Remover del equipo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <DeleteConfirmDialog
        open={confirmRemoveOpen}
        onOpenChange={setConfirmRemoveOpen}
        title="¿Remover del equipo?"
        description={
          <>
            Vas a remover a <strong>{member.name ?? member.email}</strong> de la organización.
            Perderá el acceso inmediatamente y será desconectado en tiempo real.
            Esta acción no se puede deshacer.
          </>
        }
        onConfirm={confirmRemove}
        confirming={isPending}
        confirmLabel="Remover"
        confirmingLabel="Removiendo…"
      />
    </div>
  )
}

function InvitationRow({
  invitation,
  canManage,
  onCancelled,
}: {
  invitation: PendingInvitation
  canManage: boolean
  onCancelled: (id: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)

  const expiresDate = new Date(invitation.expiresAt)
  const isExpired = expiresDate < new Date()

  const handleCancel = () => {
    startTransition(async () => {
      try {
        await cancelInvitationAction(invitation.id)
        setConfirmCancelOpen(false)
        onCancelled(invitation.id)
        toast.success("Invitación cancelada")
      } catch {
        toast.error("Error al cancelar la invitación")
      }
    })
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-dashed p-3">
      <div className="flex size-9 items-center justify-center rounded-full bg-muted">
        <UserPlus className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm">{invitation.email}</span>
          <RoleBadge tone="member">{ROLE_LABELS[invitation.role]}</RoleBadge>
          {isExpired && <RoleBadge tone="expired">Expirada</RoleBadge>}
        </div>
        <p className="text-xs text-muted-foreground">
          {isExpired
            ? `Expiró ${formatFriendlyDate(invitation.expiresAt)}`
            : `Vence ${formatFriendlyDate(invitation.expiresAt)}`}
        </p>
      </div>
      {canManage && (
        <>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirmCancelOpen(true)}
                  disabled={isPending}
                  aria-label="Cancelar invitación"
                >
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Cancelar invitación</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DeleteConfirmDialog
            open={confirmCancelOpen}
            onOpenChange={setConfirmCancelOpen}
            title="¿Cancelar invitación?"
            description={
              <>
                Vas a cancelar la invitación enviada a <strong>{invitation.email}</strong>.
                La persona ya no podrá aceptarla.
              </>
            }
            onConfirm={handleCancel}
            confirming={isPending}
            confirmLabel="Cancelar invitación"
            confirmingLabel="Cancelando…"
            cancelLabel="Volver"
          />
        </>
      )}
    </div>
  )
}

/**
 * Row for the "Invitaciones rechazadas y expiradas" panel. Mirrors the
 * InvitationRow layout (icon + email + role badge + status badge + actions)
 * but with two action buttons: Reenviar (rejected only) and Eliminar.
 *
 * `onResent` returns the new pending invitation so the parent can lift it
 * out of "archived" and into the "pendientes" list optimistically. Both
 * destructive actions are gated behind confirmation dialogs (Reenviar:
 * AlertDialog because it sends an email on confirm; Eliminar:
 * DeleteConfirmDialog to match the pattern used for removing a member).
 */
function ArchivedInvitationRow({
  invitation,
  pendingInvitations,
  onResent,
  onDeleted,
}: {
  invitation: ArchivedInvitation
  // Passed in so Reenviar can detect the "already pending" conflict
  // client-side and short-circuit with a specific toast instead of
  // dispatching the action and surfacing a generic backend error. The
  // backend `sendInvitationUseCase` keeps its own `hasPendingForEmail`
  // check (defense in depth) — this prop only powers the UX hint.
  pendingInvitations: PendingInvitation[]
  onResent: (oldId: string, fresh: PendingInvitation) => void
  onDeleted: (id: string) => void
}) {
  // Two separate transitions so the in-flight state of each mutation
  // only disables / spins its own button. A single shared transition
  // would make the Reenviar button appear loading while Eliminar is
  // running (and vice-versa), confusing the user about which action is
  // actually in progress.
  const [isResendPending, startResendTransition] = useTransition()
  const [isDeletePending, startDeleteTransition] = useTransition()
  const [confirmResendOpen, setConfirmResendOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const isRejected = invitation.status === "rejected"
  // Either mutation in flight disables BOTH buttons (you can still see
  // which is running via its own spinner). Prevents stacking a delete
  // on top of a resend mid-flight.
  const anyPending = isResendPending || isDeletePending

  /**
   * Detect whether the archived row's email already has an active
   * pending invitation. The backend `sendInvitationUseCase` would
   * reject this with `hasPendingForEmail` and surface a generic
   * error — better to short-circuit client-side with a specific toast.
   *
   * The invitation `email` is stored lowercased by the repository;
   * normalise both sides to be defensive against a stray mixed-case
   * row that slipped past the writer.
   */
  const hasActivePendingForEmail = () => {
    const normalized = invitation.email.toLowerCase()
    return pendingInvitations.some((p) => p.email.toLowerCase() === normalized)
  }

  /**
   * Click handler for the Reenviar button. Guards both against a
   * concurrent in-flight mutation (defensive — the button is already
   * `disabled={anyPending}`, but a programmatic trigger could bypass
   * the UI) and the duplicate-pending case. Only opens the dialog when
   * both checks pass.
   */
  const handleResendClick = () => {
    if (anyPending) return
    if (hasActivePendingForEmail()) {
      toast.error("Ya existe una invitación pendiente para esta persona")
      return
    }
    setConfirmResendOpen(true)
  }

  const handleResend = () => {
    // Re-check at confirm time: a realtime event or another browser tab
    // could have added a pending invitation for this email while the
    // dialog was open. Without this guard the action would dispatch and
    // the backend's `hasPendingForEmail` throw would surface as the
    // generic "Error al reenviar" toast — the same vague message the
    // pre-check was added to eliminate.
    if (hasActivePendingForEmail()) {
      toast.error("Ya existe una invitación pendiente para esta persona")
      setConfirmResendOpen(false)
      return
    }
    startResendTransition(async () => {
      try {
        const fresh = await resendInvitationAction(invitation.id)
        toast.success(`Invitación reenviada a ${invitation.email}`)
        setConfirmResendOpen(false)
        onResent(invitation.id, fresh)
      } catch {
        toast.error("Error al reenviar la invitación")
      }
    })
  }

  const handleDelete = () => {
    startDeleteTransition(async () => {
      try {
        await deleteArchivedInvitationAction(invitation.id)
        setConfirmDeleteOpen(false)
        onDeleted(invitation.id)
        toast.success("Invitación eliminada")
      } catch {
        toast.error("Error al eliminar la invitación")
      }
    })
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-dashed p-3">
      <div className="flex size-9 items-center justify-center rounded-full bg-muted">
        <UserPlus className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm">{invitation.email}</span>
          <RoleBadge tone="member">{ROLE_LABELS[invitation.role]}</RoleBadge>
          {/*
            Status badge: rejected uses the destructive (red) tone to
            signal an active decline by the invitee; expired uses the
            secondary (grey) tone to mark a passive timeout. Both share
            the same RoleBadge shape so they read as the same kind of
            status pill — only the colour distinguishes intent.
          */}
          {isRejected ? (
            <RoleBadge tone="rejected">Rechazada</RoleBadge>
          ) : (
            <RoleBadge tone="expired">Expirada</RoleBadge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {isRejected
            ? `Rechazada ${formatFriendlyDate(invitation.createdAt)}`
            : `Expiró ${formatFriendlyDate(invitation.expiresAt)}`}
        </p>
      </div>
      <TooltipProvider>
        {/*
          Reenviar is available for BOTH rejected and expired archived
          rows: rejected = admin tries again after a decline; expired =
          admin renews after a timeout (the more common case). The
          server-side `resendInvitationUseCase` validates the row is
          archivable (rejected / expired / pending+past-expiry) — the
          UI just exposes the button consistently.
        */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              onClick={handleResendClick}
              disabled={anyPending}
              aria-label="Reenviar invitación"
            >
              {isResendPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reenviar invitación</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={anyPending}
              aria-label="Eliminar invitación"
            >
              {isDeletePending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Eliminar invitación</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/*
        Resend uses the generic Dialog primitive (not DeleteConfirmDialog)
        because it is a *constructive* action — confirming sends a fresh
        email and creates a new pending invitation. DeleteConfirmDialog
        renders a red `destructive` button which would be the wrong
        affordance here. Block dismissal while the mutation is in flight
        so the user cannot orphan the request state.
      */}
      <Dialog open={confirmResendOpen} onOpenChange={setConfirmResendOpen}>
        <DialogContent
          showCloseButton={!isResendPending}
          onEscapeKeyDown={(e) => isResendPending && e.preventDefault()}
          onInteractOutside={(e) => isResendPending && e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>¿Reenviar invitación?</DialogTitle>
            <DialogDescription>
              Vas a enviar una nueva invitación a <strong>{invitation.email}</strong>.
              La invitación anterior será eliminada.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmResendOpen(false)}
              disabled={isResendPending}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleResend} disabled={isResendPending}>
              {isResendPending ? "Reenviando…" : "Reenviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="¿Eliminar invitación?"
        description={
          <>
            Vas a eliminar la invitación enviada a <strong>{invitation.email}</strong>.
            Si más adelante quieres volver a invitar a esta persona, podrás hacerlo desde
            el formulario de arriba.
          </>
        }
        onConfirm={handleDelete}
        confirming={isDeletePending}
        confirmLabel="Eliminar"
        confirmingLabel="Eliminando…"
      />
    </div>
  )
}
