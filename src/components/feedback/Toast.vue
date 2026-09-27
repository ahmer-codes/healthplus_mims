<script setup lang="ts">
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import { onMounted, onUnmounted, watch } from 'vue'
import { useToastStore, type ToastVariant } from '@/stores'
import { cn } from '@/utils'

const store = useToastStore()
const { toasts } = storeToRefs(store)

const timers = new Map<string, ReturnType<typeof setTimeout>>()

function iconFor(variant: ToastVariant) {
  if (variant === 'success') return CheckCircle2
  if (variant === 'error') return XCircle
  if (variant === 'warning') return TriangleAlert
  return Info
}

function toneClass(variant: ToastVariant) {
  return cn(
    'border',
    variant === 'success' && 'border-success/25 bg-success-subtle text-success',
    variant === 'error' && 'border-danger/25 bg-danger-subtle text-danger',
    variant === 'warning' && 'border-warning/25 bg-warning-subtle text-warning',
    variant === 'info' && 'border-info/25 bg-info-subtle text-info',
  )
}

function schedule(id: string, duration: number) {
  clearTimer(id)
  timers.set(
    id,
    setTimeout(() => {
      store.dismiss(id)
      timers.delete(id)
    }, duration),
  )
}

function clearTimer(id: string) {
  const existing = timers.get(id)
  if (existing) clearTimeout(existing)
}

onMounted(() => {
  for (const toast of toasts.value) {
    schedule(toast.id, toast.duration)
  }
})

onUnmounted(() => {
  for (const id of timers.keys()) clearTimer(id)
  timers.clear()
})

watch(
  toasts,
  (list) => {
    for (const toast of list) {
      if (!timers.has(toast.id)) {
        schedule(toast.id, toast.duration)
      }
    }
  },
  { deep: true },
)
</script>

<template>
  <div
    class="pointer-events-none fixed right-3 top-3 z-[60] flex w-[calc(100%-1.5rem)] max-w-sm flex-col gap-2 sm:right-4 sm:top-4"
    aria-live="polite"
    aria-relevant="additions"
  >
    <TransitionGroup name="toast" tag="div" class="flex flex-col gap-2">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto flex gap-3 rounded-[var(--radius-md)] border border-border bg-surface p-3 shadow-[var(--shadow-md)]"
        role="status"
      >
        <div
          class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
          :class="toneClass(toast.variant)"
        >
          <component :is="iconFor(toast.variant)" class="size-4" aria-hidden="true" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-ink">{{ toast.title }}</p>
          <p v-if="toast.message" class="mt-0.5 text-xs text-ink-muted leading-relaxed">
            {{ toast.message }}
          </p>
        </div>
        <button
          type="button"
          class="icon-btn !size-7"
          aria-label="Dismiss notification"
          @click="store.dismiss(toast.id)"
        >
          <X class="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
