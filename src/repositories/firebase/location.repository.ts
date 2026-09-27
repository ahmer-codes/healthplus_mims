import { doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { HOSPITAL_LOCATION_SEEDS } from '@/data'
import type { CreateLocationInput, HospitalLocation } from '@/types'
import type { LocationRepository } from '../contracts'
import { COLLECTIONS } from './collections'
import {
  collectionRef,
  docRef,
  newDocId,
  requireFirestore,
  stripUndefined,
  toIsoTimestamp,
} from './firestore'

function mapLocation(id: string, data: Record<string, unknown>): HospitalLocation {
  return {
    id,
    name: String(data.name ?? ''),
    code: String(data.code ?? ''),
    type: data.type as HospitalLocation['type'],
    isActive: data.isActive !== false,
    sortOrder: Number(data.sortOrder ?? 0),
    createdAt: toIsoTimestamp(data.createdAt),
    updatedAt: toIsoTimestamp(data.updatedAt),
  }
}

let seedPromise: Promise<void> | null = null

function locationFallback(activeOnly = true): HospitalLocation[] {
  const now = new Date().toISOString()
  return HOSPITAL_LOCATION_SEEDS.map((seed) => ({
    id: seed.id,
    name: seed.name,
    code: seed.code,
    type: seed.type,
    isActive: true,
    sortOrder: seed.sortOrder,
    createdAt: now,
    updatedAt: now,
  }))
    .filter((location) => (activeOnly ? location.isActive : true))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

export class FirebaseLocationRepository implements LocationRepository {
  readonly collectionName = COLLECTIONS.locations

  private async ensureSeeded(): Promise<void> {
    if (seedPromise) return seedPromise
    seedPromise = (async () => {
      const db = requireFirestore()
      const snap = await getDocs(collectionRef(COLLECTIONS.locations))
      if (!snap.empty) return

      await Promise.all(
        HOSPITAL_LOCATION_SEEDS.map(async (seed) => {
          await setDoc(
            doc(db, COLLECTIONS.locations, seed.id),
            {
              name: seed.name,
              code: seed.code,
              type: seed.type,
              isActive: true,
              sortOrder: seed.sortOrder,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          )
        }),
      )
    })().catch((error) => {
      seedPromise = null
      throw error
    })
    return seedPromise
  }

  async list(activeOnly = true): Promise<HospitalLocation[]> {
    try {
      await this.ensureSeeded()
      const snap = await getDocs(collectionRef(COLLECTIONS.locations))
      const rows = snap.docs
        .map((d) => mapLocation(d.id, d.data() as Record<string, unknown>))
        .filter((location) => (activeOnly ? location.isActive : true))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      return rows.length ? rows : locationFallback(activeOnly)
    } catch {
      return locationFallback(activeOnly)
    }
  }

  async getById(id: string): Promise<HospitalLocation | null> {
    try {
      await this.ensureSeeded()
      const snap = await getDoc(docRef(COLLECTIONS.locations, id))
      if (snap.exists()) {
        return mapLocation(snap.id, snap.data() as Record<string, unknown>)
      }
    } catch {
      // fall through
    }
    return locationFallback(false).find((location) => location.id === id) ?? null
  }

  async create(input: CreateLocationInput): Promise<HospitalLocation> {
    const id = newDocId('loc')
    await setDoc(
      docRef(COLLECTIONS.locations, id),
      stripUndefined({
        name: input.name.trim(),
        code: input.code.trim().toUpperCase(),
        type: input.type,
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 100,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    )
    const created = await this.getById(id)
    if (!created) throw new Error('Failed to create location.')
    return created
  }

  async update(id: string, input: Partial<CreateLocationInput>): Promise<HospitalLocation> {
    const existing = await this.getById(id)
    if (!existing) throw new Error(`Location ${id} not found.`)
    await updateDoc(
      docRef(COLLECTIONS.locations, id),
      stripUndefined({
        name: input.name?.trim() ?? existing.name,
        code: input.code?.trim().toUpperCase() ?? existing.code,
        type: input.type ?? existing.type,
        isActive: input.isActive ?? existing.isActive,
        sortOrder: input.sortOrder ?? existing.sortOrder,
        updatedAt: serverTimestamp(),
      }),
    )
    const updated = await this.getById(id)
    if (!updated) throw new Error(`Location ${id} not found after update.`)
    return updated
  }
}

export const locationRepository = new FirebaseLocationRepository()
