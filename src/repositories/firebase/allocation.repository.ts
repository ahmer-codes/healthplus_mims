import {
  deleteDoc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import type { Allocation, AllocationItem, CreateAllocationInput } from '@/types'
import { createEntityId, deriveBatchStatus } from '@/utils'
import { RepositoryError } from '../base'
import type { AllocationRepository } from '../contracts'
import { assertAllocatableBatch, mapBatchDoc } from './batch-helpers'
import { COLLECTIONS } from './collections'
import {
  collectionRef,
  docRef,
  newDocId,
  requireFirestore,
  stripUndefined,
  toIsoTimestamp,
  txRequireDoc,
} from './firestore'

function mapAllocation(id: string, data: Record<string, unknown>): Allocation {
  const items = Array.isArray(data.items) ? (data.items as AllocationItem[]) : []
  return {
    id,
    date: String(data.date ?? ''),
    voucherNo: String(data.voucherNo ?? ''),
    destinationLocationId: String(data.destinationLocationId ?? ''),
    receiverName: String(data.receiverName ?? ''),
    receiverDesignation: String(data.receiverDesignation ?? ''),
    items,
    createdBy: String(data.createdBy ?? ''),
    createdAt: toIsoTimestamp(data.createdAt),
    status: (data.status as Allocation['status']) ?? 'posted',
    reportId: data.reportId ? String(data.reportId) : undefined,
    updatedAt: toIsoTimestamp(data.updatedAt),
  }
}

function toItems(input: CreateAllocationInput): AllocationItem[] {
  return input.items.map((item) => ({
    id: createEntityId('ali'),
    medicineId: item.medicineId,
    batchId: item.batchId,
    quantity: item.quantity,
  }))
}

export class FirebaseAllocationRepository implements AllocationRepository {
  readonly collectionName = COLLECTIONS.allocations

  async list(): Promise<Allocation[]> {
    const snap = await getDocs(
      query(collectionRef(COLLECTIONS.allocations), orderBy('createdAt', 'desc')),
    )
    return snap.docs.map((d) => mapAllocation(d.id, d.data() as Record<string, unknown>))
  }

  async getById(id: string): Promise<Allocation | null> {
    const snap = await getDoc(docRef(COLLECTIONS.allocations, id))
    if (!snap.exists()) return null
    return mapAllocation(snap.id, snap.data() as Record<string, unknown>)
  }

  async create(input: CreateAllocationInput): Promise<Allocation> {
    const id = newDocId('alloc')
    const items = toItems(input)
    await setDoc(
      docRef(COLLECTIONS.allocations, id),
      stripUndefined({
        date: input.date,
        voucherNo: input.voucherNo.trim(),
        destinationLocationId: input.destinationLocationId,
        receiverName: input.receiverName?.trim() ?? '',
        receiverDesignation: input.receiverDesignation?.trim() ?? '',
        items,
        createdBy: input.createdBy,
        status: input.status ?? 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    )
    const created = await this.getById(id)
    if (!created) throw new Error('Failed to create allocation.')
    return created
  }

  /**
   * Transaction: verify each batch (available, not held/expired, sufficient qty),
   * deduct quantities, create allocation record. No negative inventory.
   */
  async finalize(input: CreateAllocationInput): Promise<Allocation> {
    const db = requireFirestore()
    const allocationId = newDocId('alloc')
    const items = toItems(input)

    // Aggregate qty per batch for multi-line carts
    const byBatch = new Map<string, number>()
    for (const item of items) {
      byBatch.set(item.batchId, (byBatch.get(item.batchId) ?? 0) + item.quantity)
    }

    return runTransaction(db, async (tx) => {
      const deductions: Array<{
        ref: ReturnType<typeof docRef>
        remainingQuantity: number
        status: string
        batchNo: string
      }> = []

      for (const [batchId, totalQty] of byBatch) {
        const ref = docRef(COLLECTIONS.batches, batchId)
        const data = await txRequireDoc(tx, ref, 'Batch')
        const batch = mapBatchDoc(batchId, data)
        assertAllocatableBatch(batch, totalQty)

        const remainingQuantity = batch.remainingQuantity - totalQty
        const status = deriveBatchStatus({
          remainingQuantity,
          expiryDate: batch.expiryDate,
          currentStatus: batch.status,
        })
        deductions.push({ ref, remainingQuantity, status, batchNo: batch.batchNo })
      }

      for (const deduction of deductions) {
        tx.update(deduction.ref, {
          remainingQuantity: deduction.remainingQuantity,
          status: deduction.status,
          updatedAt: serverTimestamp(),
        })
      }

      const now = new Date().toISOString()
      const allocation: Allocation = {
        id: allocationId,
        date: input.date,
        voucherNo: input.voucherNo.trim(),
        destinationLocationId: input.destinationLocationId,
        receiverName: input.receiverName?.trim() ?? '',
        receiverDesignation: input.receiverDesignation?.trim() ?? '',
        items,
        createdBy: input.createdBy,
        createdAt: now,
        status: input.status ?? 'posted',
        updatedAt: now,
      }

      tx.set(
        docRef(COLLECTIONS.allocations, allocationId),
        stripUndefined({
          date: allocation.date,
          voucherNo: allocation.voucherNo,
          destinationLocationId: allocation.destinationLocationId,
          receiverName: allocation.receiverName,
          receiverDesignation: allocation.receiverDesignation,
          items: allocation.items,
          createdBy: allocation.createdBy,
          status: allocation.status,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      )

      return allocation
    })
  }

  async updateStatus(
    id: string,
    status: Allocation['status'],
    reportId?: string,
  ): Promise<Allocation> {
    const existing = await this.getById(id)
    if (!existing) throw new RepositoryError('repository/not-found', `Allocation ${id} not found.`)
    await updateDoc(
      docRef(COLLECTIONS.allocations, id),
      stripUndefined({
        status,
        reportId: reportId ?? existing.reportId,
        updatedAt: serverTimestamp(),
      }),
    )
    const updated = await this.getById(id)
    if (!updated) throw new Error(`Allocation ${id} not found after update.`)
    return updated
  }

  async remove(id: string): Promise<void> {
    await deleteDoc(docRef(COLLECTIONS.allocations, id))
  }
}

export const allocationRepository = new FirebaseAllocationRepository()
