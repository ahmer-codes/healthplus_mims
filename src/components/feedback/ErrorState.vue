<script setup lang="ts">
import { AlertTriangle } from '@lucide/vue'
import AppButton from '@/components/common/AppButton.vue'

withDefaults(
  defineProps<{
    title?: string
    message?: string
    retryLabel?: string
  }>(),
  {
    title: 'Something went wrong',
    message: 'We could not load this content. Please try again.',
    retryLabel: 'Retry',
  },
)

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center px-6 py-14 text-center">
    <div
      class="mb-4 flex size-12 items-center justify-center rounded-[var(--radius-md)] border border-danger/20 bg-danger-bg text-danger"
    >
      <AlertTriangle class="size-5" />
    </div>
    <h3 class="text-base font-semibold text-ink">{{ title }}</h3>
    <p class="mt-1.5 max-w-sm text-sm text-ink-muted leading-relaxed">{{ message }}</p>
    <AppButton class="mt-5" variant="outline" @click="emit('retry')">{{ retryLabel }}</AppButton>
  </div>
</template>
