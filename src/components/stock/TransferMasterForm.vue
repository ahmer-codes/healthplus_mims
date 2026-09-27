<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppDatePicker from '@/components/forms/AppDatePicker.vue'
import AppInput from '@/components/forms/AppInput.vue'
import AppSelect, { type SelectOption } from '@/components/forms/AppSelect.vue'
import SectionHeader from '@/components/common/SectionHeader.vue'
import { locationService, type TransferDraftMaster, type TransferMasterFormErrors } from '@/services'

const props = defineProps<{
  master: TransferDraftMaster
  errors: TransferMasterFormErrors
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:date': [value: string]
  'update:voucherNo': [value: string]
  'update:fromLocationId': [value: string]
  'update:toLocationId': [value: string]
}>()

const locationOptions = ref<SelectOption[]>([])
const loadingLocations = ref(false)

const toOptions = computed(() =>
  locationOptions.value.map((option) => ({
    ...option,
    disabled: option.value === props.master.fromLocationId,
  })),
)

onMounted(async () => {
  loadingLocations.value = true
  try {
    const locations = await locationService.list(true)
    locationOptions.value = locations.map((location) => ({
      value: location.id,
      label: `${location.name} (${location.code})`,
    }))
  } finally {
    loadingLocations.value = false
  }
})

watch(
  () => props.master.fromLocationId,
  (fromId) => {
    if (fromId && fromId === props.master.toLocationId) {
      emit('update:toLocationId', '')
    }
  },
)
</script>

<template>
  <section class="surface-panel p-4 sm:p-5 space-y-4">
    <SectionHeader
      title="Master Information"
      description="Date, voucher, and transfer locations"
    />
    <div class="grid gap-3 sm:grid-cols-2">
      <AppDatePicker
        :model-value="master.date"
        label="Date"
        required
        :disabled="disabled"
        :error="errors.date"
        @update:model-value="emit('update:date', $event)"
      />
      <AppInput
        :model-value="master.voucherNo"
        label="Voucher Number"
        placeholder="e.g. TRF-110"
        required
        :disabled="disabled"
        :error="errors.voucherNo"
        @update:model-value="emit('update:voucherNo', $event)"
      />
      <AppSelect
        :model-value="master.fromLocationId"
        label="From Location"
        :options="locationOptions"
        required
        :disabled="disabled || loadingLocations"
        :error="errors.fromLocationId"
        placeholder="Select source location"
        @update:model-value="emit('update:fromLocationId', $event)"
      />
      <AppSelect
        :model-value="master.toLocationId"
        label="To Location"
        :options="toOptions"
        required
        :disabled="disabled || loadingLocations || !master.fromLocationId"
        :error="errors.toLocationId"
        placeholder="Select destination location"
        @update:model-value="emit('update:toLocationId', $event)"
      />
    </div>
  </section>
</template>
