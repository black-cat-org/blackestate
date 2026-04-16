# Sub-plan 08 — Storage Simplification

> **Depends on:** 07 (storage policies use auth.jwt nativo)
> **Unlocks:** None (cleanup downstream)

## Goal

Eliminar el workaround de service_role en `lib/supabase/storage.ts`. Con policies storage simplificadas (Fase 07), el cliente Supabase autenticado (cookie-based session) va con JWT natural que cumple las policies.

Simplifica:
- `uploadFile` ya no requiere `ctx` explícito (el JWT ya carga active_org_id).
- Path `{ctx.orgId}/...` se sigue usando pero ya no es defensivo — es la identidad real del JWT.
- `assertSecretKey` ya no es necesario para uploads de users (el secret key queda solo para ops admin legítimas).

## Archivos

### Modificar

- `lib/supabase/storage.ts` — aceptar cliente inyectado, no usar getSupabaseAdmin por default
- `lib/supabase/server.ts` — mantener `getSupabaseAdmin` solo para admin ops, exponer helper para cliente auth
- `features/properties/presentation/storage-actions.ts` — usar cliente auth

### Mantener

- `lib/supabase/config.ts` — bucket config sigue igual
- `lib/supabase/assert-secret-key.ts` — se mueve a internal de `server.ts` como antes (o se elimina si ya no protege uploads)

## Código

### `lib/supabase/storage.ts` (refactor)

```ts
import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { BUCKET_CONFIG, type Bucket } from "./config"

export type { Bucket }

const PUBLIC_URL_PATTERN = /\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/

function deriveContentType(bucket: Bucket, filename: string) {
  // [unchanged from current implementation]
  // ...
}

function assertSize(bucket: Bucket, file: File) {
  // [unchanged]
}

function buildObjectPath(orgId: string, entityId: string, ext: string): string {
  return `${orgId}/${entityId}/${crypto.randomUUID()}.${ext}`
}

/**
 * Upload a file using the provided authenticated Supabase client.
 * Caller must pass a client created via createServerClient (has user JWT in cookies).
 * RLS policies on storage.objects validate `foldername[1] = auth.jwt() ->> 'active_org_id'`.
 *
 * orgId is still required for path construction (must match JWT active_org_id — RLS will block if mismatched).
 */
export async function uploadFile(
  client: SupabaseClient,
  bucket: Bucket,
  orgId: string,
  entityId: string,
  file: File,
): Promise<string> {
  assertSize(bucket, file)
  const { ext, contentType } = deriveContentType(bucket, file.name)
  const path = buildObjectPath(orgId, entityId, ext)
  const cacheControl = String(BUCKET_CONFIG[bucket].cacheControlSeconds)

  const body = new Blob([await file.arrayBuffer()], { type: contentType })

  const { error } = await client.storage.from(bucket).upload(path, body, {
    contentType,
    cacheControl,
    upsert: false,
  })

  if (error) {
    throw new Error(`[storage] upload to ${bucket} failed: ${error.message}`)
  }

  if (!BUCKET_CONFIG[bucket].public) return path
  return client.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

export async function uploadFiles(
  client: SupabaseClient,
  bucket: Bucket,
  orgId: string,
  entityId: string,
  files: File[],
): Promise<string[]> {
  if (files.length === 0) return []
  return Promise.all(files.map((file) => uploadFile(client, bucket, orgId, entityId, file)))
}

export async function deleteFile(
  client: SupabaseClient,
  bucket: Bucket,
  path: string,
): Promise<void> {
  if (!path) return
  const { error } = await client.storage.from(bucket).remove([path])
  if (error) {
    throw new Error(`[storage] delete from ${bucket} failed: ${error.message}`)
  }
}

export async function deleteFiles(
  client: SupabaseClient,
  bucket: Bucket,
  paths: string[],
): Promise<void> {
  const cleaned = paths.filter(Boolean)
  if (cleaned.length === 0) return
  const { error } = await client.storage.from(bucket).remove(cleaned)
  if (error) {
    throw new Error(`[storage] bulk delete from ${bucket} failed: ${error.message}`)
  }
}

export async function getSignedUrl(
  client: SupabaseClient,
  bucket: Bucket,
  path: string,
  expiresIn: number = 3600,
): Promise<string> {
  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)
  if (error || !data?.signedUrl) {
    throw new Error(`[storage] signed URL failed for ${bucket}/${path}: ${error?.message ?? "unknown"}`)
  }
  return data.signedUrl
}

export function extractStoragePath(bucket: Bucket, publicUrl: string): string | null {
  // [unchanged]
}
```

### `lib/supabase/server.ts` (refactor)

Separar en dos exports:
- `getSupabaseServerClient()` — cliente auth cookies-based (nuevo, Fase 09 lo usa)
- `getSupabaseAdmin()` — cliente service_role (mantenido, para admin ops)

Detalle completo se documenta en Fase 09.

### `features/properties/presentation/storage-actions.ts` (refactor)

```ts
"use server"

import { getSessionContext } from "@/features/shared/infrastructure/session-context"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { uploadFile, deleteFile, extractStoragePath, uploadFiles } from "@/lib/supabase/storage"
import { uploadPropertyMediaUseCase } from "@/features/properties/application/upload-property-media.use-case"
import { deletePropertyMediaUseCase } from "@/features/properties/application/delete-property-media.use-case"

export async function uploadPropertyMediaAction(
  propertyId: string,
  formData: FormData,
): Promise<string[]> {
  const ctx = await getSessionContext()
  const client = await getSupabaseServerClient()
  const files = formData.getAll("files").filter((v): v is File => v instanceof File)
  if (files.length === 0) return []
  return uploadPropertyMediaUseCase(ctx, client, propertyId, files)
}

export async function deletePropertyMediaAction(photoUrl: string): Promise<void> {
  const ctx = await getSessionContext()
  const client = await getSupabaseServerClient()
  return deletePropertyMediaUseCase(ctx, client, photoUrl)
}

export async function uploadAvatarAction(formData: FormData): Promise<string> {
  const ctx = await getSessionContext()
  const client = await getSupabaseServerClient()
  const file = formData.get("file")
  if (!(file instanceof File)) throw new Error("No file provided")

  const newUrl = await uploadFile(client, "avatars", ctx.orgId, ctx.userId, file)

  const previousAvatarUrl = formData.get("previousAvatarUrl")
  if (typeof previousAvatarUrl === "string" && previousAvatarUrl.length > 0) {
    const previousPath = extractStoragePath("avatars", previousAvatarUrl)
    if (previousPath?.startsWith(`${ctx.orgId}/${ctx.userId}/`)) {
      try {
        await deleteFile(client, "avatars", previousPath)
      } catch (error) {
        console.warn(`[avatar] previous avatar delete failed (path=${previousPath})`, error)
      }
    }
  }

  return newUrl
}
```

### `features/properties/application/upload-property-media.use-case.ts` (refactor)

Acepta `client` como parámetro:

```ts
import type { SupabaseClient } from "@supabase/supabase-js"
import type { SessionContext } from "@/features/shared/domain/session-context"
import { DrizzlePropertyRepository } from "@/features/properties/infrastructure/drizzle-property.repository"
import { uploadFiles } from "@/lib/supabase/storage"

export async function uploadPropertyMediaUseCase(
  ctx: SessionContext,
  client: SupabaseClient,
  propertyId: string,
  files: File[],
): Promise<string[]> {
  const repo = new DrizzlePropertyRepository()
  const property = await repo.findById(ctx, propertyId)
  if (!property) throw new Error("Property not found or forbidden")
  return uploadFiles(client, "property-media", ctx.orgId, propertyId, files)
}
```

Similar para `delete-property-media.use-case.ts`.

## Pasos

- [ ] **1.** Modificar `lib/supabase/storage.ts` para aceptar `client: SupabaseClient` como primer param.
- [ ] **2.** Actualizar call sites en Server Actions:
  - `features/properties/presentation/storage-actions.ts`
  - Cualquier otro consumer de `uploadFile`/`deleteFile`.
- [ ] **3.** Actualizar use cases que llaman storage.
- [ ] **4.** Build check.
- [ ] **5.** Test manual upload avatar:
  - Sign-in como user A.
  - Upload avatar.
  - Verificar que el upload usa JWT del user (ver header Authorization en network tab).
  - Verificar objeto creado en `storage.objects` con `owner = user A's id` (no service_role).
- [ ] **6.** Test RLS negative: user A intenta upload a org B path manipulando FormData → debe fallar con RLS error.
- [ ] **7.** Commit.

## Checklist

- [ ] `uploadFile` acepta client parameter
- [ ] Server Actions pasan client correcto
- [ ] Use cases adaptados
- [ ] Avatar upload funciona end-to-end
- [ ] Path manipulation manual falla (RLS activo)

## Rollback

Revertir commit. El service_role bypass vuelve a ser el default.

## Notas

- **Importante:** este cambio depende 100% de que el cliente auth tenga session válida con JWT. Si el cookie expira o no hay auth, upload falla con "new row violates row-level security policy" (correcto, es lo que queremos).
- El service_role queda para:
  - Admin API calls (inviteUserByEmail — Fase 06)
  - Inngest background jobs (futuro Capa 3)
  - Seed scripts (Fase 11)
  - NO para user flows de storage
