<script setup lang="ts">
import { EXPIRY_WATCH_WINDOWS, type ExpiryWatchMonths } from '@/constants'
import { cn } from '@/utils'

defineProps<{
  modelValue: ExpiryWatchMonths
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ExpiryWatchMonths]
}>()
</script>

<template>
  <div class="inline-flex rounded-[var(--radius-md)] border border-border bg-surface p-1 gap-0.5">
    <button
      v-for="window in EXPIRY_WATCH_WINDOWS"
      :key="window.months"
      type="button"
      :class="
        cn(
          'h-8 px-3 sm:px-4 rounded-[var(--radius-sm)] text-sm font-medium transition-colors',
          modelValue === window.months
            ? 'bg-ink text-white shadow-[var(--shadow-sm)]'
            : 'text-ink-secondary hover:bg-surface-muted hover:text-ink',
        )
      "
      @click="emit('update:modelValue', window.months)"
    >
      {{ window.label }}
    </button>
  </div>
</template>
