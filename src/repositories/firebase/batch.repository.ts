import {
  deleteDoc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import type { BatchFilter, CreateBatchInput, MedicineBatch, UpdateBatchInput } from '@/types'
import { calculateLineTotal, deriveBatchStatus } from '@/utils'
import { RepositoryError } from '../base'
import type { BatchRepository } from '../contracts'
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
  requireFirestore,
  stripUndefined,
  txRequireDoc,
} from './firestore'

function matchesFilter(batch: MedicineBatch, filter?: BatchFilter): boolean {
  if (!filter) return !batch.deletedAt
  if (!filter.includeDeleted && batch.deletedAt) return false
  if (filter.medicineId && batch.medicineId !== filter.medicineId) return false
  if (filter.locationId && batch.locationId !== filter.locationId) return false
  if (filter.expiringBefore && batch.expiryDate > filter.expiringBefore) return false
  if (filter.status) {
    const statuses = Array.isArray(filter.status) ? filter.status : [filter.status]
    if (!statuses.includes(batch.status)) return false
  }
  if (filter.manufacturer) {
    const m = filter.manufacturer.trim().toLowerCase()
    if (m && !batch.manufacturerName.toLowerCase().includes(m)) return false
  }
  if (filter.batchNo) {
    const b = filter.batchNo.trim().toLowerCase()
    if (b && !batch.batchNo.toLowerCase().includes(b)) return false
  }
  if (filter.query) {
    const q = filter.query.trim().toLowerCase()
    if (
      q &&
      !`${batch.batchNo} ${batch.manufacturerName} ${batch.purchaseOrderNo}`
        .toLowerCase()
        .includes(q)
    ) {
      return false
    }
  }
  return true
}

function buildBatchPayload(input: CreateBatchInput, id: string) {
  const remainingQuantity = input.remainingQuantity ?? input.quantityReceived
  const totalPrice = input.totalPrice ?? calculateLineTotal(input.quantityReceived, input.unitPrice)
  const batchNo = input.batchNo.trim()
  const status =
    input.status ??
    deriveBatchStatus({
      remainingQuantity,
      expiryDate: input.expiryDate,
    })

  return {
    id,
    payload: stripUndefined({
      medicineId: input.medicineId,
      purchaseOrderNo: input.purchaseOrderNo.trim(),
      receivingDate: input.receivingDate,
      manufacturerName: input.manufacturerName.trim(),
      batchNo,
      manufacturingDate: input.manufacturingDate,
      expiryDate: input.expiryDate,
      quantityReceived: input.quantityReceived,
      remainingQuantity,
      unitPrice: input.unitPrice,
      totalPrice,
      status,
      locationId: input.locationId,
      lotKey: batchLotKey(input.medicineId, batchNo),
      locationKey: batchLocationKey(input.medicineId, batchNo, input.locationId),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
    domain: {
      id,
      medicineId: input.medicineId,
      purchaseOrderNo: input.purchaseOrderNo.trim(),
      receivingDate: input.receivingDate,
      manufacturerName: input.manufacturerName.trim(),
      batchNo,
      manufacturingDate: input.manufacturingDate,
      expiryDate: input.expiryDate,
      quantityReceived: input.quantityReceived,
      remainingQuantity,
      unitPrice: input.unitPrice,
      totalPrice,
      status,
      locationId: input.locationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } satisfies MedicineBatch,
  }
}

/**
 * Medicine batch persistence. Firestore with transactional deduct/transfer.
 */
export class FirebaseBatchRepository implements BatchRepository {
  readonly collectionName = COLLECTIONS.batches

  async list(filter?: BatchFilter): Promise<MedicineBatch[]> {
    const snap = await getDocs(collectionRef(COLLECTIONS.batches))
    return snap.docs
      .map((d) => mapBatchDoc(d.id, d.data() as Record<string, unknown>))
      .filter((batch) => matchesFilter(batch, filter))
  }

  async getById(id: string): Promise<MedicineBatch | null> {
    const snap = await getDoc(docRef(COLLECTIONS.batches, id))
    if (!snap.exists()) return null
    return mapBatchDoc(snap.id, snap.data() as Record<string, unknown>)
  }

  async listByMedicine(medicineId: string): Promise<MedicineBatch[]> {
    return this.list({ medicineId })
  }

  async listByLocation(locationId: string): Promise<MedicineBatch[]> {
    return this.list({ locationId })
  }

  async findByMedicineAndBatchNo(
    medicineId: string,
    batchNo: string,
  ): Promise<MedicineBatch | null> {
    const lotKey = batchLotKey(medicineId, batchNo)
    const snap = await getDocs(
      query(collectionRef(COLLECTIONS.batches), where('lotKey', '==', lotKey)),
    )
    const active = snap.docs
      .map((d) => mapBatchDoc(d.id, d.data() as Record<string, unknown>))
      .find((batch) => !batch.deletedAt)
    return active ?? null
  }

  async create(input: CreateBatchInput): Promise<MedicineBatch> {
    const id = batchIdForLocation(input.medicineId, input.batchNo, input.locationId)
    const existing = await this.getById(id)
    if (existing && !existing.deletedAt) {
      throw new RepositoryError(
        'batch/duplicate',
        `Batch ${input.batchNo.trim()} already exists at this location.`,
      )
    }
    const built = buildBatchPayload(input, id)
    await setDoc(docRef(COLLECTIONS.batches, id), built.payload)
    return (await this.getById(id)) ?? built.domain
  }

  async createMany(inputs: CreateBatchInput[]): Promise<MedicineBatch[]> {
    const results: MedicineBatch[] = []
    for (const input of inputs) {
      results.push(await this.create(input))
    }
    return results
  }

  async update(id: string, input: UpdateBatchInput): Promise<MedicineBatch> {
    const existing = await this.getById(id)
    if (!existing) throw new RepositoryError('repository/not-found', `Batch ${id} not found.`)

    const remainingQuantity = input.remainingQuantity ?? existing.remainingQuantity
    const expiryDate = input.expiryDate ?? existing.expiryDate
    const statusInput = input.status ?? existing.status
    const batchNo = input.batchNo?.trim() ?? existing.batchNo
    const locationId = input.locationId ?? existing.locationId
    const deletedAt =
      input.deletedAt === null ? null : (input.deletedAt ?? existing.deletedAt ?? null)

    const status = deriveBatchStatus({
      remainingQuantity,
      expiryDate,
      currentStatus: statusInput,
    })

    await updateDoc(
      docRef(COLLECTIONS.batches, id),
      stripUndefined({
        manufacturerName: input.manufacturerName?.trim() ?? existing.manufacturerName,
        batchNo,
        manufacturingDate: input.manufacturingDate ?? existing.manufacturingDate,
        expiryDate,
        remainingQuantity,
        unitPrice: input.unitPrice ?? existing.unitPrice,
        totalPrice:
          input.totalPrice ??
          calculateLineTotal(existing.quantityReceived, input.unitPrice ?? existing.unitPrice),
        locationId,
        status,
        lotKey: batchLotKey(existing.medicineId, batchNo),
        locationKey: batchLocationKey(existing.medicineId, batchNo, locationId),
        deletedAt: deletedAt === null ? null : deletedAt,
        updatedAt: serverTimestamp(),
      }),
    )

    const updated = await this.getById(id)
    if (!updated) throw new RepositoryError('repository/not-found', `Batch ${id} not found.`)
    return updated
  }

  async remove(id: string): Promise<void> {
    await deleteDoc(docRef(COLLECTIONS.batches, id))
  }

  async deductQuantity(id: string, quantity: number): Promise<MedicineBatch> {
    const db = requireFirestore()
    return runTransaction(db, async (tx) => {
      const ref = docRef(COLLECTIONS.batches, id)
      const data = await txRequireDoc(tx, ref, 'Batch')
      const batch = mapBatchDoc(id, data)
      assertAllocatableBatch(batch, quantity)

      const remainingQuantity = batch.remainingQuantity - quantity
      const status = deriveBatchStatus({
        remainingQuantity,
        expiryDate: batch.expiryDate,
        currentStatus: batch.status,
      })

      tx.update(ref, {
        remainingQuantity,
        status,
        updatedAt: serverTimestamp(),
      })

      return {
        ...batch,
        remainingQuantity,
        status,
        updatedAt: new Date().toISOString(),
      }
    })
  }

  async transferQuantity(
    sourceBatchId: string,
    toLocationId: string,
    quantity: number,
  ): Promise<{
    source: MedicineBatch
    destination: MedicineBatch
    destinationCreated: boolean
  }> {
    const db = requireFirestore()
    return runTransaction(db, async (tx) => {
      const sourceRef = docRef(COLLECTIONS.batches, sourceBatchId)
      const sourceData = await txRequireDoc(tx, sourceRef, 'Source batch')
      const source = mapBatchDoc(sourceBatchId, sourceData)

      if (source.locationId === toLocationId) {
        throw new Error('Cannot transfer to the same location.')
      }
      assertAllocatableBatch(source, quantity)

      const destId = batchIdForLocation(source.medicineId, source.batchNo, toLocationId)
      const destRef = docRef(COLLECTIONS.batches, destId)
      const destSnap = await tx.get(destRef)

      const sourceRemaining = source.remainingQuantity - quantity
      const sourceStatus = deriveBatchStatus({
        remainingQuantity: sourceRemaining,
        expiryDate: source.expiryDate,
        currentStatus: source.status,
      })

      tx.update(sourceRef, {
        remainingQuantity: sourceRemaining,
        status: sourceStatus,
        updatedAt: serverTimestamp(),
      })

      const nextSource: MedicineBatch = {
        ...source,
        remainingQuantity: sourceRemaining,
        status: sourceStatus,
        updatedAt: new Date().toISOString(),
      }

      if (destSnap.exists()) {
        const existingDest = mapBatchDoc(destId, destSnap.data() as Record<string, unknown>)
        if (!existingDest.deletedAt) {
          const destRemaining = existingDest.remainingQuantity + quantity
          const destReceived = existingDest.quantityReceived + quantity
          const destStatus = deriveBatchStatus({
            remainingQuantity: destRemaining,
            expiryDate: existingDest.expiryDate,
            currentStatus: existingDest.status === 'hold' ? 'hold' : undefined,
          })
          tx.update(destRef, {
            remainingQuantity: destRemaining,
            quantityReceived: destReceived,
            totalPrice: calculateLineTotal(destReceived, existingDest.unitPrice),
            status: destStatus,
            updatedAt: serverTimestamp(),
          })
          return {
            source: nextSource,
            destination: {
              ...existingDest,
              remainingQuantity: destRemaining,
              quantityReceived: destReceived,
              totalPrice: calculateLineTotal(destReceived, existingDest.unitPrice),
              status: destStatus,
              updatedAt: new Date().toISOString(),
            },
            destinationCreated: false,
          }
        }
      }

      const destStatus = deriveBatchStatus({
        remainingQuantity: quantity,
        expiryDate: source.expiryDate,
      })
      const destination: MedicineBatch = {
        id: destId,
        medicineId: source.medicineId,
        purchaseOrderNo: source.purchaseOrderNo,
        receivingDate: source.receivingDate,
        manufacturerName: source.manufacturerName,
        batchNo: source.batchNo,
        manufacturingDate: source.manufacturingDate,
        expiryDate: source.expiryDate,
        quantityReceived: quantity,
        remainingQuantity: quantity,
        unitPrice: source.unitPrice,
        totalPrice: calculateLineTotal(quantity, source.unitPrice),
        status: destStatus,
        locationId: toLocationId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      tx.set(
        destRef,
        stripUndefined({
          medicineId: destination.medicineId,
          purchaseOrderNo: destination.purchaseOrderNo,
          receivingDate: destination.receivingDate,
          manufacturerName: destination.manufacturerName,
          batchNo: destination.batchNo,
          manufacturingDate: destination.manufacturingDate,
          expiryDate: destination.expiryDate,
          quantityReceived: quantity,
          remainingQuantity: quantity,
          unitPrice: destination.unitPrice,
          totalPrice: destination.totalPrice,
          status: destStatus,
          locationId: toLocationId,
          lotKey: batchLotKey(destination.medicineId, destination.batchNo),
          locationKey: batchLocationKey(destination.medicineId, destination.batchNo, toLocationId),
          deletedAt: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      )

      return { source: nextSource, destination, destinationCreated: true }
    })
  }
}

export const batchRepository = new FirebaseBatchRepository()
