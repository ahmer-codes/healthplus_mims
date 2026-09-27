<script setup lang="ts">
import { Eye, PauseCircle, Pencil, PlayCircle, Trash2 } from '@lucide/vue'
import AppButton from '@/components/common/AppButton.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import type { BatchBoardRow } from '@/services'
import type { BatchStatus } from '@/types'
import { formatCurrency, formatDate, formatQuantity } from '@/utils'

defineProps<{
  rows: BatchBoardRow[]
  canManage?: boolean
}>()

const emit = defineEmits<{
  view: [row: BatchBoardRow]
  edit: [row: BatchBoardRow]
  toggleHold: [row: BatchBoardRow]
  remove: [row: BatchBoardRow]
}>()

function canToggleHold(status: BatchStatus) {
  return status === 'available' || status === 'hold'
}
</script>

<template>
  <div class="lg:hidden space-y-3">
    <p v-if="!rows.length" class="surface-panel px-4 py-10 text-center text-sm text-ink-muted">
      No batches match the current filters.
    </p>

    <article
      v-for="row in rows"
      :key="row.batch.id"
      class="surface-panel p-4 space-y-3"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="font-semibold text-ink leading-snug">{{ row.medicine.displayName }}</h3>
          <p class="mt-0.5 text-xs text-ink-muted">
            {{ row.medicine.genericName }} · {{ row.medicine.strength }} ·
            {{ row.medicine.dosageForm }}
          </p>
        </div>
        <StatusBadge :status="row.batch.status" />
      </div>

      <dl class="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <div>
          <dt class="text-[11px] text-ink-muted">Batch</dt>
          <dd class="font-medium tabular-nums">{{ row.batch.batchNo }}</dd>
        </div>
        <div>
          <dt class="text-[11px] text-ink-muted">Location</dt>
          <dd class="font-medium">{{ row.locationName }}</dd>
        </div>
        <div>
          <dt class="text-[11px] text-ink-muted">Remaining</dt>
          <dd class="font-medium tabular-nums">
            {{ formatQuantity(row.batch.remainingQuantity) }}
            <span class="text-ink-faint font-normal">
              / {{ formatQuantity(row.batch.quantityReceived) }}
            </span>
          </dd>
        </div>
        <div>
          <dt class="text-[11px] text-ink-muted">Unit price</dt>
          <dd class="font-medium tabular-nums">{{ formatCurrency(row.batch.unitPrice) }}</dd>
        </div>
        <div>
          <dt class="text-[11px] text-ink-muted">Manufacturer</dt>
          <dd>{{ row.batch.manufacturerName }}</dd>
        </div>
        <div>
          <dt class="text-[11px] text-ink-muted">Expiry</dt>
          <dd>{{ formatDate(row.batch.expiryDate) }}</dd>
        </div>
      </dl>

      <div class="flex flex-wrap gap-2 pt-1">
        <AppButton size="sm" variant="outline" @click="emit('view', row)">
          <Eye class="size-3.5" /> View
        </AppButton>
        <AppButton v-if="canManage" size="sm" variant="outline" @click="emit('edit', row)">
          <Pencil class="size-3.5" /> Edit
        </AppButton>
        <AppButton
          v-if="canManage && canToggleHold(row.batch.status)"
          size="sm"
          variant="outline"
          @click="emit('toggleHold', row)"
        >
          <PauseCircle v-if="row.batch.status === 'available'" class="size-3.5" />
          <PlayCircle v-else class="size-3.5" />
          {{ row.batch.status === 'hold' ? 'Make Available' : 'Hold' }}
        </AppButton>
        <AppButton v-if="canManage" size="sm" variant="danger" @click="emit('remove', row)">
          <Trash2 class="size-3.5" /> Delete
        </AppButton>
      </div>
    </article>
  </div>
</template>
