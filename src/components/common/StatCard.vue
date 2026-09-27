<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/utils'

export type StatTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand'

export type StatSegment = {
  value: number
  tone?: StatTone
}

const props = withDefaults(
  defineProps<{
    label: string
    value: string | number
    hint?: string
    tone?: StatTone
    /** 0–1 share for a single progress meter under the value */
    share?: number | null
    /** Stacked composition bar (e.g. status mix of total) */
    segments?: StatSegment[]
    /** Compact sparkline values (relative heights) */
    sparkline?: number[]
    loading?: boolean
  }>(),
  {
    tone: 'neutral',
    share: null,
    segments: () => [],
    sparkline: () => [],
  },
)

const toneValueClass: Record<StatTone, string> = {
  neutral: 'text-ink',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
  brand: 'text-brand-600',
}

const toneBarClass: Record<StatTone, string> = {
  neutral: 'bg-neutral',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  brand: 'bg-primary',
}

const toneDotClass: Record<StatTone, string> = {
  neutral: 'bg-neutral',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  brand: 'bg-primary',
}

const clampedShare = computed(() => {
  if (props.share == null || Number.isNaN(props.share)) return null
  return Math.max(0, Math.min(1, props.share))
})

const normalizedSegments = computed(() => {
  const total = props.segments.reduce((sum, s) => sum + Math.max(0, s.value), 0)
  if (total <= 0) return []
  return props.segments
    .filter((s) => s.value > 0)
    .map((s) => ({
      tone: s.tone ?? 'neutral',
      width: `${(Math.max(0, s.value) / total) * 100}%`,
    }))
})

const sparkPoints = computed(() => {
  const values = props.sparkline
  if (values.length < 2) return ''
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const span = Math.max(max - min, 1)
  const w = 64
  const h = 22
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w
      const y = h - ((v - min) / span) * (h - 2) - 1
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})

const hasVisual = computed(
  () =>
    clampedShare.value != null ||
    normalizedSegments.value.length > 0 ||
    sparkPoints.value.length > 0,
)
</script>

<template>
  <div
    :class="
      cn(
        'surface-panel px-3.5 py-3 sm:px-4',
        tone === 'danger' && 'border-danger/20',
        tone === 'warning' && 'border-warning/20',
      )
    "
  >
    <div class="flex items-start justify-between gap-2">
      <p class="text-[10px] font-medium uppercase tracking-[0.07em] text-ink-muted leading-tight">
        {{ label }}
      </p>
      <span
        class="mt-0.5 size-1.5 shrink-0 rounded-full"
        :class="toneDotClass[tone]"
        aria-hidden="true"
      />
    </div>

    <div class="mt-1.5 flex items-end justify-between gap-3">
      <p
        class="text-display text-xl font-semibold tracking-tight tabular-nums leading-none"
        :class="toneValueClass[tone]"
      >
        {{ loading ? '-' : value }}
      </p>

      <!-- Mini sparkline -->
      <svg
        v-if="sparkPoints && !loading"
        viewBox="0 0 64 22"
        class="mb-0.5 h-[22px] w-16 shrink-0 overflow-visible"
        :class="toneValueClass[tone]"
        aria-hidden="true"
      >
        <polyline
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
          :points="sparkPoints"
        />
      </svg>
    </div>

    <!-- Single share meter -->
    <div
      v-if="clampedShare != null && !loading"
      class="mt-2.5 h-1 overflow-hidden rounded-full bg-surface-subtle"
      role="meter"
      :aria-label="`${label} level`"
      :aria-valuenow="Math.round(clampedShare * 100)"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div
        class="h-full rounded-full transition-[width] duration-[var(--duration-normal)]"
        :class="toneBarClass[tone]"
        :style="{ width: `${clampedShare * 100}%` }"
      />
    </div>

    <!-- Stacked composition -->
    <div
      v-else-if="normalizedSegments.length && !loading"
      class="mt-2.5 flex h-1 overflow-hidden rounded-full bg-surface-subtle"
      aria-hidden="true"
    >
      <div
        v-for="(seg, i) in normalizedSegments"
        :key="i"
        class="h-full transition-[width] duration-[var(--duration-normal)]"
        :class="toneBarClass[seg.tone]"
        :style="{ width: seg.width }"
      />
    </div>

    <!-- Spacer when no visual so card heights stay even with neighbors that have meters -->
    <div v-else-if="!hasVisual" class="mt-2.5 h-1" aria-hidden="true" />

    <p v-if="hint" class="mt-1.5 text-[11px] text-ink-faint leading-snug truncate" :title="hint">
      {{ hint }}
    </p>
  </div>
</template>
