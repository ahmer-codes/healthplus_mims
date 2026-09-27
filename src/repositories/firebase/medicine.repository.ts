import {
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { MEDICINE_CATALOG } from '@/data'
import type {
  CreateMedicineInput,
  Medicine,
  MedicineFilter,
  UpdateMedicineInput,
} from '@/types'
import { buildMedicineDisplayName, medicineIdentityKey } from '@/utils'
import type { MedicineRepository } from '../contracts'
import { COLLECTIONS } from './collections'
import {
  collectionRef,
  docRef,
  newDocId,
  requireFirestore,
  stripUndefined,
  toIsoTimestamp,
} from './firestore'

function mapMedicine(id: string, data: Record<string, unknown>): Medicine {
  return {
    id,
    genericName: String(data.genericName ?? ''),
    strength: String(data.strength ?? ''),
    dosageForm: String(data.dosageForm ?? ''),
    volume: String(data.volume ?? ''),
    displayName: String(data.displayName ?? ''),
    isActive: data.isActive !== false,
    category: data.category as Medicine['category'],
    createdAt: toIsoTimestamp(data.createdAt),
    updatedAt: toIsoTimestamp(data.updatedAt),
  }
}

function matchesFilter(medicine: Medicine, filter?: MedicineFilter): boolean {
  if (!filter) return true
  if (filter.isActive !== undefined && medicine.isActive !== filter.isActive) return false
  if (filter.genericName && medicine.genericName.toLowerCase() !== filter.genericName.toLowerCase()) {
    return false
  }
  if (filter.dosageForm && medicine.dosageForm.toLowerCase() !== filter.dosageForm.toLowerCase()) {
    return false
  }
  if (filter.category && medicine.category !== filter.category) return false
  if (filter.query) {
    const tokens = filter.query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
    if (!tokens.length) return true
    const haystack = [
      medicine.displayName,
      medicine.genericName,
      medicine.strength,
      medicine.dosageForm,
      medicine.volume,
      medicine.category ?? '',
    ]
      .join(' ')
      .toLowerCase()
    if (!tokens.every((token) => haystack.includes(token))) return false
  }
  return true
}

let seedPromise: Promise<void> | null = null

function catalogFallback(filter?: MedicineFilter): Medicine[] {
  const now = new Date().toISOString()
  return MEDICINE_CATALOG.map((entry) => ({
    id: entry.id,
    genericName: entry.genericName,
    strength: entry.strength,
    dosageForm: entry.dosageForm,
    volume: entry.volume || '',
    displayName: entry.displayName,
    isActive: entry.isActive,
    category: entry.category,
    createdAt: now,
    updatedAt: now,
  }))
    .filter((medicine) => matchesFilter(medicine, filter))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
}

/**
 * Medicine catalog in Firestore. Seeds curated catalog once when empty.
 * Falls back to the bundled catalog if Firestore is unreachable / rules deny.
 */
export class FirebaseMedicineRepository implements MedicineRepository {
  readonly collectionName = COLLECTIONS.medicines

  private async ensureSeeded(): Promise<void> {
    if (seedPromise) return seedPromise
    seedPromise = (async () => {
      const db = requireFirestore()
      const snap = await getDocs(query(collectionRef(COLLECTIONS.medicines)))
      if (!snap.empty) return

      await Promise.all(
        MEDICINE_CATALOG.map(async (entry) => {
          const ref = doc(db, COLLECTIONS.medicines, entry.id)
          await setDoc(
            ref,
            stripUndefined({
              genericName: entry.genericName,
              strength: entry.strength,
              dosageForm: entry.dosageForm,
              volume: entry.volume || '',
              displayName: entry.displayName,
              category: entry.category,
              identityKey: medicineIdentityKey(
                entry.genericName,
                entry.strength,
                entry.dosageForm,
                entry.volume,
              ),
              isActive: entry.isActive,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }),
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

  async list(filter?: MedicineFilter): Promise<Medicine[]> {
    try {
      await this.ensureSeeded()
      const snap = await getDocs(collectionRef(COLLECTIONS.medicines))
      const rows = snap.docs
        .map((d) => mapMedicine(d.id, d.data() as Record<string, unknown>))
        .filter((medicine) => matchesFilter(medicine, filter))
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
      return rows.length ? rows : catalogFallback(filter)
    } catch {
      return catalogFallback(filter)
    }
  }

  async getById(id: string): Promise<Medicine | null> {
    try {
      await this.ensureSeeded()
      const snap = await getDoc(docRef(COLLECTIONS.medicines, id))
      if (snap.exists()) {
        return mapMedicine(snap.id, snap.data() as Record<string, unknown>)
      }
    } catch {
      // fall through to catalog
    }
    return catalogFallback().find((medicine) => medicine.id === id) ?? null
  }

  async search(queryText: string): Promise<Medicine[]> {
    return this.list({ query: queryText, isActive: true })
  }

  async create(input: CreateMedicineInput): Promise<Medicine> {
    const id = newDocId('med')
    const payload = stripUndefined({
      genericName: input.genericName.trim(),
      strength: input.strength.trim(),
      dosageForm: input.dosageForm.trim(),
      volume: input.volume?.trim() || '',
      displayName:
        input.displayName?.trim() ||
        buildMedicineDisplayName(
          input.genericName,
          input.strength,
          input.dosageForm,
          input.volume,
        ),
      category: input.category,
      identityKey: medicineIdentityKey(
        input.genericName,
        input.strength,
        input.dosageForm,
        input.volume,
      ),
      isActive: input.isActive ?? true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    await setDoc(docRef(COLLECTIONS.medicines, id), payload)
    const created = await this.getById(id)
    if (!created) throw new Error('Failed to create medicine.')
    return created
  }

  async update(id: string, input: UpdateMedicineInput): Promise<Medicine> {
    const existing = await this.getById(id)
    if (!existing) throw new Error(`Medicine ${id} not found.`)

    const genericName = input.genericName?.trim() ?? existing.genericName
    const strength = input.strength?.trim() ?? existing.strength
    const dosageForm = input.dosageForm?.trim() ?? existing.dosageForm
    const volume =
      input.volume !== undefined ? input.volume?.trim() || '' : existing.volume

    await updateDoc(
      docRef(COLLECTIONS.medicines, id),
      stripUndefined({
        genericName,
        strength,
        dosageForm,
        volume,
        displayName: buildMedicineDisplayName(genericName, strength, dosageForm, volume),
        identityKey: medicineIdentityKey(genericName, strength, dosageForm, volume),
        isActive: input.isActive ?? existing.isActive,
        category: input.category ?? existing.category,
        updatedAt: serverTimestamp(),
      }),
    )
    const updated = await this.getById(id)
    if (!updated) throw new Error(`Medicine ${id} not found after update.`)
    return updated
  }

  async findByIdentity(
    genericName: string,
    strength: string,
    dosageForm: string,
    volume = '',
  ): Promise<Medicine | null> {
    await this.ensureSeeded()
    const key = medicineIdentityKey(genericName, strength, dosageForm, volume)
    const snap = await getDocs(
      query(collectionRef(COLLECTIONS.medicines), where('identityKey', '==', key)),
    )
    const first = snap.docs[0]
    if (!first) return null
    return mapMedicine(first.id, first.data() as Record<string, unknown>)
  }
}

export const medicineRepository = new FirebaseMedicineRepository()
