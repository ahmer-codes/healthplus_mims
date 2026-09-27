import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type Unsubscribe,
  type User,
  type UserCredential,
} from 'firebase/auth'
import { getFirebaseAuth, getPersistedFirebaseAuth, isFirebaseConfigured } from '@/firebase'

/**
 * Firebase Auth persistence boundary.
 * Components and stores must not call Firebase Auth APIs directly.
 */
export class AuthRepository {
  async ensureReady(): Promise<void> {
    if (!isFirebaseConfigured()) return
    await getPersistedFirebaseAuth()
  }

  async signInWithEmail(email: string, password: string): Promise<UserCredential> {
    const auth = await getPersistedFirebaseAuth()
    return signInWithEmailAndPassword(auth, email, password)
  }

  async signOut(): Promise<void> {
    const auth = await getPersistedFirebaseAuth()
    await signOut(auth)
  }

  getCurrentUser(): User | null {
    return getFirebaseAuth()?.currentUser ?? null
  }

  onAuthStateChanged(callback: (user: User | null) => void): Unsubscribe {
    const auth = getFirebaseAuth()
    if (!auth) {
      callback(null)
      return () => undefined
    }
    return onAuthStateChanged(auth, callback)
  }
}

export const authRepository = new AuthRepository()
