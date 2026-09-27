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
import type { CreateStockInInput, MedicineBatch, StockIn, StockInItem } from '@/types'
import { calculateLineTotal, createEntityId, deriveBatchStatus } from '@/utils'
import { RepositoryError } from '../base'
import type { StockInRepository } from '../contracts'
import { batchIdForLocation, batchLocationKey, batchLotKey, mapBatchDoc } from './batch-helpers'
import { COLLECTIONS } from './collections'
import {
  collectionRef,
  docRef,
  newDocId,
  requireFirestore,
  stripUndefined,
  toIsoTimestamp,
} from './firestore'

function mapStockIn(id: string, data: Record<string, unknown>): StockIn {
  const items = Array.isArray(data.items) ? (data.items as StockInItem[]) : []
  return {
    id,
    purchaseOrderNo: String(data.purchaseOrderNo ?? ''),
    receivingDate: String(data.receivingDate ?? ''),
    items,
    createdBy: String(data.createdBy ?? ''),
    createdAt: toIsoTimestamp(data.createdAt),
    status: (data.status as StockIn['status']) ?? 'posted',
    reportId: data.reportId ? String(data.reportId) : undefined,
    locationId: String(data.locationId ?? ''),
    updatedAt: toIsoTimestamp(data.updatedAt),
  }
}

function toItems(input: CreateStockInInput): StockInItem[] {
  return input.items.map((item) => ({
    id: createEntityId('sii'),
    medicineId: item.medicineId,
    manufacturerName: item.manufacturerName.trim(),
    batchNo: item.batchNo.trim(),
    manufacturingDate: item.manufacturingDate,
    expiryDate: item.expiryDate,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: calculateLineTotal(item.quantity, item.unitPrice),
  }))
}

export class FirebaseStockInRepository implements StockInRepository {
  readonly collectionName = COLLECTIONS.stockIns

  async list(): Promise<StockIn[]> {
    const snap = await getDocs(
      query(collectionRef(COLLECTIONS.stockIns), orderBy('createdAt', 'desc')),
    )
    return snap.docs.map((d) => mapStockIn(d.id, d.data() as Record<string, unknown>))
  }

  async getById(id: string): Promise<StockIn | null> {
    const snap = await getDoc(docRef(COLLECTIONS.stockIns, id))
    if (!snap.exists()) return null
    return mapStockIn(snap.id, snap.data() as Record<string, unknown>)
  }

  async create(input: CreateStockInInput): Promise<StockIn> {
    const id = newDocId('sin')
    const items = toItems(input)
    await setDoc(
      docRef(COLLECTIONS.stockIns, id),
      stripUndefined({
        purchaseOrderNo: input.purchaseOrderNo.trim(),
        receivingDate: input.receivingDate,
        locationId: input.locationId,
        items,
        createdBy: input.createdBy,
        status: input.status ?? 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    )
    const created = await this.getById(id)
    if (!created) throw new Error('Failed to create stock-in.')
    return created
  }

  /**
   * Single transaction: create stock-in + all medicine batch lots.
   * Re-checks lot uniqueness so concurrent stock-ins cannot collide.
   */
  async finalize(
    input: CreateStockInInput,
  ): Promise<{ stockIn: StockIn; batches: MedicineBatch[] }> {
    const db = requireFirestore()
    const stockInId = newDocId('sin')
    const items = toItems(input)

    return runTransaction(db, async (tx) => {
      // Document gets only (no queries inside web SDK transactions).
      for (const item of items) {
        // Block if this lot already exists at the receiving location.
        const localId = batchIdForLocation(item.medicineId, item.batchNo, input.locationId)
        const localSnap = await tx.get(docRef(COLLECTIONS.batches, localId))
        if (localSnap.exists()) {
          const mapped = mapBatchDoc(localId, localSnap.data() as Record<string, unknown>)
          if (!mapped.deletedAt) {
            throw new RepositoryError(
              'stock-in/duplicate-batch',
              `Batch ${item.batchNo} already exists at this location.`,
            )
          }
        }
      }

      const stockInRef = docRef(COLLECTIONS.stockIns, stockInId)
      tx.set(
        stockInRef,
        stripUndefined({
          purchaseOrderNo: input.purchaseOrderNo.trim(),
          receivingDate: input.receivingDate,
          locationId: input.locationId,
          items,
          createdBy: input.createdBy,
          status: input.status ?? 'posted',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      )

      const batches: MedicineBatch[] = []
      const now = new Date().toISOString()

      for (let i = 0; i < items.length; i += 1) {
        const item = items[i]!
        const batchId = batchIdForLocation(item.medicineId, item.batchNo, input.locationId)
        const status = deriveBatchStatus({
          remainingQuantity: item.quantity,
          expiryDate: item.expiryDate,
        })
        const batch: MedicineBatch = {
          id: batchId,
          medicineId: item.medicineId,
          purchaseOrderNo: input.purchaseOrderNo.trim(),
          receivingDate: input.receivingDate,
          manufacturerName: item.manufacturerName,
          batchNo: item.batchNo,
          manufacturingDate: item.manufacturingDate,
          expiryDate: item.expiryDate,
          quantityReceived: item.quantity,
          remainingQuantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          status,
          locationId: input.locationId,
          createdAt: now,
          updatedAt: now,
        }

        tx.set(
          docRef(COLLECTIONS.batches, batchId),
          stripUndefined({
            medicineId: batch.medicineId,
            purchaseOrderNo: batch.purchaseOrderNo,
            receivingDate: batch.receivingDate,
            manufacturerName: batch.manufacturerName,
            batchNo: batch.batchNo,
            manufacturingDate: batch.manufacturingDate,
            expiryDate: batch.expiryDate,
            quantityReceived: batch.quantityReceived,
            remainingQuantity: batch.remainingQuantity,
            unitPrice: batch.unitPrice,
            totalPrice: batch.totalPrice,
            status: batch.status,
            locationId: batch.locationId,
            lotKey: batchLotKey(batch.medicineId, batch.batchNo),
            locationKey: batchLocationKey(batch.medicineId, batch.batchNo, batch.locationId),
            deletedAt: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }),
        )
        batches.push(batch)
      }

      const stockIn: StockIn = {
        id: stockInId,
        purchaseOrderNo: input.purchaseOrderNo.trim(),
        receivingDate: input.receivingDate,
        items,
        createdBy: input.createdBy,
        createdAt: now,
        status: input.status ?? 'posted',
        locationId: input.locationId,
        updatedAt: now,
      }

      return { stockIn, batches }
    })
  }

  async updateStatus(
    id: string,
    status: StockIn['status'],
    reportId?: string,
  ): Promise<StockIn> {
    const existing = await this.getById(id)
    if (!existing) throw new RepositoryError('repository/not-found', `Stock-in ${id} not found.`)
    await updateDoc(
      docRef(COLLECTIONS.stockIns, id),
      stripUndefined({
        status,
        reportId: reportId ?? existing.reportId,
        updatedAt: serverTimestamp(),
      }),
    )
    const updated = await this.getById(id)
    if (!updated) throw new Error(`Stock-in ${id} not found after update.`)
    return updated
  }

  async remove(id: string): Promise<void> {
    await deleteDoc(docRef(COLLECTIONS.stockIns, id))
  }
}

export const stockInRepository = new FirebaseStockInRepository()
