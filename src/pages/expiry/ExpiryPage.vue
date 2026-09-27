<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { FileDown } from '@lucide/vue'
import AppButton from '@/components/common/AppButton.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ChartPanel from '@/components/charts/ChartPanel.vue'
import ExpiryHorizonChart from '@/components/charts/ExpiryHorizonChart.vue'
import ExpiryFilters from '@/components/expiry/ExpiryFilters.vue'
import ExpirySummaryCards from '@/components/expiry/ExpirySummaryCards.vue'
import ExpiryTable from '@/components/expiry/ExpiryTable.vue'
import ExpiryWindowToggle from '@/components/expiry/ExpiryWindowToggle.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import LoadingState from '@/components/feedback/LoadingState.vue'
import type { ExpiryWatchMonths } from '@/constants'
import { useAppPage, useAuth, useToast } from '@/composables'
import {
  DomainError,
  expiryService,
  type ExpiryWatchBoard,
  type ExpiryWatchFilter,
} from '@/services'

const { setPage } = useAppPage()
const { user } = useAuth()
const toast = useToast()

const windowMonths = ref<ExpiryWatchMonths>(3)
const filters = ref<Omit<ExpiryWatchFilter, 'windowMonths'>>({})
const board = ref<ExpiryWatchBoard | null>(null)
const loading = ref(true)
const exporting = ref(false)

const query = computed<ExpiryWatchFilter>(() => ({
  windowMonths: windowMonths.value,
  ...filters.value,
}))

const windowLabel = computed(() => {
  const found = expiryService.windows.find((w) => w.months === windowMonths.value)
  return found?.label ?? 'Window'
})

function bandColor(status: string): string {
  const dark =
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  if (status === 'expired') return dark ? '#e85a6f' : '#c41e3a'
  if (status === 'critical') return dark ? '#e0a04a' : '#b45309'
  if (status === 'expiring_soon') return dark ? '#c4a574' : '#a16207'
  return dark ? '#8b93a3' : '#64748b'
}

async function load() {
  loading.value = true
  try {
    board.value = await expiryService.getBoard(query.value)
  } catch (error) {
    toast.error(
      'Could not load expiry board',
      error instanceof Error ? error.message : 'Unexpected error',
    )
  } finally {
    loading.value = false
  }
}

async function onExport() {
  if (!user.value) {
    toast.error('Sign in required', 'Sign in to export the expiry report.')
    return
  }
  exporting.value = true
  try {
    await expiryService.exportPdf({
      filter: query.value,
      preparedBy: user.value,
    })
    toast.success('Expiry report exported', `Window: ${windowLabel.value}`)
  } catch (error) {
    toast.error(
      'Export failed',
      error instanceof DomainError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Unexpected error',
    )
  } finally {
    exporting.value = false
  }
}

onMounted(() => {
  setPage({
    title: 'Expiry Management',
    subtitle: 'FEFO watch for dispensary rotation',
    breadcrumbs: [{ label: 'Home', to: '/dashboard' }, { label: 'Expiry' }],
  })
  void load()
})

watch(query, () => void load(), { deep: true })
</script>

<template>
  <div class="space-y-5 lg:space-y-6">
    <PageHeader
      title="Expiry Management"
      description="Identify batches approaching expiry by configurable watch windows. Prioritise the most urgent lots for rotation or return."
    >
      <template #actions>
        <AppButton variant="outline" :loading="exporting" @click="onExport">
          <FileDown class="size-4" />
          Export PDF
        </AppButton>
      </template>
    </PageHeader>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-xs font-medium uppercase tracking-[0.06em] text-ink-muted">Watch window</p>
        <p class="text-sm text-ink-secondary mt-1">
          Showing batches within
          <span class="font-medium text-ink">{{ windowLabel }}</span>
          plus already expired stock.
        </p>
      </div>
      <ExpiryWindowToggle v-model="windowMonths" />
    </div>

    <ExpirySummaryCards
      :summary="
        board?.summary ?? {
          within1Month: 0,
          within3Months: 0,
          within6Months: 0,
          alreadyExpired: 0,
          quantityWithin1Month: 0,
          quantityWithin3Months: 0,
          quantityWithin6Months: 0,
          quantityExpired: 0,
        }
      "
      :loading="loading"
    />

    <ExpiryFilters v-model="filters" />

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <ChartPanel
        title="Quantity by medicine & urgency"
        description="Stacked remaining units: amber for near-term risk, red only for expired stock"
        height="20rem"
      >
        <ExpiryHorizonChart
          v-if="board?.medicineQuantities.length"
          :items="board.medicineQuantities"
        />
        <EmptyState
          v-else
          title="No quantity to chart"
          description="Adjust the watch window or filters to see approaching-expiry quantities."
        />
      </ChartPanel>

      <section class="surface-panel p-4 sm:p-5 space-y-4">
        <div>
          <h2 class="text-sm font-semibold text-ink">Urgency quantity mix</h2>
          <p class="text-xs text-ink-muted mt-0.5">
            Remaining units in the current window, grouped by watch status
          </p>
        </div>
        <div v-if="board?.chartBands.length" class="space-y-3">
          <div
            class="flex h-2.5 overflow-hidden rounded-[var(--radius-sm)] bg-surface-muted"
            role="img"
            :aria-label="`Quantity mix for ${windowLabel}`"
          >
            <div
              v-for="band in board.chartBands"
              :key="band.status"
              class="h-full transition-[width]"
              :style="{
                width: `${(band.quantity / board.chartBands.reduce((s, b) => s + b.quantity, 0)) * 100}%`,
                backgroundColor: bandColor(band.status),
              }"
            />
          </div>
          <ul class="space-y-2">
            <li
              v-for="band in board.chartBands"
              :key="band.status"
              class="flex items-center justify-between gap-3 text-sm"
            >
              <span class="flex items-center gap-2 text-ink-secondary">
                <span
                  class="size-2.5 rounded-full"
                  :style="{
                    backgroundColor: bandColor(band.status),
                  }"
                />
                {{ band.label }}
              </span>
              <span class="font-semibold tabular-nums text-ink">{{ band.quantity }}</span>
            </li>
          </ul>
        </div>
        <EmptyState
          v-else
          title="No urgency bands"
          description="Batches in this window will summarise here by status."
        />
      </section>
    </div>

    <div class="space-y-3">
      <div class="flex items-end justify-between gap-3">
        <div>
          <h2 class="text-sm font-semibold text-ink">Expiry detail</h2>
          <p class="text-xs text-ink-muted mt-0.5">
            Most urgent batches first ·
            <span class="tabular-nums">{{ board?.rows.length ?? 0 }}</span> listed
          </p>
        </div>
      </div>
      <div v-if="loading" class="surface-panel">
        <LoadingState label="Loading expiry board…" />
      </div>
      <ExpiryTable v-else :rows="board?.rows ?? []" />
    </div>
  </div>
</template>
