<script setup lang="ts">
import { computed, useId } from 'vue'
import { cn } from '@/utils'

export interface SelectOption {
  label: string
  value: string
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue?: string
    label?: string
    options?: SelectOption[]
    placeholder?: string
    disabled?: boolean
    error?: string
    required?: boolean
    compact?: boolean
  }>(),
  {
    modelValue: '',
    options: () => [],
    placeholder: 'Select…',
    disabled: false,
    required: false,
    compact: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const id = useId()

const selectClass = computed(() =>
  cn(
    'w-full px-3 rounded-[var(--radius-md)] border bg-surface text-ink appearance-none',
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
    <div class="relative">
      <select
        :id="id"
        :value="modelValue"
        :disabled="disabled"
        :required="required"
        :class="selectClass"
        @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <option value="" disabled>{{ placeholder }}</option>
        <option
          v-for="option in options"
          :key="option.value"
          :value="option.value"
          :disabled="option.disabled"
        >
          {{ option.label }}
        </option>
      </select>
      <span
        class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ink-muted text-xs"
        aria-hidden="true"
      >
        ▾
      </span>
    </div>
    <p v-if="error" class="text-xs text-danger">{{ error }}</p>
  </div>
</template>
