<script setup lang="ts">
import StatusBadge from '@/components/common/StatusBadge.vue'
import type { ExpiryWatchRow } from '@/services'
import { formatDate, formatQuantity } from '@/utils'

defineProps<{
  rows: ExpiryWatchRow[]
}>()

function daysLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Today'
  return `${days}d`
}
</script>

<template>
  <div class="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
    <div class="overflow-x-auto">
      <table class="table-cols-stripe w-full min-w-[52rem] border-collapse text-sm">
        <thead>
          <tr class="border-b border-border bg-surface-muted/80 text-left text-xs text-ink-muted">
            <th class="px-4 py-2.5 font-medium">Medicine</th>
            <th class="px-3 py-2.5 font-medium">Batch</th>
            <th class="px-3 py-2.5 font-medium">Expiry Date</th>
            <th class="px-3 py-2.5 font-medium text-right">Remaining Qty</th>
            <th class="px-3 py-2.5 font-medium">Location</th>
            <th class="px-3 py-2.5 font-medium text-right">Days Remaining</th>
            <th class="px-4 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!rows.length">
            <td colspan="7" class="px-4 py-12 text-center text-ink-muted">
              No batches match this expiry window and filters.
            </td>
          </tr>
          <tr
            v-for="row in rows"
            :key="row.batch.id"
            class="border-b border-border last:border-b-0"
          >
            <td class="px-4 py-3 cell-medicine">
              <p class="font-medium text-ink cell-medicine-title" :title="row.medicine.displayName">
                {{ row.medicine.displayName }}
              </p>
              <p class="text-[11px] text-ink-faint mt-0.5 cell-medicine-sub">
                {{ row.medicine.genericName }} · {{ row.medicine.strength }}
              </p>
            </td>
            <td class="px-3 py-3 tabular-nums text-ink-secondary">{{ row.batch.batchNo }}</td>
            <td class="px-3 py-3 whitespace-nowrap text-ink-secondary">
              {{ formatDate(row.batch.expiryDate) }}
            </td>
            <td class="px-3 py-3 text-right tabular-nums font-medium">
              {{ formatQuantity(row.remainingQuantity) }}
            </td>
            <td class="px-3 py-3 text-ink-secondary whitespace-nowrap">{{ row.locationName }}</td>
            <td
              class="px-3 py-3 text-right tabular-nums font-medium"
              :class="row.daysRemaining < 0 ? 'text-danger' : 'text-ink'"
            >
              {{ daysLabel(row.daysRemaining) }}
            </td>
            <td class="px-4 py-3">
              <StatusBadge
                :status="row.watchStatus"
                :tone="
                  row.watchStatus === 'critical'
                    ? 'warning'
                    : row.watchStatus === 'expired'
                      ? 'danger'
                      : undefined
                "
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
