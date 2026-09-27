<script setup lang="ts">
import { ArrowLeftRight, FileChartColumn, PackageMinus, PackagePlus } from '@lucide/vue'
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { format } from 'date-fns'
import ChartPanel from '@/components/charts/ChartPanel.vue'
import ExpiryOverviewChart from '@/components/charts/ExpiryOverviewChart.vue'
import InventoryMovementChart from '@/components/charts/InventoryMovementChart.vue'
import StockDistributionChart from '@/components/charts/StockDistributionChart.vue'
import StockHealthChart from '@/components/charts/StockHealthChart.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import LoadingState from '@/components/feedback/LoadingState.vue'
import { useAppPage, useDashboard } from '@/composables'
import { cn, formatDate, formatQuantity, formatRelative } from '@/utils'
import type { DashboardMetric } from '@/types'

const { setPage } = useAppPage()
const {
  snapshot,
  loading,
  error,
  hasExpiryChart,
  hasDistribution,
  hasMovement,
  hasUpcoming,
  hasLowStock,
  hasActivity,
  reload,
} = useDashboard()

const todayLabel = computed(() => format(new Date(), 'EEEE, d MMMM yyyy'))

const featuredMetric = computed(
  () => snapshot.value?.metrics.find((metric) => metric.id === 'value') ?? null,
)
const secondaryMetrics = computed(
  () => snapshot.value?.metrics.filter((metric) => metric.id !== 'value') ?? [],
)

const quickActions = [
  { label: 'Stock In', to: '/stock/stock-in', icon: PackagePlus },
  { label: 'Allocate', to: '/stock/allocate', icon: PackageMinus },
  { label: 'Transfer Stock', to: '/stock/transfer', icon: ArrowLeftRight },
  { label: 'Generate Report', to: '/reports/stock-in', icon: FileChartColumn },
]

const activityIcon = {
  stock_in: PackagePlus,
  allocation: PackageMinus,
  transfer: ArrowLeftRight,
} as const

onMounted(() => {
  setPage({
    title: 'Dashboard',
    subtitle: 'Dispensary operations at a glance',
    breadcrumbs: [{ label: 'Home', to: '/dashboard' }, { label: 'Dashboard' }],
  })
})

function metricToneClass(metric: DashboardMetric) {
  if (metric.tone === 'warning') return 'border-warning/25'
  if (metric.tone === 'danger') return 'border-danger/25'
  if (metric.tone === 'success') return 'border-success/20'
  return ''
}

function metricBarClass(metric: DashboardMetric) {
  if (metric.tone === 'warning') return 'bg-warning'
  if (metric.tone === 'danger') return 'bg-danger'
  if (metric.tone === 'success') return 'bg-success'
  if (metric.tone === 'brand') return 'bg-primary'
  return 'bg-neutral'
}

/** Soft relative fill for KPI meter (log-ish so large values don't always fill 100%). */
function metricShare(metric: DashboardMetric) {
  const v = Math.max(0, metric.value)
  if (v <= 0) return 0
  return Math.min(1, Math.log10(v + 1) / Math.log10(1000))
}
</script>

<template>
  <div class="space-y-6 lg:space-y-7">
    <header class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="min-w-0">
        <p class="text-xs font-medium uppercase tracking-[0.08em] text-ink-muted">
          {{ todayLabel }}
        </p>
        <h1 class="mt-1 text-display text-xl sm:text-2xl font-semibold tracking-tight text-ink">
          Dispensary overview
        </h1>
        <p class="mt-1.5 max-w-xl text-sm text-ink-muted leading-relaxed">
          What needs attention in the HealthPlus medicine inventory right now: stock health,
          expiry risk, and recent movements.
        </p>
      </div>

      <nav class="flex flex-wrap gap-2" aria-label="Quick actions">
        <RouterLink
          v-for="action in quickActions"
          :key="action.to"
          :to="action.to"
          :class="
            cn(
              'inline-flex h-9 items-center gap-2 rounded-[var(--radius-md)] px-3 text-sm font-medium transition-colors',
              'border border-border bg-surface text-ink hover:bg-surface-muted',
            )
          "
        >
          <component :is="action.icon" class="size-3.5" aria-hidden="true" />
          {{ action.label }}
        </RouterLink>
      </nav>
    </header>

    <LoadingState v-if="loading" label="Loading dispensary overview…" />
    <ErrorState v-else-if="error" :message="error" @retry="reload" />

    <template v-else-if="snapshot">
      <p v-if="snapshot.source === 'live'" class="text-[11px] text-ink-faint">
        Live Firestore inventory. Metrics update after Stock In, Allocate, and Transfer.
      </p>
      <p v-else class="text-[11px] text-ink-faint">
        Firebase is not configured. Add root <code class="text-[10px]">.env.local</code> and sign in
        to load live data.
      </p>

      <!-- Asymmetric metrics: featured value + compact operational KPIs -->
      <section aria-label="Summary metrics" class="grid gap-3 lg:grid-cols-12">
        <article
          v-if="featuredMetric"
          class="surface-panel p-4 sm:p-5 lg:col-span-4 lg:row-span-2 flex flex-col justify-between border-brand-100 bg-[linear-gradient(165deg,var(--color-primary-subtle)_0%,var(--color-surface)_55%)]"
        >
          <div>
            <p class="text-[10px] font-medium uppercase tracking-[0.07em] text-brand-700/80">
              {{ featuredMetric.label }}
            </p>
            <p class="mt-2 text-display text-3xl sm:text-[2.15rem] font-semibold tracking-tight text-brand-700 tabular-nums leading-none">
              {{ featuredMetric.displayValue }}
            </p>
            <p class="mt-2 text-sm text-ink-muted leading-relaxed max-w-xs">
              {{ featuredMetric.hint }}
            </p>
          </div>
          <p class="mt-4 text-[11px] text-ink-faint border-t border-brand-100/80 pt-2.5">
            Based on remaining on-hand quantities × unit cost
          </p>
        </article>

        <article
          v-for="metric in secondaryMetrics"
          :key="metric.id"
          :class="cn('surface-panel px-3.5 py-3 sm:px-4 lg:col-span-4', metricToneClass(metric))"
        >
          <div class="flex items-start justify-between gap-3">
            <p class="text-[10px] font-medium uppercase tracking-[0.07em] text-ink-muted">
              {{ metric.label }}
            </p>
            <span
              v-if="metric.id === 'expiring' && metric.value > 0"
              class="rounded-[var(--radius-sm)] bg-warning-subtle px-1.5 py-0.5 text-[10px] font-medium text-warning"
            >
              6 mo
            </span>
            <span
              v-else-if="metric.id === 'low' && metric.value > 0"
              class="rounded-[var(--radius-sm)] bg-warning-subtle px-1.5 py-0.5 text-[10px] font-medium text-warning"
            >
              Action
            </span>
          </div>
          <p class="mt-1.5 text-display text-xl font-semibold tracking-tight text-ink tabular-nums leading-none">
            {{ metric.displayValue }}
          </p>
          <div
            class="mt-2.5 h-1 overflow-hidden rounded-full bg-surface-subtle"
            role="meter"
            :aria-label="`${metric.label} level`"
            :aria-valuenow="Math.round(metricShare(metric) * 100)"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div
              class="h-full rounded-full transition-[width] duration-[var(--duration-normal)]"
              :class="metricBarClass(metric)"
              :style="{ width: `${metricShare(metric) * 100}%` }"
            />
          </div>
          <p class="mt-1.5 text-[11px] text-ink-faint leading-snug truncate">{{ metric.hint }}</p>
        </article>
      </section>

      <section class="grid gap-4 xl:grid-cols-12" aria-label="Analytics">
        <div class="xl:col-span-7 min-w-0">
          <ChartPanel
            title="Upcoming expiry overview"
            description="Highest quantities approaching expiry within six months"
            height="18rem"
          >
            <div v-if="hasExpiryChart" class="h-[16rem]">
              <ExpiryOverviewChart :items="snapshot.expiryOverview" />
            </div>
            <EmptyState
              v-else
              title="No near-expiry quantities"
              description="Batches nearing expiry will appear here for rotation planning."
            />
          </ChartPanel>
        </div>

        <div class="xl:col-span-5 min-w-0">
          <ChartPanel
            title="Stock health"
            description="Batch posture across the dispensary"
            height="18rem"
          >
            <div class="h-full flex items-center">
              <StockHealthChart class="w-full" :health="snapshot.stockHealth" />
            </div>
          </ChartPanel>
        </div>

        <div class="xl:col-span-5 min-w-0">
          <ChartPanel
            title="Stock distribution"
            description="Available inventory by hospital location"
            height="17rem"
          >
            <div v-if="hasDistribution" class="h-[14.5rem]">
              <StockDistributionChart :items="snapshot.stockByLocation" />
            </div>
            <EmptyState
              v-else
              title="No location stock yet"
              description="Distribution across pharmacies and wards will show once stock is on hand."
            />
          </ChartPanel>
        </div>

        <div class="xl:col-span-7 min-w-0">
          <ChartPanel
            title="Inventory movement"
            description="Stock in, allocation, and transfer activity"
            height="17rem"
          >
            <div v-if="hasMovement" class="h-[14.5rem]">
              <InventoryMovementChart :series="snapshot.movementSeries" />
            </div>
            <EmptyState
              v-else
              title="No movement history"
              description="Recent stock-in, allocation, and transfer trends will plot here."
            />
          </ChartPanel>
        </div>
      </section>

      <section class="grid gap-4 lg:grid-cols-12" aria-label="Operational lists">
        <div class="surface-panel lg:col-span-7 overflow-hidden min-w-0">
          <div class="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
            <div>
              <h2 class="text-sm font-semibold text-ink">Upcoming expiry</h2>
              <p class="text-xs text-ink-muted mt-0.5">Nearest lots requiring rotation</p>
            </div>
            <RouterLink
              to="/expiry"
              class="text-xs font-medium text-brand-600 hover:text-brand-700 shrink-0"
            >
              View all
            </RouterLink>
          </div>

          <div v-if="hasUpcoming" class="overflow-x-auto">
            <table class="table-cols-stripe w-full min-w-[36rem] text-sm">
              <thead>
                <tr class="border-b border-border bg-surface-muted/70 text-left text-xs text-ink-muted">
                  <th class="px-4 py-2.5 font-medium sm:px-5">Medicine</th>
                  <th class="px-3 py-2.5 font-medium">Batch</th>
                  <th class="px-3 py-2.5 font-medium">Expiry</th>
                  <th class="px-3 py-2.5 font-medium text-right">Qty</th>
                  <th class="px-3 py-2.5 font-medium">Location</th>
                  <th class="px-4 py-2.5 font-medium sm:px-5">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in snapshot.upcomingExpiry"
                  :key="row.id"
                  class="border-b border-border last:border-b-0"
                >
                  <td class="px-4 py-3 sm:px-5">
                    <p class="font-medium text-ink leading-snug">{{ row.medicineName }}</p>
                    <p class="text-[11px] text-ink-faint mt-0.5">{{ row.expiryLabel }}</p>
                  </td>
                  <td class="px-3 py-3 text-ink-secondary tabular-nums">{{ row.batchNo }}</td>
                  <td class="px-3 py-3 text-ink-secondary whitespace-nowrap">
                    {{ formatDate(row.expiryDate) }}
                  </td>
                  <td class="px-3 py-3 text-right tabular-nums text-ink">
                    {{ formatQuantity(row.remainingQuantity) }}
                  </td>
                  <td class="px-3 py-3 text-ink-secondary">{{ row.locationName }}</td>
                  <td class="px-4 py-3 sm:px-5">
                    <StatusBadge :status="row.status" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <EmptyState
            v-else
            title="No upcoming expiries"
            description="Lots entering the six-month window will list here."
          />
        </div>

        <div class="lg:col-span-5 flex flex-col gap-4 min-w-0">
          <div class="surface-panel overflow-hidden">
            <div class="border-b border-border px-4 py-3 sm:px-5">
              <h2 class="text-sm font-semibold text-ink">Low stock</h2>
              <p class="text-xs text-ink-muted mt-0.5">Below configured thresholds</p>
            </div>
            <ul v-if="hasLowStock" class="divide-y divide-border">
              <li
                v-for="row in snapshot.lowStock"
                :key="`${row.medicineId}-${row.locationName}`"
                class="flex items-start justify-between gap-3 px-4 py-3 sm:px-5"
              >
                <div class="min-w-0">
                  <p class="text-sm font-medium text-ink leading-snug">{{ row.medicineName }}</p>
                  <p class="text-xs text-ink-muted mt-0.5">{{ row.locationName }}</p>
                </div>
                <div class="text-right shrink-0">
                  <p class="text-sm font-semibold tabular-nums text-warning">
                    {{ formatQuantity(row.remainingQuantity) }}
                  </p>
                  <p class="text-[11px] text-ink-faint">min {{ row.threshold }}</p>
                </div>
              </li>
            </ul>
            <EmptyState
              v-else
              title="Stock levels look healthy"
              description="Medicines under threshold will appear here for replenishment."
            />
          </div>

          <div class="surface-panel overflow-hidden flex-1">
            <div class="border-b border-border px-4 py-3 sm:px-5">
              <h2 class="text-sm font-semibold text-ink">Recent activity</h2>
              <p class="text-xs text-ink-muted mt-0.5">Latest stock movements</p>
            </div>
            <ul v-if="hasActivity" class="divide-y divide-border">
              <li v-for="item in snapshot.recentActivity" :key="item.id">
                <RouterLink
                  :to="item.href || '/dashboard'"
                  class="flex gap-3 px-4 py-3 sm:px-5 hover:bg-surface-muted/60 transition-colors"
                >
                  <span
                    class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-border bg-surface-muted text-ink-secondary"
                  >
                    <component :is="activityIcon[item.kind]" class="size-3.5" aria-hidden="true" />
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-ink leading-snug">{{ item.title }}</p>
                    <p class="text-xs text-ink-muted mt-0.5">{{ item.subtitle }}</p>
                  </div>
                  <time class="text-[11px] text-ink-faint whitespace-nowrap shrink-0">
                    {{ formatRelative(item.at) }}
                  </time>
                </RouterLink>
              </li>
            </ul>
            <EmptyState
              v-else
              title="No recent movements"
              description="Stock in, allocations, and transfers will show up as they are posted."
            />
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
