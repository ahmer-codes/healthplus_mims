<script setup lang="ts">
import { computed } from 'vue'
import StatCard from '@/components/common/StatCard.vue'
import type { BatchBoardSummary } from '@/types'

const props = defineProps<{
  summary: BatchBoardSummary
  loading?: boolean
}>()

const total = computed(() => Math.max(props.summary.total, 0))

function share(n: number) {
  if (!total.value) return 0
  return n / total.value
}

const mixSegments = computed(() => [
  { value: props.summary.available, tone: 'success' as const },
  { value: props.summary.hold, tone: 'info' as const },
  { value: props.summary.expiringSoon, tone: 'warning' as const },
  { value: props.summary.expired, tone: 'danger' as const },
  { value: props.summary.depleted, tone: 'neutral' as const },
])
</script>

<template>
  <div class="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
    <StatCard
      label="Total batches"
      :value="summary.total"
      :loading="loading"
      tone="brand"
      hint="All active lots"
      :segments="mixSegments"
    />
    <StatCard
      label="Available"
      :value="summary.available"
      :loading="loading"
      tone="success"
      hint="Ready to allocate"
      :share="share(summary.available)"
    />
    <StatCard
      label="On Hold"
      :value="summary.hold"
      :loading="loading"
      tone="info"
      hint="Excluded from allocation"
      :share="share(summary.hold)"
    />
    <StatCard
      label="Expiring Soon"
      :value="summary.expiringSoon"
      :loading="loading"
      tone="warning"
      hint="Within expiry watch window"
      :share="share(summary.expiringSoon)"
    />
    <StatCard
      label="Expired"
      :value="summary.expired"
      :loading="loading"
      tone="danger"
      hint="Needs quarantine review"
      :share="share(summary.expired)"
    />
  </div>
</template>
