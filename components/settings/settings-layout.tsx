"use client"

import { useState } from "react"
import { SETTINGS_SECTIONS } from "@/lib/constants/settings"
import { ProfileSection } from "@/components/settings/sections/profile-section"
import { BusinessSection } from "@/components/settings/sections/business-section"
import { NotificationsSection } from "@/components/settings/sections/notifications-section"
import { IntegrationsSection } from "@/components/settings/sections/integrations-section"
import { MarketingSection } from "@/components/settings/sections/marketing-section"
import { PlanSection } from "@/components/settings/sections/plan-section"
import { BotConfigPanel } from "@/components/bot/bot-config-panel"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import type { SettingsSection } from "@/lib/types/settings"
import type {
  AgentProfile,
  BusinessSettings,
  NotificationPreferences,
  IntegrationSettings,
  MarketingSettings,
  PlanInfo,
} from "@/lib/types/settings"
import type { BotConfig } from "@/lib/types/bot"

interface SettingsLayoutProps {
  profile: AgentProfile
  business: BusinessSettings
  notifications: NotificationPreferences
  integrations: IntegrationSettings
  marketing: MarketingSettings
  plan: PlanInfo
  botConfig: BotConfig
}

export function SettingsLayout({
  profile,
  business,
  notifications,
  integrations,
  marketing,
  plan,
  botConfig,
}: SettingsLayoutProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile")

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      {/* Mobile: horizontal scroll tabs */}
      <div className="md:hidden">
        <ScrollArea className="w-full">
          <div className="flex gap-1 pb-2">
            {SETTINGS_SECTIONS.map((section) => {
              const Icon = section.icon
              return (
                <button
                  key={section.key}
                  onClick={() => setActiveSection(section.key)}
                  className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                    activeSection === section.key
                      ? "bg-muted font-medium"
                      : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className="size-4" />
                  {section.label}
                </button>
              )
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Desktop: vertical sidebar */}
      <nav className="hidden w-64 shrink-0 md:block">
        <div className="space-y-1">
          {SETTINGS_SECTIONS.map((section) => {
            const Icon = section.icon
            return (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key)}
                className={`flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
                  activeSection === section.key
                    ? "bg-muted font-medium"
                    : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className="mt-0.5 size-4 shrink-0" />
                <div>
                  <div>{section.label}</div>
                  <div className="text-xs font-normal text-muted-foreground">{section.description}</div>
                </div>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {activeSection === "profile" && <ProfileSection data={profile} />}
        {activeSection === "business" && <BusinessSection data={business} />}
        {activeSection === "notifications" && <NotificationsSection data={notifications} />}
        {activeSection === "integrations" && <IntegrationsSection data={integrations} />}
        {activeSection === "marketing" && <MarketingSection data={marketing} />}
        {activeSection === "bot" && <BotConfigPanel config={botConfig} />}
        {activeSection === "plan" && <PlanSection data={plan} />}
      </div>
    </div>
  )
}
