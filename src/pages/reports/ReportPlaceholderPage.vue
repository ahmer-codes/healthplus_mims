<script setup lang="ts">
import { FileDown } from '@lucide/vue'
import { onMounted } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import AppDatePicker from '@/components/forms/AppDatePicker.vue'
import AppSelect from '@/components/forms/AppSelect.vue'
import { useAppPage } from '@/composables'

const props = defineProps<{
  reportTitle: string
  reportDescription: string
  crumb: string
}>()

const { setPage } = useAppPage()

onMounted(() => {
  setPage({
    title: props.reportTitle,
    breadcrumbs: [
      { label: 'Home', to: '/dashboard' },
      { label: 'Reports' },
      { label: props.crumb },
    ],
  })
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="reportTitle" :description="reportDescription">
      <template #actions>
        <AppButton variant="outline">
          <FileDown class="size-4" />
          Export PDF
        </AppButton>
      </template>
    </PageHeader>

    <div class="surface-panel p-4 sm:p-5">
      <div class="grid gap-3 sm:grid-cols-3">
        <AppDatePicker label="From" />
        <AppDatePicker label="To" />
        <AppSelect
          label="Location"
          :options="[
            { label: 'Main Store', value: 'main' },
            { label: 'Central Pharmacy', value: 'pharmacy' },
          ]"
        />
      </div>
    </div>

    <div class="surface-panel">
      <EmptyState
        title="Report preview unavailable"
        description="Filters and PDF export (jsPDF) will be wired when reporting services are implemented."
      />
    </div>
  </div>
</template>
