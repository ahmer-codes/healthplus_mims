import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores'
import type { UserRole } from '@/types'

export function useAuth() {
  const store = useAuthStore()
  const router = useRouter()
  const { user, initialized, loading, error, isAuthenticated, role } = storeToRefs(store)

  async function login(email: string, password: string) {
    const ok = await store.login(email, password)
    if (ok) {
      const redirect =
        typeof router.currentRoute.value.query.redirect === 'string'
          ? router.currentRoute.value.query.redirect
          : '/dashboard'
      await router.replace(redirect || '/dashboard')
    }
    return ok
  }

  async function logout() {
    await store.logout()
    await router.replace('/login')
  }

  function hasRole(...roles: UserRole[]) {
    return store.hasRole(...roles)
  }

  return {
    user,
    initialized,
    loading,
    error,
    isAuthenticated,
    role,
    login,
    logout,
    hasRole,
    clearError: store.clearError,
    init: store.init,
  }
}
