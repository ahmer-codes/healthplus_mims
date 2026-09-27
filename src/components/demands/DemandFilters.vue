<script setup lang="ts">
import { computed } from 'vue'
import SearchInput from '@/components/forms/SearchInput.vue'
import AppSelect, { type SelectOption } from '@/components/forms/AppSelect.vue'
import { DEMAND_PRIORITIES, DEMAND_STATUSES, STATUS_LABELS } from '@/constants'

const props = defineProps<{
  query: string
  status: string
  priority: string
  department: string
  departmentOptions: SelectOption[]
}>()

const emit = defineEmits<{
  'update:query': [value: string]
  'update:status': [value: string]
  'update:priority': [value: string]
  'update:department': [value: string]
}>()

const statusOptions = computed<SelectOption[]>(() => [
  { value: 'all', label: 'All statuses' },
  ...DEMAND_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
])

const priorityOptions = computed<SelectOption[]>(() => [
  { value: 'all', label: 'All priorities' },
  ...DEMAND_PRIORITIES.map((p) => ({ value: p, label: STATUS_LABELS[p] })),
])

const deptOptions = computed<SelectOption[]>(() => [
  { value: 'all', label: 'All departments' },
  ...props.departmentOptions,
])
</script>

<template>
  <section class="surface-panel px-3 py-2.5 sm:px-3.5">
    <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <div class="flex flex-col gap-1">
        <span class="text-[11px] font-medium text-ink-muted">Search</span>
        <SearchInput
          compact
          :model-value="query"
          placeholder="Medicine, requester…"
          @update:model-value="emit('update:query', $event)"
        />
      </div>
      <AppSelect
        compact
        :model-value="status"
        label="Status"
        :options="statusOptions"
        @update:model-value="emit('update:status', $event)"
      />
      <AppSelect
        compact
        :model-value="priority"
        label="Priority"
        :options="priorityOptions"
        @update:model-value="emit('update:priority', $event)"
      />
      <AppSelect
        compact
        :model-value="department"
        label="Department"
        :options="deptOptions"
        @update:model-value="emit('update:department', $event)"
      />
    </div>
  </section>
</template>
