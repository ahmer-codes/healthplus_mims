<script setup lang="ts">
import { AlertTriangle, CheckCircle2, Download, FileText } from '@lucide/vue'
import AppButton from '@/components/common/AppButton.vue'
import AppModal from '@/components/common/AppModal.vue'

defineProps<{
  open: boolean
  mode: 'success' | 'failure'
  title: string
  description?: string
  errorMessage?: string
  showDownload?: boolean
}>()

const emit = defineEmits<{
  close: []
  download: []
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
    <div v-if="mode === 'success'" class="space-y-4">
      <div
        class="flex items-start gap-3 rounded-[var(--radius-md)] border border-success/20 bg-success-subtle px-3 py-3"
      >
        <CheckCircle2 class="size-5 text-success shrink-0 mt-0.5" aria-hidden="true" />
        <div class="min-w-0">
          <slot name="success" />
        </div>
      </div>
      <slot />
    </div>

    <div
      v-else
      class="flex items-start gap-3 rounded-[var(--radius-md)] border border-danger/20 bg-danger-subtle px-3 py-3"
    >
      <AlertTriangle class="size-5 text-danger shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        <p class="text-sm font-medium text-ink">Could not finalize</p>
        <p class="text-xs text-ink-muted mt-0.5 leading-relaxed">
          {{ errorMessage || 'An unexpected error occurred. Please review and try again.' }}
        </p>
      </div>
    </div>

    <template #footer>
      <AppButton variant="outline" @click="emit('close')">
        <FileText class="size-3.5" aria-hidden="true" />
        {{ mode === 'success' ? 'Continue' : 'Close' }}
      </AppButton>
      <AppButton v-if="mode === 'success' && showDownload !== false" @click="emit('download')">
        <Download class="size-3.5" aria-hidden="true" />
        Download PDF
      </AppButton>
    </template>
  </AppModal>
</template>
