import type { UserRole } from '@/types'

/**
 * Authorized Firebase Auth accounts for Medicine Inventory.
 *
 * Firebase verifies the password. This file only allows known emails
 * into the app and supplies display/role metadata. never stores secrets.
 *
 * Demo:
 *   Email: value of VITE_DEMO_AUTH_EMAIL (e.g. staff@hospital.com)
 *   Password: hospital  (set on the Email/Password user in Firebase Console)
 */
export interface AuthAccountMapping {
  /** Profile handle derived from the email local-part (not a separate login id). */
  username: string
  firebaseEmail: string
  displayName: string
  role: UserRole
}

function demoFirebaseEmail(): string {
  const fromEnv = import.meta.env.VITE_DEMO_AUTH_EMAIL?.trim()
  return fromEnv || 'staff@hospital.com'
}

function usernameFromEmail(email: string): string {
  const local = email.split('@')[0]?.trim().toLowerCase()
  return local || 'staff'
}

function buildDemoMapping(): AuthAccountMapping {
  const firebaseEmail = demoFirebaseEmail()
  return {
    username: usernameFromEmail(firebaseEmail),
    firebaseEmail,
    displayName: 'HealthPlus Hospital',
    role: 'admin',
  }
}

export const AUTH_ACCOUNT_MAPPINGS: readonly AuthAccountMapping[] = [buildDemoMapping()]

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** @deprecated Prefer resolveAuthAccountByEmail. login is email-based. */
export function resolveAuthAccountByUsername(username: string): AuthAccountMapping | null {
  const key = username.trim().toLowerCase()
  return AUTH_ACCOUNT_MAPPINGS.find((account) => account.username === key) ?? null
}

export function resolveAuthAccountByEmail(email: string): AuthAccountMapping | null {
  const key = normalizeEmail(email)
  return (
    AUTH_ACCOUNT_MAPPINGS.find((account) => account.firebaseEmail.toLowerCase() === key) ?? null
  )
}
