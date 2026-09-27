import {
  Timestamp,
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
  type Firestore,
  type Transaction,
} from 'firebase/firestore'
import { getFirestoreDb } from '@/firebase'
import { createEntityId } from '@/utils'
import { RepositoryError } from '../base'
import { COLLECTIONS, type CollectionName } from './collections'

export function requireFirestore(): Firestore {
  const db = getFirestoreDb()
  if (!db) {
    throw new RepositoryError(
      'repository/firebase-not-configured',
      'Firestore is not configured. Add Firebase environment variables to enable persistence.',
    )
  }
  return db
}

export function collectionRef(name: CollectionName): CollectionReference {
  return collection(requireFirestore(), name)
}

export function docRef(name: CollectionName, id: string): DocumentReference {
  return doc(requireFirestore(), name, id)
}

/** Convert Firestore Timestamp / Date / ISO string → ISO string for domain models. */
export function toIsoTimestamp(value: unknown, fallback?: string): string {
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string' && value.trim()) return value
  return fallback ?? new Date().toISOString()
}

/** Strip undefined so Firestore accepts the payload. */
export function stripUndefined<T extends Record<string, unknown>>(data: T): T {
  const next = { ...data }
  for (const key of Object.keys(next)) {
    if (next[key] === undefined) delete next[key]
  }
  return next
}

export function newDocId(prefix: string): string {
  return createEntityId(prefix)
}

/**
 * Read a document inside a transaction; throws if missing.
 */
export async function txRequireDoc(
  tx: Transaction,
  ref: DocumentReference,
  label: string,
): Promise<Record<string, unknown>> {
  const snap = await tx.get(ref)
  if (!snap.exists()) {
    throw new RepositoryError('repository/not-found', `${label} not found.`)
  }
  return snap.data() as Record<string, unknown>
}

export { COLLECTIONS, Timestamp }
