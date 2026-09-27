import type { DateString, DemandPriority, DemandStatus, EntityId, Timestamp } from './common'

export interface MedicineDemand {
  id: EntityId
  medicineId: EntityId
  requestedQuantity: number
  requestingDepartment: string
  requestedBy: string
  priority: DemandPriority
  status: DemandStatus
  /** Calendar date of the request (yyyy-MM-dd) */
  requestDate: DateString
  notes?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface CreateDemandInput {
  medicineId: EntityId
  requestedQuantity: number
  requestingDepartment: string
  requestedBy: string
  priority?: DemandPriority
  requestDate?: DateString
  notes?: string
}

/** Editable fields for pending demands only */
export interface UpdateDemandInput {
  medicineId: EntityId
  requestedQuantity: number
  requestingDepartment: string
  requestedBy: string
  priority: DemandPriority
  requestDate: DateString
  notes?: string
}

export interface UpdateDemandStatusInput {
  status: DemandStatus
}

export interface DemandFilter {
  query?: string
  status?: DemandStatus | 'all'
  priority?: DemandPriority | 'all'
  department?: string
  medicineId?: string
}
