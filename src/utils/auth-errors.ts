import { FirebaseError } from 'firebase/app'

export interface AuthErrorInfo {
  code: string
  message: string
}

/**
 * Normalize Firebase Auth (and unknown) errors into stable UI messages.
 * Never reveal whether an email or password specifically failed.
 */
export function normalizeAuthError(error: unknown): AuthErrorInfo {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-email':
      case 'auth/user-disabled':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
      case 'auth/invalid-login-credentials':
        return {
          code: error.code,
          message: 'Invalid email or password.',
        }
      case 'auth/too-many-requests':
        return {
          code: error.code,
          message: 'Too many attempts. Please wait a moment and try again.',
        }
      case 'auth/network-request-failed':
        return {
          code: error.code,
          message: 'Network error. Check your connection and try again.',
        }
      case 'auth/operation-not-allowed':
        return {
          code: error.code,
          message: 'Email/password sign-in is not enabled for this project.',
        }
      default:
        return {
          code: error.code,
          message: 'Unable to sign in. Please try again.',
        }
    }
  }

  if (error instanceof Error && error.message) {
    return { code: 'app/error', message: error.message }
  }

  return {
    code: 'app/unknown',
    message: 'Unable to sign in. Please try again.',
  }
}
