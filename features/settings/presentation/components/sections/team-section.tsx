"use client"

import { useState, useTransition } from "react"
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
import { MoreHorizontal, UserPlus, Shield, ShieldAlert, UserX, XCircle, Loader2 } from "lucide-react"
import { updateMemberRoleAction, removeMemberAction } from "@/features/shared/presentation/member-actions"
import { sendInvitationAction, cancelInvitationAction } from "@/features/shared/presentation/invitation-actions"
import { getDisplayMessage } from "@/lib/errors/invitation-errors"
import type { TeamMember, TeamSeatInfo } from "@/features/shared/domain/member.entity"
import type { PendingInvitation, InvitableRole } from "@/features/shared/domain/invitation.entity"

const ROLE_LABELS: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  agent: "Agente",
}

const ROLE_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  owner: "default",
  admin: "secondary",
  agent: "outline",
}

interface TeamSectionProps {
  data: {
    members: TeamMember[]
    invitations: PendingInvitation[]
    seatInfo: TeamSeatInfo
    userRole: "owner" | "admin" | "agent"
  }
}

export function TeamSection({ data: initialData }: TeamSectionProps) {
  const [members, setMembers] = useState(initialData.members)
  const [invitations, setInvitations] = useState(initialData.invitations)
  const [seatInfo, setSeatInfo] = useState(initialData.seatInfo)
  const { userRole } = initialData

  const canManage = userRole === "owner" || userRole === "admin"
  const canChangeRoles = userRole === "owner"
  const seatsAvailable = seatInfo.maxSeats - seatInfo.currentMembers

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Equipo</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona los miembros de tu organización
          </p>
        </div>
        <Badge variant="outline">
          {seatInfo.currentMembers} de {seatInfo.maxSeats} asientos
        </Badge>
      </div>

      <Separator />

      {canManage && (
        <InviteForm
          seatsAvailable={seatsAvailable}
          userRole={userRole}
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
    </div>
  )
}

function InviteForm({
  seatsAvailable,
  userRole,
  onInviteSent,
}: {
  seatsAvailable: number
  userRole: "owner" | "admin" | "agent"
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

    startTransition(async () => {
      try {
        const inv = await sendInvitationAction({ email, role })
        toast.success(`Invitación enviada a ${email}`)
        onInviteSent(inv)
        setEmail("")
      } catch (err) {
        // Server boundary already translated to ES neutral copy via
        // withInvitationActionBoundary. getDisplayMessage extracts it
        // without raw `.message` access (G24 defence-in-depth).
        toast.error(getDisplayMessage(err, "Error al enviar la invitación."))
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
        {isPending ? <Loader2 className="animate-spin" /> : <UserPlus className="size-4" />}
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

  const handleRemove = () => {
    startTransition(async () => {
      const result = await removeMemberAction(member.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
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
        <div className="flex items-baseline gap-2">
          <span className="truncate text-sm font-medium">{member.name ?? member.email}</span>
          <Badge variant={ROLE_VARIANTS[member.role]} className="shrink-0 text-[10px] px-1.5 py-0 leading-normal">
            {ROLE_LABELS[member.role]}
          </Badge>
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
            <DropdownMenuItem onClick={handleRemove} className="text-destructive">
              <UserX className="mr-2 size-4" />
              Remover del equipo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
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

  const expiresDate = new Date(invitation.expiresAt)
  const isExpired = expiresDate < new Date()

  const handleCancel = () => {
    startTransition(async () => {
      try {
        await cancelInvitationAction(invitation.id)
        onCancelled(invitation.id)
        toast.success("Invitación cancelada")
      } catch (err) {
        toast.error(getDisplayMessage(err, "Error al cancelar la invitación."))
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
          <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0">
            {ROLE_LABELS[invitation.role]}
          </Badge>
          {isExpired && (
            <Badge variant="destructive" className="shrink-0 text-xs">
              Expirada
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {isExpired
            ? `Expiró el ${expiresDate.toLocaleDateString("es-BO")}`
            : `Expira el ${expiresDate.toLocaleDateString("es-BO")}`}
        </p>
      </div>
      {canManage && (
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-destructive"
          onClick={handleCancel}
          disabled={isPending}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
        </Button>
      )}
    </div>
  )
}
