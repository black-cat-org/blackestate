import "server-only"
import { Link, Text } from "@react-email/components"
import {
  BrandLayout,
  EmailButton,
  Footer,
  InfoSection,
} from "@/lib/email"
import { formatFriendlyDate } from "@/lib/utils/relative-time"

/**
 * Email sent to a user who has been invited to join an organization.
 *
 * Spanish neutral copy (using "tú"), formatted dates `dd/mm/yyyy` per
 * `es-BO` — the product's primary locale. Role names are localised
 * here rather than imported from a UI constants module to keep the
 * email feature self-contained: the email template runs server-side
 * only and should not pull on client-side label dictionaries.
 *
 * Composition:
 *   - `BrandLayout` with a custom `Footer` slot so the security
 *     disclaimer ("ignore this message if you do not recognise the
 *     invitation") sits alongside the standard copyright line. The
 *     disclaimer is per-Stripe/GitHub/Linear convention and prevents
 *     a confused recipient from inadvertently joining an org they
 *     do not belong to.
 *   - `InfoSection` with the explanation paragraph.
 *   - `EmailButton` CTA + a fallback plain `<Link>` underneath for
 *     clients that fail to render the table-cell button (rare but
 *     does happen on minimalist text-mode clients).
 *
 * Subject is exported separately (`invitationEmailSubject`) so the
 * action layer can pass it to `sendEmail` without re-deriving the
 * inviter/org strings.
 */

export interface InvitationEmailProps {
  inviterName: string
  organizationName: string
  role: "admin" | "agent"
  acceptUrl: string
  /** ISO timestamp of the invitation expiry; rendered in es-BO format. */
  expiresAtIso: string
}

const ROLE_LABELS: Record<InvitationEmailProps["role"], string> = {
  admin: "Administrador",
  agent: "Agente",
}

export function invitationEmailSubject(params: {
  inviterName: string
  organizationName: string
}): string {
  return `${params.inviterName} te invitó a unirte a ${params.organizationName} en Black Estate`
}

export function InvitationEmail({
  inviterName,
  organizationName,
  role,
  acceptUrl,
  expiresAtIso,
}: InvitationEmailProps) {
  // Fallback to the raw role string if a new value is ever added to
  // `InvitableRole` without a label here. Prevents the template from
  // rendering the literal string "undefined" to a user.
  const roleLabel = ROLE_LABELS[role] ?? role
  // Friendly relative date — "hoy", "mañana", "el viernes", "el 19 de
  // mayo" — so the copy reads naturally regardless of how soon the
  // invitation expires. `formatFriendlyDate` already injects the
  // Spanish article "el" where needed, so the surrounding sentence
  // never has to template it.
  //
  // Guard against an invalid ISO string crashing dayjs internals. The
  // mapper always produces a valid ISO via `.toISOString()`, but
  // hardening the boundary keeps email rendering robust to any future
  // mapper drift.
  const friendlyExpiry = Number.isNaN(new Date(expiresAtIso).getTime())
    ? expiresAtIso
    : formatFriendlyDate(expiresAtIso)
  const preview = `${inviterName} te invitó a ${organizationName} como ${roleLabel}`

  return (
    <BrandLayout
      preview={preview}
      footer={
        <Footer
          extra={
            <>
              Si no reconoces esta invitación o prefieres no aceptarla, ignora este mensaje.
              No se realizará ninguna acción y la invitación expirará automáticamente.
            </>
          }
        />
      }
    >
      <InfoSection title="Te invitaron a un equipo">
        <Text style={{ margin: "0 0 12px 0" }}>
          Hola,
        </Text>
        <Text style={{ margin: "0 0 12px 0" }}>
          <strong>{inviterName}</strong> te invitó a unirte a{" "}
          <strong>{organizationName}</strong> en Black Estate como{" "}
          <strong>{roleLabel}</strong>.
        </Text>
        <Text style={{ margin: "0 0 16px 0" }}>
          Revisa los detalles y decide si quieres unirte. La invitación vence {friendlyExpiry}.
        </Text>
      </InfoSection>

      <div style={{ margin: "8px 0 24px 0" }}>
        <EmailButton href={acceptUrl}>Ver invitación</EmailButton>
      </div>

      <InfoSection>
        <Text style={{ margin: "0 0 6px 0", fontSize: "14px" }}>
          ¿El botón no funciona? Copia y pega este enlace en tu navegador:
        </Text>
        <Link
          href={acceptUrl}
          style={{
            color: "#18181b",
            fontSize: "13px",
            wordBreak: "break-all",
          }}
        >
          {acceptUrl}
        </Link>
      </InfoSection>
    </BrandLayout>
  )
}
