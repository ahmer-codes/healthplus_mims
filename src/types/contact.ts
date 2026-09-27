import type { EntityId, Timestamp } from './common'

export interface Contact {
  id: EntityId
  name: string
  designation: string
  department: string
  phone: string
  email: string
  notes?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface CreateContactInput {
  name: string
  designation: string
  department: string
  phone: string
  email: string
  notes?: string
}

export type UpdateContactInput = CreateContactInput

export interface ContactFilter {
  query?: string
  department?: string
}
