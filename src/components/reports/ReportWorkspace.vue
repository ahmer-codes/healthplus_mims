<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ReportDetailPanel from '@/components/reports/ReportDetailPanel.vue'
import ReportDocumentList from '@/components/reports/ReportDocumentList.vue'
import ReportFiltersBar from '@/components/reports/ReportFiltersBar.vue'
import { useAppPage, useAuth, useToast } from '@/composables'
import {
  DomainError,
  reportService,
  type ReportDetail,
  type ReportDocumentFilter,
  type ReportListItem,
  type ReportPriceMode,
} from '@/services'

const props = defineProps<{
  reportType: 'stock_in' | 'allocation' | 'transfer'
  title: string
  description: string
  crumb: string
  locationLabel?: string
  emptyTitle?: string
  emptyDescription?: string
}>()

const { setPage } = useAppPage()
const { user } = useAuth()
const toast = useToast()

const filters = ref<ReportDocumentFilter>({})
const items = ref<ReportListItem[]>([])
const selected = ref<ReportListItem | null>(null)
const detail = ref<ReportDetail | null>(null)
const loadingList = ref(false)
const loadingDetail = ref(false)
const exporting = ref(false)

async function loadList() {
  loadingList.value = true
  try {
    if (props.reportType === 'stock_in') {
      items.value = await reportService.listStockInReports(filters.value)
    } else if (props.reportType === 'allocation') {
      items.value = await reportService.listAllocationReports(filters.value)
    } else {
      items.value = await reportService.listTransferReports(filters.value)
    }

    if (selected.value && !items.value.some((item) => item.id === selected.value?.id)) {
      selected.value = null
      detail.value = null
    }
  } catch (error) {
    toast.error(
      'Could not load reports',
      error instanceof Error ? error.message : 'Unexpected error',
    )
  } finally {
    loadingList.value = false
  }
}

async function loadDetail(item: ReportListItem) {
  selected.value = item
  loadingDetail.value = true
  detail.value = null
  try {
    if (item.type === 'stock_in') {
      detail.value = await reportService.getStockInDetail(item.id)
    } else if (item.type === 'allocation') {
      detail.value = await reportService.getAllocationDetail(item.id)
    } else {
      detail.value = await reportService.getTransferDetail(item.id)
    }
  } catch (error) {
    toast.error(
      'Could not open report',
      error instanceof DomainError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Unexpected error',
    )
  } finally {
    loadingDetail.value = false
  }
}

async function onExport(mode: ReportPriceMode | 'plain') {
  if (!selected.value || !user.value) {
    toast.error('Sign in required', 'Sign in to export reports.')
    return
  }

  exporting.value = true
  try {
    const priceMode =
      mode === 'plain' ? undefined : mode === 'with_price' ? 'with_price' : 'without_price'

    const result = await reportService.exportDocumentPdf({
      type: selected.value.type,
      id: selected.value.id,
      preparedBy: user.value,
      priceMode,
    })

    reportService.downloadPdf(result.blob, result.filename)
    toast.success('PDF exported', result.filename)
  } catch (error) {
    toast.error(
      'Export failed',
      error instanceof DomainError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Unexpected error',
    )
  } finally {
    exporting.value = false
  }
}

onMounted(() => {
  setPage({
    title: props.title,
    subtitle: 'Hospital document archive',
    breadcrumbs: [
      { label: 'Home', to: '/dashboard' },
      { label: 'Reports' },
      { label: props.crumb },
    ],
  })
  void loadList()
})

watch(filters, () => void loadList(), { deep: true })
</script>

<template>
  <div class="space-y-5 lg:space-y-6">
    <PageHeader :title="title" :description="description" />

    <ReportFiltersBar v-model="filters" :location-label="locationLabel" />

    <div class="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <ReportDocumentList
        :items="items"
        :selected-id="selected?.id"
        :loading="loadingList"
        :empty-title="emptyTitle"
        :empty-description="emptyDescription"
        @select="loadDetail"
      />
      <ReportDetailPanel
        :item="selected"
        :detail="detail"
        :loading="loadingDetail"
        :exporting="exporting"
        @export="onExport"
      />
    </div>
  </div>
</template>
