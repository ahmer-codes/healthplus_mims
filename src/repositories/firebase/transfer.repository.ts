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
import type { CreateStockTransferInput, StockTransfer, StockTransferItem } from '@/types'
import { calculateLineTotal, createEntityId, deriveBatchStatus } from '@/utils'
import { RepositoryError } from '../base'
import type { TransferRepository } from '../contracts'
import {
  assertAllocatableBatch,
  batchIdForLocation,
  batchLocationKey,
  batchLotKey,
  mapBatchDoc,
} from './batch-helpers'
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

function mapTransfer(id: string, data: Record<string, unknown>): StockTransfer {
  const items = Array.isArray(data.items) ? (data.items as StockTransferItem[]) : []
  return {
    id,
    date: String(data.date ?? ''),
    voucherNo: String(data.voucherNo ?? ''),
    fromLocationId: String(data.fromLocationId ?? ''),
    toLocationId: String(data.toLocationId ?? ''),
    items,
    createdBy: String(data.createdBy ?? ''),
    createdAt: toIsoTimestamp(data.createdAt),
    status: (data.status as StockTransfer['status']) ?? 'posted',
    reportId: data.reportId ? String(data.reportId) : undefined,
    updatedAt: toIsoTimestamp(data.updatedAt),
  }
}

function toItems(input: CreateStockTransferInput): StockTransferItem[] {
  return input.items.map((item) => ({
    id: createEntityId('tri'),
    medicineId: item.medicineId,
    batchId: item.batchId,
    quantity: item.quantity,
  }))
}

export class FirebaseTransferRepository implements TransferRepository {
  readonly collectionName = COLLECTIONS.transfers

  async list(): Promise<StockTransfer[]> {
    const snap = await getDocs(
      query(collectionRef(COLLECTIONS.transfers), orderBy('createdAt', 'desc')),
    )
    return snap.docs.map((d) => mapTransfer(d.id, d.data() as Record<string, unknown>))
  }

  async getById(id: string): Promise<StockTransfer | null> {
    const snap = await getDoc(docRef(COLLECTIONS.transfers, id))
    if (!snap.exists()) return null
    return mapTransfer(snap.id, snap.data() as Record<string, unknown>)
  }

  async create(input: CreateStockTransferInput): Promise<StockTransfer> {
    const id = newDocId('trn')
    const items = toItems(input)
    await setDoc(
      docRef(COLLECTIONS.transfers, id),
      stripUndefined({
        date: input.date,
        voucherNo: input.voucherNo.trim(),
        fromLocationId: input.fromLocationId,
        toLocationId: input.toLocationId,
        items,
        createdBy: input.createdBy,
        status: input.status ?? 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    )
    const created = await this.getById(id)
    if (!created) throw new Error('Failed to create transfer.')
    return created
  }

  /**
   * Transaction: verify source batches, deduct source, upsert destination lots,
   * create transfer document. Destination create/increase stays atomic with source deduct.
   */
  async finalize(input: CreateStockTransferInput): Promise<StockTransfer> {
    const db = requireFirestore()
    const transferId = newDocId('trn')
    const items = toItems(input)

    if (input.fromLocationId === input.toLocationId) {
      throw new RepositoryError('transfer/invalid', 'Source and destination must differ.')
    }

    const byBatch = new Map<string, number>()
    for (const item of items) {
      byBatch.set(item.batchId, (byBatch.get(item.batchId) ?? 0) + item.quantity)
    }

    return runTransaction(db, async (tx) => {
      type MovePlan = {
        sourceRef: ReturnType<typeof docRef>
        sourceRemaining: number
        sourceStatus: string
        source: ReturnType<typeof mapBatchDoc>
        quantity: number
        destRef: ReturnType<typeof docRef> | null
        destExisting: ReturnType<typeof mapBatchDoc> | null
        newDestId: string | null
      }

      const plans: MovePlan[] = []

      for (const [batchId, totalQty] of byBatch) {
        const sourceRef = docRef(COLLECTIONS.batches, batchId)
        const sourceData = await txRequireDoc(tx, sourceRef, 'Source batch')
        const source = mapBatchDoc(batchId, sourceData)

        if (source.locationId !== input.fromLocationId) {
          throw new Error(`Batch ${source.batchNo} is not at the source location.`)
        }
        assertAllocatableBatch(source, totalQty)

        const destId = batchIdForLocation(source.medicineId, source.batchNo, input.toLocationId)
        const destRef = docRef(COLLECTIONS.batches, destId)
        const destSnap = await tx.get(destRef)
        const destExisting =
          destSnap.exists() &&
          !mapBatchDoc(destId, destSnap.data() as Record<string, unknown>).deletedAt
            ? mapBatchDoc(destId, destSnap.data() as Record<string, unknown>)
            : null

        plans.push({
          sourceRef,
          sourceRemaining: source.remainingQuantity - totalQty,
          sourceStatus: deriveBatchStatus({
            remainingQuantity: source.remainingQuantity - totalQty,
            expiryDate: source.expiryDate,
            currentStatus: source.status,
          }),
          source,
          quantity: totalQty,
          destRef,
          destExisting,
          newDestId: destExisting ? null : destId,
        })
      }

      for (const plan of plans) {
        tx.update(plan.sourceRef, {
          remainingQuantity: plan.sourceRemaining,
          status: plan.sourceStatus,
          updatedAt: serverTimestamp(),
        })

        if (plan.destExisting && plan.destRef) {
          const destRemaining = plan.destExisting.remainingQuantity + plan.quantity
          const destReceived = plan.destExisting.quantityReceived + plan.quantity
          tx.update(plan.destRef, {
            remainingQuantity: destRemaining,
            quantityReceived: destReceived,
            totalPrice: calculateLineTotal(destReceived, plan.destExisting.unitPrice),
            status: deriveBatchStatus({
              remainingQuantity: destRemaining,
              expiryDate: plan.destExisting.expiryDate,
              currentStatus: plan.destExisting.status === 'hold' ? 'hold' : undefined,
            }),
            updatedAt: serverTimestamp(),
          })
        } else if (plan.newDestId) {
          const destRef = plan.destRef!
          const status = deriveBatchStatus({
            remainingQuantity: plan.quantity,
            expiryDate: plan.source.expiryDate,
          })
          tx.set(
            destRef,
            stripUndefined({
              medicineId: plan.source.medicineId,
              purchaseOrderNo: plan.source.purchaseOrderNo,
              receivingDate: plan.source.receivingDate,
              manufacturerName: plan.source.manufacturerName,
              batchNo: plan.source.batchNo,
              manufacturingDate: plan.source.manufacturingDate,
              expiryDate: plan.source.expiryDate,
              quantityReceived: plan.quantity,
              remainingQuantity: plan.quantity,
              unitPrice: plan.source.unitPrice,
              totalPrice: calculateLineTotal(plan.quantity, plan.source.unitPrice),
              status,
              locationId: input.toLocationId,
              lotKey: batchLotKey(plan.source.medicineId, plan.source.batchNo),
              locationKey: batchLocationKey(
                plan.source.medicineId,
                plan.source.batchNo,
                input.toLocationId,
              ),
              deletedAt: null,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }),
          )
        }
      }

      const now = new Date().toISOString()
      const transfer: StockTransfer = {
        id: transferId,
        date: input.date,
        voucherNo: input.voucherNo.trim(),
        fromLocationId: input.fromLocationId,
        toLocationId: input.toLocationId,
        items,
        createdBy: input.createdBy,
        createdAt: now,
        status: input.status ?? 'posted',
        updatedAt: now,
      }

      tx.set(
        docRef(COLLECTIONS.transfers, transferId),
        stripUndefined({
          date: transfer.date,
          voucherNo: transfer.voucherNo,
          fromLocationId: transfer.fromLocationId,
          toLocationId: transfer.toLocationId,
          items: transfer.items,
          createdBy: transfer.createdBy,
          status: transfer.status,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      )

      return transfer
    })
  }

  async updateStatus(
    id: string,
    status: StockTransfer['status'],
    reportId?: string,
  ): Promise<StockTransfer> {
    const existing = await this.getById(id)
    if (!existing) throw new RepositoryError('repository/not-found', `Transfer ${id} not found.`)
    await updateDoc(
      docRef(COLLECTIONS.transfers, id),
      stripUndefined({
        status,
        reportId: reportId ?? existing.reportId,
        updatedAt: serverTimestamp(),
      }),
    )
    const updated = await this.getById(id)
    if (!updated) throw new Error(`Transfer ${id} not found after update.`)
    return updated
  }

  async remove(id: string): Promise<void> {
    await deleteDoc(docRef(COLLECTIONS.transfers, id))
  }
}

export const transferRepository = new FirebaseTransferRepository()
