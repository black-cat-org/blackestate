export interface SessionContext {
  userId: string
  orgId: string
  role: "owner" | "admin" | "agent"
  isSuperAdmin?: boolean
}
