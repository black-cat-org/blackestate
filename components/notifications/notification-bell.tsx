"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/data/bot"
import type { AgentNotification } from "@/lib/types/bot"

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Justo ahora"
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })
}

export function NotificationBell() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<AgentNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    async function load() {
      const [notifs, count] = await Promise.all([
        getNotifications(),
        getUnreadNotificationCount(),
      ])
      setNotifications(notifs.slice(0, 10))
      setUnreadCount(count)
    }
    load()
  }, [])

  async function handleClick(notification: AgentNotification) {
    if (!notification.read) {
      await markNotificationRead(notification.id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
    if (notification.leadId) {
      router.push(`/dashboard/contacts/${notification.leadId}`)
    }
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-8">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-sm font-semibold">Notificaciones</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-1.5 py-0.5 text-xs"
              onClick={handleMarkAllRead}
            >
              Marcar todas como leídas
            </Button>
          )}
        </div>
        <Separator />
        <ScrollArea className="h-[350px]">
          {notifications.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No hay notificaciones
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className="flex items-start gap-2.5 p-3 cursor-pointer transition-colors hover:bg-accent"
                onClick={() => handleClick(notification)}
              >
                {!notification.read && (
                  <div className="mt-1.5 size-2 shrink-0 rounded-full bg-blue-500" />
                )}
                <div className={`min-w-0 flex-1 ${notification.read ? "pl-[18px]" : ""}`}>
                  <p className="text-sm font-medium">{notification.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notification.description}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatRelativeTime(notification.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
        <Separator />
        <button
          className="w-full py-2.5 text-center text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={() => router.push("/dashboard/bot")}
        >
          Ver toda la actividad
        </button>
      </PopoverContent>
    </Popover>
  )
}
