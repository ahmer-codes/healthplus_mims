<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ClipboardPlus } from '@lucide/vue'
import AppButton from '@/components/common/AppButton.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import ConfirmDialog from '@/components/feedback/ConfirmDialog.vue'
import LoadingState from '@/components/feedback/LoadingState.vue'
import DemandFilters from '@/components/demands/DemandFilters.vue'
import DemandFormModal from '@/components/demands/DemandFormModal.vue'
import DemandSummaryCards from '@/components/demands/DemandSummaryCards.vue'
import DemandTable from '@/components/demands/DemandTable.vue'
import DemandViewModal from '@/components/demands/DemandViewModal.vue'
import type { SelectOption } from '@/components/forms/AppSelect.vue'
import { HOSPITAL_LOCATION_SEEDS } from '@/data/hospital-locations'
import { useAppPage, useAuth, useToast } from '@/composables'
import {
  DomainError,
  demandService,
  type DemandBoardRow,
  type DemandSummary,
} from '@/services'
import type {
  CreateDemandInput,
  DemandPriority,
  DemandStatus,
  UpdateDemandInput,
} from '@/types'

const { setPage } = useAppPage()
const { hasRole, user } = useAuth()
const toast = useToast()

const canManage = computed(() => hasRole('admin', 'pharmacist', 'staff'))

const loading = ref(true)
const saving = ref(false)
const rows = ref<DemandBoardRow[]>([])
const summary = ref<DemandSummary>({
  total: 0,
  pending: 0,
  approved: 0,
  fulfilled: 0,
  cancelled: 0,
  urgentOpen: 0,
})

const query = ref('')
const status = ref<'all' | DemandStatus>('all')
const priority = ref<'all' | DemandPriority>('all')
const department = ref('all')
const departmentOptions = ref<SelectOption[]>([])

const viewOpen = ref(false)
const formOpen = ref(false)
const active = ref<DemandBoardRow | null>(null)

const confirmOpen = ref(false)
const confirmTitle = ref('')
const confirmDescription = ref('')
const confirmLabel = ref('Confirm')
const pendingStatus = ref<DemandStatus | null>(null)

async function refreshDepartments() {
  const fromDemands = await demandService.listDepartments()
  const seeded = HOSPITAL_LOCATION_SEEDS.map((l) => l.name)
  const merged = [...new Set([...seeded, ...fromDemands])].sort((a, b) => a.localeCompare(b))
  departmentOptions.value = merged.map((name) => ({ value: name, label: name }))
}

async function load() {
  loading.value = true
  try {
    const [board, boardSummary] = await Promise.all([
      demandService.listBoard({
        query: query.value,
        status: status.value,
        priority: priority.value,
        department: department.value,
      }),
      demandService.getSummary(),
    ])
    rows.value = board
    summary.value = boardSummary
  } catch (error) {
    toast.error(
      'Could not load demands',
      error instanceof Error ? error.message : 'Unexpected error',
    )
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  setPage({
    title: 'Medicine Demands',
    subtitle: 'Ward and clinic requests',
    breadcrumbs: [{ label: 'Home', to: '/dashboard' }, { label: 'Demands' }],
  })
  await refreshDepartments()
  await load()
})

watch([query, status, priority, department], () => {
  void load()
})

function openCreate() {
  active.value = null
  formOpen.value = true
}

function openView(row: DemandBoardRow) {
  active.value = row
  viewOpen.value = true
}

function openEdit(row: DemandBoardRow) {
  active.value = row
  viewOpen.value = false
  formOpen.value = true
}

function onEditFromView() {
  if (active.value) openEdit(active.value)
}

async function onSave(payload: {
  mode: 'create' | 'edit'
  input: CreateDemandInput | UpdateDemandInput
}) {
  saving.value = true
  try {
    if (payload.mode === 'edit' && active.value) {
      await demandService.update(active.value.demand.id, payload.input as UpdateDemandInput)
      toast.success('Demand updated')
    } else {
      await demandService.create(payload.input as CreateDemandInput)
      toast.success('Demand created')
    }
    formOpen.value = false
    active.value = null
    await refreshDepartments()
    await load()
  } catch (error) {
    toast.error(
      'Could not save demand',
      error instanceof DomainError ? error.message : 'Unexpected error',
    )
  } finally {
    saving.value = false
  }
}

function askStatusChange(row: DemandBoardRow, next: DemandStatus) {
  active.value = row
  pendingStatus.value = next
  const labels: Record<DemandStatus, string> = {
    pending: 'Pending',
    approved: 'Approved',
    fulfilled: 'Fulfilled',
    cancelled: 'Cancelled',
  }
  confirmTitle.value = `Mark as ${labels[next]}?`
  confirmDescription.value =
    next === 'fulfilled'
      ? 'Fulfill marks this request complete. Stock is not deducted automatically. Allocate separately if needed.'
      : next === 'approved'
        ? 'Approve this demand for fulfilment planning. Inventory is not changed.'
        : next === 'cancelled'
          ? 'Cancel this demand. This cannot be undone via status change.'
          : `Change status to ${labels[next]}.`
  confirmLabel.value = `Mark ${labels[next]}`
  confirmOpen.value = true
}

function askStatusFromView(next: DemandStatus) {
  if (!active.value) return
  askStatusChange(active.value, next)
}

async function onConfirmStatus() {
  if (!active.value || !pendingStatus.value) return
  saving.value = true
  try {
    await demandService.updateStatus(active.value.demand.id, { status: pendingStatus.value })
    toast.success(`Demand marked ${pendingStatus.value}`)
    confirmOpen.value = false
    viewOpen.value = false
    pendingStatus.value = null
    await load()
  } catch (error) {
    toast.error(
      'Could not update status',
      error instanceof DomainError ? error.message : 'Unexpected error',
    )
  } finally {
    saving.value = false
  }
}

const hasActiveFilters = computed(
  () =>
    !!query.value.trim() ||
    status.value !== 'all' ||
    priority.value !== 'all' ||
    department.value !== 'all',
)
</script>

<template>
  <div class="space-y-5">
    <PageHeader
      title="Medicine Demands"
      description="Track ward and clinic requests against available hospital stock. Status changes are explicit. They do not move inventory."
    >
      <template #actions>
        <AppButton v-if="canManage" @click="openCreate">
          <ClipboardPlus class="size-4" />
          New demand
        </AppButton>
      </template>
    </PageHeader>

    <DemandSummaryCards :summary="summary" />

    <DemandFilters
      v-model:query="query"
      v-model:status="status"
      v-model:priority="priority"
      v-model:department="department"
      :department-options="departmentOptions"
    />

    <div v-if="loading" class="surface-panel">
      <LoadingState label="Loading demands…" />
    </div>

    <template v-else-if="rows.length || hasActiveFilters">
      <DemandTable
        :rows="rows"
        :can-manage="canManage"
        @view="openView"
        @edit="openEdit"
        @status="askStatusChange"
      />
    </template>

    <div v-else class="surface-panel">
      <EmptyState
        title="No open demands"
        description="Create a request when a ward or clinic needs medicine. Available quantity is shown for planning only."
      >
        <template v-if="canManage" #action>
          <AppButton @click="openCreate">
            <ClipboardPlus class="size-4" />
            New demand
          </AppButton>
        </template>
      </EmptyState>
    </div>

    <DemandViewModal
      :open="viewOpen"
      :row="active"
      :can-manage="canManage"
      @close="viewOpen = false"
      @edit="onEditFromView"
      @status="askStatusFromView"
    />

    <DemandFormModal
      :open="formOpen"
      :row="active"
      :department-options="departmentOptions"
      :default-requested-by="user?.displayName"
      :saving="saving"
      @close="formOpen = false"
      @save="onSave"
    />

    <ConfirmDialog
      :open="confirmOpen"
      :title="confirmTitle"
      :message="confirmDescription"
      :confirm-label="confirmLabel"
      :loading="saving"
      :danger="pendingStatus === 'cancelled'"
      @close="confirmOpen = false"
      @confirm="onConfirmStatus"
    />
  </div>
</template>
