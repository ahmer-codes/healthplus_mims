<script setup lang="ts">
import { computed } from 'vue'
import StatCard from '@/components/common/StatCard.vue'
import type { ExpiryWatchSummary } from '@/services'

const props = defineProps<{
  summary: ExpiryWatchSummary
  loading?: boolean
}>()

const peakQty = computed(() =>
  Math.max(
    props.summary.quantityWithin1Month,
    props.summary.quantityWithin3Months,
    props.summary.quantityWithin6Months,
    props.summary.quantityExpired,
    1,
  ),
)

function qtyShare(n: number) {
  return n / peakQty.value
}
</script>

<template>
  <div class="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
    <StatCard
      label="Within 1 month"
      :value="summary.within1Month"
      :loading="loading"
      tone="danger"
      :hint="loading ? undefined : `${summary.quantityWithin1Month} units remaining`"
      :share="qtyShare(summary.quantityWithin1Month)"
    />
    <StatCard
      label="Within 3 months"
      :value="summary.within3Months"
      :loading="loading"
      tone="warning"
      :hint="loading ? undefined : `${summary.quantityWithin3Months} units remaining`"
      :share="qtyShare(summary.quantityWithin3Months)"
    />
    <StatCard
      label="Within 6 months"
      :value="summary.within6Months"
      :loading="loading"
      tone="info"
      :hint="loading ? undefined : `${summary.quantityWithin6Months} units remaining`"
      :share="qtyShare(summary.quantityWithin6Months)"
    />
    <StatCard
      label="Already expired"
      :value="summary.alreadyExpired"
      :loading="loading"
      tone="danger"
      :hint="loading ? undefined : `${summary.quantityExpired} units for quarantine review`"
      :share="qtyShare(summary.quantityExpired)"
    />
  </div>
</template>
