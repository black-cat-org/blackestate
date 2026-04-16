# Sub-plan 13 — Mobile Skeleton (iOS + Android)

> **Depends on:** migración web completa (sub-plans 01-12)
> **Unlocks:** mobile stream futuro

## Goal

Documentar decisiones preliminares + skeleton de implementación para mobile apps (iOS / Android) que usarán Supabase Auth. **NO IMPLEMENTAR** en esta fase — es el plan que se seguirá cuando arranque el stream mobile.

## Decisiones preliminares

### 1. Framework

**Expo con React Native.**

Razones:
- Compartir lógica con web (Clean Architecture, feature modules, use cases pueden portarse)
- React Native tiene el mejor soporte de Supabase SDK
- Expo simplifica OAuth (Google/Apple Sign-In) con `expo-auth-session`
- Tooling rápido (EAS Build, EAS Update)

Alternativas descartadas:
- Native iOS (Swift) + Android (Kotlin) separados → doble esfuerzo para un MVP
- Flutter → lejos del stack TS del web
- Capacitor → peor rendimiento, no nativo

### 2. Supabase SDK

- `@supabase/supabase-js` v2.x (mismo que web)
- Storage de session: `expo-secure-store` (encrypted, cross-platform)
- SDK config:

```ts
// mobile/lib/supabase.ts
import "react-native-url-polyfill/auto"
import { createClient } from "@supabase/supabase-js"
import * as SecureStore from "expo-secure-store"

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
)
```

### 3. Auth providers

**Email/password:**
- Directo con `supabase.auth.signInWithPassword()` y `supabase.auth.signUp()`.
- Email verification: usar deep link `blackestate://auth/verify` → handler que extrae token.

**Google OAuth:**
- `expo-auth-session` + `@supabase/supabase-js` + `supabase.auth.signInWithIdToken()`
- iOS: configure Google OAuth con iOS client ID de Google Cloud.
- Android: configure con SHA-1 fingerprint.

**Apple OAuth (iOS, obligatorio en App Store si hay Google):**
- `expo-apple-authentication` + `supabase.auth.signInWithIdToken({ provider: 'apple', ... })`
- Configure Apple App ID + Sign in with Apple capability.

### 4. Deep linking

URL scheme: `blackestate://`

Routes:
- `blackestate://auth/callback` — OAuth callback
- `blackestate://auth/verify?token=...` — email verification
- `blackestate://accept-invite?inv=...` — invitation acceptance
- `blackestate://reset-password?token=...` — password reset

Expo config (`app.json`):
```json
{
  "expo": {
    "scheme": "blackestate",
    "ios": { "bundleIdentifier": "com.blackestate.app" },
    "android": { "package": "com.blackestate.app" }
  }
}
```

### 5. Session lifecycle

- SDK refresca JWT automáticamente (default 1h expiry).
- Custom claims (active_org_id, org_role) vienen del mismo hook de Fase 03. Mobile ve los mismos claims.
- Switching de org: misma API via Server Action call desde mobile (HTTP a Next.js API).

### 6. RLS consistency

- Mismo JWT que web → mismas policies aplican.
- Storage uploads directo a Supabase desde mobile: `supabase.storage.from('property-media').upload(path, blob)`. RLS valida.
- **No proxy por Vercel:** mobile → Supabase directo para storage. Bandwidth eficiente.

### 7. Backend shared

- Next.js API routes (o Server Actions expuestas como POST endpoints) para lógica custom.
- Mobile envía `Authorization: Bearer <supabase-jwt>`.
- Next.js API routes usan `getSupabaseServerClient()` equivalente — pero con `createClient({ global: { headers: { Authorization: ... } } })` en vez de cookies.

Helper nuevo (futuro):
```ts
// lib/supabase/bearer.ts (para mobile API calls)
export function getSupabaseForBearer(bearerToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${bearerToken}` } },
    },
  )
}
```

Y en API routes:
```ts
// app/api/properties/route.ts
import { getSupabaseForBearer } from "@/lib/supabase/bearer"

export async function POST(req: NextRequest) {
  const bearer = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!bearer) return new Response("Unauthorized", { status: 401 })

  const supabase = getSupabaseForBearer(bearer)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  // ... usar supabase para queries (RLS aplica)
}
```

### 8. Feature parity target inicial

Pantallas mobile MVP:
- Sign-up, sign-in, forgot password
- Dashboard (overview)
- Properties list + detalle
- Leads list + detalle
- Appointments calendar
- Upload foto (desde camera / galería)
- Profile

Diferido post-MVP mobile:
- Org switching (si user tiene múltiples orgs; menos común en mobile)
- Invitations accept via deep link
- Bot config
- Analytics

### 9. Navegación

- `@react-navigation/native` + stack navigator.
- Auth stack (sign-in, sign-up, forgot).
- Authenticated stack (dashboard, properties, leads, appointments, profile).
- AuthGuard: chequea `supabase.auth.getSession()` → redirige a auth stack si null.

### 10. Monorepo vs separado

**Decisión:** monorepo con Turborepo.

Estructura propuesta:
```
apps/
  web/              # Next.js actual (move content here)
  mobile/           # Expo app
packages/
  shared/
    entities/       # Tipos domain compartidos (Property, Lead, etc.)
    use-cases/      # Lógica pura portable
```

**Consideración:** mover web a `apps/web/` es disrupción. Alternativa: mobile en repo separado pero copia-pega tipos. Mejor monorepo desde día 1 si mobile va a arrancar.

Evaluar al momento de empezar mobile stream — decisión puede posponerse hasta ahí.

### 11. Desarrollo local

- Dev build: `npx expo start`
- iOS simulator: macOS + Xcode requerido
- Android emulator: Android Studio requerido
- Físico: Expo Go app (limitado: sin OAuth nativo) o Dev Client (requiere build).

### 12. CI/CD

- EAS Build para release builds
- EAS Update para OTA updates sin App Store review
- Fastlane (opcional) para submission

### 13. Testing

- Jest + React Native Testing Library para unit
- Maestro (YAML scripts) o Detox para E2E
- Supabase test instance (project separado) para dev/staging

## Pasos

**No se ejecutan ahora.** Cuando arranque el mobile stream:

- [ ] Decidir monorepo vs separado
- [ ] Crear `apps/mobile/` con `npx create-expo-app`
- [ ] Instalar `@supabase/supabase-js`, `expo-secure-store`, `expo-auth-session`, `expo-apple-authentication`, `react-native-url-polyfill`
- [ ] Configurar env vars `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- [ ] Implementar `lib/supabase.ts` (mobile)
- [ ] Implementar Auth screens (sign-in, sign-up, forgot-password)
- [ ] Implementar Navigation + AuthGuard
- [ ] Implementar Properties list + detail (consume Supabase directo + API routes cuando haga falta lógica custom)
- [ ] Implementar Upload foto desde camera
- [ ] Agregar Google OAuth + Apple OAuth
- [ ] Deep linking para invitations + email verify
- [ ] EAS Build + Update setup
- [ ] Submit a App Store + Play Store

## Dependencias web requeridas para mobile

Al arrancar mobile:

1. **Bearer helper (`lib/supabase/bearer.ts`):** para API routes que acepten Bearer JWT.
2. **CORS:** configurar Next.js API routes para aceptar requests desde mobile (diferente origin).
3. **Deep link config:** Expo universal links + Apple/Google associated domains si se quiere usar universal links en vez de solo custom scheme.

## Checklist (placeholder)

- [ ] Stream mobile decidido (timeline)
- [ ] Monorepo vs separado decidido
- [ ] Bearer helper implementado en web (`lib/supabase/bearer.ts`)
- [ ] Apple Developer + Google Play Console cuentas (costos: $99/year + $25 one-time)
- [ ] Resto del checklist expandido cuando se active el stream

## Notas

- Este documento es **vivo** — actualizar decisiones a medida que se piense más el stream mobile.
- El costo del mobile es dominado por App Store / Play Store fees + EAS Build (opcional pago) + testing devices.
- Supabase Auth en mobile es **el gran ganador** de esta migración — todo funciona out-of-the-box con el mismo JWT hook que web.
- RLS policies se validan una sola vez, aplican a todos los clientes. Mobile no requiere lógica adicional de RLS — solo usar el SDK correctamente.
