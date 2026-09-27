<script setup lang="ts">
import { ChevronDown, EllipsisVertical } from '@lucide/vue'
import { onMounted, onUnmounted, ref, useSlots } from 'vue'

withDefaults(
  defineProps<{
    label?: string
    align?: 'left' | 'right'
    /** Compact kebab trigger for table row actions */
    variant?: 'default' | 'icon'
  }>(),
  {
    label: 'Options',
    align: 'left',
    variant: 'default',
  },
)

const slots = useSlots()
const open = ref(false)
const root = ref<HTMLElement | null>(null)

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
}

function onPointerDown(event: MouseEvent) {
  if (!root.value?.contains(event.target as Node)) {
    close()
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('mousedown', onPointerDown)
  document.addEventListener('keydown', onKeydown)
})
onUnmounted(() => {
  document.removeEventListener('mousedown', onPointerDown)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="root" class="relative inline-flex">
    <button
      type="button"
      :class="
        variant === 'icon'
          ? 'row-action-btn focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400'
          : slots.trigger
            ? 'rounded-[var(--radius-md)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400'
            : 'inline-flex h-9 items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm font-medium text-ink transition-colors duration-[var(--duration-fast)] hover:bg-surface-muted'
      "
      :aria-expanded="open"
      :aria-haspopup="true"
      :aria-label="label"
      @click.stop="toggle"
    >
      <slot name="trigger">
        <EllipsisVertical v-if="variant === 'icon'" class="size-4" aria-hidden="true" />
        <template v-else>
          {{ label }}
          <ChevronDown class="size-4 text-ink-muted" aria-hidden="true" />
        </template>
      </slot>
    </button>

    <Transition name="dropdown">
      <div
        v-if="open"
        class="absolute z-50 mt-1.5 min-w-[11.5rem] overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface py-1 shadow-[var(--shadow-lg)] origin-top"
        :class="align === 'right' ? 'right-0' : 'left-0'"
        role="menu"
      >
        <slot :close="close" />
      </div>
    </Transition>
  </div>
</template>
