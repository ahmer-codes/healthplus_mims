<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppDatePicker from '@/components/forms/AppDatePicker.vue'
import AppSelect, { type SelectOption } from '@/components/forms/AppSelect.vue'
import SearchInput from '@/components/forms/SearchInput.vue'
import { locationService, type ReportDocumentFilter } from '@/services'

const props = defineProps<{
  modelValue: ReportDocumentFilter
  locationLabel?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ReportDocumentFilter]
}>()

const locationOptions = ref<SelectOption[]>([])

const statusOptions: SelectOption[] = [
  { value: 'posted', label: 'Posted' },
  { value: 'draft', label: 'Draft' },
  { value: 'cancelled', label: 'Cancelled' },
]

function patch(partial: Partial<ReportDocumentFilter>) {
  emit('update:modelValue', { ...props.modelValue, ...partial })
}

onMounted(async () => {
  const locations = await locationService.list(true)
  locationOptions.value = locations.map((location) => ({
    value: location.id,
    label: `${location.name} (${location.code})`,
  }))
})
</script>

<template>
  <section class="surface-panel px-3 py-2.5 sm:px-3.5">
    <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
      <AppDatePicker
        compact
        :model-value="modelValue.dateFrom ?? ''"
        label="From date"
        @update:model-value="patch({ dateFrom: $event || undefined })"
      />
      <AppDatePicker
        compact
        :model-value="modelValue.dateTo ?? ''"
        label="To date"
        @update:model-value="patch({ dateTo: $event || undefined })"
      />
      <AppSelect
        compact
        :model-value="modelValue.locationId ?? ''"
        :label="locationLabel || 'Location'"
        :options="locationOptions"
        placeholder="All locations"
        @update:model-value="patch({ locationId: $event || undefined })"
      />
      <AppSelect
        compact
        :model-value="(modelValue.status as string) ?? ''"
        label="Status"
        :options="statusOptions"
        placeholder="All statuses"
        @update:model-value="patch({ status: ($event || undefined) as ReportDocumentFilter['status'] })"
      />
      <div class="sm:col-span-2 lg:col-span-1 flex flex-col gap-1">
        <span class="text-[11px] font-medium text-ink-muted">Search</span>
        <SearchInput
          compact
          :model-value="modelValue.query ?? ''"
          placeholder="Reference, location…"
          @update:model-value="patch({ query: $event })"
        />
      </div>
    </div>
  </section>
</template>
