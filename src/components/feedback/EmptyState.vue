<script setup lang="ts">
import { Inbox } from '@lucide/vue'
import AppButton from '@/components/common/AppButton.vue'

withDefaults(
  defineProps<{
    title?: string
    description?: string
    actionLabel?: string
  }>(),
  {
    title: 'Nothing here yet',
    description: 'Records will appear once this module is connected to live data.',
  },
)

const emit = defineEmits<{
  action: []
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center px-6 py-14 text-center">
    <div
      class="mb-4 flex size-11 items-center justify-center rounded-[var(--radius-md)] border border-border bg-surface-muted text-primary"
    >
      <slot name="icon">
        <Inbox class="size-5" aria-hidden="true" />
      </slot>
    </div>
    <h3 class="text-display text-base font-semibold text-ink">{{ title }}</h3>
    <p class="mt-1.5 max-w-sm text-sm text-ink-muted leading-relaxed">{{ description }}</p>
    <div v-if="actionLabel || $slots.action" class="mt-5">
      <slot name="action">
        <AppButton variant="outline" @click="emit('action')">{{ actionLabel }}</AppButton>
      </slot>
    </div>
  </div>
</template>
