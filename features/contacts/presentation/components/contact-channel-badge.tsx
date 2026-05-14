import { MessageCircle, Phone, Mail } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { PREFERRED_CHANNEL_LABELS } from "@/lib/constants/contact"
import type { ContactPreferredChannel } from "@/features/contacts/domain/contact.entity"

const CHANNEL_ICONS: Record<
  ContactPreferredChannel,
  React.ComponentType<{ className?: string }>
> = {
  whatsapp: MessageCircle,
  phone: Phone,
  email: Mail,
}

interface ContactChannelBadgeProps {
  channel: ContactPreferredChannel
}

export function ContactChannelBadge({ channel }: ContactChannelBadgeProps) {
  const Icon = CHANNEL_ICONS[channel]
  return (
    <Badge variant="secondary" className="gap-1">
      <Icon className="size-3" />
      {PREFERRED_CHANNEL_LABELS[channel]}
    </Badge>
  )
}
