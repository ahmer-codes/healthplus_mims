import type { EntityId, Timestamp } from './common'

export type LocationType =
  | 'pharmacy'
  | 'emergency'
  | 'opd'
  | 'ward'
  | 'icu'
  | 'store'
  | 'other'

export interface HospitalLocation {
  id: EntityId
  name: string
  code: string
  type: LocationType
  isActive: boolean
  sortOrder: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface CreateLocationInput {
  name: string
  code: string
  type: LocationType
  isActive?: boolean
  sortOrder?: number
}
