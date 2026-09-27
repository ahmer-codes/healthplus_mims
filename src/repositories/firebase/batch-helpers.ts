import type { MedicineBatch } from '@/types'
import { calculateLineTotal, deriveBatchStatus } from '@/utils'
import { toIsoTimestamp } from './firestore'

/** Stable key for locating a lot at a location (transfer destination upsert). */
export function batchLocationKey(
  medicineId: string,
  batchNo: string,
  locationId: string,
): string {
  return `${medicineId}|${batchNo.trim().toLowerCase()}|${locationId}`
}

/** Medicine + batch number (any location). used for stock-in duplicate checks. */
export function batchLotKey(medicineId: string, batchNo: string): string {
  return `${medicineId}|${batchNo.trim().toLowerCase()}`
}

/**
 * Deterministic document id so transactions can tx.get() destinations
 * without querying (Firestore web transactions only support DocumentReference).
 */
export function batchIdForLocation(
  medicineId: string,
  batchNo: string,
  locationId: string,
): string {
  const raw = batchLocationKey(medicineId, batchNo, locationId)
  const safe = raw.replace(/\|/g, '__').replace(/[^a-zA-Z0-9_-]/g, '_')
  return `bat_${safe}`.slice(0, 700)
}

export function mapBatchDoc(id: string, data: Record<string, unknown>): MedicineBatch {
  const remainingQuantity = Number(data.remainingQuantity ?? 0)
  const expiryDate = String(data.expiryDate ?? '')
  const statusRaw = data.status as MedicineBatch['status'] | undefined

  return {
    id,
    medicineId: String(data.medicineId ?? ''),
    purchaseOrderNo: String(data.purchaseOrderNo ?? ''),
    receivingDate: String(data.receivingDate ?? ''),
    manufacturerName: String(data.manufacturerName ?? ''),
    batchNo: String(data.batchNo ?? ''),
    manufacturingDate: String(data.manufacturingDate ?? ''),
    expiryDate,
    quantityReceived: Number(data.quantityReceived ?? 0),
    remainingQuantity,
    unitPrice: Number(data.unitPrice ?? 0),
    totalPrice: Number(
      data.totalPrice ??
        calculateLineTotal(Number(data.quantityReceived ?? 0), Number(data.unitPrice ?? 0)),
    ),
    status: deriveBatchStatus({
      remainingQuantity,
      expiryDate,
      currentStatus: statusRaw,
    }),
    locationId: String(data.locationId ?? ''),
    createdAt: toIsoTimestamp(data.createdAt),
    updatedAt: toIsoTimestamp(data.updatedAt),
    deletedAt: data.deletedAt ? toIsoTimestamp(data.deletedAt) : undefined,
  }
}

/** Assert batch is allocatable for deduction / transfer (no hold, expired, depleted, deleted). */
export function assertAllocatableBatch(
  batch: MedicineBatch,
  quantity: number,
): void {
  if (batch.deletedAt) {
    throw new Error(`Batch ${batch.batchNo} has been removed from inventory.`)
  }
  if (batch.status === 'hold') {
    throw new Error(`Batch ${batch.batchNo} is on hold and cannot be allocated or transferred.`)
  }
  if (batch.status === 'expired') {
    throw new Error(`Batch ${batch.batchNo} is expired and cannot be allocated or transferred.`)
  }
  if (batch.status === 'depleted' || batch.remainingQuantity <= 0) {
    throw new Error(`Batch ${batch.batchNo} has no remaining quantity.`)
  }
  if (batch.status !== 'available') {
    throw new Error(`Batch ${batch.batchNo} is not available (${batch.status}).`)
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Quantity must be greater than zero.')
  }
  if (batch.remainingQuantity < quantity) {
    throw new Error(
      `Insufficient quantity on batch ${batch.batchNo}: need ${quantity}, have ${batch.remainingQuantity}.`,
    )
  }
}
