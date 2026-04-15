"use client"

import { Bot, FileText, User, Check, CheckCheck } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import type { BotMessage, MessageStatus } from "@/lib/types/bot"

function MessageStatusIcon({ status }: { status: MessageStatus }) {
  if (status === "sent") return <Check className="size-3 text-muted-foreground" />
  if (status === "delivered") return <CheckCheck className="size-3 text-muted-foreground" />
  return <CheckCheck className="size-3 text-blue-500" />
}

function formatMessageTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface LeadChatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  messages: BotMessage[]
  leadName: string
  leadPhone?: string
}

export function LeadChatDialog({ open, onOpenChange, messages, leadName, leadPhone }: LeadChatDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="size-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <User className="size-4 text-green-700 dark:text-green-300" />
            </div>
            <div>
              <p className="text-sm font-semibold">{leadName}</p>
              <p className="text-xs text-muted-foreground font-normal">{leadPhone}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[450px] px-4 py-3">
          <div className="space-y-3">
            {messages.map((message) => {
              const isClient = message.sender === "client"
              return (
                <div
                  key={message.id}
                  className={`flex ${isClient ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      isClient
                        ? "bg-muted text-foreground"
                        : "bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100"
                    }`}
                  >
                    {message.contentType === "property_card" && (
                      <div className="mb-1.5 flex items-center gap-1.5 rounded bg-background/50 px-2 py-1.5 text-xs">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Propiedad
                        </Badge>
                        <span className="font-medium text-foreground">{message.text}</span>
                      </div>
                    )}
                    {message.contentType === "pdf" && (
                      <div className="mb-1.5 flex items-center gap-1.5">
                        <FileText className="size-4" />
                        <span className="text-xs font-medium">Documento adjunto</span>
                      </div>
                    )}
                    {(message.contentType === "text" || message.contentType === "property_card") && (
                      <p className="text-sm whitespace-pre-wrap">
                        {message.contentType === "text" ? message.text : null}
                      </p>
                    )}
                    <div className={`flex items-center gap-1 mt-1 ${isClient ? "justify-start" : "justify-end"}`}>
                      <span className="text-[10px] text-muted-foreground">
                        {formatMessageTime(message.timestamp)}
                      </span>
                      {!isClient && <MessageStatusIcon status={message.status} />}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>

        <div className="border-t px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Bot className="size-3.5" />
            <span>Esta conversación es gestionada automáticamente por el bot</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
