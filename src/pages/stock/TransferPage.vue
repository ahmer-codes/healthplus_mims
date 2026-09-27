<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StockDocumentConfirmModal from '@/components/stock/StockDocumentConfirmModal.vue'
import StockDocumentResultModal from '@/components/stock/StockDocumentResultModal.vue'
import TransferItemForm from '@/components/stock/TransferItemForm.vue'
import TransferMasterForm from '@/components/stock/TransferMasterForm.vue'
import TransferPendingTable from '@/components/stock/TransferPendingTable.vue'
import { useAppPage, useAuth, useToast } from '@/composables'
import {
  DomainError,
  locationService,
  reportService,
  transferService,
  validateTransferMaster,
  type TransferDraftItem,
  type TransferMasterFormErrors,
} from '@/services'
import { useTransferDraftStore } from '@/stores'
import type { HospitalLocation, StockTransfer } from '@/types'
import { formatDate, formatQuantity } from '@/utils'

const { setPage } = useAppPage()
const { user } = useAuth()
const toast = useToast()
const draft = useTransferDraftStore()

const masterErrors = ref<TransferMasterFormErrors>({})
const finalizing = ref(false)
const confirmOpen = ref(false)
const resultOpen = ref(false)
const resultMode = ref<'success' | 'failure'>('success')
const resultError = ref('')
const lastTransfer = ref<StockTransfer | null>(null)
const lastPdf = ref<Blob | null>(null)
const lastTotalQty = ref(0)
const locations = ref<HospitalLocation[]>([])

const canInteract = computed(() => !finalizing.value)

const fromName = computed(() => {
  const id = lastTransfer.value?.fromLocationId || draft.master.fromLocationId
  return locations.value.find((location) => location.id === id)?.name ?? ''
})

const toName = computed(() => {
  const id = lastTransfer.value?.toLocationId || draft.master.toLocationId
  return locations.value.find((location) => location.id === id)?.name ?? ''
})

onMounted(async () => {
  setPage({
    title: 'Stock Transfer',
    subtitle: 'Move inventory between hospital locations',
    breadcrumbs: [
      { label: 'Home', to: '/dashboard' },
      { label: 'Stock' },
      { label: 'Transfer' },
    ],
  })
  locations.value = await locationService.list(true)
})

function onSaveItem(item: TransferDraftItem) {
  if (draft.editingId) {
    draft.updateItem(draft.editingId, item)
    toast.success('Line updated', 'Pending transfer list has been updated.')
  } else {
    draft.addItem(item)
    toast.success('Line saved', 'Added to pending transfers.')
  }
}

function onFromLocationChange(locationId: string) {
  const hadItems = draft.items.length > 0
  draft.setMaster({ fromLocationId: locationId })
  masterErrors.value.fromLocationId = undefined
  if (hadItems) {
    draft.clearItems()
    toast.info('From location changed', 'Pending transfer lines were cleared.')
  }
}

function onRequestFinalize() {
  masterErrors.value = validateTransferMaster(draft.master)
  if (
    masterErrors.value.date ||
    masterErrors.value.voucherNo ||
    masterErrors.value.fromLocationId ||
    masterErrors.value.toLocationId
  ) {
    toast.error(
      'Complete master information',
      'Date, voucher, and distinct locations are required.',
    )
    return
  }
  if (!draft.items.length) {
    toast.error('No lines staged', 'Save at least one medicine before finalizing.')
    return
  }
  if (!user.value) {
    toast.error('Not signed in', 'Sign in to finalize transfer.')
    return
  }
  confirmOpen.value = true
}

async function onConfirmFinalize() {
  if (!user.value) return

  finalizing.value = true
  resultError.value = ''
  try {
    const result = await transferService.finalize({
      master: draft.master,
      items: draft.items,
      createdBy: user.value,
    })

    lastTransfer.value = result.transfer
    lastPdf.value = result.pdfBlob
    lastTotalQty.value = result.transfer.items.reduce((sum, item) => sum + item.quantity, 0)

    draft.clearAll()
    masterErrors.value = {}
    confirmOpen.value = false
    resultMode.value = 'success'
    resultOpen.value = true
    toast.success('Transfer finalized', 'Inventory moved. Download the report when ready.')
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
  if (!lastPdf.value || !lastTransfer.value) return
  reportService.downloadStockTransferPdf(lastPdf.value, lastTransfer.value.voucherNo)
}
</script>

<template>
  <div class="space-y-5 lg:space-y-6">
    <PageHeader
      title="Stock Transfer"
      description="Move available stock between locations. Stage lines first, then finalize to update inventory atomically and generate the transfer report."
    />

    <TransferMasterForm
      :master="draft.master"
      :errors="masterErrors"
      :disabled="!canInteract"
      @update:date="draft.setMaster({ date: $event }); masterErrors.date = undefined"
      @update:voucher-no="draft.setMaster({ voucherNo: $event }); masterErrors.voucherNo = undefined"
      @update:from-location-id="onFromLocationChange"
      @update:to-location-id="
        draft.setMaster({ toLocationId: $event });
        masterErrors.toLocationId = undefined
      "
    />

    <TransferItemForm
      :from-location-id="draft.master.fromLocationId"
      :pending-items="draft.items"
      :editing-item="draft.editingItem"
      :disabled="!canInteract"
      @save="onSaveItem"
      @cancel-edit="draft.cancelEdit()"
    />

    <TransferPendingTable
      :items="draft.items"
      :total-quantity="draft.totalQuantity"
      :finalizing="finalizing"
      :disabled="!canInteract"
      @edit="draft.startEdit($event)"
      @remove="draft.removeItem($event)"
      @request-finalize="onRequestFinalize"
    />

    <StockDocumentConfirmModal
      :open="confirmOpen"
      title="Confirm transfer"
      description="Stock will move from source to destination in one step."
      confirm-label="Confirm & finalize"
      hint="Staged lines stay in your cart if posting fails."
      :loading="finalizing"
      @close="confirmOpen = false"
      @confirm="onConfirmFinalize"
    >
      <p class="text-ink-secondary leading-relaxed">
        Post voucher
        <span class="font-semibold text-ink">{{ draft.master.voucherNo || '-' }}</span>
        from
        <span class="font-semibold text-ink">{{ fromName || '-' }}</span>
        to
        <span class="font-semibold text-ink">{{ toName || '-' }}</span>
        ·
        <span class="font-semibold text-ink">{{ draft.items.length }}</span>
        line(s),
        <span class="font-semibold text-ink tabular-nums">{{ formatQuantity(draft.totalQuantity) }}</span>
        units.
      </p>
    </StockDocumentConfirmModal>

    <StockDocumentResultModal
      :open="resultOpen"
      :mode="resultMode"
      :title="resultMode === 'success' ? 'Transfer finalized' : 'Transfer failed'"
      :description="
        resultMode === 'success'
          ? 'Inventory was moved and the report is ready.'
          : 'No inventory was changed. Staged lines were kept.'
      "
      :error-message="resultError"
      @close="resultOpen = false"
      @download="onDownloadAgain"
    >
      <template #success>
        <p class="text-sm font-medium text-ink">Transfer completed successfully</p>
        <p v-if="lastTransfer" class="text-xs text-ink-muted mt-0.5">
          Document {{ lastTransfer.id }} · {{ lastTransfer.items.length }} line(s)
        </p>
      </template>

      <dl v-if="lastTransfer" class="grid gap-3 sm:grid-cols-2 text-sm">
        <div>
          <dt class="text-xs text-ink-muted">Voucher</dt>
          <dd class="font-medium text-ink mt-0.5">{{ lastTransfer.voucherNo }}</dd>
        </div>
        <div>
          <dt class="text-xs text-ink-muted">Date</dt>
          <dd class="font-medium text-ink mt-0.5">{{ formatDate(lastTransfer.date) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-ink-muted">From</dt>
          <dd class="font-medium text-ink mt-0.5">{{ fromName }}</dd>
        </div>
        <div>
          <dt class="text-xs text-ink-muted">To</dt>
          <dd class="font-medium text-ink mt-0.5">{{ toName }}</dd>
        </div>
        <div>
          <dt class="text-xs text-ink-muted">Total quantity</dt>
          <dd class="font-semibold tabular-nums text-ink mt-0.5">
            {{ formatQuantity(lastTotalQty) }}
          </dd>
        </div>
      </dl>
    </StockDocumentResultModal>
  </div>
</template>
