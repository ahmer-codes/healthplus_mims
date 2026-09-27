<script setup lang="ts">
import { computed, useId } from 'vue'
import { cn } from '@/utils'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    label?: string
    placeholder?: string
    disabled?: boolean
    error?: string
    hint?: string
    required?: boolean
    rows?: number
  }>(),
  {
    modelValue: '',
    disabled: false,
    required: false,
    rows: 3,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const id = useId()

const fieldClass = computed(() =>
  cn(
    'w-full px-3 py-2 rounded-[var(--radius-md)] border bg-surface text-ink placeholder:text-ink-faint resize-y min-h-[4.5rem]',
    'transition-[border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
    'focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400',
    props.error ? 'border-danger focus:ring-danger/20' : 'border-border hover:border-border-strong',
    props.disabled && 'bg-surface-muted opacity-70 cursor-not-allowed',
  ),
)
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" :for="id" class="text-sm font-medium text-ink">
      {{ label }}
      <span v-if="required" class="text-brand-500">*</span>
    </label>
    <textarea
      :id="id"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :rows="rows"
      :class="fieldClass"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <p v-if="error" class="text-xs text-danger">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-ink-muted">{{ hint }}</p>
  </div>
</template>
