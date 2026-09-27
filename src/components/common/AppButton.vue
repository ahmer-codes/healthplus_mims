<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant
    size?: ButtonSize
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    loading?: boolean
    block?: boolean
  }>(),
  {
    variant: 'primary',
    size: 'md',
    type: 'button',
    disabled: false,
    loading: false,
    block: false,
  },
)

const classes = computed(() =>
  cn(
    'inline-flex items-center justify-center gap-2 font-medium select-none',
    'transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
    'disabled:opacity-50 disabled:pointer-events-none',
    'active:scale-[0.98]',
    props.block && 'w-full',
    props.size === 'sm' && 'h-8 px-3 text-sm rounded-[var(--radius-sm)]',
    props.size === 'md' && 'h-9.5 px-4 text-sm rounded-[var(--radius-md)]',
    props.size === 'lg' && 'h-11 px-5 text-base rounded-[var(--radius-md)]',
    props.variant === 'primary' &&
      'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active shadow-[var(--shadow-sm)]',
    props.variant === 'secondary' &&
      'bg-surface-subtle text-ink hover:bg-surface-sunken active:bg-border',
    props.variant === 'ghost' &&
      'bg-transparent text-ink-secondary hover:bg-surface-subtle hover:text-ink',
    props.variant === 'danger' &&
      'bg-danger text-white hover:bg-danger-hover active:bg-primary-active',
    props.variant === 'outline' &&
      'bg-surface text-ink border border-border hover:border-border-strong hover:bg-surface-muted active:bg-surface-subtle',
  ),
)
</script>

<template>
  <button :type="type" :class="classes" :disabled="disabled || loading" :aria-busy="loading || undefined">
    <span
      v-if="loading"
      class="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
      aria-hidden="true"
    />
    <slot />
  </button>
</template>
