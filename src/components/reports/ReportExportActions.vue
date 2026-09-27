<script setup lang="ts">
import { Download } from '@lucide/vue'
import AppButton from '@/components/common/AppButton.vue'
import type { ReportPriceMode } from '@/services'

defineProps<{
  hasPricing: boolean
  exporting?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  export: [mode: ReportPriceMode | 'plain']
}>()
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <template v-if="hasPricing">
      <AppButton
        variant="outline"
        size="sm"
        :loading="exporting"
        :disabled="disabled"
        @click="emit('export', 'with_price')"
      >
        <Download class="size-3.5" />
        Export With Price
      </AppButton>
      <AppButton
        variant="outline"
        size="sm"
        :loading="exporting"
        :disabled="disabled"
        @click="emit('export', 'without_price')"
      >
        <Download class="size-3.5" />
        Export Without Price
      </AppButton>
    </template>
    <AppButton
      v-else
      size="sm"
      :loading="exporting"
      :disabled="disabled"
      @click="emit('export', 'plain')"
    >
      <Download class="size-3.5" />
      Export PDF
    </AppButton>
  </div>
</template>
