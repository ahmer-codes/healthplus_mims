<script setup lang="ts">
import { computed } from 'vue'
import SearchInput from '@/components/forms/SearchInput.vue'
import AppSelect, { type SelectOption } from '@/components/forms/AppSelect.vue'

const props = defineProps<{
  query: string
  department: string
  departmentOptions: SelectOption[]
}>()

const emit = defineEmits<{
  'update:query': [value: string]
  'update:department': [value: string]
}>()

const allDeptOptions = computed<SelectOption[]>(() => [
  { value: 'all', label: 'All departments' },
  ...props.departmentOptions,
])
</script>

<template>
  <section class="surface-panel px-3 py-2.5 sm:px-3.5">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div class="flex-1 sm:max-w-xs flex flex-col gap-1">
        <span class="text-[11px] font-medium text-ink-muted">Search</span>
        <SearchInput
          compact
          :model-value="query"
          placeholder="Name, phone, email…"
          @update:model-value="emit('update:query', $event)"
        />
      </div>
      <div class="sm:w-52">
        <AppSelect
          compact
          :model-value="department"
          label="Department"
          :options="allDeptOptions"
          placeholder="Department"
          @update:model-value="emit('update:department', $event)"
        />
      </div>
    </div>
  </section>
</template>
