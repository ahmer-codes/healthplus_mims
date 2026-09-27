<script setup lang="ts">
import AppDatePicker from '@/components/forms/AppDatePicker.vue'
import AppInput from '@/components/forms/AppInput.vue'
import SectionHeader from '@/components/common/SectionHeader.vue'
import type { StockInDraftMaster, StockInMasterFormErrors } from '@/services'

defineProps<{
  master: StockInDraftMaster
  errors: StockInMasterFormErrors
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:purchaseOrderNo': [value: string]
  'update:receivingDate': [value: string]
}>()
</script>

<template>
  <section class="surface-panel p-4 sm:p-5 space-y-4">
    <SectionHeader
      title="Master Information"
      description="Purchase order and receiving date for this delivery"
    />
    <div class="grid gap-3 sm:grid-cols-2">
      <AppInput
        :model-value="master.purchaseOrderNo"
        label="Purchase Order Number"
        placeholder="e.g. PO-1024"
        required
        :disabled="disabled"
        :error="errors.purchaseOrderNo"
        @update:model-value="emit('update:purchaseOrderNo', $event)"
      />
      <AppDatePicker
        :model-value="master.receivingDate"
        label="Medicine Receiving Date"
        required
        :disabled="disabled"
        :error="errors.receivingDate"
        @update:model-value="emit('update:receivingDate', $event)"
      />
    </div>
  </section>
</template>
