"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { MessageSquare, Home, MessageCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { LeadChatDialog } from "@/components/contacts/lead-chat-dialog"
import { getLeadColor } from "@/lib/utils/lead-colors"
import { formatRelativeTime } from "@/lib/utils/relative-time"
import { BOT_ACTIVITY_LABELS, BOT_ACTIVITY_COLORS } from "@/lib/constants/bot"
import { AGENT_CONFIG } from "@/lib/constants/agent"
import type { BotActivity, BotMessage } from "@/lib/types/bot"

interface BotLeadsViewProps {
  activities: BotActivity[]
  messages: BotMessage[]
}

interface LeadSummary {
  leadId: string
  leadName: string
  lastActivity: BotActivity
  messageCount: number
  propertiesSent: number
}

export function BotLeadsView({ activities, messages }: BotLeadsViewProps) {
  const [chatLead, setChatLead] = useState<LeadSummary | null>(null)

  const leads = useMemo(() => {
    const map = new Map<string, LeadSummary>()

    for (const a of activities) {
      const existing = map.get(a.leadId)

      if (!existing) {
        map.set(a.leadId, {
          leadId: a.leadId,
          leadName: a.leadName,
          lastActivity: a,
          messageCount: (a.type === "message_sent" || a.type === "message_received") ? 1 : 0,
          propertiesSent: a.type === "property_sent" ? 1 : 0,
        })
      } else {
        if (a.timestamp > existing.lastActivity.timestamp) {
          existing.lastActivity = a
        }
        if (a.type === "message_sent" || a.type === "message_received") existing.messageCount++
        if (a.type === "property_sent") existing.propertiesSent++
      }
    }

    return [...map.values()].sort(
      (a, b) => b.lastActivity.timestamp.localeCompare(a.lastActivity.timestamp)
    )
  }, [activities])

  const chatMessages = useMemo(() => {
    if (!chatLead) return []
    return messages
      .filter((m) => m.leadId === chatLead.leadId)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  }, [messages, chatLead])

  if (leads.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No hay leads activos con el bot.</p>
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {leads.map((lead) => {
          const color = getLeadColor(lead.leadId)

          return (
            <Card
              key={lead.leadId}
              className="gap-0 py-0 cursor-pointer transition-colors hover:bg-accent/50"
              onClick={() => setChatLead(lead)}
            >
              <CardContent className="p-3!">
                <div className="space-y-2.5">
                  {/* Header — name links to lead detail */}
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/dashboard/leads/${lead.leadId}`}
                      className="flex items-center gap-1.5 min-w-0 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-sm font-semibold truncate">{lead.leadName}</span>
                    </Link>
                  </div>

                  {/* Last activity */}
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Badge className={`text-[9px] px-1 py-0 border-0 shrink-0 ${BOT_ACTIVITY_COLORS[lead.lastActivity.type]}`}>
                        {BOT_ACTIVITY_LABELS[lead.lastActivity.type]}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{formatRelativeTime(lead.lastActivity.timestamp)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{lead.lastActivity.description}</p>
                  </div>

                  {/* Counters */}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="size-3" />
                      {lead.messageCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Home className="size-3" />
                      {lead.propertiesSent}
                    </span>

                    {/* WhatsApp */}
                    <a
                      href={`https://wa.me/${lead.leadId}?text=${encodeURIComponent(AGENT_CONFIG.whatsappMessage("", ""))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="ghost" size="icon" className="size-6 text-green-600 hover:text-green-700 hover:bg-green-50">
                        <MessageCircle className="size-3.5" />
                      </Button>
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Chat dialog — same component used in lead detail */}
      {chatLead && (
        <LeadChatDialog
          open={!!chatLead}
          onOpenChange={(open) => { if (!open) setChatLead(null) }}
          messages={chatMessages}
          leadName={chatLead.leadName}
          leadPhone={chatLead.leadId}
        />
      )}
    </>
  )
}
