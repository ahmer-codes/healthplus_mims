<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppDatePicker from '@/components/forms/AppDatePicker.vue'
import AppInput from '@/components/forms/AppInput.vue'
import AppSelect, { type SelectOption } from '@/components/forms/AppSelect.vue'
import SectionHeader from '@/components/common/SectionHeader.vue'
import { locationService, type AllocationDraftMaster, type AllocationMasterFormErrors } from '@/services'

const SOURCE_LOCATION = 'loc-main-pharmacy'

const props = defineProps<{
  master: AllocationDraftMaster
  errors: AllocationMasterFormErrors
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:date': [value: string]
  'update:voucherNo': [value: string]
  'update:destinationLocationId': [value: string]
  'update:receiverName': [value: string]
  'update:receiverDesignation': [value: string]
}>()

const locationOptions = ref<SelectOption[]>([])
const loadingLocations = ref(false)

const destinationHint = computed(() =>
  loadingLocations.value ? 'Loading destinations…' : 'Select department / location',
)

onMounted(async () => {
  loadingLocations.value = true
  try {
    const locations = await locationService.list(true)
    locationOptions.value = locations
      .filter((location) => location.id !== SOURCE_LOCATION)
      .map((location) => ({
        value: location.id,
        label: `${location.name} (${location.code})`,
      }))
  } finally {
    loadingLocations.value = false
  }
})
</script>

<template>
  <section class="surface-panel p-4 sm:p-5 space-y-4">
    <SectionHeader
      title="Master Information"
      description="Voucher, date, and destination for this allocation"
    />
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
        placeholder="e.g. ALC-2048"
        required
        :disabled="disabled"
        :error="errors.voucherNo"
        @update:model-value="emit('update:voucherNo', $event)"
      />
      <AppSelect
        :model-value="master.destinationLocationId"
        label="To / Destination"
        :options="locationOptions"
        required
        :disabled="disabled || loadingLocations"
        :error="errors.destinationLocationId"
        :placeholder="destinationHint"
        @update:model-value="emit('update:destinationLocationId', $event)"
      />
      <AppInput
        :model-value="master.receiverName"
        label="Receiver Name"
        placeholder="Optional"
        :disabled="disabled"
        @update:model-value="emit('update:receiverName', $event)"
      />
      <AppInput
        :model-value="master.receiverDesignation"
        label="Receiver Designation"
        placeholder="Optional"
        :disabled="disabled"
        @update:model-value="emit('update:receiverDesignation', $event)"
      />
    </div>
  </section>
</template>
