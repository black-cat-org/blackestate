import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { DashboardHeader } from "@/components/dashboard-header"
import { SettingsLayout } from "@/features/settings/presentation/components/settings-layout"
import {
  getBusinessSettingsAction,
  getNotificationPreferencesAction,
  getIntegrationSettingsAction,
  getPlanInfoAction,
} from "@/features/settings/presentation/actions"
import { getBotConfigAction } from "@/features/bot/presentation/actions"
import { listMembersAction, getSeatInfoAction } from "@/features/shared/presentation/member-actions"
import {
  listInvitationsAction,
  listArchivedInvitationsAction,
} from "@/features/shared/presentation/invitation-actions"
import { getSessionContext } from "@/features/shared/infrastructure/session-context"

export default async function SettingsPage() {
  const [
    business,
    notifications,
    integrations,
    plan,
    botConfig,
    members,
    invitations,
    archivedInvitations,
    seatInfo,
    ctx,
  ] = await Promise.all([
    getBusinessSettingsAction(),
    getNotificationPreferencesAction(),
    getIntegrationSettingsAction(),
    getPlanInfoAction(),
    getBotConfigAction(),
    listMembersAction(),
    listInvitationsAction(),
    listArchivedInvitationsAction(),
    getSeatInfoAction(),
    getSessionContext(),
  ])

  return (
    <>
      <DashboardHeader>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Configuración</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </DashboardHeader>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <SettingsLayout
          business={business}
          notifications={notifications}
          integrations={integrations}
          plan={plan}
          botConfig={botConfig}
          team={{
            members,
            invitations,
            archivedInvitations,
            seatInfo,
            userRole: ctx.role,
          }}
        />
      </div>
    </>
  )
}
