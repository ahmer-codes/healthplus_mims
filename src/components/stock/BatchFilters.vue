<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppSelect, { type SelectOption } from '@/components/forms/AppSelect.vue'
import AppInput from '@/components/forms/AppInput.vue'
import SearchInput from '@/components/forms/SearchInput.vue'
import { batchService, locationService, medicineService, type BatchManagementQuery } from '@/services'
import type { BatchStatus } from '@/types'

const props = defineProps<{
  modelValue: BatchManagementQuery
}>()

const emit = defineEmits<{
  'update:modelValue': [value: BatchManagementQuery]
}>()

const medicineOptions = ref<SelectOption[]>([])
const locationOptions = ref<SelectOption[]>([])
const manufacturerOptions = ref<SelectOption[]>([])

const statusOptions: SelectOption[] = [
  { value: 'available', label: 'Available' },
  { value: 'hold', label: 'On Hold' },
  { value: 'expired', label: 'Expired' },
  { value: 'depleted', label: 'Depleted' },
]

const expiryOptions: SelectOption[] = [
  { value: 'expiring_soon', label: 'Expiring soon' },
  { value: 'critical', label: 'Critical' },
  { value: 'warning', label: 'Warning' },
  { value: 'expired', label: 'Expired' },
  { value: 'ok', label: 'OK' },
]

const filters = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

function patch(partial: Partial<BatchManagementQuery>) {
  emit('update:modelValue', { ...props.modelValue, ...partial })
}

onMounted(async () => {
  const [medicines, locations, manufacturers] = await Promise.all([
    medicineService.listActive(),
    locationService.list(true),
    batchService.listManufacturers(),
  ])
  medicineOptions.value = medicines.map((m) => ({ value: m.id, label: m.displayName }))
  locationOptions.value = locations.map((l) => ({
    value: l.id,
    label: `${l.name} (${l.code})`,
  }))
  manufacturerOptions.value = manufacturers.map((name) => ({ value: name, label: name }))
})
</script>

<template>
  <section class="surface-panel px-3 py-2.5 sm:px-3.5">
    <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
      <div class="sm:col-span-2 xl:col-span-2 flex flex-col gap-1">
        <span class="text-[11px] font-medium text-ink-muted">Search</span>
        <SearchInput
          compact
          :model-value="filters.query ?? ''"
          placeholder="Medicine, batch, manufacturer…"
          @update:model-value="patch({ query: $event })"
        />
      </div>
      <AppSelect
        compact
        :model-value="filters.medicineId ?? ''"
        label="Medicine"
        :options="medicineOptions"
        placeholder="All medicines"
        @update:model-value="patch({ medicineId: $event || undefined })"
      />
      <AppInput
        compact
        :model-value="filters.batchNo ?? ''"
        label="Batch"
        placeholder="Batch / lot #"
        @update:model-value="patch({ batchNo: $event || undefined })"
      />
      <AppSelect
        compact
        :model-value="filters.locationId ?? ''"
        label="Location"
        :options="locationOptions"
        placeholder="All locations"
        @update:model-value="patch({ locationId: $event || undefined })"
      />
      <AppSelect
        compact
        :model-value="(filters.status as string) ?? ''"
        label="Status"
        :options="statusOptions"
        placeholder="All statuses"
        @update:model-value="patch({ status: ($event || undefined) as BatchStatus | undefined })"
      />
      <AppSelect
        compact
        :model-value="filters.expiry && filters.expiry !== 'all' ? filters.expiry : ''"
        label="Expiry"
        :options="expiryOptions"
        placeholder="Any expiry"
        @update:model-value="
          patch({ expiry: ($event || 'all') as BatchManagementQuery['expiry'] })
        "
      />
      <AppSelect
        compact
        :model-value="filters.manufacturer ?? ''"
        label="Manufacturer"
        :options="manufacturerOptions"
        placeholder="All manufacturers"
        @update:model-value="patch({ manufacturer: $event || undefined })"
      />
    </div>
  </section>
</template>
