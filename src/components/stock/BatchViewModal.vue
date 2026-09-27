<script setup lang="ts">
import StatusBadge from '@/components/common/StatusBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppModal from '@/components/common/AppModal.vue'
import type { BatchBoardRow } from '@/services'
import { formatCurrency, formatDate, formatQuantity } from '@/utils'

defineProps<{
  open: boolean
  row: BatchBoardRow | null
  canManage?: boolean
}>()

const emit = defineEmits<{
  close: []
  edit: []
}>()
</script>

<template>
  <AppModal
    :open="open"
    title="Batch details"
    description="Operational view of this medicine lot"
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
            <template v-if="row.medicine.volume"> · {{ row.medicine.volume }}</template>
          </p>
        </div>
        <StatusBadge :status="row.batch.status" />
      </div>

      <dl class="grid gap-3 sm:grid-cols-2 text-sm">
        <div>
          <dt class="text-xs text-ink-muted">Batch number</dt>
          <dd class="font-medium tabular-nums mt-0.5">{{ row.batch.batchNo }}</dd>
        </div>
        <div>
          <dt class="text-xs text-ink-muted">Manufacturer</dt>
          <dd class="font-medium mt-0.5">{{ row.batch.manufacturerName }}</dd>
        </div>
        <div>
          <dt class="text-xs text-ink-muted">Location</dt>
          <dd class="font-medium mt-0.5">{{ row.locationName }} ({{ row.locationCode }})</dd>
        </div>
        <div>
          <dt class="text-xs text-ink-muted">Purchase order</dt>
          <dd class="font-medium mt-0.5">{{ row.batch.purchaseOrderNo || '-' }}</dd>
        </div>
        <div>
          <dt class="text-xs text-ink-muted">Manufacturing date</dt>
          <dd class="font-medium mt-0.5">{{ formatDate(row.batch.manufacturingDate) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-ink-muted">Expiry date</dt>
          <dd class="font-medium mt-0.5">{{ formatDate(row.batch.expiryDate) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-ink-muted">Received quantity</dt>
          <dd class="font-medium tabular-nums mt-0.5">
            {{ formatQuantity(row.batch.quantityReceived) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-ink-muted">Remaining quantity</dt>
          <dd class="font-semibold tabular-nums mt-0.5">
            {{ formatQuantity(row.batch.remainingQuantity) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-ink-muted">Unit price</dt>
          <dd class="font-medium tabular-nums mt-0.5">{{ formatCurrency(row.batch.unitPrice) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-ink-muted">Line total</dt>
          <dd class="font-medium tabular-nums mt-0.5">{{ formatCurrency(row.batch.totalPrice) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-ink-muted">Receiving date</dt>
          <dd class="font-medium mt-0.5">{{ formatDate(row.batch.receivingDate) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-ink-muted">Last updated</dt>
          <dd class="font-medium mt-0.5">{{ formatDate(row.batch.updatedAt, 'dd MMM yyyy, HH:mm') }}</dd>
        </div>
      </dl>
    </div>

    <template #footer>
      <AppButton variant="outline" @click="emit('close')">Close</AppButton>
      <AppButton v-if="canManage" @click="emit('edit')">Edit batch</AppButton>
    </template>
  </AppModal>
</template>
