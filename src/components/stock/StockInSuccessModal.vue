<script setup lang="ts">
import { CheckCircle2, Download, FileText } from '@lucide/vue'
import AppButton from '@/components/common/AppButton.vue'
import AppModal from '@/components/common/AppModal.vue'
import type { StockIn } from '@/types'
import { formatCurrency, formatDate } from '@/utils'

defineProps<{
  open: boolean
  stockIn: StockIn | null
  grandTotal: number
}>()

const emit = defineEmits<{
  close: []
  download: []
}>()
</script>

<template>
  <AppModal
    :open="open"
    title="Stock In finalized"
    description="Inventory batches were created and the report is ready."
    size="md"
    @close="emit('close')"
  >
    <div v-if="stockIn" class="space-y-4">
      <div class="flex items-start gap-3 rounded-[var(--radius-md)] border border-success/20 bg-success-subtle px-3 py-3">
        <CheckCircle2 class="size-5 text-success shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p class="text-sm font-medium text-ink">Receiving completed successfully</p>
          <p class="text-xs text-ink-muted mt-0.5">
            Document {{ stockIn.id }} · {{ stockIn.items.length }} medicine line(s)
          </p>
        </div>
      </div>

      <dl class="grid gap-3 sm:grid-cols-2 text-sm">
        <div>
          <dt class="text-xs text-ink-muted">Purchase Order</dt>
          <dd class="font-medium text-ink mt-0.5">{{ stockIn.purchaseOrderNo }}</dd>
        </div>
        <div>
          <dt class="text-xs text-ink-muted">Receiving Date</dt>
          <dd class="font-medium text-ink mt-0.5">{{ formatDate(stockIn.receivingDate) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-ink-muted">Grand Total</dt>
          <dd class="font-semibold tabular-nums text-ink mt-0.5">{{ formatCurrency(grandTotal) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-ink-muted">Status</dt>
          <dd class="font-medium text-success mt-0.5 capitalize">{{ stockIn.status }}</dd>
        </div>
      </dl>
    </div>

    <template #footer>
      <AppButton variant="outline" @click="emit('close')">
        <FileText class="size-3.5" aria-hidden="true" />
        Continue receiving
      </AppButton>
      <AppButton @click="emit('download')">
        <Download class="size-3.5" aria-hidden="true" />
        Download PDF
      </AppButton>
    </template>
  </AppModal>
</template>
