import type { EntityId, Timestamp, UserRole } from './common'

export interface UserProfile {
  id: EntityId
  username: string
  displayName: string
  role: UserRole
  email: string
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
