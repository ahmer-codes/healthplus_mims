import type { BatchStatus, MedicineBatch } from '@/types'
import { deriveBatchStatus } from './expiry'

export interface StockLevelSummary {
  medicineId: string
  locationId?: string
  totalRemaining: number
  availableRemaining: number
  batchCount: number
  hasExpired: boolean
  hasHold: boolean
}

/** Sum remaining quantity for batches matching optional filters. */
export function sumRemainingQuantity(
  batches: Pick<MedicineBatch, 'remainingQuantity' | 'status' | 'medicineId' | 'locationId'>[],
  options?: {
    medicineId?: string
    locationId?: string
    statuses?: BatchStatus[]
  },
): number {
  return batches.reduce((total, batch) => {
    if (options?.medicineId && batch.medicineId !== options.medicineId) return total
    if (options?.locationId && batch.locationId !== options.locationId) return total
    if (options?.statuses && !options.statuses.includes(batch.status)) return total
    return total + batch.remainingQuantity
  }, 0)
}

export function summarizeStockLevels(
  batches: MedicineBatch[],
  medicineId: string,
  locationId?: string,
): StockLevelSummary {
  const scoped = batches.filter((batch) => {
    if (batch.medicineId !== medicineId) return false
    if (locationId && batch.locationId !== locationId) return false
    return true
  })

  return {
    medicineId,
    locationId,
    totalRemaining: sumRemainingQuantity(scoped),
    availableRemaining: sumRemainingQuantity(scoped, { statuses: ['available'] }),
    batchCount: scoped.length,
    hasExpired: scoped.some((b) => b.status === 'expired'),
    hasHold: scoped.some((b) => b.status === 'hold'),
  }
}

/** Refresh persisted status fields from quantity/expiry rules. */
export function refreshBatchStatus(batch: MedicineBatch, asOf?: Date): MedicineBatch {
  return {
    ...batch,
    status: deriveBatchStatus({
      remainingQuantity: batch.remainingQuantity,
      expiryDate: batch.expiryDate,
      currentStatus: batch.status,
      asOf,
    }),
  }
}
