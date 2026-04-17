# Sub-plan 10 — UI Components Migration

> **Depends on:** 02, 05, 06, 09
> **Unlocks:** 12

## Goal

Reescribir todos los componentes UI que consumen Better Auth client para usar `@supabase/ssr` + Server Actions. Funcionalidad equivalente al estado actual:

- Sign-up page (email/password + Google OAuth)
- Sign-in page (email/password + Google OAuth)
- Password reset flow (nuevo — no existía antes)
- Email verification landing (nuevo — no existía antes)
- UserButton (dropdown con avatar, nombre, logout)
- OrgSwitcher (dropdown para cambiar org activa)
- MembersList (tabla de members + invitations pendientes)

## Archivos

### Reescribir

- `app/(auth)/sign-up/page.tsx`
- `app/(auth)/sign-in/page.tsx`
- `components/nav-user.tsx` (UserButton)
- `components/org-switcher.tsx` (OrgSwitcher)

### Crear

- `app/(auth)/forgot-password/page.tsx`
- `app/(auth)/reset-password/page.tsx`
- `app/(auth)/verify-email/page.tsx`
- `app/auth/callback/route.ts` — route handler OAuth callback (reemplaza `/api/auth/callback/google` de Better Auth)
- `app/(auth)/actions.ts` — Server Actions auth (signUp, signIn, signOut, sendPasswordReset, resetPassword)
- `features/shared/presentation/components/members-list.tsx`

### Eliminar (Fase 12)

- `components/auth/social-buttons.tsx` (lógica mueve a actions + new component)
- Cualquier componente que `import from "@/lib/auth-client"`

## Server Actions

### `app/(auth)/actions.ts` (nuevo)

```ts
"use server"

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function signUpAction(input: {
  name: string
  email: string
  password: string
}): Promise<{ error?: string }> {
  const supabase = await getSupabaseServerClient()
  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.name,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) return { error: error.message }

  // User created. Email verification required.
  // Trigger on_auth_user_created already ran: org + member + user_active_org created.
  // But user hasn't confirmed email yet → can't auth-session.
  // Show a "Check your email" state in the UI.
  return {}
}

export async function signInEmailAction(input: {
  email: string
  password: string
}): Promise<{ error?: string }> {
  const supabase = await getSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  })
  if (error) return { error: error.message }
  revalidatePath("/", "layout")
  return {}
}

export async function signInGoogleAction(): Promise<{ url?: string; error?: string }> {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })
  if (error) return { error: error.message }
  return { url: data.url }
}

export async function signOutAction(): Promise<void> {
  const supabase = await getSupabaseServerClient()
  await supabase.auth.signOut()
  redirect("/sign-in")
}

export async function sendPasswordResetAction(email: string): Promise<{ error?: string }> {
  const supabase = await getSupabaseServerClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  })
  if (error) return { error: error.message }
  return {}
}

export async function updatePasswordAction(newPassword: string): Promise<{ error?: string }> {
  const supabase = await getSupabaseServerClient()
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }
  return {}
}
```

### `app/auth/callback/route.ts` (nuevo)

Maneja el callback de OAuth / email verification (reemplaza `/api/auth/callback/*` de Better Auth):

```ts
import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"

  if (code) {
    const supabase = await getSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_failed`)
}
```

## Páginas

### `app/(auth)/sign-up/page.tsx` (rewrite)

```tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { signUpAction, signInGoogleAction } from "../actions"
import { GoogleIcon } from "@/components/icons/google"

export default function SignUpPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [emailSent, setEmailSent] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const { error } = await signUpAction({ name, email, password })
      if (error) {
        toast.error(error)
        return
      }
      setEmailSent(true)
    })
  }

  const handleGoogle = async () => {
    startTransition(async () => {
      const { url, error } = await signInGoogleAction()
      if (error) {
        toast.error(error)
        return
      }
      if (url) window.location.href = url
    })
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-xl font-semibold">Revisá tu email</h1>
          <p className="text-sm text-muted-foreground">
            Te mandamos un link a <strong>{email}</strong> para confirmar tu cuenta.
          </p>
          <p className="text-xs text-muted-foreground">
            Si no llega en unos minutos, revisá spam o probá con otro email.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold">Crear cuenta</h1>
          <p className="text-sm text-muted-foreground">
            Ingresá tus datos para comenzar con Black Estate
          </p>
        </div>

        <Button onClick={handleGoogle} disabled={isPending} variant="outline" className="w-full">
          <GoogleIcon className="size-4 mr-2" />
          Continuar con Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">o</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre completo</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} disabled={isPending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isPending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} disabled={isPending} />
          </div>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Creando..." : "Crear cuenta"}
          </Button>
        </form>

        <p className="text-sm text-center text-muted-foreground">
          ¿Ya tenés cuenta?{" "}
          <Link href="/sign-in" className="text-primary hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
```

### `app/(auth)/sign-in/page.tsx` (rewrite)

Similar structure. OnSubmit llama `signInEmailAction`. Link a `/forgot-password`.

### `app/(auth)/forgot-password/page.tsx` (nuevo)

Form con email único. OnSubmit llama `sendPasswordResetAction`. Mensaje de confirmación.

### `app/(auth)/reset-password/page.tsx` (nuevo)

Form con password doble. Llama `updatePasswordAction`. Redirige a `/dashboard` tras éxito.

### `app/(auth)/verify-email/page.tsx` (nuevo)

Opcional: puede ser una página de "Email confirmado, ya podés entrar" cuando user hace click en el link de email. Redirige a sign-in.

## `components/nav-user.tsx` (rewrite)

```tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { signOutAction } from "@/app/(auth)/actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { ChevronsUpDown, LogOut, User, Settings, CreditCard } from "lucide-react"

interface User {
  id: string
  email?: string
  name?: string
  avatarUrl?: string
}

export function NavUser() {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      setUser({
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.full_name,
        avatarUrl: data.user.user_metadata?.avatar_url,
      })
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name,
          avatarUrl: session.user.user_metadata?.avatar_url,
        })
      } else {
        setUser(null)
      }
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  if (!user) return null

  const initials = (user.name ?? user.email ?? "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg">
              <Avatar className="h-8 w-8">
                {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name ?? user.email}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" side="right" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.name ?? user.email}</p>
                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>
              <User className="mr-2 size-4" /> Mi perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
              <Settings className="mr-2 size-4" /> Mi cuenta
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
              <CreditCard className="mr-2 size-4" /> Facturación
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={async () => { await signOutAction() }}>
              <LogOut className="mr-2 size-4" /> Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
```

## `components/org-switcher.tsx` (rewrite)

Usa nuevo Server Action + custom hook:

```tsx
"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { switchActiveOrgAction, listUserOrgsAction } from "@/features/shared/presentation/organization-actions"

interface Org {
  id: string
  name: string
  slug: string
  logoUrl?: string | null
  isActive: boolean
}

export function OrgSwitcher() {
  const [orgs, setOrgs] = useState<Org[]>([])
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    listUserOrgsAction().then(setOrgs)
  }, [])

  const activeOrg = orgs.find((o) => o.isActive) ?? orgs[0]
  if (!activeOrg) return null

  const handleSwitch = (orgId: string) => {
    startTransition(async () => {
      await switchActiveOrgAction(orgId)
      router.refresh()
    })
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary">
                {activeOrg.logoUrl ? (
                  <img src={activeOrg.logoUrl} alt={activeOrg.name} className="size-8 rounded-lg" />
                ) : (
                  <span className="text-sm font-bold">{activeOrg.name[0]}</span>
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{activeOrg.name}</span>
                <span className="truncate text-xs">{activeOrg.slug}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          {orgs.length > 1 && (
            <DropdownMenuContent className="w-64" side="right" align="start">
              <DropdownMenuLabel>Organizaciones</DropdownMenuLabel>
              {orgs.map((o) => (
                <DropdownMenuItem key={o.id} onClick={() => handleSwitch(o.id)} disabled={isPending}>
                  {o.isActive && <Check className="mr-2 size-4" />}
                  {o.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/dashboard/new-organization")}>
                <Plus className="mr-2 size-4" /> Crear organización
              </DropdownMenuItem>
            </DropdownMenuContent>
          )}
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
```

### Server Action `listUserOrgs` (para OrgSwitcher)

Agregar a `features/shared/presentation/organization-actions.ts`:

```ts
export async function listUserOrgsAction() {
  const ctx = await getSessionContext()
  const rows = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logoUrl: organization.logoUrl,
    })
    .from(organization)
    .innerJoin(member, eq(member.organizationId, organization.id))
    .where(
      and(
        eq(member.userId, ctx.userId),
        sql`${member.deletedAt} IS NULL`,
      ),
    )

  return rows.map((o) => ({
    ...o,
    isActive: o.id === ctx.orgId,
  }))
}
```


## `features/shared/presentation/components/members-list.tsx`

Listado de members + invites pendientes. Permite:
- Cambiar role de member (owner only)
- Remover member (owner/admin; no a sí mismo)
- Cancelar invitation pendiente
- Re-enviar invitation

```tsx
"use client"

import { useEffect, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
// ...shadcn table imports

// Server Actions necesarias:
// - listMembersAction() → Member[]
// - listInvitationsAction() → Invitation[]
// - updateMemberRoleAction(memberId, role) → void
// - removeMemberAction(memberId) → void
// - cancelInvitationAction(invitationId) → void

export function MembersList() {
  // Fetch + render logic similar a OrgSwitcher.
  // Sections: "Miembros activos" + "Invitaciones pendientes".
  // Actions via transitions, toast on success/error.
  // Respetar permisos: owner cambia roles; admin no puede cambiar role de owner; agent solo lectura.
  return null
}
```

**Detalle:** implementación completa es tabular shadcn básica. No detallo más acá — ~200 líneas, estándar.

## Pasos

- [x] **1.** Crear `app/(auth)/actions.ts` con las 6 Server Actions. ⏭️ Absorbido parcialmente en sub-plan 09 task #63. signIn/signUp inline en pages. Password reset uses browser client directly (no server actions needed — PKCE flow).
- [x] **2.** Reescribir `app/(auth)/sign-up/page.tsx`. ✅ task #63 (commit `979b187`)
- [x] **3.** Reescribir `app/(auth)/sign-in/page.tsx`. ✅ task #63 (commit `979b187`). Link "¿Olvidaste tu contraseña?" agregado en task #68.
- [x] **4.** Crear `app/(auth)/forgot-password/page.tsx` y `reset-password/page.tsx`. ✅ task #68
- [x] **5.** Crear `app/auth/callback/route.ts`. ✅ task #63 (commit `979b187`). `resolveBaseUrl` fix en task #69.
- [x] **5b.** Crear `app/auth/confirm/route.ts` — token_hash verifyOtp route (fix Gmail pre-fetch). ✅ task #69. Templates Supabase Dashboard pendientes de actualización manual por usuario.
- [x] **6.** Reescribir `components/nav-user.tsx`. ✅ task #63 — props-driven from server
- [x] **7.** Reescribir `components/org-switcher.tsx`. ✅ task #63 — props-driven from server
- [x] **8.** Agregar `listUserOrgsAction` a organization-actions. ✅ task #66 — `getUserOrganizationsAction()` (equivalent)
- [ ] **9.** Implementar `features/shared/presentation/components/members-list.tsx`. ⬜
- [ ] **10.** Integrar MembersList en `app/dashboard/settings/page.tsx`. ⬜
- [x] **11.** Actualizar `app/dashboard/layout.tsx`. ✅ task #63 — uses `getAuthState()` + `getUserOrganizationsAction()`
- [ ] **12.** Build + lint check.
- [ ] **13.** Test manual.
- [ ] **14.** Commit.

## Checklist

- [x] Sign-up funciona (email/password + Google OAuth) ✅ task #63
- [x] Email verification se envía y valida ✅ task #63
- [x] Sign-in con ambos métodos ✅ task #63
- [x] Password reset end-to-end ✅ task #68 (forgot-password + reset-password pages, session guard, error mapping, proxy AUTH_ROUTES update)
- [x] UserButton muestra user + logout funciona ✅ task #63
- [x] OrgSwitcher lista orgs + permite switch + refresh correcto ✅ task #66
- [ ] MembersList muestra members y invitations ⬜

## Rollback

- Revertir commit.
- Reactivar `lib/auth-client.ts` imports.

## Notas

- **`useSession` replacement:** Better Auth's `useSession` hook → reemplazado por `supabase.auth.onAuthStateChange` + state local en componentes que necesitan session info.
- **Cookie-based session:** el proxy.ts refresca cookies. No hace falta `useSession` hook en la mayoría de componentes — el server ya tiene session y la pasa via props o Server Component.
- **`session.activeOrganizationId` en Better Auth:** ahora vive en `user_active_org` + JWT claim `active_org_id`. `getSessionContext` lo lee del JWT.
- **Next.js 16 Server Actions:** revalidatePath + redirect patterns son idénticos a antes.
- **TypeScript:** tipos de Supabase client via `@supabase/supabase-js` `SupabaseClient`. Ya está importado en el proyecto.
