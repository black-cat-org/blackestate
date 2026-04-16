# Sub-plan 03 — Custom Access Token Hook (JWT Claims)

> **Depends on:** 01, 02
> **Unlocks:** 04, 05, 07, 09

## Goal

Crear la Postgres function `public.custom_access_token_hook(event jsonb) returns jsonb` que se ejecuta CADA VEZ que Supabase Auth emite un nuevo JWT (sign-in, sign-up, refresh). El hook enriquece los claims del JWT con:

- `active_org_id` — UUID de la org activa del user (de `public.user_active_org`)
- `org_role` — role del user en esa org (`owner` / `admin` / `agent`)
- `is_super_admin` — boolean si user está en `public.platform_admins`
- `user_name` — de `auth.users.raw_user_meta_data ->> 'full_name'`

Los RLS policies (sub-plan 07) leen estos claims vía `auth.jwt() ->> 'active_org_id'`.

Habilitar el hook en Dashboard → Authentication → Hooks.

## Archivos

### Crear

- `drizzle/sql/003_custom_access_token_hook.sql` — function + grants, ejecutada via Supabase MCP `execute_sql` o CLI.
- `drizzle/sql/README.md` (si no existe) — documenta que este directorio tiene SQL manual no gestionado por Drizzle Kit.

### No se crean TS files en esta fase.

## Lógica del hook

Pseudocódigo:

```
Input: event { user_id, claims, authentication_method, ... }

1. Extract user_id from event.
2. Query public.user_active_org to get current active_org_id for this user.
   - If not found: return event unchanged (user sin org aún; sub-plan 05 trigger la crea post sign-up, pero entre sign-up y first refresh puede estar vacío).
3. If active_org_id found:
   - Query public.member to get role for (user_id, active_org_id).
   - If row exists: claims.active_org_id = <uuid>; claims.org_role = <role>.
   - If row doesn't exist (inconsistent state): claims.active_org_id = null (defensive).
4. Query public.platform_admins → is_super_admin boolean.
5. Merge full_name from auth.users.raw_user_meta_data.
6. Return event with modified claims.
```

## SQL completo

### `drizzle/sql/003_custom_access_token_hook.sql`

```sql
-- Custom Access Token Hook — inject org_id, role, super_admin into JWT
-- Reference: https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  active_org uuid;
  member_role text;
  is_super_admin_flag boolean;
  user_display_name text;
  target_user_id uuid;
begin
  -- Extract user id
  target_user_id := (event->>'user_id')::uuid;

  -- Start from existing claims
  claims := event->'claims';

  -- 1. Active org
  select uao.organization_id into active_org
  from public.user_active_org uao
  where uao.user_id = target_user_id
  limit 1;

  if active_org is not null then
    claims := jsonb_set(claims, '{active_org_id}', to_jsonb(active_org::text));

    -- 2. Role in that org
    select m.role::text into member_role
    from public.member m
    where m.user_id = target_user_id
      and m.organization_id = active_org
      and m.deleted_at is null
    limit 1;

    if member_role is not null then
      claims := jsonb_set(claims, '{org_role}', to_jsonb(member_role));
    else
      -- Inconsistent state: active_org exists but user not a member. Clear it.
      claims := jsonb_set(claims, '{active_org_id}', 'null');
      claims := jsonb_set(claims, '{org_role}', 'null');
    end if;
  else
    -- No active org yet (new user, pre-trigger or post-sign-up race)
    claims := jsonb_set(claims, '{active_org_id}', 'null');
    claims := jsonb_set(claims, '{org_role}', 'null');
  end if;

  -- 3. Super admin
  select exists(
    select 1 from public.platform_admins pa
    where pa.user_id = target_user_id
  ) into is_super_admin_flag;

  claims := jsonb_set(
    claims,
    '{is_super_admin}',
    to_jsonb(coalesce(is_super_admin_flag, false))
  );

  -- 4. Display name
  select coalesce(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    u.email
  )
  into user_display_name
  from auth.users u
  where u.id = target_user_id;

  if user_display_name is not null then
    claims := jsonb_set(claims, '{user_name}', to_jsonb(user_display_name));
  end if;

  -- Merge modified claims into event
  event := jsonb_set(event, '{claims}', claims);

  return event;
end;
$$;

-- Grants required by Supabase Auth to execute the hook
grant usage on schema public to supabase_auth_admin;

grant execute
  on function public.custom_access_token_hook
  to supabase_auth_admin;

-- Auth admin needs to read from the tables used
grant select on public.user_active_org to supabase_auth_admin;
grant select on public.member to supabase_auth_admin;
grant select on public.platform_admins to supabase_auth_admin;

-- Revoke public access to the hook (security)
revoke execute
  on function public.custom_access_token_hook
  from authenticated, anon, public;

-- Restrict table access to auth admin (RLS is still enforced for other roles in sub-plan 07)
-- Auth admin bypass RLS by role attribute, but we keep least-privilege grants.
```

## Enable hook en Dashboard

Tras ejecutar el SQL:

Dashboard → Authentication → Hooks (Beta)

- **Hook type:** Before User Created — NO
- **Hook type:** Custom Access Token — **YES**
- **Schema:** `public`
- **Function:** `custom_access_token_hook`
- **Enabled:** true
- **Save**

## Testing del hook

Antes de usarlo en producción, verificar que funciona:

### Test 1: user sin org (inicio de vida)

1. Crear user via dashboard (no corre trigger de Fase 05 aún):
   ```sql
   -- Dashboard → Authentication → Users → Add user
   -- email: hooktest@blackestate.test
   ```

2. En SQL editor:
   ```sql
   -- Simular event como lo pasa Supabase Auth
   select public.custom_access_token_hook('{
     "user_id": "<user-id-aquí>",
     "claims": {
       "sub": "<user-id-aquí>",
       "aud": "authenticated",
       "role": "authenticated"
     }
   }'::jsonb);
   ```

   **Expected:**
   ```json
   {
     "user_id": "...",
     "claims": {
       "sub": "...",
       "aud": "authenticated",
       "role": "authenticated",
       "active_org_id": null,
       "org_role": null,
       "is_super_admin": false,
       "user_name": "hooktest@blackestate.test"
     }
   }
   ```

### Test 2: user con org + role

1. Insertar org + member + user_active_org manualmente:
   ```sql
   INSERT INTO public.organization (id, name, slug, plan)
   VALUES ('11111111-1111-1111-1111-111111111111', 'Test Org', 'test-org', 'free');

   INSERT INTO public.member (user_id, organization_id, role)
   VALUES ('<user-id>', '11111111-1111-1111-1111-111111111111', 'owner');

   INSERT INTO public.user_active_org (user_id, organization_id)
   VALUES ('<user-id>', '11111111-1111-1111-1111-111111111111');
   ```

2. Re-ejecutar hook:
   ```sql
   select public.custom_access_token_hook('{
     "user_id": "<user-id>",
     "claims": {"sub": "<user-id>", "aud": "authenticated"}
   }'::jsonb);
   ```

   **Expected:**
   ```json
   {
     "claims": {
       "active_org_id": "11111111-1111-1111-1111-111111111111",
       "org_role": "owner",
       "is_super_admin": false,
       "user_name": "..."
     }
   }
   ```

### Test 3: super admin

1. Insertar en platform_admins:
   ```sql
   INSERT INTO public.platform_admins (user_id) VALUES ('<user-id>');
   ```

2. Re-ejecutar hook:
   ```json
   {
     "claims": {
       "is_super_admin": true,
       ...
     }
   }
   ```

### Test 4: end-to-end con sign-in real

1. Sign-in via dashboard o curl al endpoint /auth/v1/token.
2. Decode el `access_token` retornado (jwt.io o `jwt-decode`).
3. Verificar que el payload contiene `active_org_id`, `org_role`, `is_super_admin`, `user_name`.

## Pasos de ejecución

- [ ] **1. Crear directorio `drizzle/sql/` si no existe**

  ```bash
  mkdir -p drizzle/sql
  ```

- [ ] **2. Crear `drizzle/sql/README.md`** (si no existe):

  ```markdown
  # Manual SQL Migrations

  SQL ejecutado a mano via Supabase MCP `execute_sql` o `psql` CLI. No gestionado por Drizzle Kit.

  Orden de aplicación:
  - `003_custom_access_token_hook.sql` — JWT custom claims hook (sub-plan 03)
  - `004_authorize_function.sql` — RBAC function (sub-plan 04)
  - `005_org_creation_trigger.sql` — Auto-create org on signup (sub-plan 05)
  - `006_rls_policies_supabase_auth.sql` — Rewrite RLS for Supabase Auth (sub-plan 07)

  Aplicar con:
  ```bash
  psql "$DATABASE_URL" -f drizzle/sql/NNN_*.sql
  ```
  O via MCP execute_sql.
  ```

- [ ] **3. Crear `drizzle/sql/003_custom_access_token_hook.sql`** con el SQL de arriba.

- [ ] **4. Ejecutar el SQL via Supabase MCP `execute_sql`** (o CLI):

  ```bash
  # con psql
  psql "$DATABASE_URL" -f drizzle/sql/003_custom_access_token_hook.sql
  ```

  Vía MCP:
  ```
  execute_sql con el contenido del archivo
  ```

- [ ] **5. Verificar creación**

  ```sql
  SELECT proname, pronargs FROM pg_proc
  WHERE proname = 'custom_access_token_hook'
  AND pronamespace = 'public'::regnamespace;
  ```

  Debe retornar 1 fila.

- [ ] **6. Verificar grants**

  ```sql
  SELECT grantee, privilege_type
  FROM information_schema.routine_privileges
  WHERE routine_name = 'custom_access_token_hook';
  ```

  Debe incluir `supabase_auth_admin` con `EXECUTE`.

- [ ] **7. Tests 1-3 de arriba** (user sin org, user con org, super admin).

- [ ] **8. Enable hook en Dashboard Supabase**
  - Authentication → Hooks → Custom Access Token → Selection del function → enable.

- [ ] **9. Test 4 (end-to-end)**
  - Sign-in via dashboard con un user de prueba.
  - Decode JWT en jwt.io.
  - Verificar claims.

- [ ] **10. Commit**

  ```bash
  git add drizzle/sql/
  git commit -m "feat(auth-migration): phase 03 — custom access token hook

- SQL function public.custom_access_token_hook injects:
  - active_org_id (from public.user_active_org)
  - org_role (from public.member)
  - is_super_admin (from public.platform_admins)
  - user_name (from auth.users.raw_user_meta_data)
- Grants to supabase_auth_admin
- Enable in dashboard → Authentication → Hooks

Ref: docs/plans/2026-04-16-supabase-auth-migration/03-custom-claims-hook.md"
  ```

## Checklist de verificación

- [ ] SQL file existe en `drizzle/sql/003_custom_access_token_hook.sql`
- [ ] Function creada en DB (`pg_proc`)
- [ ] Grants a `supabase_auth_admin` aplicados
- [ ] Tests 1-3 dan outputs esperados
- [ ] Hook habilitado en Dashboard
- [ ] Test end-to-end (Test 4): JWT contiene los claims custom

## Rollback de esta fase

Dashboard → Authentication → Hooks → Custom Access Token → disable.

SQL:
```sql
DROP FUNCTION IF EXISTS public.custom_access_token_hook(jsonb);
```

## Notas

- **Performance:** el hook corre cada refresh (cada ~1h por user activo). Las 3 queries (user_active_org, member, platform_admins) son por PK/unique index, sub-ms. No optimizable prematuramente.
- **Consistencia:** si `user_active_org` apunta a un `org_id` donde el user ya no es member (edge case borrado orphan), el hook defensive-null-sea los claims. El usuario queda en estado "sin org activa" y la app debe detectarlo en UI.
- **Cache del JWT:** una vez emitido, el JWT no se actualiza hasta refresh. Si el user cambia de org activa, hay que forzar refresh manualmente vía `supabase.auth.refreshSession()` (sub-plan 05 lo documenta para `switchActiveOrg`).
- **Seguridad:** el hook corre con privilegios de `supabase_auth_admin` (rol bypass RLS). Por eso los grants de SELECT a las tablas son mínimos — solo las que necesita. Si a futuro se agregan lookups, actualizar los grants.
- **Testing en local:** Supabase local CLI soporta hooks via config.toml. Documentar si el flujo local se usa para dev.
