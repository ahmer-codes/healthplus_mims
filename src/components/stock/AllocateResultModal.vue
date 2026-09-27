<script setup lang="ts">
import { AlertTriangle, CheckCircle2, Download, FileText } from '@lucide/vue'
import AppButton from '@/components/common/AppButton.vue'
import AppModal from '@/components/common/AppModal.vue'
import type { Allocation } from '@/types'
import { formatDate, formatQuantity } from '@/utils'

defineProps<{
  open: boolean
  mode: 'success' | 'failure'
  allocation: Allocation | null
  destinationName: string
  totalQuantity: number
  errorMessage?: string
}>()

const emit = defineEmits<{
  close: []
  download: []
}>()
</script>

<template>
  <AppModal
    :open="open"
    :title="mode === 'success' ? 'Allocation finalized' : 'Allocation failed'"
    :description="
      mode === 'success'
        ? 'Quantities were deducted and the report is ready.'
        : 'No inventory was changed. Staged lines were kept.'
    "
    size="md"
    @close="emit('close')"
  >
    <div v-if="mode === 'success' && allocation" class="space-y-4">
      <div
        class="flex items-start gap-3 rounded-[var(--radius-md)] border border-success/20 bg-success-subtle px-3 py-3"
      >
        <CheckCircle2 class="size-5 text-success shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p class="text-sm font-medium text-ink">Issue completed successfully</p>
          <p class="text-xs text-ink-muted mt-0.5">
            Document {{ allocation.id }} · {{ allocation.items.length }} line(s)
          </p>
        </div>
      </div>

      <dl class="grid gap-3 sm:grid-cols-2 text-sm">
        <div>
          <dt class="text-xs text-ink-muted">Voucher</dt>
          <dd class="font-medium text-ink mt-0.5">{{ allocation.voucherNo }}</dd>
        </div>
        <div>
          <dt class="text-xs text-ink-muted">Date</dt>
          <dd class="font-medium text-ink mt-0.5">{{ formatDate(allocation.date) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-ink-muted">Destination</dt>
          <dd class="font-medium text-ink mt-0.5">{{ destinationName }}</dd>
        </div>
        <div>
          <dt class="text-xs text-ink-muted">Total quantity</dt>
          <dd class="font-semibold tabular-nums text-ink mt-0.5">
            {{ formatQuantity(totalQuantity) }}
          </dd>
        </div>
      </dl>
    </div>

    <div
      v-else
      class="flex items-start gap-3 rounded-[var(--radius-md)] border border-danger/20 bg-danger-subtle px-3 py-3"
    >
      <AlertTriangle class="size-5 text-danger shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        <p class="text-sm font-medium text-ink">Could not finalize allocation</p>
        <p class="text-xs text-ink-muted mt-0.5 leading-relaxed">
          {{ errorMessage || 'An unexpected error occurred. Please review and try again.' }}
        </p>
      </div>
    </div>

    <template #footer>
      <AppButton variant="outline" @click="emit('close')">
        <FileText class="size-3.5" aria-hidden="true" />
        {{ mode === 'success' ? 'Continue allocating' : 'Close' }}
      </AppButton>
      <AppButton v-if="mode === 'success'" @click="emit('download')">
        <Download class="size-3.5" aria-hidden="true" />
        Download PDF
      </AppButton>
    </template>
  </AppModal>
</template>
