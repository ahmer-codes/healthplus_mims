<script setup lang="ts">
import { computed } from 'vue'
import { STATUS_LABELS, type StatusKey } from '@/constants'
import { cn } from '@/utils'

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand'

const props = withDefaults(
  defineProps<{
    label?: string
    status?: StatusKey
    tone?: BadgeTone
  }>(),
  {
    tone: 'neutral',
  },
)

const display = computed(() => {
  if (props.label) return props.label
  if (props.status && props.status in STATUS_LABELS) {
    return STATUS_LABELS[props.status]
  }
  return 'Unknown'
})

/**
 * Tone map. keep strong red for true danger (expired / cancelled / urgent).
 * Demand priorities stay distinct from operational “success” greens.
 */
const resolvedTone = computed<BadgeTone>(() => {
  if (props.tone !== 'neutral') return props.tone
  const s = props.status
  if (!s) return 'neutral'

  if (['available', 'approved', 'posted', 'fulfilled', 'ok', 'upcoming'].includes(s)) {
    return 'success'
  }
  if (['hold', 'draft', 'pending', 'warning', 'critical', 'expiring_soon', 'high'].includes(s)) {
    return 'warning'
  }
  if (['expired', 'cancelled', 'depleted', 'urgent'].includes(s)) return 'danger'
  if (['low', 'normal'].includes(s)) return 'neutral'
  return 'neutral'
})

const classes = computed(() =>
  cn(
    'inline-flex max-w-full items-center gap-1 rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-medium border whitespace-nowrap',
    resolvedTone.value === 'neutral' && 'bg-neutral-subtle text-neutral border-border',
    resolvedTone.value === 'success' && 'bg-success-subtle text-success border-success/20',
    resolvedTone.value === 'warning' && 'bg-warning-subtle text-warning border-warning/20',
    resolvedTone.value === 'danger' && 'bg-danger-subtle text-danger border-danger/20',
    resolvedTone.value === 'info' && 'bg-info-subtle text-info border-info/20',
    resolvedTone.value === 'brand' && 'bg-primary-subtle text-brand-700 border-brand-200',
  ),
)
</script>

<template>
  <span :class="classes">{{ display }}</span>
</template>
