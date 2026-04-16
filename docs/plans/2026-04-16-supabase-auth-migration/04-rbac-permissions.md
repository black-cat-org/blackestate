# Sub-plan 04 — RBAC + authorize() function

> **Depends on:** 01, 03
> **Unlocks:** 07, 09

## Goal

Reemplazar `lib/auth-permissions.ts` (Better Auth AC) por RBAC nativo en DB:

- Tabla `public.role_permissions` (seed con las 20+ permisos actuales mapeados a roles owner/admin/agent).
- Postgres function `public.authorize(requested_permission app_permission_enum) returns boolean` — lee `auth.jwt() ->> 'org_role'` y chequea si ese role tiene el permiso pedido.
- RLS policies (sub-plan 07) que requieran chequeos finos de permisos pueden llamar `authorize('property.delete_all')` en vez de hardcode de role checks.

## Seed del role_permissions

Basado en `lib/auth-permissions.ts` actual:

```sql
-- drizzle/sql/004_authorize_function.sql
-- Depende de que exista public.role_permissions (creada en Fase 01)

-- Seed permissions per role
-- Owner: todo
INSERT INTO public.role_permissions (role, permission) VALUES
  ('owner', 'property.create'),
  ('owner', 'property.read_own'),
  ('owner', 'property.read_all'),
  ('owner', 'property.edit_own'),
  ('owner', 'property.edit_all'),
  ('owner', 'property.delete_own'),
  ('owner', 'property.delete_all'),
  ('owner', 'property.assign'),
  ('owner', 'lead.create'),
  ('owner', 'lead.read_own'),
  ('owner', 'lead.read_all'),
  ('owner', 'lead.edit_own'),
  ('owner', 'lead.edit_all'),
  ('owner', 'lead.delete_own'),
  ('owner', 'lead.delete_all'),
  ('owner', 'lead.assign'),
  ('owner', 'analytics.read_own'),
  ('owner', 'analytics.read_all'),
  ('owner', 'bot.read'),
  ('owner', 'bot.configure'),
  ('owner', 'settings.read'),
  ('owner', 'settings.manage'),
  ('owner', 'billing.manage');

-- Admin: todo menos billing
INSERT INTO public.role_permissions (role, permission) VALUES
  ('admin', 'property.create'),
  ('admin', 'property.read_own'),
  ('admin', 'property.read_all'),
  ('admin', 'property.edit_own'),
  ('admin', 'property.edit_all'),
  ('admin', 'property.delete_own'),
  ('admin', 'property.delete_all'),
  ('admin', 'property.assign'),
  ('admin', 'lead.create'),
  ('admin', 'lead.read_own'),
  ('admin', 'lead.read_all'),
  ('admin', 'lead.edit_own'),
  ('admin', 'lead.edit_all'),
  ('admin', 'lead.delete_own'),
  ('admin', 'lead.delete_all'),
  ('admin', 'lead.assign'),
  ('admin', 'analytics.read_own'),
  ('admin', 'analytics.read_all'),
  ('admin', 'bot.read'),
  ('admin', 'bot.configure'),
  ('admin', 'settings.read'),
  ('admin', 'settings.manage');

-- Agent: read_all permitido, edit/delete solo own, sin assign, sin configure/manage
INSERT INTO public.role_permissions (role, permission) VALUES
  ('agent', 'property.create'),
  ('agent', 'property.read_own'),
  ('agent', 'property.read_all'),
  ('agent', 'property.edit_own'),
  ('agent', 'property.delete_own'),
  ('agent', 'lead.create'),
  ('agent', 'lead.read_own'),
  ('agent', 'lead.read_all'),
  ('agent', 'lead.edit_own'),
  ('agent', 'analytics.read_own'),
  ('agent', 'bot.read'),
  ('agent', 'settings.read');

-- authorize() function
create or replace function public.authorize(requested_permission app_permission_enum)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  matched_count integer;
  user_role text;
begin
  user_role := (auth.jwt() ->> 'org_role');
  if user_role is null then
    return false;
  end if;

  select count(*)
  into matched_count
  from public.role_permissions rp
  where rp.role::text = user_role
    and rp.permission = requested_permission;

  return matched_count > 0;
end;
$$;

-- Allow authenticated users to call authorize()
grant execute on function public.authorize(app_permission_enum) to authenticated;
revoke execute on function public.authorize(app_permission_enum) from anon, public;
```

## Archivos

### Crear

- `drizzle/sql/004_authorize_function.sql` (contenido de arriba)

### Modificar

- Nada en TS esta fase. Eliminar `lib/auth-permissions.ts` queda para Fase 12.

## Pasos

- [ ] **1.** Crear `drizzle/sql/004_authorize_function.sql` con el SQL de arriba.
- [ ] **2.** Ejecutar via Supabase MCP `execute_sql` o `psql`.
- [ ] **3.** Verificar seed:
  ```sql
  SELECT role::text, COUNT(*) FROM public.role_permissions GROUP BY role;
  -- Expected: owner=23, admin=22, agent=12
  ```
- [ ] **4.** Verificar function:
  ```sql
  SELECT proname FROM pg_proc WHERE proname = 'authorize';
  ```
- [ ] **5.** Commit
  ```bash
  git add drizzle/sql/004_authorize_function.sql
  git commit -m "feat(auth-migration): phase 04 — RBAC permissions + authorize()"
  ```

## Checklist

- [ ] Seed de role_permissions completo (57 filas total)
- [ ] Function `authorize()` creada
- [ ] Grants configurados

## Rollback

```sql
DROP FUNCTION IF EXISTS public.authorize(app_permission_enum);
TRUNCATE public.role_permissions;
```

## Notas

- La función `authorize()` es equivalente semántico a los checks AC de Better Auth. En código TS actual no se usaban (las permissions estaban definidas pero no checked). RLS policies de sub-plan 07 pueden usarlo, pero también servirá a futuro para fine-grained server-side auth.
- Si a futuro se agregan permissions nuevas, basta INSERT en `role_permissions`. No requiere redeploy.
