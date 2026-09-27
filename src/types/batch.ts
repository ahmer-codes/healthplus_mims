import type { BatchStatus, DateString, EntityId, Timestamp } from './common'

/**
 * A physical received lot of a medicine variant at a hospital location.
 */
export interface MedicineBatch {
  id: EntityId
  medicineId: EntityId
  purchaseOrderNo: string
  receivingDate: DateString
  manufacturerName: string
  batchNo: string
  manufacturingDate: DateString
  expiryDate: DateString
  quantityReceived: number
  remainingQuantity: number
  unitPrice: number
  totalPrice: number
  status: BatchStatus
  locationId: EntityId
  createdAt: Timestamp
  updatedAt: Timestamp
  /**
   * Soft-delete marker. Historical allocation/transfer refs stay resolvable.
   * Soft-deleted batches are excluded from operational selectors.
   */
  deletedAt?: Timestamp
}

export interface CreateBatchInput {
  medicineId: EntityId
  purchaseOrderNo: string
  receivingDate: DateString
  manufacturerName: string
  batchNo: string
  manufacturingDate: DateString
  expiryDate: DateString
  quantityReceived: number
  remainingQuantity?: number
  unitPrice: number
  totalPrice?: number
  status?: BatchStatus
  locationId: EntityId
}

export interface UpdateBatchInput {
  manufacturerName?: string
  batchNo?: string
  manufacturingDate?: DateString
  expiryDate?: DateString
  remainingQuantity?: number
  unitPrice?: number
  totalPrice?: number
  status?: BatchStatus
  locationId?: EntityId
  deletedAt?: Timestamp | null
}

export type BatchExpiryFilter = 'all' | 'ok' | 'warning' | 'critical' | 'expired' | 'expiring_soon'

export interface BatchFilter {
  medicineId?: EntityId
  locationId?: EntityId
  status?: BatchStatus | BatchStatus[]
  expiringBefore?: DateString
  query?: string
  manufacturer?: string
  batchNo?: string
  /** Include soft-deleted rows (management archive). Default false. */
  includeDeleted?: boolean
}

export interface BatchBoardSummary {
  total: number
  available: number
  hold: number
  expiringSoon: number
  expired: number
  depleted: number
}
