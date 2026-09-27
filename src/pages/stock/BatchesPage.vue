<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ConfirmDialog from '@/components/feedback/ConfirmDialog.vue'
import BatchEditModal from '@/components/stock/BatchEditModal.vue'
import BatchFilters from '@/components/stock/BatchFilters.vue'
import BatchMobileList from '@/components/stock/BatchMobileList.vue'
import BatchSummaryCards from '@/components/stock/BatchSummaryCards.vue'
import BatchTable from '@/components/stock/BatchTable.vue'
import BatchViewModal from '@/components/stock/BatchViewModal.vue'
import { useAppPage, useAuth, useToast } from '@/composables'
import {
  DomainError,
  batchService,
  locationService,
  type BatchBoardRow,
  type BatchEditInput,
  type BatchManagementQuery,
  type SensitiveBatchField,
} from '@/services'
import type { BatchBoardSummary } from '@/types'
import type { SelectOption } from '@/components/forms/AppSelect.vue'

const PAGE_SIZE = 25

const { setPage } = useAppPage()
const { hasRole } = useAuth()
const toast = useToast()
const route = useRoute()

const canManage = computed(() => hasRole('admin', 'pharmacist'))

const loading = ref(true)
const saving = ref(false)
const rows = ref<BatchBoardRow[]>([])
const summary = ref<BatchBoardSummary>({
  total: 0,
  available: 0,
  hold: 0,
  expiringSoon: 0,
  expired: 0,
  depleted: 0,
})
const filters = ref<BatchManagementQuery>({
  query: '',
  expiry: 'all',
  sortBy: 'expiryDate',
  sortDir: 'asc',
})
const page = ref(1)
const locationOptions = ref<SelectOption[]>([])

const viewOpen = ref(false)
const editOpen = ref(false)
const activeRow = ref<BatchBoardRow | null>(null)

const confirmOpen = ref(false)
const confirmTitle = ref('')
const confirmDescription = ref('')
const confirmAction = ref<null | (() => Promise<void>)>(null)

const totalPages = computed(() => Math.max(1, Math.ceil(rows.value.length / PAGE_SIZE)))
const pagedRows = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return rows.value.slice(start, start + PAGE_SIZE)
})

async function load() {
  loading.value = true
  try {
    const [board, boardSummary] = await Promise.all([
      batchService.listBoard(filters.value),
      batchService.getBoardSummary(),
    ])
    rows.value = board
    summary.value = boardSummary
    if (page.value > totalPages.value) page.value = totalPages.value
  } catch (error) {
    toast.error(
      'Could not load batches',
      error instanceof Error ? error.message : 'Unexpected error',
    )
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  setPage({
    title: 'Batches',
    subtitle: 'Operational inventory by medicine lot',
    breadcrumbs: [
      { label: 'Home', to: '/dashboard' },
      { label: 'Stock' },
      { label: 'Batches' },
    ],
  })
  const q = typeof route.query.q === 'string' ? route.query.q.trim() : ''
  if (q) filters.value = { ...filters.value, query: q }
  const locations = await locationService.list(true)
  locationOptions.value = locations.map((l) => ({
    value: l.id,
    label: `${l.name} (${l.code})`,
  }))
  await load()
})

watch(
  () => route.query.q,
  (value) => {
    const q = typeof value === 'string' ? value.trim() : ''
    if (q !== (filters.value.query ?? '')) {
      filters.value = { ...filters.value, query: q }
    }
  },
)

watch(
  filters,
  () => {
    page.value = 1
    void load()
  },
  { deep: true },
)

function onSort(key: string) {
  const map: Record<string, BatchManagementQuery['sortBy']> = {
    medicine: 'medicine',
    batchNo: 'batchNo',
    expiryDate: 'expiryDate',
    remainingQuantity: 'remainingQuantity',
    status: 'status',
    location: 'location',
    manufacturer: 'manufacturer',
  }
  const sortBy = map[key] ?? 'expiryDate'
  if (filters.value.sortBy === sortBy) {
    filters.value = {
      ...filters.value,
      sortDir: filters.value.sortDir === 'asc' ? 'desc' : 'asc',
    }
  } else {
    filters.value = { ...filters.value, sortBy, sortDir: 'asc' }
  }
}

function openView(row: BatchBoardRow) {
  activeRow.value = row
  viewOpen.value = true
}

function openEdit(row: BatchBoardRow) {
  activeRow.value = row
  viewOpen.value = false
  editOpen.value = true
}

function askConfirm(title: string, description: string, action: () => Promise<void>) {
  confirmTitle.value = title
  confirmDescription.value = description
  confirmAction.value = action
  confirmOpen.value = true
}

async function onConfirm() {
  if (!confirmAction.value) return
  saving.value = true
  try {
    await confirmAction.value()
    confirmOpen.value = false
    await load()
  } catch (error) {
    toast.error(
      'Action failed',
      error instanceof DomainError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Unexpected error',
    )
  } finally {
    saving.value = false
  }
}

function onToggleHold(row: BatchBoardRow) {
  const hold = row.batch.status !== 'hold'
  askConfirm(
    hold ? 'Place batch on hold' : 'Make batch available',
    hold
      ? `Batch ${row.batch.batchNo} will be excluded from allocation and transfer selectors. Quantity is preserved.`
      : `Batch ${row.batch.batchNo} will become allocatable again if it is in date and has remaining quantity.`,
    async () => {
      await batchService.setHold(row.batch.id, hold)
      toast.success(
        hold ? 'Batch on hold' : 'Batch available',
        `${row.batch.batchNo} status updated.`,
      )
    },
  )
}

function onRemove(row: BatchBoardRow) {
  askConfirm(
    'Delete batch',
    `Delete ${row.medicine.displayName} / ${row.batch.batchNo}? If this lot appears in historical vouchers, it will be soft-deleted so records stay meaningful.`,
    async () => {
      const result = await batchService.remove(row.batch.id)
      toast.success(
        result.mode === 'soft' ? 'Batch archived' : 'Batch deleted',
        result.mode === 'soft'
          ? 'Historical references were preserved.'
          : 'Batch removed from inventory.',
      )
    },
  )
}

async function onSaveEdit(payload: {
  input: BatchEditInput
  confirmed: boolean
  sensitiveFields: SensitiveBatchField[]
}) {
  if (!activeRow.value) return
  saving.value = true
  try {
    await batchService.applyEdit(activeRow.value.batch.id, payload.input, payload.confirmed)
    editOpen.value = false
    toast.success('Batch updated', activeRow.value.batch.batchNo)
    await load()
  } catch (error) {
    toast.error(
      'Could not save',
      error instanceof DomainError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Unexpected error',
    )
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-5 lg:space-y-6">
    <PageHeader
      title="Batch Management"
      description="Inspect, hold, and correct medicine lots across HealthPlus locations. Held batches remain visible here but cannot be allocated."
    />

    <BatchSummaryCards :summary="summary" :loading="loading" />

    <BatchFilters v-model="filters" />

    <div class="flex items-center justify-between gap-3 text-xs text-ink-muted">
      <p>
        Showing
        <span class="font-medium text-ink tabular-nums">{{ pagedRows.length }}</span>
        of
        <span class="font-medium text-ink tabular-nums">{{ rows.length }}</span>
        batches
        <span v-if="loading">· Loading…</span>
      </p>
      <div v-if="totalPages > 1" class="flex items-center gap-2">
        <AppButton
          size="sm"
          variant="outline"
          :disabled="page <= 1"
          @click="page -= 1"
        >
          Previous
        </AppButton>
        <span class="tabular-nums">{{ page }} / {{ totalPages }}</span>
        <AppButton
          size="sm"
          variant="outline"
          :disabled="page >= totalPages"
          @click="page += 1"
        >
          Next
        </AppButton>
      </div>
    </div>

    <BatchTable
      :rows="pagedRows"
      :sort-by="filters.sortBy || 'expiryDate'"
      :sort-dir="filters.sortDir || 'asc'"
      :can-manage="canManage"
      @sort="onSort"
      @view="openView"
      @edit="openEdit"
      @toggle-hold="onToggleHold"
      @remove="onRemove"
    />

    <BatchMobileList
      :rows="pagedRows"
      :can-manage="canManage"
      @view="openView"
      @edit="openEdit"
      @toggle-hold="onToggleHold"
      @remove="onRemove"
    />

    <BatchViewModal
      :open="viewOpen"
      :row="activeRow"
      :can-manage="canManage"
      @close="viewOpen = false"
      @edit="activeRow && openEdit(activeRow)"
    />

    <BatchEditModal
      :open="editOpen"
      :row="activeRow"
      :location-options="locationOptions"
      :saving="saving"
      @close="editOpen = false"
      @save="onSaveEdit"
    />

    <ConfirmDialog
      :open="confirmOpen"
      :title="confirmTitle"
      :message="confirmDescription"
      :loading="saving"
      confirm-label="Confirm"
      :danger="confirmTitle.toLowerCase().includes('delete')"
      @close="confirmOpen = false"
      @confirm="onConfirm"
    />
  </div>
</template>
