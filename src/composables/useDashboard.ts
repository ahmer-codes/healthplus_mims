import { computed, onMounted, ref } from 'vue'
import { dashboardService } from '@/services'
import type { DashboardSnapshot } from '@/types'

export function useDashboard() {
  const snapshot = ref<DashboardSnapshot | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)

  const hasExpiryChart = computed(() => (snapshot.value?.expiryOverview.length ?? 0) > 0)
  const hasDistribution = computed(() => (snapshot.value?.stockByLocation.length ?? 0) > 0)
  const hasMovement = computed(() => (snapshot.value?.movementSeries.length ?? 0) > 0)
  const hasUpcoming = computed(() => (snapshot.value?.upcomingExpiry.length ?? 0) > 0)
  const hasLowStock = computed(() => (snapshot.value?.lowStock.length ?? 0) > 0)
  const hasActivity = computed(() => (snapshot.value?.recentActivity.length ?? 0) > 0)

  async function load() {
    loading.value = true
    error.value = null
    try {
      snapshot.value = await dashboardService.getSnapshot()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unable to load dashboard.'
      snapshot.value = null
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    void load()
  })

  return {
    snapshot,
    loading,
    error,
    hasExpiryChart,
    hasDistribution,
    hasMovement,
    hasUpcoming,
    hasLowStock,
    hasActivity,
    reload: load,
  }
}
