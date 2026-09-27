import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import type { UserProfile } from '@/types'
import { COLLECTIONS } from './firebase/collections'
import { requireFirestore, stripUndefined, toIsoTimestamp } from './firebase/firestore'

/**
 * Application user profiles in Firestore (`users/{uid}`).
 * Auth identity remains Firebase Auth; this stores role/display metadata.
 */
export class UserRepository {
  async getById(id: string): Promise<UserProfile | null> {
    const db = requireFirestore()
    const snap = await getDoc(doc(db, COLLECTIONS.users, id))
    if (!snap.exists()) return null
    const data = snap.data() as Record<string, unknown>
    return {
      id: snap.id,
      username: String(data.username ?? ''),
      displayName: String(data.displayName ?? ''),
      role: data.role as UserProfile['role'],
      email: String(data.email ?? ''),
      isActive: data.isActive !== false,
      createdAt: toIsoTimestamp(data.createdAt),
      updatedAt: toIsoTimestamp(data.updatedAt),
    }
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    return null
  }

  /** Upsert profile after successful login (creates users/{uid} for security rules). */
  async upsertProfile(profile: UserProfile): Promise<UserProfile> {
    const db = requireFirestore()
    const ref = doc(db, COLLECTIONS.users, profile.id)
    const existing = await getDoc(ref)

    await setDoc(
      ref,
      stripUndefined({
        username: profile.username,
        displayName: profile.displayName,
        role: profile.role,
        email: profile.email,
        isActive: profile.isActive,
        createdAt: existing.exists() ? existing.data()?.createdAt ?? serverTimestamp() : serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
      { merge: true },
    )

    return (await this.getById(profile.id)) ?? profile
  }
}

export const userRepository = new UserRepository()
