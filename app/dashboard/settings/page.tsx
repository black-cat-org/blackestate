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
  getAgentProfile,
  getBusinessSettings,
  getNotificationPreferences,
  getIntegrationSettings,
  getMarketingSettings,
  getPlanInfo,
} from "@/lib/data/settings"
import { getBotConfig } from "@/lib/data/bot"

export default async function SettingsPage() {
  const [profile, business, notifications, integrations, marketing, plan, botConfig] = await Promise.all([
    getAgentProfile(),
    getBusinessSettings(),
    getNotificationPreferences(),
    getIntegrationSettings(),
    getMarketingSettings(),
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
          profile={profile}
          business={business}
          notifications={notifications}
          integrations={integrations}
          marketing={marketing}
          plan={plan}
          botConfig={botConfig}
        />
      </div>
    </>
  )
}
