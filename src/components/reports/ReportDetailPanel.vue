<script setup lang="ts">
import StatusBadge from '@/components/common/StatusBadge.vue'
import ReportExportActions from '@/components/reports/ReportExportActions.vue'
import type {
  ReportDetail,
  ReportListItem,
  ReportPriceMode,
} from '@/services'
import { formatCurrency, formatDate, formatQuantity } from '@/utils'

defineProps<{
  item: ReportListItem | null
  detail: ReportDetail | null
  loading?: boolean
  exporting?: boolean
}>()

const emit = defineEmits<{
  export: [mode: ReportPriceMode | 'plain']
}>()
</script>

<template>
  <section class="surface-panel overflow-hidden min-h-[24rem]">
    <div class="border-b border-border px-4 py-3 sm:px-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-sm font-semibold text-ink">Report details</h2>
        <p class="text-xs text-ink-muted mt-0.5">
          {{ item ? item.reference : 'Choose a document from the list' }}
        </p>
      </div>
      <ReportExportActions
        v-if="item"
        :has-pricing="item.hasPricing"
        :exporting="exporting"
        :disabled="!detail || loading"
        @export="emit('export', $event)"
      />
    </div>

    <div v-if="loading" class="px-5 py-16 text-center text-sm text-ink-muted">
      Loading document…
    </div>

    <div
      v-else-if="!item || !detail"
      class="px-5 py-16 text-center text-sm text-ink-muted leading-relaxed"
    >
      Select a report document to inspect medicines, batches, and export options.
    </div>

    <div v-else class="p-4 sm:p-5 space-y-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-base font-semibold text-ink">{{ item.reference }}</p>
          <p class="text-sm text-ink-muted mt-0.5">{{ item.subtitle }}</p>
        </div>
        <StatusBadge :status="item.status" />
      </div>

      <!-- Stock In -->
      <template v-if="detail.kind === 'stock_in'">
        <dl class="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt class="text-xs text-ink-muted">Purchase order</dt>
            <dd class="font-medium mt-0.5">{{ detail.document.purchaseOrderNo }}</dd>
          </div>
          <div>
            <dt class="text-xs text-ink-muted">Receiving date</dt>
            <dd class="font-medium mt-0.5">{{ formatDate(detail.document.receivingDate) }}</dd>
          </div>
          <div>
            <dt class="text-xs text-ink-muted">Location</dt>
            <dd class="font-medium mt-0.5">{{ detail.locationName }}</dd>
          </div>
          <div>
            <dt class="text-xs text-ink-muted">Grand total</dt>
            <dd class="font-semibold tabular-nums mt-0.5">
              {{ formatCurrency(detail.grandTotal) }}
            </dd>
          </div>
        </dl>

        <div class="overflow-x-auto rounded-[var(--radius-md)] border border-border">
          <table class="table-cols-stripe w-full min-w-[40rem] text-sm">
            <thead>
              <tr class="border-b border-border bg-surface-muted/70 text-left text-xs text-ink-muted">
                <th class="px-3 py-2 font-medium">Medicine</th>
                <th class="px-3 py-2 font-medium">Manufacturer</th>
                <th class="px-3 py-2 font-medium">Batch</th>
                <th class="px-3 py-2 font-medium text-right">Qty</th>
                <th class="px-3 py-2 font-medium text-right">Unit</th>
                <th class="px-3 py-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="line in detail.document.items"
                :key="line.id"
                class="border-b border-border last:border-b-0"
              >
                <td class="px-3 py-2.5 font-medium">
                  {{ detail.medicinesById[line.medicineId]?.displayName ?? line.medicineId }}
                </td>
                <td class="px-3 py-2.5 text-ink-secondary">{{ line.manufacturerName }}</td>
                <td class="px-3 py-2.5 tabular-nums">{{ line.batchNo }}</td>
                <td class="px-3 py-2.5 text-right tabular-nums">
                  {{ formatQuantity(line.quantity) }}
                </td>
                <td class="px-3 py-2.5 text-right tabular-nums">
                  {{ formatCurrency(line.unitPrice) }}
                </td>
                <td class="px-3 py-2.5 text-right tabular-nums font-medium">
                  {{ formatCurrency(line.totalPrice) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <!-- Allocation -->
      <template v-else-if="detail.kind === 'allocation'">
        <dl class="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt class="text-xs text-ink-muted">Voucher</dt>
            <dd class="font-medium mt-0.5">{{ detail.document.voucherNo }}</dd>
          </div>
          <div>
            <dt class="text-xs text-ink-muted">Date</dt>
            <dd class="font-medium mt-0.5">{{ formatDate(detail.document.date) }}</dd>
          </div>
          <div>
            <dt class="text-xs text-ink-muted">Destination</dt>
            <dd class="font-medium mt-0.5">{{ detail.destinationName }}</dd>
          </div>
          <div>
            <dt class="text-xs text-ink-muted">Receiver</dt>
            <dd class="font-medium mt-0.5">
              {{ detail.document.receiverName || '-' }}
              <span v-if="detail.document.receiverDesignation" class="text-ink-muted font-normal">
                · {{ detail.document.receiverDesignation }}
              </span>
            </dd>
          </div>
        </dl>

        <div class="overflow-x-auto rounded-[var(--radius-md)] border border-border">
          <table class="table-cols-stripe w-full min-w-[28rem] text-sm">
            <thead>
              <tr class="border-b border-border bg-surface-muted/70 text-left text-xs text-ink-muted">
                <th class="px-3 py-2 font-medium">Medicine</th>
                <th class="px-3 py-2 font-medium">Batch</th>
                <th class="px-3 py-2 font-medium text-right">Quantity</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="line in detail.document.items"
                :key="line.id"
                class="border-b border-border last:border-b-0"
              >
                <td class="px-3 py-2.5 font-medium">
                  {{ detail.medicinesById[line.medicineId]?.displayName ?? line.medicineId }}
                </td>
                <td class="px-3 py-2.5 tabular-nums">
                  {{ detail.batchLabels[line.batchId] ?? line.batchId }}
                </td>
                <td class="px-3 py-2.5 text-right tabular-nums font-medium">
                  {{ formatQuantity(line.quantity) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <!-- Transfer -->
      <template v-else>
        <dl class="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt class="text-xs text-ink-muted">Voucher</dt>
            <dd class="font-medium mt-0.5">{{ detail.document.voucherNo }}</dd>
          </div>
          <div>
            <dt class="text-xs text-ink-muted">Date</dt>
            <dd class="font-medium mt-0.5">{{ formatDate(detail.document.date) }}</dd>
          </div>
          <div>
            <dt class="text-xs text-ink-muted">From</dt>
            <dd class="font-medium mt-0.5">{{ detail.fromName }}</dd>
          </div>
          <div>
            <dt class="text-xs text-ink-muted">To</dt>
            <dd class="font-medium mt-0.5">{{ detail.toName }}</dd>
          </div>
        </dl>

        <div class="overflow-x-auto rounded-[var(--radius-md)] border border-border">
          <table class="table-cols-stripe w-full min-w-[28rem] text-sm">
            <thead>
              <tr class="border-b border-border bg-surface-muted/70 text-left text-xs text-ink-muted">
                <th class="px-3 py-2 font-medium">Medicine</th>
                <th class="px-3 py-2 font-medium">Batch</th>
                <th class="px-3 py-2 font-medium text-right">Quantity</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="line in detail.document.items"
                :key="line.id"
                class="border-b border-border last:border-b-0"
              >
                <td class="px-3 py-2.5 font-medium">
                  {{ detail.medicinesById[line.medicineId]?.displayName ?? line.medicineId }}
                </td>
                <td class="px-3 py-2.5 tabular-nums">
                  {{ detail.batchLabels[line.batchId] ?? line.batchId }}
                </td>
                <td class="px-3 py-2.5 text-right tabular-nums font-medium">
                  {{ formatQuantity(line.quantity) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>
  </section>
</template>
