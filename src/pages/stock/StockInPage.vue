<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StockInMasterForm from '@/components/stock/StockInMasterForm.vue'
import StockInMedicineForm from '@/components/stock/StockInMedicineForm.vue'
import StockInPendingTable from '@/components/stock/StockInPendingTable.vue'
import StockInSuccessModal from '@/components/stock/StockInSuccessModal.vue'
import { useAppPage, useAuth, useToast } from '@/composables'
import {
  DomainError,
  stockInPdfService,
  stockInService,
  validateMaster,
  type StockInDraftItem,
  type StockInMasterFormErrors,
} from '@/services'
import { useStockInDraftStore } from '@/stores'
import type { StockIn } from '@/types'

const { setPage } = useAppPage()
const { user } = useAuth()
const toast = useToast()
const draft = useStockInDraftStore()

const masterErrors = ref<StockInMasterFormErrors>({})
const finalizing = ref(false)
const successOpen = ref(false)
const lastStockIn = ref<StockIn | null>(null)
const lastPdf = ref<Blob | null>(null)
const lastTotal = ref(0)

const canInteract = computed(() => !finalizing.value)

onMounted(() => {
  setPage({
    title: 'Stock In',
    subtitle: 'Receive medicines into dispensary inventory',
    breadcrumbs: [
      { label: 'Home', to: '/dashboard' },
      { label: 'Stock' },
      { label: 'Stock In' },
    ],
  })
})

function onSaveItem(item: StockInDraftItem) {
  if (draft.editingId) {
    draft.updateItem(draft.editingId, item)
    toast.success('Medicine updated', 'Pending list has been updated.')
  } else {
    draft.addItem(item)
    toast.success('Medicine saved', 'Added to pending medicines.')
  }
}

async function onFinalize() {
  masterErrors.value = validateMaster(draft.master)
  if (masterErrors.value.purchaseOrderNo || masterErrors.value.receivingDate) {
    toast.error('Complete master information', 'Purchase order and receiving date are required.')
    return
  }
  if (!draft.items.length) {
    toast.error('No medicines staged', 'Save at least one medicine before finalizing.')
    return
  }
  if (!user.value) {
    toast.error('Not signed in', 'Sign in to finalize stock in.')
    return
  }

  finalizing.value = true
  try {
    const result = await stockInService.finalize({
      master: draft.master,
      items: draft.items,
      createdBy: user.value,
    })

    lastStockIn.value = result.stockIn
    lastPdf.value = result.pdfBlob
    lastTotal.value = stockInService.calculateDocumentTotal(result.stockIn.items)

    draft.clearAll()
    masterErrors.value = {}
    successOpen.value = true
    toast.success('Stock In finalized', 'Batches created. Download the report when ready.')
  } catch (error) {
    const message =
      error instanceof DomainError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Finalization failed. Pending medicines were kept.'
    toast.error('Could not finalize', message)
  } finally {
    finalizing.value = false
  }
}

function onDownloadAgain() {
  if (!lastPdf.value || !lastStockIn.value) return
  stockInPdfService.download(lastPdf.value, lastStockIn.value.purchaseOrderNo)
}
</script>

<template>
  <div class="space-y-5 lg:space-y-6">
    <PageHeader
      title="Stock In"
      description="Record medicines received against a purchase order. Stage lines first, then finalize to update inventory and generate the report."
    />

    <StockInMasterForm
      :master="draft.master"
      :errors="masterErrors"
      :disabled="!canInteract"
      @update:purchase-order-no="draft.setMaster({ purchaseOrderNo: $event }); masterErrors.purchaseOrderNo = undefined"
      @update:receiving-date="draft.setMaster({ receivingDate: $event }); masterErrors.receivingDate = undefined"
    />

    <StockInMedicineForm
      :pending-items="draft.items"
      :editing-item="draft.editingItem"
      :disabled="!canInteract"
      @save="onSaveItem"
      @cancel-edit="draft.cancelEdit()"
    />

    <StockInPendingTable
      :items="draft.items"
      :grand-total="draft.grandTotal"
      :finalizing="finalizing"
      :disabled="!canInteract"
      @edit="draft.startEdit($event)"
      @remove="draft.removeItem($event)"
      @finalize="onFinalize"
    />

    <StockInSuccessModal
      :open="successOpen"
      :stock-in="lastStockIn"
      :grand-total="lastTotal"
      @close="successOpen = false"
      @download="onDownloadAgain"
    />
  </div>
</template>
