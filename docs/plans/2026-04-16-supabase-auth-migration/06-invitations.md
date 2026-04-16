# Sub-plan 06 — Invitations Flow

> **Depends on:** 01, 02, 05, 10 (parcial — UI)
> **Unlocks:** Feature completa (end-user visible)

## Goal

Flow completo de invitaciones:

1. Owner/admin invita a un email con un role específico (admin / agent).
2. Supabase manda email con token (enviado vía Supabase Auth admin API → Resend SMTP).
3. Destinatario hace click → landing `/accept-invite?token=...` → si no existe user, sign-up flow (con redirect post-signup); si existe, login.
4. Post-auth: Server Action valida token, crea row en `public.member`, expira invitation, auto-switch a esa org.

## Estrategia de dos partes

**Parte A — email + token:**

Opción 1 (elegida): usar `supabase.auth.admin.inviteUserByEmail(email, { data, redirectTo })` — Supabase genera el token, manda email via SMTP configurado (Resend). El token viene como `?access_token=...` en la URL.

Opción 2 (descartada): custom token manual en `public.invitation.token`. Más control pero más código. Usamos Opción 1.

**Parte B — metadata de invitación:**

La tabla `public.invitation` persiste el contexto de la invite (org_id, role, email, status). Al crear invitation:
1. Insert row en `public.invitation` con `token` generado (UUID) + status `pending`.
2. Call `supabase.auth.admin.inviteUserByEmail(email, { redirectTo: `${origin}/accept-invite?inv=${token}` })`.
3. User recibe email de Supabase con link. Click → va a Supabase → Supabase verifica token de sesión → redirect a nuestro `/accept-invite?inv=...`.
4. En `/accept-invite` Server Action:
   - Valida invitation por `inv` token.
   - Verifica que está pending y no expiró.
   - Verifica que el user autenticado tiene email que coincide con `invitation.email`.
   - Insert `member` row (user, org, role).
   - Update `user_active_org` (set active = new org).
   - Update invitation status a `accepted`.
   - Force JWT refresh.
   - Redirect a `/dashboard`.

## Archivos

### Crear

- `features/shared/presentation/invitation-actions.ts` (TS)
- `app/accept-invite/page.tsx` (página pública — user authenticated requerido)
- `features/shared/presentation/components/invite-member-dialog.tsx` (UI para invitar)
- `features/shared/presentation/components/members-list.tsx` (listado con status de invitations pendientes)

### Modificar

- Settings page (`app/dashboard/settings/page.tsx`): agregar tab "Miembros" que renderiza `MembersList` + `InviteMemberDialog`.

## Server Actions

### `features/shared/presentation/invitation-actions.ts`

```ts
"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getSessionContext } from "@/features/shared/infrastructure/session-context"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { db } from "@/lib/db"
import { and, eq, sql } from "drizzle-orm"
import { invitation, member, organization, userActiveOrg } from "@/lib/db/schema"

const INVITE_EXPIRY_DAYS = 7

function generateInviteToken(): string {
  return crypto.randomUUID()
}

/**
 * Send an invitation to join the current active org.
 * Only owner/admin can invite.
 */
export async function sendInvitationAction(input: {
  email: string
  role: "admin" | "agent"
}): Promise<void> {
  const ctx = await getSessionContext()

  if (ctx.role !== "owner" && ctx.role !== "admin") {
    throw new Error("No tenés permisos para invitar miembros")
  }

  // Prevent self-invite
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email === input.email) {
    throw new Error("No podés invitarte a vos mismo")
  }

  // Check org max_seats not exceeded
  const [org] = await db
    .select({ maxSeats: organization.maxSeats })
    .from(organization)
    .where(eq(organization.id, ctx.orgId))
    .limit(1)

  const [currentMemberCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(member)
    .where(
      and(
        eq(member.organizationId, ctx.orgId),
        sql`${member.deletedAt} is null`,
      ),
    )

  if (currentMemberCount.count >= org.maxSeats) {
    throw new Error(
      `Tu plan permite ${org.maxSeats} miembros. Actualizá el plan para invitar más.`,
    )
  }

  // Check existing pending invite for this email+org
  const [existing] = await db
    .select({ id: invitation.id })
    .from(invitation)
    .where(
      and(
        eq(invitation.organizationId, ctx.orgId),
        eq(invitation.email, input.email),
        eq(invitation.status, "pending"),
      ),
    )
    .limit(1)

  if (existing) {
    throw new Error("Ya existe una invitación pendiente para este email")
  }

  const token = generateInviteToken()
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  // Persist invitation
  await db.insert(invitation).values({
    organizationId: ctx.orgId,
    email: input.email,
    role: input.role,
    status: "pending",
    token,
    invitedByUserId: ctx.userId,
    expiresAt,
  })

  // Send email via Supabase admin
  const admin = getSupabaseAdmin()
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const redirectTo = `${origin}/accept-invite?inv=${token}`

  const { error } = await admin.auth.admin.inviteUserByEmail(input.email, {
    redirectTo,
    data: {
      invited_to_org_id: ctx.orgId,
      invited_role: input.role,
    },
  })

  if (error) {
    // Rollback invitation row
    await db.delete(invitation).where(eq(invitation.token, token))
    throw new Error(`No se pudo enviar la invitación: ${error.message}`)
  }

  revalidatePath("/dashboard/settings")
}

/**
 * Accept an invitation. Called from /accept-invite page after auth.
 */
export async function acceptInvitationAction(token: string): Promise<{ orgId: string }> {
  const ctx = await getSessionContext()
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Sesión inválida")

  const [inv] = await db
    .select()
    .from(invitation)
    .where(eq(invitation.token, token))
    .limit(1)

  if (!inv) throw new Error("Invitación no encontrada")
  if (inv.status !== "pending") throw new Error("Invitación ya procesada")
  if (inv.expiresAt < new Date()) {
    await db
      .update(invitation)
      .set({ status: "expired" })
      .where(eq(invitation.id, inv.id))
    throw new Error("La invitación expiró")
  }
  if (inv.email.toLowerCase() !== user.email?.toLowerCase()) {
    throw new Error("Esta invitación es para otro email")
  }

  // Check if user is already a member of this org
  const [existingMember] = await db
    .select({ id: member.id })
    .from(member)
    .where(
      and(
        eq(member.userId, ctx.userId),
        eq(member.organizationId, inv.organizationId),
      ),
    )
    .limit(1)

  if (existingMember) {
    // Mark invitation accepted but skip insert
    await db
      .update(invitation)
      .set({ status: "accepted", acceptedAt: new Date() })
      .where(eq(invitation.id, inv.id))
    return { orgId: inv.organizationId }
  }

  // Perform accept in transaction
  await db.transaction(async (tx) => {
    await tx.insert(member).values({
      userId: ctx.userId,
      organizationId: inv.organizationId,
      role: inv.role,
    })

    await tx
      .insert(userActiveOrg)
      .values({ userId: ctx.userId, organizationId: inv.organizationId })
      .onConflictDoUpdate({
        target: userActiveOrg.userId,
        set: { organizationId: inv.organizationId, updatedAt: new Date() },
      })

    await tx
      .update(invitation)
      .set({ status: "accepted", acceptedAt: new Date() })
      .where(eq(invitation.id, inv.id))
  })

  await supabase.auth.refreshSession()
  revalidatePath("/dashboard")

  return { orgId: inv.organizationId }
}

/**
 * Cancel a pending invitation (owner/admin only).
 */
export async function cancelInvitationAction(invitationId: string): Promise<void> {
  const ctx = await getSessionContext()
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    throw new Error("Sin permisos")
  }

  await db
    .update(invitation)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(invitation.id, invitationId),
        eq(invitation.organizationId, ctx.orgId),
        eq(invitation.status, "pending"),
      ),
    )

  revalidatePath("/dashboard/settings")
}

/**
 * List pending invitations for current org (owner/admin).
 */
export async function listInvitationsAction(): Promise<
  Array<{ id: string; email: string; role: "admin" | "agent"; expiresAt: Date }>
> {
  const ctx = await getSessionContext()
  if (ctx.role !== "owner" && ctx.role !== "admin") return []

  const rows = await db
    .select({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    })
    .from(invitation)
    .where(
      and(
        eq(invitation.organizationId, ctx.orgId),
        eq(invitation.status, "pending"),
      ),
    )
    .orderBy(sql`${invitation.createdAt} desc`)

  return rows.filter((r) => r.role !== "owner") as Array<{
    id: string
    email: string
    role: "admin" | "agent"
    expiresAt: Date
  }>
}
```

## Página `/accept-invite`

### `app/accept-invite/page.tsx`

```tsx
import { redirect } from "next/navigation"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { acceptInvitationAction } from "@/features/shared/presentation/invitation-actions"

interface Props {
  searchParams: Promise<{ inv?: string }>
}

export default async function AcceptInvitePage({ searchParams }: Props) {
  const params = await searchParams
  const token = params.inv

  if (!token) redirect("/sign-in")

  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // User not authenticated — redirect to sign-in with `next`
    redirect(`/sign-in?next=/accept-invite?inv=${encodeURIComponent(token)}`)
  }

  try {
    await acceptInvitationAction(token)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al aceptar invitación"
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md p-6 text-center space-y-4">
          <h1 className="text-xl font-semibold">No pudimos aceptar la invitación</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
          <a href="/dashboard" className="text-primary hover:underline">
            Ir al dashboard
          </a>
        </div>
      </div>
    )
  }

  redirect("/dashboard")
}
```

## UI Components

### `features/shared/presentation/components/invite-member-dialog.tsx`

```tsx
"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { sendInvitationAction } from "@/features/shared/presentation/invitation-actions"
import { toast } from "sonner"

export function InviteMemberDialog() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"admin" | "agent">("agent")
  const [isPending, startTransition] = useTransition()

  const submit = () => {
    startTransition(async () => {
      try {
        await sendInvitationAction({ email: email.trim().toLowerCase(), role })
        toast.success(`Invitación enviada a ${email}`)
        setOpen(false)
        setEmail("")
        setRole("agent")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Invitar miembro</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar miembro</DialogTitle>
          <DialogDescription>
            Recibirá un email con el link para aceptar la invitación.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@empresa.com"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">Rol</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "admin" | "agent")}>
              <SelectTrigger id="invite-role" disabled={isPending}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="agent">Agente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!email || isPending}>
            {isPending ? "Enviando..." : "Enviar invitación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### `features/shared/presentation/components/members-list.tsx`

```tsx
// Listado combinado: miembros actuales + invitaciones pending.
// Lee via Server Actions getMembers + listInvitations.
// Permite: cambiar rol (owner/admin), remover miembro, cancelar invitación pending.
// Implementación a detallar en ejecución; skeleton aquí, behavior en sub-plan 10.
```

**Nota:** `MembersList` completo se implementa en Fase 10 (UI general). Aquí solo dejamos el comportamiento documentado.

## Pasos

- [ ] **1.** Crear `features/shared/presentation/invitation-actions.ts` con el código de arriba.
- [ ] **2.** Crear `app/accept-invite/page.tsx`.
- [ ] **3.** Crear `features/shared/presentation/components/invite-member-dialog.tsx`.
- [ ] **4.** Agregar tab "Miembros" a `app/dashboard/settings/page.tsx`:
  ```tsx
  // pseudocode
  <TabsContent value="miembros">
    <MembersList />
    <InviteMemberDialog />
  </TabsContent>
  ```
- [ ] **5.** Build + lint check.
- [ ] **6.** Smoke test end-to-end:
  1. Login como owner.
  2. Invitar a otro email tuyo (second@test.com).
  3. Verificar que llega email (Resend logs).
  4. En incognito, click link → accept-invite → si no logueado, sign-up con ese email.
  5. Post-signup, acceptInvitationAction corre.
  6. Ver dashboard con la org compartida.
  7. Verificar en DB: 2 members en la org, 1 invitation status accepted.

- [ ] **7.** Commit
  ```bash
  git commit -m "feat(auth-migration): phase 06 — invitations flow

- Server Actions: sendInvitation, acceptInvitation, cancelInvitation, listInvitations
- UI: InviteMemberDialog, MembersList skeleton
- /accept-invite page auto-accepts post-auth
- Email sent via supabase.auth.admin.inviteUserByEmail
- Persistence in public.invitation with token+expiry

Ref: docs/plans/2026-04-16-supabase-auth-migration/06-invitations.md"
  ```

## Checklist

- [ ] Invitación envía email
- [ ] Email link redirige a `/accept-invite`
- [ ] `acceptInvitation` crea member + actualiza user_active_org
- [ ] Invitation expira a los 7 días
- [ ] Self-invite bloqueado
- [ ] Invitation duplicada bloqueada
- [ ] Max seats respetado

## Rollback

- Borrar archivos TS creados
- No hay SQL nuevo en esta fase (la tabla `invitation` se creó en Fase 01)

## Notas

- `NEXT_PUBLIC_APP_URL` es nuevo env var. Agregar a `.env.local`:
  ```
  NEXT_PUBLIC_APP_URL=http://localhost:3000
  ```
  y en prod usar el dominio real.
- `getSupabaseAdmin()` es el cliente service_role (server-only). Se usa acá porque `auth.admin.inviteUserByEmail` requiere privilegios admin.
- `supabase.auth.admin.inviteUserByEmail` crea al usuario en `auth.users` si no existe, con `email_confirmed_at = null` hasta que accept link.
- El trigger `handle_new_user` de Fase 05 corre al crear el user, le crea su org default. Después el accept-invite lo agrega COMO MEMBER de la org de la invitación. User termina siendo miembro de 2 orgs: la suya default + la invitada.
- **Opinable:** maybe NO crear org default si el user llega via invitation. Enhancement futuro: trigger detecta `raw_app_meta_data->>'invited'` flag y skip org creation. Por ahora, default behavior (crear org personal) está bien.
