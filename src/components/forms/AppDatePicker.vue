<script setup lang="ts">
import { computed, useId } from 'vue'
import { cn } from '@/utils'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    label?: string
    disabled?: boolean
    error?: string
    required?: boolean
    min?: string
    max?: string
    compact?: boolean
  }>(),
  {
    modelValue: '',
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
    'w-full px-3 rounded-[var(--radius-md)] border bg-surface text-ink',
    'transition-colors focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400',
    props.compact ? 'h-8 text-sm' : 'h-9.5',
    props.error ? 'border-danger' : 'border-border hover:border-border-strong',
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
      type="date"
      :value="modelValue"
      :disabled="disabled"
      :required="required"
      :min="min"
      :max="max"
      :class="inputClass"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <p v-if="error" class="text-xs text-danger">{{ error }}</p>
  </div>
</template>
