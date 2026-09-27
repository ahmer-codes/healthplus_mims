<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppSelect, { type SelectOption } from '@/components/forms/AppSelect.vue'
import SearchInput from '@/components/forms/SearchInput.vue'
import {
  locationService,
  medicineService,
  type ExpiryWatchFilter,
  type ExpiryWatchStatus,
} from '@/services'

const props = defineProps<{
  modelValue: Omit<ExpiryWatchFilter, 'windowMonths'>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Omit<ExpiryWatchFilter, 'windowMonths'>]
}>()

const medicineOptions = ref<SelectOption[]>([])
const locationOptions = ref<SelectOption[]>([])

const statusOptions: SelectOption[] = [
  { value: 'expired', label: 'Expired' },
  { value: 'critical', label: 'Critical' },
  { value: 'expiring_soon', label: 'Expiring Soon' },
  { value: 'upcoming', label: 'Upcoming' },
]

function patch(partial: Partial<Omit<ExpiryWatchFilter, 'windowMonths'>>) {
  emit('update:modelValue', { ...props.modelValue, ...partial })
}

onMounted(async () => {
  const [medicines, locations] = await Promise.all([
    medicineService.listActive(),
    locationService.list(true),
  ])
  medicineOptions.value = medicines.map((m) => ({ value: m.id, label: m.displayName }))
  locationOptions.value = locations.map((l) => ({
    value: l.id,
    label: `${l.name} (${l.code})`,
  }))
})
</script>

<template>
  <section class="surface-panel px-3 py-2.5 sm:px-3.5">
    <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <div class="sm:col-span-2 flex flex-col gap-1">
        <span class="text-[11px] font-medium text-ink-muted">Search</span>
        <SearchInput
          compact
          :model-value="modelValue.query ?? ''"
          placeholder="Medicine, batch, location…"
          @update:model-value="patch({ query: $event })"
        />
      </div>
      <AppSelect
        compact
        :model-value="modelValue.locationId ?? ''"
        label="Location"
        :options="locationOptions"
        placeholder="All locations"
        @update:model-value="patch({ locationId: $event || undefined })"
      />
      <AppSelect
        compact
        :model-value="modelValue.medicineId ?? ''"
        label="Medicine"
        :options="medicineOptions"
        placeholder="All medicines"
        @update:model-value="patch({ medicineId: $event || undefined })"
      />
      <AppSelect
        compact
        :model-value="(modelValue.status as string) ?? ''"
        label="Status"
        :options="statusOptions"
        placeholder="All statuses"
        @update:model-value="
          patch({ status: ($event || undefined) as ExpiryWatchStatus | undefined })
        "
      />
    </div>
  </section>
</template>
