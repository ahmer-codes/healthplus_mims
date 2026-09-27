<script setup lang="ts">
import { CheckCircle2, Eye, EllipsisVertical, Pencil, XCircle } from '@lucide/vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import Dropdown from '@/components/common/Dropdown.vue'
import type { DemandBoardRow } from '@/services'
import type { DemandStatus } from '@/types'
import { STATUS_LABELS } from '@/constants'
import { formatDate, formatQuantity } from '@/utils'

defineProps<{
  rows: DemandBoardRow[]
  canManage?: boolean
}>()

const emit = defineEmits<{
  view: [row: DemandBoardRow]
  edit: [row: DemandBoardRow]
  status: [row: DemandBoardRow, status: DemandStatus]
}>()

function coverageHint(row: DemandBoardRow): string {
  if (row.availableQuantity <= 0) return 'No allocatable stock'
  if (row.availableQuantity < row.demand.requestedQuantity) return 'Below request'
  return 'Covers request'
}

function coverageClass(row: DemandBoardRow): string {
  if (row.availableQuantity <= 0) return 'text-ink-muted'
  if (row.availableQuantity < row.demand.requestedQuantity) return 'text-warning'
  return 'text-success'
}
</script>

<template>
  <div class="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
    <div class="overflow-x-auto">
      <table class="table-cols-stripe w-full min-w-[64rem] border-collapse text-sm">
        <thead>
          <tr class="border-b border-border bg-surface-muted/80 text-left text-xs text-ink-muted">
            <th class="px-3 py-2.5 font-medium">Medicine</th>
            <th class="px-3 py-2.5 font-medium text-right">Requested</th>
            <th class="px-3 py-2.5 font-medium text-right">Available</th>
            <th class="px-3 py-2.5 font-medium">Department</th>
            <th class="px-3 py-2.5 font-medium">Requested by</th>
            <th class="px-3 py-2.5 font-medium">Priority</th>
            <th class="px-3 py-2.5 font-medium">Status</th>
            <th class="px-3 py-2.5 font-medium">Date</th>
            <th class="px-3 py-2.5 font-medium w-16">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!rows.length">
            <td colspan="9" class="px-4 py-10 text-center text-ink-muted">
              No demands match the current filters.
            </td>
          </tr>
          <tr
            v-for="row in rows"
            :key="row.demand.id"
            class="border-b border-border last:border-b-0 cursor-pointer"
            @click="emit('view', row)"
          >
            <td class="px-3 py-2.5 cell-medicine">
              <p class="font-medium text-ink cell-medicine-title" :title="row.medicine.displayName">
                {{ row.medicine.displayName }}
              </p>
              <p class="text-xs text-ink-muted mt-0.5 cell-medicine-sub">
                {{ row.medicine.strength }} · {{ row.medicine.dosageForm }}
              </p>
            </td>
            <td class="px-3 py-2.5 text-right tabular-nums font-medium">
              {{ formatQuantity(row.demand.requestedQuantity) }}
            </td>
            <td class="px-3 py-2.5 text-right">
              <p class="tabular-nums font-medium" :class="coverageClass(row)">
                {{ formatQuantity(row.availableQuantity) }}
              </p>
              <p class="text-[11px] mt-0.5" :class="coverageClass(row)">{{ coverageHint(row) }}</p>
            </td>
            <td class="px-3 py-2.5 text-ink-secondary">{{ row.demand.requestingDepartment }}</td>
            <td class="px-3 py-2.5 text-ink-secondary">{{ row.demand.requestedBy }}</td>
            <td class="px-3 py-2.5">
              <StatusBadge :status="row.demand.priority" />
            </td>
            <td class="px-3 py-2.5">
              <StatusBadge :status="row.demand.status" />
            </td>
            <td class="px-3 py-2.5 whitespace-nowrap text-ink-secondary">
              {{ formatDate(row.demand.requestDate) }}
            </td>
            <td class="px-3 py-2.5" @click.stop>
              <Dropdown label="Row actions" align="right" variant="icon">
                <template #trigger>
                  <EllipsisVertical class="size-4" aria-hidden="true" />
                </template>
                <template #default="{ close }">
                  <button
                    type="button"
                    role="menuitem"
                    class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-ink transition-colors duration-[var(--duration-fast)] hover:bg-surface-muted"
                    @click="emit('view', row); close()"
                  >
                    <Eye class="size-3.5 text-ink-muted" /> View
                  </button>
                  <button
                    v-if="canManage && row.canEdit"
                    type="button"
                    role="menuitem"
                    class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-ink transition-colors duration-[var(--duration-fast)] hover:bg-surface-muted"
                    @click="emit('edit', row); close()"
                  >
                    <Pencil class="size-3.5 text-ink-muted" /> Edit
                  </button>
                  <template v-if="canManage && row.nextStatuses.length">
                    <div class="my-1 border-t border-border" role="separator" />
                    <button
                      v-for="next in row.nextStatuses"
                      :key="next"
                      type="button"
                      role="menuitem"
                      class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-ink transition-colors duration-[var(--duration-fast)] hover:bg-surface-muted"
                      @click="emit('status', row, next); close()"
                    >
                      <XCircle v-if="next === 'cancelled'" class="size-3.5 text-ink-muted" />
                      <CheckCircle2 v-else class="size-3.5 text-brand-600" />
                      Mark {{ STATUS_LABELS[next] }}
                    </button>
                  </template>
                </template>
              </Dropdown>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
