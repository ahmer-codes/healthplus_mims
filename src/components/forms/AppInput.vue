<script setup lang="ts">
import { computed, useId } from 'vue'
import { cn } from '@/utils'

const props = withDefaults(
  defineProps<{
    modelValue?: string | number
    label?: string
    placeholder?: string
    type?: string
    disabled?: boolean
    error?: string
    hint?: string
    required?: boolean
    autocomplete?: string
    /** Tighter label + control for filter toolbars */
    compact?: boolean
  }>(),
  {
    modelValue: '',
    type: 'text',
    disabled: false,
    required: false,
    compact: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const id = useId()

const inputClass = computed(() =>
  cn(
    'w-full px-3 rounded-[var(--radius-md)] border bg-surface text-ink placeholder:text-ink-faint',
    'transition-[border-color,box-shadow,background-color] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
    'focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400',
    props.compact ? 'h-8 text-sm' : 'h-9.5',
    props.error ? 'border-danger focus:ring-danger/20' : 'border-border hover:border-border-strong',
    props.disabled && 'bg-surface-muted opacity-70 cursor-not-allowed',
  ),
)
</script>

<template>
  <div :class="compact ? 'flex flex-col gap-1' : 'flex flex-col gap-1.5'">
    <label
      v-if="label"
      :for="id"
      :class="compact ? 'text-[11px] font-medium text-ink-muted' : 'text-sm font-medium text-ink'"
    >
      {{ label }}
      <span v-if="required" class="text-brand-500">*</span>
    </label>
    <input
      :id="id"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :autocomplete="autocomplete"
      :class="inputClass"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <p v-if="error" class="text-xs text-danger">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-ink-muted">{{ hint }}</p>
  </div>
</template>
