import type { User } from 'firebase/auth'
import { resolveAuthAccountByEmail, type AuthAccountMapping } from '@/constants'
import { isFirebaseConfigured } from '@/firebase'
import { authRepository, userRepository } from '@/repositories'
import type { UserProfile } from '@/types'
import { normalizeAuthError } from '@/utils'

export class AuthServiceError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'AuthServiceError'
    this.code = code
  }
}

function requireMappingForEmail(email: string): AuthAccountMapping {
  const mapping = resolveAuthAccountByEmail(email)
  if (!mapping) {
    throw new AuthServiceError('auth/invalid-credential', 'Invalid email or password.')
  }
  return mapping
}

function buildProfile(user: User, mapping: AuthAccountMapping): UserProfile {
  const createdAt = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toISOString()
    : new Date().toISOString()
  const updatedAt = user.metadata.lastSignInTime
    ? new Date(user.metadata.lastSignInTime).toISOString()
    : createdAt

  return {
    id: user.uid,
    username: mapping.username,
    displayName: mapping.displayName,
    role: mapping.role,
    email: user.email ?? mapping.firebaseEmail,
    isActive: true,
    createdAt,
    updatedAt,
  }
}

/**
 * Resolves a Firebase user into an application UserProfile via the
 * authorized-email allowlist.
 */
export function profileFromFirebaseUser(user: User): UserProfile | null {
  const email = user.email
  if (!email) return null

  const mapping = resolveAuthAccountByEmail(email)
  if (!mapping) return null

  return buildProfile(user, mapping)
}

export const authService = {
  isConfigured(): boolean {
    return isFirebaseConfigured()
  },

  /**
   * Sign in with email + password.
   * Password verification is performed exclusively by Firebase Authentication.
   * Only emails listed in AUTH_ACCOUNT_MAPPINGS (via VITE_DEMO_AUTH_EMAIL) are allowed.
   */
  async login(email: string, password: string): Promise<UserProfile> {
    if (!email.trim()) {
      throw new AuthServiceError('auth/validation', 'Email is required.')
    }
    if (!password) {
      throw new AuthServiceError('auth/validation', 'Password is required.')
    }
    if (!isFirebaseConfigured()) {
      throw new AuthServiceError(
        'auth/not-configured',
        'Authentication is not configured. Add Firebase credentials to your environment.',
      )
    }

    const mapping = requireMappingForEmail(email)

    try {
      const credential = await authRepository.signInWithEmail(mapping.firebaseEmail, password)
      const profile = profileFromFirebaseUser(credential.user)
      if (!profile) {
        await authRepository.signOut()
        throw new AuthServiceError(
          'auth/unmapped-account',
          'This account is not authorized for Medicine Inventory.',
        )
      }

      // Persist role/profile for Firestore security rules (users/{uid}).
      try {
        await userRepository.upsertProfile(profile)
      } catch {
        // Profile upsert is best-effort; auth session remains valid.
      }

      return profile
    } catch (error) {
      if (error instanceof AuthServiceError) throw error
      const normalized = normalizeAuthError(error)
      throw new AuthServiceError(normalized.code, normalized.message)
    }
  },

  async logout(): Promise<void> {
    if (!isFirebaseConfigured()) return
    try {
      await authRepository.signOut()
    } catch (error) {
      const normalized = normalizeAuthError(error)
      throw new AuthServiceError(normalized.code, normalized.message)
    }
  },

  subscribe(callback: (profile: UserProfile | null) => void): () => void {
    if (!isFirebaseConfigured()) {
      callback(null)
      return () => undefined
    }

    return authRepository.onAuthStateChanged(async (user) => {
      if (!user) {
        callback(null)
        return
      }
      const profile = profileFromFirebaseUser(user)
      if (profile) {
        try {
          await userRepository.upsertProfile(profile)
        } catch {
          // best-effort
        }
      }
      callback(profile)
    })
  },

  async ensureReady(): Promise<void> {
    await authRepository.ensureReady()
  },
}
