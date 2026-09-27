<script setup lang="ts">
import StatusBadge from '@/components/common/StatusBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppModal from '@/components/common/AppModal.vue'
import type { DemandBoardRow } from '@/services'
import type { DemandStatus } from '@/types'
import { STATUS_LABELS } from '@/constants'
import { formatDate, formatQuantity } from '@/utils'

defineProps<{
  open: boolean
  row: DemandBoardRow | null
  canManage?: boolean
}>()

const emit = defineEmits<{
  close: []
  edit: []
  status: [status: DemandStatus]
}>()
</script>

<template>
  <AppModal
    :open="open"
    title="Demand details"
    description="Request linked to current inventory levels"
    size="lg"
    @close="emit('close')"
  >
    <div v-if="row" class="space-y-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-base font-semibold text-ink">{{ row.medicine.displayName }}</p>
          <p class="text-sm text-ink-muted mt-0.5">
            {{ row.medicine.genericName }} · {{ row.medicine.strength }} ·
            {{ row.medicine.dosageForm }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <StatusBadge :status="row.demand.priority" />
          <StatusBadge :status="row.demand.status" />
        </div>
      </div>

      <div
        class="rounded-[var(--radius-md)] border border-border bg-surface-muted/50 px-4 py-3"
      >
        <p class="text-xs font-medium text-ink-muted uppercase tracking-wide">Inventory context</p>
        <div class="mt-2 grid gap-3 sm:grid-cols-3 text-sm">
          <div>
            <p class="text-xs text-ink-muted">Requested</p>
            <p class="font-semibold tabular-nums mt-0.5">
              {{ formatQuantity(row.demand.requestedQuantity) }}
            </p>
          </div>
          <div>
            <p class="text-xs text-ink-muted">Current available</p>
            <p class="font-semibold tabular-nums mt-0.5">
              {{ formatQuantity(row.availableQuantity) }}
            </p>
          </div>
          <div>
            <p class="text-xs text-ink-muted">Total on hand</p>
            <p class="font-semibold tabular-nums mt-0.5">
              {{ formatQuantity(row.totalRemaining) }}
            </p>
          </div>
        </div>
        <p class="mt-2 text-xs text-ink-muted">
          Available quantity is informational. Approving or fulfilling does not move stock.
        </p>
      </div>

      <dl class="grid gap-3 sm:grid-cols-2 text-sm">
        <div>
          <dt class="text-xs text-ink-muted">Requesting department</dt>
          <dd class="font-medium mt-0.5">{{ row.demand.requestingDepartment }}</dd>
        </div>
        <div>
          <dt class="text-xs text-ink-muted">Requested by</dt>
          <dd class="font-medium mt-0.5">{{ row.demand.requestedBy }}</dd>
        </div>
        <div>
          <dt class="text-xs text-ink-muted">Date</dt>
          <dd class="font-medium mt-0.5">{{ formatDate(row.demand.requestDate) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-ink-muted">Last updated</dt>
          <dd class="font-medium mt-0.5">
            {{ formatDate(row.demand.updatedAt, 'dd MMM yyyy, HH:mm') }}
          </dd>
        </div>
        <div v-if="row.demand.notes" class="sm:col-span-2">
          <dt class="text-xs text-ink-muted">Notes</dt>
          <dd class="mt-0.5 text-ink-secondary whitespace-pre-wrap">{{ row.demand.notes }}</dd>
        </div>
      </dl>
    </div>

    <template #footer>
      <div class="flex w-full flex-wrap items-center justify-between gap-2">
        <div v-if="canManage && row?.nextStatuses.length" class="flex flex-wrap gap-2">
          <AppButton
            v-for="next in row.nextStatuses"
            :key="next"
            size="sm"
            :variant="next === 'cancelled' ? 'outline' : 'secondary'"
            @click="emit('status', next)"
          >
            {{ STATUS_LABELS[next] }}
          </AppButton>
        </div>
        <div class="flex gap-2 ml-auto">
          <AppButton variant="outline" @click="emit('close')">Close</AppButton>
          <AppButton v-if="canManage && row?.canEdit" @click="emit('edit')">Edit</AppButton>
        </div>
      </div>
    </template>
  </AppModal>
</template>
