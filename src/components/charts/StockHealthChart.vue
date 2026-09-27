<script setup lang="ts">
import { computed } from 'vue'
import type { StockHealthBreakdown } from '@/types'

const props = defineProps<{
  health: StockHealthBreakdown
}>()

const rows = computed(() => {
  const items = [
    { key: 'available', label: 'Available', value: props.health.available, tone: 'bg-success' },
    { key: 'lowStock', label: 'Low Stock', value: props.health.lowStock, tone: 'bg-warning' },
    { key: 'hold', label: 'On Hold', value: props.health.hold, tone: 'bg-info' },
    { key: 'expiringSoon', label: 'Expiring Soon', value: props.health.expiringSoon, tone: 'bg-brand-400' },
    { key: 'expired', label: 'Expired', value: props.health.expired, tone: 'bg-danger' },
  ] as const

  const max = Math.max(...items.map((item) => item.value), 1)
  return items.map((item) => ({
    ...item,
    width: `${Math.round((item.value / max) * 100)}%`,
  }))
})
</script>

<template>
  <div class="space-y-3.5">
    <div v-for="row in rows" :key="row.key" class="space-y-1.5">
      <div class="flex items-baseline justify-between gap-3 text-sm">
        <span class="text-ink-secondary">{{ row.label }}</span>
        <span class="tabular-nums font-medium text-ink">{{ row.value }}</span>
      </div>
      <div class="h-1.5 rounded-full bg-surface-subtle overflow-hidden">
        <div
          class="h-full rounded-full transition-[width] duration-[var(--duration-normal)]"
          :class="row.tone"
          :style="{ width: row.width }"
        />
      </div>
    </div>
  </div>
</template>
