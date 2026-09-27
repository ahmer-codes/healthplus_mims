<script setup lang="ts">
import { Pencil, Trash2 } from '@lucide/vue'
import AppButton from '@/components/common/AppButton.vue'
import SectionHeader from '@/components/common/SectionHeader.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import type { AllocationDraftItem } from '@/services'
import { formatDate, formatQuantity } from '@/utils'

defineProps<{
  items: AllocationDraftItem[]
  totalQuantity: number
  finalizing?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  edit: [id: string]
  remove: [id: string]
  requestFinalize: []
}>()
</script>

<template>
  <section class="surface-panel overflow-hidden">
    <div class="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
      <SectionHeader
        title="Pending Allocations"
        description="Staged issue cart. Inventory is unchanged until finalized"
      />
      <div class="text-right">
        <p class="text-xs text-ink-muted">Lines · Total qty</p>
        <p class="text-sm font-semibold text-ink">
          {{ items.length }}
          <span class="text-ink-faint font-normal">·</span>
          <span class="tabular-nums">{{ formatQuantity(totalQuantity) }}</span>
        </p>
      </div>
    </div>

    <div v-if="items.length" class="overflow-x-auto">
      <table class="table-cols-stripe w-full min-w-[40rem] text-sm">
        <thead>
          <tr class="border-b border-border bg-surface-muted/70 text-left text-xs text-ink-muted">
            <th class="px-4 py-2.5 font-medium sm:px-5">#</th>
            <th class="px-3 py-2.5 font-medium">Medicine</th>
            <th class="px-3 py-2.5 font-medium">Batch</th>
            <th class="px-3 py-2.5 font-medium text-right">Qty</th>
            <th class="px-3 py-2.5 font-medium">Expiry</th>
            <th class="px-4 py-2.5 font-medium sm:px-5">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, index) in items"
            :key="item.id"
            class="border-b border-border last:border-b-0"
          >
            <td class="px-4 py-3 sm:px-5 text-ink-muted tabular-nums">{{ index + 1 }}</td>
            <td class="px-3 py-3 font-medium text-ink cell-medicine">
              <span class="cell-medicine-title" :title="item.medicineDisplayName">{{
                item.medicineDisplayName
              }}</span>
            </td>
            <td class="px-3 py-3 tabular-nums text-ink-secondary">{{ item.batchNo }}</td>
            <td class="px-3 py-3 text-right tabular-nums font-medium">
              {{ formatQuantity(item.quantity) }}
            </td>
            <td class="px-3 py-3 whitespace-nowrap text-ink-secondary">
              {{ formatDate(item.expiryDate) }}
            </td>
            <td class="px-4 py-3 sm:px-5">
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="icon-btn"
                  aria-label="Edit line"
                  :disabled="disabled || finalizing"
                  @click="emit('edit', item.id)"
                >
                  <Pencil class="size-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  class="icon-btn text-danger hover:bg-danger-subtle"
                  aria-label="Remove line"
                  :disabled="disabled || finalizing"
                  @click="emit('remove', item.id)"
                >
                  <Trash2 class="size-3.5" aria-hidden="true" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <EmptyState
      v-else
      title="No pending allocations"
      description="Save medicine lines here before finalizing the issue voucher."
    />

    <div
      v-if="items.length"
      class="flex flex-col gap-3 border-t border-border bg-surface-muted/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
    >
      <p class="text-xs text-ink-muted max-w-md leading-relaxed">
        Finalizing deducts quantities from available batches and generates the allocation PDF.
        Staged lines stay available if finalization fails.
      </p>
      <AppButton
        type="button"
        :loading="finalizing"
        :disabled="disabled"
        @click="emit('requestFinalize')"
      >
        Finalize Allocation
      </AppButton>
    </div>
  </section>
</template>
