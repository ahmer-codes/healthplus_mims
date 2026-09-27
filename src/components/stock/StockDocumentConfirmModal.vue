<script setup lang="ts">
import AppButton from '@/components/common/AppButton.vue'
import AppModal from '@/components/common/AppModal.vue'

withDefaults(
  defineProps<{
    open: boolean
    title: string
    description?: string
    confirmLabel?: string
    loading?: boolean
    /** When true, confirm uses danger styling (destructive flows). */
    danger?: boolean
    /** Optional footnote under the body (e.g. staged-cart reassurance). */
    hint?: string
  }>(),
  {
    confirmLabel: 'Confirm',
    loading: false,
    danger: false,
  },
)

const emit = defineEmits<{
  close: []
  confirm: []
}>()
</script>

<template>
  <AppModal
    :open="open"
    :title="title"
    :description="description"
    size="md"
    @close="emit('close')"
  >
    <div class="space-y-3 text-sm">
      <slot />
      <p v-if="hint" class="text-xs text-ink-muted leading-relaxed">{{ hint }}</p>
    </div>

    <template #footer>
      <AppButton variant="outline" :disabled="loading" @click="emit('close')">Cancel</AppButton>
      <AppButton
        :variant="danger ? 'danger' : 'primary'"
        :loading="loading"
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </AppButton>
    </template>
  </AppModal>
</template>
