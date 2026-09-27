import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authService, AuthServiceError } from '@/services'
import type { UserProfile, UserRole } from '@/types'

/**
 * Auth session state. Persistence is owned by Firebase Auth.
 * Do not store passwords or credentials here.
 */
export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserProfile | null>(null)
  const initialized = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  let unsubscribe: (() => void) | null = null
  let initPromise: Promise<void> | null = null

  const isAuthenticated = computed(() => user.value !== null)
  const role = computed(() => user.value?.role ?? null)

  function setUser(profile: UserProfile | null) {
    user.value = profile
  }

  function clearError() {
    error.value = null
  }

  function hasRole(...roles: UserRole[]): boolean {
    if (!user.value) return false
    return roles.includes(user.value.role)
  }

  /**
   * Subscribe to Firebase auth state once. Safe to call repeatedly.
   */
  function init(): Promise<void> {
    if (initPromise) return initPromise

    initPromise = (async () => {
      await authService.ensureReady()

      await new Promise<void>((resolve) => {
        unsubscribe?.()
        unsubscribe = authService.subscribe((profile) => {
          user.value = profile
          if (!initialized.value) {
            initialized.value = true
            resolve()
          }
        })

        if (!authService.isConfigured() && !initialized.value) {
          initialized.value = true
          resolve()
        }
      })
    })()

    return initPromise
  }

  async function login(email: string, password: string): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const profile = await authService.login(email, password)
      user.value = profile
      return true
    } catch (err) {
      user.value = null
      if (err instanceof AuthServiceError) {
        error.value = err.message
      } else {
        error.value = 'Unable to sign in. Please try again.'
      }
      return false
    } finally {
      loading.value = false
    }
  }

  async function logout(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await authService.logout()
      user.value = null
    } catch (err) {
      if (err instanceof AuthServiceError) {
        error.value = err.message
      } else {
        error.value = 'Unable to sign out. Please try again.'
      }
      // Clear local session even if remote sign-out fails.
      user.value = null
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    initialized,
    loading,
    error,
    isAuthenticated,
    role,
    setUser,
    clearError,
    hasRole,
    init,
    login,
    logout,
  }
})
