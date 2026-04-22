export interface TeamMember {
  id: string
  userId: string
  name?: string
  email: string
  avatarUrl?: string
  role: "owner" | "admin" | "agent"
  title?: string
  createdAt: string
}

export interface TeamSeatInfo {
  maxSeats: number
  currentMembers: number
}
