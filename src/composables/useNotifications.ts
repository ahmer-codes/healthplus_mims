import { computed, onMounted, ref } from 'vue'
import { usePreferencesStore } from '@/stores'
import { batchService, demandService, expiryService } from '@/services'
import { INVENTORY_THRESHOLDS } from '@/constants'

export type NotificationKind = 'expiry' | 'low_stock' | 'demand'

export interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  href: string
  at: string
}

export function useNotifications() {
  const preferences = usePreferencesStore()
  const items = ref<AppNotification[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const open = ref(false)

  const filtered = computed(() =>
    items.value.filter((item) => {
      if (item.kind === 'expiry' && !preferences.notifyExpiry) return false
      if (item.kind === 'low_stock' && !preferences.notifyLowStock) return false
      if (item.kind === 'demand' && !preferences.notifyDemands) return false
      return true
    }),
  )

  const unreadCount = computed(() => filtered.value.length)

  async function load() {
    loading.value = true
    error.value = null
    try {
      const next: AppNotification[] = []
      const now = new Date().toISOString()

      if (preferences.notifyExpiry) {
        try {
          const board = await expiryService.getBoard({ windowMonths: 3 })
          for (const row of board.rows.slice(0, 8)) {
            next.push({
              id: `expiry-${row.batch.id}`,
              kind: 'expiry',
              title: row.medicine.displayName,
              body: `Batch ${row.batch.batchNo} · ${row.daysRemaining}d · ${row.locationName}`,
              href: '/expiry',
              at: now,
            })
          }
        } catch {
          // ignore partial failures
        }
      }

      if (preferences.notifyLowStock) {
        try {
          const rows = await batchService.listBoard({})
          const low = rows
            .filter((row) => row.batch.remainingQuantity > 0)
            .filter((row) => row.batch.remainingQuantity <= INVENTORY_THRESHOLDS.lowStockUnits)
            .slice(0, 6)
          for (const row of low) {
            next.push({
              id: `low-${row.batch.id}`,
              kind: 'low_stock',
              title: `Low stock · ${row.medicine.displayName}`,
              body: `${row.batch.remainingQuantity} left at ${row.locationName}`,
              href: '/stock/batches',
              at: now,
            })
          }
        } catch {
          // ignore
        }
      }

      if (preferences.notifyDemands) {
        try {
          const demands = await demandService.listBoard({ status: 'pending' })
          for (const row of demands.slice(0, 6)) {
            next.push({
              id: `demand-${row.demand.id}`,
              kind: 'demand',
              title: `Demand · ${row.medicine.displayName}`,
              body: `${row.demand.requestingDepartment} · qty ${row.demand.requestedQuantity}`,
              href: '/demands',
              at: row.demand.requestDate,
            })
          }
        } catch {
          // ignore
        }
      }

      items.value = next
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unable to load notifications.'
      items.value = []
    } finally {
      loading.value = false
    }
  }

  function toggle() {
    open.value = !open.value
    if (open.value) void load()
  }

  function close() {
    open.value = false
  }

  onMounted(() => {
    // Warm cache quietly for badge count
    void load()
  })

  return {
    items: filtered,
    loading,
    error,
    open,
    unreadCount,
    load,
    toggle,
    close,
  }
}
