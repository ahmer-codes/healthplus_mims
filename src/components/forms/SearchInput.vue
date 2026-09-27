<script setup lang="ts">
import { Search } from '@lucide/vue'
import { computed, useId } from 'vue'
import { cn } from '@/utils'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    disabled?: boolean
    compact?: boolean
  }>(),
  {
    modelValue: '',
    placeholder: 'Search…',
    disabled: false,
    compact: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const id = useId()

const inputClass = computed(() =>
  cn(
    'w-full pl-9 pr-3 rounded-[var(--radius-md)] border border-border bg-surface text-ink',
    'placeholder:text-ink-faint transition-[border-color,box-shadow,background-color] duration-[var(--duration-fast)]',
    'focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400',
    'hover:border-border-strong',
    props.compact ? 'h-8 text-sm' : 'h-9.5',
    props.disabled && 'bg-surface-muted opacity-70 cursor-not-allowed',
  ),
)
</script>

<template>
  <div class="relative">
    <Search
      class="pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-muted"
      :class="compact ? 'left-2.5 size-3.5' : 'left-3 size-4'"
      aria-hidden="true"
    />
    <input
      :id="id"
      type="search"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="inputClass"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </div>
</template>
