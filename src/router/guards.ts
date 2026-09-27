import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    /** When true, route is accessible without authentication. */
    public?: boolean
    /** Optional role gate for future permission checks. */
    roles?: Array<'admin' | 'pharmacist' | 'staff'>
  }
}

/**
 * Registers global navigation guards for authentication.
 * Must be called after Pinia is installed.
 */
export function setupRouterGuards(router: Router): void {
  router.beforeEach(async (to) => {
    const auth = useAuthStore()

    if (!auth.initialized) {
      await auth.init()
    }

    const isPublic = to.matched.some((record) => record.meta.public === true)
    const isLoginRoute = to.name === 'login' || to.path === '/login'

    if (!auth.isAuthenticated && !isPublic) {
      return {
        path: '/login',
        query: to.fullPath !== '/' ? { redirect: to.fullPath } : undefined,
      }
    }

    if (auth.isAuthenticated && isLoginRoute) {
      return { path: '/dashboard' }
    }

    // Soft role gate. ready for future permission wiring.
    const requiredRoles = to.meta.roles
    if (requiredRoles?.length && auth.user && !auth.hasRole(...requiredRoles)) {
      return { path: '/dashboard' }
    }

    return true
  })
}
