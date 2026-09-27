<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '@/components/common/PageHeader.vue'
import AllocateConfirmModal from '@/components/stock/AllocateConfirmModal.vue'
import AllocateItemForm from '@/components/stock/AllocateItemForm.vue'
import AllocateMasterForm from '@/components/stock/AllocateMasterForm.vue'
import AllocatePendingTable from '@/components/stock/AllocatePendingTable.vue'
import AllocateResultModal from '@/components/stock/AllocateResultModal.vue'
import { useAppPage, useAuth, useToast } from '@/composables'
import {
  DomainError,
  allocationPdfService,
  allocationService,
  locationService,
  validateAllocationMaster,
  type AllocationDraftItem,
  type AllocationMasterFormErrors,
} from '@/services'
import { useAllocationDraftStore } from '@/stores'
import type { Allocation, HospitalLocation } from '@/types'

const { setPage } = useAppPage()
const { user } = useAuth()
const toast = useToast()
const draft = useAllocationDraftStore()

const masterErrors = ref<AllocationMasterFormErrors>({})
const finalizing = ref(false)
const confirmOpen = ref(false)
const resultOpen = ref(false)
const resultMode = ref<'success' | 'failure'>('success')
const resultError = ref('')
const lastAllocation = ref<Allocation | null>(null)
const lastPdf = ref<Blob | null>(null)
const lastTotalQty = ref(0)
const locations = ref<HospitalLocation[]>([])

const canInteract = computed(() => !finalizing.value)

const destinationName = computed(() => {
  const id =
    lastAllocation.value?.destinationLocationId || draft.master.destinationLocationId
  return locations.value.find((location) => location.id === id)?.name ?? ''
})

onMounted(async () => {
  setPage({
    title: 'Allocate Stock',
    subtitle: 'Issue medicines from pharmacy inventory to departments',
    breadcrumbs: [
      { label: 'Home', to: '/dashboard' },
      { label: 'Stock' },
      { label: 'Allocate' },
    ],
  })
  locations.value = await locationService.list(true)
})

function onSaveItem(item: AllocationDraftItem) {
  if (draft.editingId) {
    draft.updateItem(draft.editingId, item)
    toast.success('Line updated', 'Pending allocation list has been updated.')
  } else {
    draft.addItem(item)
    toast.success('Line saved', 'Added to pending allocations.')
  }
}

function onRequestFinalize() {
  masterErrors.value = validateAllocationMaster(draft.master)
  if (
    masterErrors.value.date ||
    masterErrors.value.voucherNo ||
    masterErrors.value.destinationLocationId
  ) {
    toast.error('Complete master information', 'Date, voucher, and destination are required.')
    return
  }
  if (!draft.items.length) {
    toast.error('No lines staged', 'Save at least one medicine before finalizing.')
    return
  }
  if (!user.value) {
    toast.error('Not signed in', 'Sign in to finalize allocation.')
    return
  }
  confirmOpen.value = true
}

async function onConfirmFinalize() {
  if (!user.value) return

  finalizing.value = true
  resultError.value = ''
  try {
    const result = await allocationService.finalize({
      master: draft.master,
      items: draft.items,
      createdBy: user.value,
    })

    lastAllocation.value = result.allocation
    lastPdf.value = result.pdfBlob
    lastTotalQty.value = result.allocation.items.reduce((sum, item) => sum + item.quantity, 0)

    draft.clearAll()
    masterErrors.value = {}
    confirmOpen.value = false
    resultMode.value = 'success'
    resultOpen.value = true
    toast.success('Allocation finalized', 'Inventory updated. Download the report when ready.')
  } catch (error) {
    const message =
      error instanceof DomainError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Finalization failed. Pending lines were kept.'
    resultError.value = message
    resultMode.value = 'failure'
    confirmOpen.value = false
    resultOpen.value = true
    toast.error('Could not finalize', message)
  } finally {
    finalizing.value = false
  }
}

function onDownloadAgain() {
  if (!lastPdf.value || !lastAllocation.value) return
  allocationPdfService.download(lastPdf.value, lastAllocation.value.voucherNo)
}
</script>

<template>
  <div class="space-y-5 lg:space-y-6">
    <PageHeader
      title="Allocate Stock"
      description="Issue available pharmacy stock to wards and departments. Stage lines first, then finalize to deduct inventory and generate the voucher report."
    />

    <AllocateMasterForm
      :master="draft.master"
      :errors="masterErrors"
      :disabled="!canInteract"
      @update:date="draft.setMaster({ date: $event }); masterErrors.date = undefined"
      @update:voucher-no="draft.setMaster({ voucherNo: $event }); masterErrors.voucherNo = undefined"
      @update:destination-location-id="
        draft.setMaster({ destinationLocationId: $event });
        masterErrors.destinationLocationId = undefined
      "
      @update:receiver-name="draft.setMaster({ receiverName: $event })"
      @update:receiver-designation="draft.setMaster({ receiverDesignation: $event })"
    />

    <AllocateItemForm
      :pending-items="draft.items"
      :editing-item="draft.editingItem"
      :disabled="!canInteract"
      @save="onSaveItem"
      @cancel-edit="draft.cancelEdit()"
    />

    <AllocatePendingTable
      :items="draft.items"
      :total-quantity="draft.totalQuantity"
      :finalizing="finalizing"
      :disabled="!canInteract"
      @edit="draft.startEdit($event)"
      @remove="draft.removeItem($event)"
      @request-finalize="onRequestFinalize"
    />

    <AllocateConfirmModal
      :open="confirmOpen"
      :voucher-no="draft.master.voucherNo"
      :destination-name="destinationName"
      :line-count="draft.items.length"
      :total-quantity="draft.totalQuantity"
      :loading="finalizing"
      @close="confirmOpen = false"
      @confirm="onConfirmFinalize"
    />

    <AllocateResultModal
      :open="resultOpen"
      :mode="resultMode"
      :allocation="lastAllocation"
      :destination-name="destinationName"
      :total-quantity="lastTotalQty"
      :error-message="resultError"
      @close="resultOpen = false"
      @download="onDownloadAgain"
    />
  </div>
</template>
