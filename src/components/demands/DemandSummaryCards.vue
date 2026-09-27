<script setup lang="ts">
import { computed } from 'vue'
import StatCard from '@/components/common/StatCard.vue'

const props = defineProps<{
  summary: {
    pending: number
    approved: number
    fulfilled: number
    urgentOpen: number
  }
}>()

const pool = computed(
  () =>
    props.summary.pending +
    props.summary.approved +
    props.summary.fulfilled +
    props.summary.urgentOpen,
)

function share(n: number) {
  const t = pool.value
  if (!t) return 0
  return n / t
}
</script>

<template>
  <div class="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
    <StatCard
      label="Pending"
      :value="summary.pending"
      tone="warning"
      hint="Awaiting review"
      :share="share(summary.pending)"
    />
    <StatCard
      label="Approved"
      :value="summary.approved"
      tone="info"
      hint="Ready to fulfill"
      :share="share(summary.approved)"
    />
    <StatCard
      label="Fulfilled"
      :value="summary.fulfilled"
      tone="success"
      hint="Completed requests"
      :share="share(summary.fulfilled)"
    />
    <StatCard
      label="Urgent open"
      :value="summary.urgentOpen"
      tone="danger"
      hint="Needs immediate attention"
      :share="share(summary.urgentOpen)"
    />
  </div>
</template>
