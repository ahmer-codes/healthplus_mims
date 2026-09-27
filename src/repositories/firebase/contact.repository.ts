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
import type { Contact, CreateContactInput, UpdateContactInput } from '@/types'
import type { ContactRepository } from '../contracts'
import { COLLECTIONS } from './collections'
import {
  collectionRef,
  docRef,
  newDocId,
  stripUndefined,
  toIsoTimestamp,
} from './firestore'

function mapContact(id: string, data: Record<string, unknown>): Contact {
  return {
    id,
    name: String(data.name ?? ''),
    designation: String(data.designation ?? ''),
    department: String(data.department ?? ''),
    phone: String(data.phone ?? ''),
    email: String(data.email ?? ''),
    notes: data.notes ? String(data.notes) : undefined,
    createdAt: toIsoTimestamp(data.createdAt),
    updatedAt: toIsoTimestamp(data.updatedAt),
  }
}

export class FirebaseContactRepository implements ContactRepository {
  readonly collectionName = COLLECTIONS.contacts

  async list(): Promise<Contact[]> {
    const snap = await getDocs(
      query(collectionRef(COLLECTIONS.contacts), orderBy('name', 'asc')),
    )
    return snap.docs.map((d) => mapContact(d.id, d.data() as Record<string, unknown>))
  }

  async getById(id: string): Promise<Contact | null> {
    const snap = await getDoc(docRef(COLLECTIONS.contacts, id))
    if (!snap.exists()) return null
    return mapContact(snap.id, snap.data() as Record<string, unknown>)
  }

  async create(input: CreateContactInput): Promise<Contact> {
    const id = newDocId('ctc')
    await setDoc(
      docRef(COLLECTIONS.contacts, id),
      stripUndefined({
        name: input.name.trim(),
        designation: input.designation.trim(),
        department: input.department.trim(),
        phone: input.phone.trim(),
        email: input.email.trim(),
        notes: input.notes?.trim() || undefined,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    )
    const created = await this.getById(id)
    if (!created) throw new Error('Failed to create contact.')
    return created
  }

  async update(id: string, input: UpdateContactInput): Promise<Contact> {
    const existing = await this.getById(id)
    if (!existing) throw new Error(`Contact ${id} not found.`)
    await updateDoc(
      docRef(COLLECTIONS.contacts, id),
      stripUndefined({
        name: input.name.trim(),
        designation: input.designation.trim(),
        department: input.department.trim(),
        phone: input.phone.trim(),
        email: input.email.trim(),
        notes: input.notes?.trim() || undefined,
        updatedAt: serverTimestamp(),
      }),
    )
    const updated = await this.getById(id)
    if (!updated) throw new Error(`Contact ${id} not found after update.`)
    return updated
  }

  async remove(id: string): Promise<void> {
    await deleteDoc(docRef(COLLECTIONS.contacts, id))
  }
}

export const contactRepository = new FirebaseContactRepository()
