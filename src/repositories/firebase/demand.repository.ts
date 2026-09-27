import {
  deleteDoc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import type {
  CreateDemandInput,
  MedicineDemand,
  UpdateDemandInput,
  UpdateDemandStatusInput,
} from '@/types'
import { todayDateString } from '@/utils'
import type { DemandRepository } from '../contracts'
import { COLLECTIONS } from './collections'
import {
  collectionRef,
  docRef,
  newDocId,
  stripUndefined,
  toIsoTimestamp,
} from './firestore'

function mapDemand(id: string, data: Record<string, unknown>): MedicineDemand {
  return {
    id,
    medicineId: String(data.medicineId ?? ''),
    requestedQuantity: Number(data.requestedQuantity ?? 0),
    requestingDepartment: String(data.requestingDepartment ?? ''),
    requestedBy: String(data.requestedBy ?? ''),
    priority: (data.priority as MedicineDemand['priority']) ?? 'normal',
    status: (data.status as MedicineDemand['status']) ?? 'pending',
    requestDate: String(data.requestDate ?? todayDateString()),
    notes: data.notes ? String(data.notes) : undefined,
    createdAt: toIsoTimestamp(data.createdAt),
    updatedAt: toIsoTimestamp(data.updatedAt),
  }
}

export class FirebaseDemandRepository implements DemandRepository {
  readonly collectionName = COLLECTIONS.demands

  async list(): Promise<MedicineDemand[]> {
    const snap = await getDocs(
      query(collectionRef(COLLECTIONS.demands), orderBy('createdAt', 'desc')),
    )
    return snap.docs.map((d) => mapDemand(d.id, d.data() as Record<string, unknown>))
  }

  async getById(id: string): Promise<MedicineDemand | null> {
    const snap = await getDoc(docRef(COLLECTIONS.demands, id))
    if (!snap.exists()) return null
    return mapDemand(snap.id, snap.data() as Record<string, unknown>)
  }

  async create(input: CreateDemandInput): Promise<MedicineDemand> {
    const id = newDocId('dem')
    await setDoc(
      docRef(COLLECTIONS.demands, id),
      stripUndefined({
        medicineId: input.medicineId,
        requestedQuantity: input.requestedQuantity,
        requestingDepartment: input.requestingDepartment.trim(),
        requestedBy: input.requestedBy.trim(),
        priority: input.priority ?? 'normal',
        status: 'pending',
        requestDate: input.requestDate ?? todayDateString(),
        notes: input.notes?.trim() || undefined,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    )
    const created = await this.getById(id)
    if (!created) throw new Error('Failed to create demand.')
    return created
  }

  async update(id: string, input: UpdateDemandInput): Promise<MedicineDemand> {
    const existing = await this.getById(id)
    if (!existing) throw new Error(`Demand ${id} not found.`)
    await updateDoc(
      docRef(COLLECTIONS.demands, id),
      stripUndefined({
        medicineId: input.medicineId,
        requestedQuantity: input.requestedQuantity,
        requestingDepartment: input.requestingDepartment.trim(),
        requestedBy: input.requestedBy.trim(),
        priority: input.priority,
        requestDate: input.requestDate,
        notes: input.notes?.trim() || undefined,
        updatedAt: serverTimestamp(),
      }),
    )
    const updated = await this.getById(id)
    if (!updated) throw new Error(`Demand ${id} not found after update.`)
    return updated
  }

  async updateStatus(id: string, input: UpdateDemandStatusInput): Promise<MedicineDemand> {
    const existing = await this.getById(id)
    if (!existing) throw new Error(`Demand ${id} not found.`)
    await updateDoc(
      docRef(COLLECTIONS.demands, id),
      {
        status: input.status,
        updatedAt: serverTimestamp(),
      },
    )
    const updated = await this.getById(id)
    if (!updated) throw new Error(`Demand ${id} not found after update.`)
    return updated
  }

  async remove(id: string): Promise<void> {
    await deleteDoc(docRef(COLLECTIONS.demands, id))
  }
}

export const demandRepository = new FirebaseDemandRepository()
