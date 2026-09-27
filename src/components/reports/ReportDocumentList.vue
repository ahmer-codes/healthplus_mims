<script setup lang="ts">
import { FileText } from '@lucide/vue'
import LoadingState from '@/components/feedback/LoadingState.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import type { ReportListItem } from '@/services'
import { formatCurrency, formatDate } from '@/utils'

defineProps<{
  items: ReportListItem[]
  selectedId?: string | null
  emptyTitle?: string
  emptyDescription?: string
  loading?: boolean
}>()

const emit = defineEmits<{
  select: [item: ReportListItem]
}>()
</script>

<template>
  <section class="surface-panel overflow-hidden min-h-[24rem]">
    <div class="border-b border-border px-4 py-3 sm:px-5 flex items-center justify-between gap-3">
      <div>
        <h2 class="text-sm font-semibold text-ink">Report documents</h2>
        <p class="text-xs text-ink-muted mt-0.5">Select a document to view details and export</p>
      </div>
      <p class="text-xs text-ink-muted tabular-nums">{{ items.length }} record(s)</p>
    </div>

    <div v-if="loading" class="px-2 py-4">
      <LoadingState label="Loading reports…" />
    </div>

    <div
      v-else-if="!items.length"
      class="flex flex-col items-center justify-center px-6 py-16 text-center"
    >
      <div
        class="mb-4 flex size-11 items-center justify-center rounded-[var(--radius-md)] border border-border bg-surface-muted text-primary"
      >
        <FileText class="size-5" aria-hidden="true" />
      </div>
      <h3 class="text-display text-base font-semibold text-ink">
        {{ emptyTitle || 'No reports found' }}
      </h3>
      <p class="mt-1.5 max-w-sm text-sm text-ink-muted leading-relaxed">
        {{
          emptyDescription ||
          'Finalize stock movements to generate documents, or adjust the date range and filters.'
        }}
      </p>
    </div>

    <ul v-else class="divide-y divide-border max-h-[36rem] overflow-y-auto">
      <li v-for="item in items" :key="item.id">
        <button
          type="button"
          class="w-full text-left px-4 py-3.5 sm:px-5 transition-colors hover:bg-surface-muted/60"
          :class="selectedId === item.id ? 'bg-primary-subtle/50' : ''"
          @click="emit('select', item)"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm font-semibold text-ink truncate">{{ item.reference }}</p>
              <p class="mt-0.5 text-xs text-ink-muted truncate">{{ item.subtitle }}</p>
              <p v-if="item.secondary" class="mt-0.5 text-[11px] text-ink-faint truncate">
                {{ item.secondary }}
              </p>
            </div>
            <StatusBadge :status="item.status" />
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-muted">
            <span>{{ formatDate(item.date) }}</span>
            <span>{{ item.lineCount }} line(s)</span>
            <span v-if="item.hasPricing && item.grandTotal !== undefined" class="tabular-nums">
              {{ formatCurrency(item.grandTotal) }}
            </span>
          </div>
        </button>
      </li>
    </ul>
  </section>
</template>
