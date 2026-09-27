<script setup lang="ts">
import { Eye, EllipsisVertical, Pencil, PauseCircle, PlayCircle, Trash2 } from '@lucide/vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import Dropdown from '@/components/common/Dropdown.vue'
import type { BatchBoardRow } from '@/services'
import type { BatchStatus } from '@/types'
import { formatCurrency, formatDate, formatQuantity } from '@/utils'

defineProps<{
  rows: BatchBoardRow[]
  sortBy: string
  sortDir: 'asc' | 'desc'
  canManage?: boolean
}>()

const emit = defineEmits<{
  sort: [key: string]
  view: [row: BatchBoardRow]
  edit: [row: BatchBoardRow]
  toggleHold: [row: BatchBoardRow]
  remove: [row: BatchBoardRow]
}>()

const columns: Array<{ key: string; label: string; sortable?: boolean; align?: 'right' }> = [
  { key: 'medicine', label: 'Medicine', sortable: true },
  { key: 'genericName', label: 'Generic Name' },
  { key: 'strength', label: 'Strength' },
  { key: 'dosageForm', label: 'Dosage Form' },
  { key: 'batchNo', label: 'Batch', sortable: true },
  { key: 'manufacturer', label: 'Manufacturer', sortable: true },
  { key: 'mfg', label: 'MFG Date' },
  { key: 'expiryDate', label: 'EXP Date', sortable: true },
  { key: 'received', label: 'Received', align: 'right' },
  { key: 'remainingQuantity', label: 'Remaining', sortable: true, align: 'right' },
  { key: 'unitPrice', label: 'Unit Price', align: 'right' },
  { key: 'location', label: 'Location', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'actions', label: 'Actions' },
]

function sortMark(key: string, sortBy: string, sortDir: 'asc' | 'desc') {
  if (sortBy !== key) return ''
  return sortDir === 'asc' ? ' ↑' : ' ↓'
}

function canToggleHold(status: BatchStatus) {
  return status === 'available' || status === 'hold'
}
</script>

<template>
  <div class="hidden lg:block overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
    <div class="overflow-x-auto">
      <table class="table-cols-stripe w-full min-w-[72rem] border-collapse text-sm">
        <thead>
          <tr class="border-b border-border bg-surface-muted/80 text-left text-xs text-ink-muted">
            <th
              v-for="column in columns"
              :key="column.key"
              scope="col"
              class="px-3 py-2.5 font-medium whitespace-nowrap"
              :class="column.align === 'right' ? 'text-right' : ''"
            >
              <button
                v-if="column.sortable"
                type="button"
                class="inline-flex items-center gap-0.5 hover:text-ink"
                @click="emit('sort', column.key)"
              >
                {{ column.label }}{{ sortMark(column.key, sortBy, sortDir) }}
              </button>
              <span v-else>{{ column.label }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!rows.length">
            <td :colspan="columns.length" class="px-4 py-12 text-center text-ink-muted">
              No batches match the current filters.
            </td>
          </tr>
          <tr
            v-for="row in rows"
            :key="row.batch.id"
            class="border-b border-border last:border-b-0"
          >
            <td class="px-3 py-3 font-medium text-ink cell-medicine">
              <p class="cell-medicine-title" :title="row.medicine.displayName">
                {{ row.medicine.displayName }}
              </p>
            </td>
            <td class="px-3 py-3 text-ink-secondary max-w-[10rem]">
              <span class="cell-medicine-sub" :title="row.medicine.genericName">{{
                row.medicine.genericName
              }}</span>
            </td>
            <td class="px-3 py-3 text-ink-secondary whitespace-nowrap">{{ row.medicine.strength }}</td>
            <td class="px-3 py-3 text-ink-secondary">{{ row.medicine.dosageForm }}</td>
            <td class="px-3 py-3 tabular-nums text-ink">{{ row.batch.batchNo }}</td>
            <td class="px-3 py-3 text-ink-secondary max-w-[10rem] truncate">
              {{ row.batch.manufacturerName }}
            </td>
            <td class="px-3 py-3 whitespace-nowrap text-ink-secondary">
              {{ formatDate(row.batch.manufacturingDate) }}
            </td>
            <td class="px-3 py-3 whitespace-nowrap text-ink-secondary">
              {{ formatDate(row.batch.expiryDate) }}
            </td>
            <td class="px-3 py-3 text-right tabular-nums">
              {{ formatQuantity(row.batch.quantityReceived) }}
            </td>
            <td class="px-3 py-3 text-right tabular-nums font-medium">
              {{ formatQuantity(row.batch.remainingQuantity) }}
            </td>
            <td class="px-3 py-3 text-right tabular-nums">
              {{ formatCurrency(row.batch.unitPrice) }}
            </td>
            <td class="px-3 py-3 text-ink-secondary whitespace-nowrap">{{ row.locationName }}</td>
            <td class="px-3 py-3">
              <StatusBadge :status="row.batch.status" />
            </td>
            <td class="px-3 py-3">
              <Dropdown label="Row actions" align="right" variant="icon">
                <template #trigger>
                  <EllipsisVertical class="size-4" aria-hidden="true" />
                </template>
                <template #default="{ close }">
                  <button
                    type="button"
                    role="menuitem"
                    class="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink transition-colors duration-[var(--duration-fast)] hover:bg-surface-muted"
                    @click="emit('view', row); close()"
                  >
                    <Eye class="size-3.5 text-ink-muted" /> View
                  </button>
                  <button
                    v-if="canManage"
                    type="button"
                    role="menuitem"
                    class="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink transition-colors duration-[var(--duration-fast)] hover:bg-surface-muted"
                    @click="emit('edit', row); close()"
                  >
                    <Pencil class="size-3.5 text-ink-muted" /> Edit
                  </button>
                  <button
                    v-if="canManage && canToggleHold(row.batch.status)"
                    type="button"
                    role="menuitem"
                    class="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink transition-colors duration-[var(--duration-fast)] hover:bg-surface-muted"
                    @click="emit('toggleHold', row); close()"
                  >
                    <PauseCircle
                      v-if="row.batch.status === 'available'"
                      class="size-3.5 text-ink-muted"
                    />
                    <PlayCircle v-else class="size-3.5 text-ink-muted" />
                    {{ row.batch.status === 'hold' ? 'Make Available' : 'Hold' }}
                  </button>
                  <div
                    v-if="canManage"
                    class="my-1 border-t border-border"
                    role="separator"
                  />
                  <button
                    v-if="canManage"
                    type="button"
                    role="menuitem"
                    class="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-danger transition-colors duration-[var(--duration-fast)] hover:bg-danger-subtle"
                    @click="emit('remove', row); close()"
                  >
                    <Trash2 class="size-3.5" /> Delete
                  </button>
                </template>
              </Dropdown>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
