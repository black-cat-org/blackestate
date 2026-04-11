import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { DashboardHeader } from "@/components/dashboard-header"
import { SettingsLayout } from "@/components/settings/settings-layout"
import {
  getBusinessSettings,
  getNotificationPreferences,
  getIntegrationSettings,
  getPlanInfo,
} from "@/lib/data/settings"
import { getBotConfig } from "@/lib/data/bot"

export default async function SettingsPage() {
  const [business, notifications, integrations, plan, botConfig] = await Promise.all([
    getBusinessSettings(),
    getNotificationPreferences(),
    getIntegrationSettings(),
    getPlanInfo(),
    getBotConfig(),
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
        />
      </div>
    </>
  )
}
