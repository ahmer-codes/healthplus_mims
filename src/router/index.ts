import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/login',
    component: AuthLayout,
    meta: { public: true },
    children: [
      {
        path: '',
        name: 'login',
        component: () => import('@/pages/auth/LoginPage.vue'),
        meta: { title: 'Sign in', public: true },
      },
    ],
  },
  {
    path: '/',
    component: AppLayout,
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/pages/dashboard/DashboardPage.vue'),
        meta: { title: 'Dashboard' },
      },
      {
        path: 'stock/stock-in',
        name: 'stock-in',
        component: () => import('@/pages/stock/StockInPage.vue'),
        meta: { title: 'Stock In' },
      },
      {
        path: 'stock/allocate',
        name: 'stock-allocate',
        component: () => import('@/pages/stock/AllocatePage.vue'),
        meta: { title: 'Allocate Stock' },
      },
      {
        path: 'stock/transfer',
        name: 'stock-transfer',
        component: () => import('@/pages/stock/TransferPage.vue'),
        meta: { title: 'Stock Transfer' },
      },
      {
        path: 'stock/batches',
        name: 'stock-batches',
        component: () => import('@/pages/stock/BatchesPage.vue'),
        meta: { title: 'Batches' },
      },
      {
        path: 'reports/stock-in',
        name: 'reports-stock-in',
        component: () => import('@/pages/reports/StockInReportPage.vue'),
        meta: { title: 'Stock In Report' },
      },
      {
        path: 'reports/allocate',
        name: 'reports-allocate',
        component: () => import('@/pages/reports/AllocateReportPage.vue'),
        meta: { title: 'Allocation Report' },
      },
      {
        path: 'reports/transfers',
        name: 'reports-transfers',
        component: () => import('@/pages/reports/TransfersReportPage.vue'),
        meta: { title: 'Transfers Report' },
      },
      {
        path: 'expiry',
        name: 'expiry',
        component: () => import('@/pages/expiry/ExpiryPage.vue'),
        meta: { title: 'Expiry Watch' },
      },
      {
        path: 'contacts',
        name: 'contacts',
        component: () => import('@/pages/contacts/ContactsPage.vue'),
        meta: { title: 'Contacts' },
      },
      {
        path: 'demands',
        name: 'demands',
        component: () => import('@/pages/demands/DemandsPage.vue'),
        meta: { title: 'Medicine Demands' },
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/pages/settings/SettingsPage.vue'),
        meta: { title: 'Settings' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.afterEach((to) => {
  const title = typeof to.meta.title === 'string' ? to.meta.title : 'Medicine Inventory'
  document.title = `${title} | HealthPlus`
})

export default router
