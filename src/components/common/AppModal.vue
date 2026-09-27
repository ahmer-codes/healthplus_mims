<script setup lang="ts">
import { X } from '@lucide/vue'
import { onMounted, onUnmounted, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    description?: string
    size?: 'sm' | 'md' | 'lg'
  }>(),
  {
    title: '',
    description: '',
    size: 'md',
  },
)

const emit = defineEmits<{
  close: []
}>()

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open) {
    emit('close')
  }
}

watch(
  () => props.open,
  (isOpen) => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
  },
)

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})

const sizeClass = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-backdrop">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title ? 'app-modal-title' : undefined"
      >
        <div class="absolute inset-0 bg-ink/45" aria-hidden="true" @click="emit('close')" />

        <Transition name="modal-panel" appear>
          <div
            v-if="open"
            class="relative z-10 w-full bg-surface border border-border shadow-[var(--shadow-lg)] sm:rounded-[var(--radius-lg)] rounded-t-[var(--radius-lg)]"
            :class="sizeClass[size]"
          >
            <div class="flex items-start justify-between gap-4 px-5 py-4 border-b border-border">
              <div>
                <h2 v-if="title" id="app-modal-title" class="text-base font-semibold text-ink">
                  {{ title }}
                </h2>
                <p v-if="description" class="mt-0.5 text-sm text-ink-muted">{{ description }}</p>
              </div>
              <button
                type="button"
                class="icon-btn"
                aria-label="Close dialog"
                @click="emit('close')"
              >
                <X class="size-4" aria-hidden="true" />
              </button>
            </div>
            <div class="px-5 py-4">
              <slot />
            </div>
            <div
              v-if="$slots.footer"
              class="flex justify-end gap-2 px-5 py-4 border-t border-border bg-surface-muted/60"
            >
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
