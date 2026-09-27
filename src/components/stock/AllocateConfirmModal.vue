<script setup lang="ts">
import AppButton from '@/components/common/AppButton.vue'
import AppModal from '@/components/common/AppModal.vue'
import { formatQuantity } from '@/utils'

defineProps<{
  open: boolean
  voucherNo: string
  destinationName: string
  lineCount: number
  totalQuantity: number
  loading?: boolean
}>()

const emit = defineEmits<{
  close: []
  confirm: []
}>()
</script>

<template>
  <AppModal
    :open="open"
    title="Confirm allocation"
    description="Inventory will be deducted from available batches."
    size="md"
    @close="emit('close')"
  >
    <div class="space-y-3 text-sm">
      <p class="text-ink-secondary leading-relaxed">
        You are about to post voucher
        <span class="font-semibold text-ink">{{ voucherNo || '-' }}</span>
        to
        <span class="font-semibold text-ink">{{ destinationName || '-' }}</span>
        with
        <span class="font-semibold text-ink">{{ lineCount }}</span>
        line(s) totaling
        <span class="font-semibold text-ink tabular-nums">{{ formatQuantity(totalQuantity) }}</span>
        units.
      </p>
      <p class="text-xs text-ink-muted">
        This cannot be undone from this screen. Staged items are kept if posting fails.
      </p>
    </div>

    <template #footer>
      <AppButton variant="outline" :disabled="loading" @click="emit('close')">Cancel</AppButton>
      <AppButton :loading="loading" @click="emit('confirm')">Confirm &amp; finalize</AppButton>
    </template>
  </AppModal>
</template>
