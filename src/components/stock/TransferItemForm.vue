<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import SectionHeader from '@/components/common/SectionHeader.vue'
import AllocatableMedicineSelect from '@/components/forms/AllocatableMedicineSelect.vue'
import AppInput from '@/components/forms/AppInput.vue'
import BatchSelect from '@/components/forms/BatchSelect.vue'
import {
  draftItemToTransferFormValues,
  emptyTransferItemForm,
  formValuesToTransferDraftItem,
  validateTransferItemForm,
  type TransferDraftItem,
  type TransferItemFormErrors,
  type TransferItemFormValues,
} from '@/services'
import type { Medicine, MedicineBatch } from '@/types'
import { formatDate, formatQuantity } from '@/utils'

const props = defineProps<{
  fromLocationId: string
  pendingItems: TransferDraftItem[]
  editingItem: TransferDraftItem | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  save: [item: TransferDraftItem]
  cancelEdit: []
}>()

const values = ref<TransferItemFormValues>(emptyTransferItemForm())
const errors = ref<TransferItemFormErrors>({})
const selectedMedicine = ref<Medicine | null>(null)
const selectedBatch = ref<MedicineBatch | null>(null)
const medicineSelect = ref<{ reload: () => Promise<void> } | null>(null)

const isEditing = computed(() => Boolean(props.editingItem))

const reservedByBatchId = computed(() => {
  const map: Record<string, number> = {}
  for (const item of props.pendingItems) {
    if (props.editingItem?.id === item.id) continue
    map[item.batchId] = (map[item.batchId] ?? 0) + item.quantity
  }
  return map
})

const reservedByMedicineId = computed(() => {
  const map: Record<string, number> = {}
  for (const item of props.pendingItems) {
    if (props.editingItem?.id === item.id) continue
    map[item.medicineId] = (map[item.medicineId] ?? 0) + item.quantity
  }
  return map
})

const availableQuantity = computed(() => {
  const batch = selectedBatch.value
  if (!batch) return 0
  const reserved = reservedByBatchId.value[batch.id] ?? 0
  return Math.max(0, batch.remainingQuantity - reserved)
})
const canSelectStock = computed(() => Boolean(props.fromLocationId) && !props.disabled)

watch(
  () => props.fromLocationId,
  () => {
    resetForm()
    void medicineSelect.value?.reload()
  },
)

watch(
  () => props.editingItem,
  (item) => {
    if (item) {
      values.value = draftItemToTransferFormValues(item)
      selectedMedicine.value = {
        id: item.medicineId,
        genericName: '',
        strength: '',
        dosageForm: '',
        volume: '',
        displayName: item.medicineDisplayName,
        isActive: true,
        createdAt: '',
        updatedAt: '',
      }
      selectedBatch.value = {
        id: item.batchId,
        medicineId: item.medicineId,
        purchaseOrderNo: '',
        receivingDate: '',
        manufacturerName: '',
        batchNo: item.batchNo,
        manufacturingDate: '',
        expiryDate: item.expiryDate,
        quantityReceived: item.availableQuantity,
        remainingQuantity: item.availableQuantity,
        unitPrice: 0,
        totalPrice: 0,
        status: 'available',
        locationId: props.fromLocationId,
        createdAt: '',
        updatedAt: '',
      }
      errors.value = {}
    }
  },
)

function onMedicineSelect(medicine: Medicine | null) {
  selectedMedicine.value = medicine
  values.value.medicineId = medicine?.id ?? ''
  if (!medicine) {
    values.value.batchId = ''
    selectedBatch.value = null
  }
}

function onBatchSelect(batch: MedicineBatch | null) {
  selectedBatch.value = batch
  values.value.batchId = batch?.id ?? ''
}

function resetForm() {
  values.value = emptyTransferItemForm()
  selectedMedicine.value = null
  selectedBatch.value = null
  errors.value = {}
}

function onSave() {
  if (!props.fromLocationId) {
    errors.value = { form: 'Select a From location first.' }
    return
  }

  errors.value = validateTransferItemForm(values.value, {
    availableQuantity: availableQuantity.value,
    pendingItems: props.pendingItems,
    editingId: props.editingItem?.id,
  })
  if (Object.keys(errors.value).length) return
  if (!selectedBatch.value) {
    errors.value = { ...errors.value, batchId: 'Batch is required.' }
    return
  }

  emit(
    'save',
    formValuesToTransferDraftItem(
      values.value,
      {
        medicineDisplayName:
          selectedMedicine.value?.displayName ||
          props.editingItem?.medicineDisplayName ||
          values.value.medicineId,
        batchNo: selectedBatch.value.batchNo,
        expiryDate: selectedBatch.value.expiryDate,
        availableQuantity: selectedBatch.value.remainingQuantity,
      },
      props.editingItem?.id,
    ),
  )
  resetForm()
}

function onCancelEdit() {
  resetForm()
  emit('cancelEdit')
}
</script>

<template>
  <section class="surface-panel p-4 sm:p-5 space-y-4">
    <SectionHeader
      :title="isEditing ? 'Edit Transfer Line' : 'Add Medicine'"
      description="Only eligible stock at the From location can be selected"
    />

    <form class="space-y-4" @submit.prevent="onSave">
      <div class="grid gap-3 lg:grid-cols-3">
        <div class="lg:col-span-2">
          <AllocatableMedicineSelect
            ref="medicineSelect"
            v-model="values.medicineId"
            required
            :disabled="!canSelectStock"
            :error="errors.medicineId"
            :location-id="fromLocationId || undefined"
            :reserved-by-medicine-id="reservedByMedicineId"
            @select="onMedicineSelect"
          />
        </div>
        <BatchSelect
          v-model="values.batchId"
          :medicine-id="values.medicineId"
          :location-id="fromLocationId || undefined"
          :reserved-by-batch-id="reservedByBatchId"
          required
          :disabled="!canSelectStock"
          :error="errors.batchId"
          @select="onBatchSelect"
        />
        <AppInput
          v-model="values.quantity"
          label="Quantity"
          type="number"
          required
          :disabled="!canSelectStock"
          :error="errors.quantity"
          placeholder="0"
          :hint="
            selectedBatch
              ? `Available: ${formatQuantity(availableQuantity)} · Exp ${formatDate(selectedBatch.expiryDate)}`
              : undefined
          "
        />
      </div>

      <div class="flex flex-wrap gap-2 justify-end">
        <AppButton
          v-if="isEditing"
          type="button"
          variant="outline"
          :disabled="disabled"
          @click="onCancelEdit"
        >
          Cancel edit
        </AppButton>
        <AppButton type="submit" :disabled="!canSelectStock">
          {{ isEditing ? 'Update Line' : 'Save' }}
        </AppButton>
      </div>

      <p v-if="errors.form" class="text-xs text-danger">{{ errors.form }}</p>
    </form>
  </section>
</template>
