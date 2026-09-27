<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import SectionHeader from '@/components/common/SectionHeader.vue'
import AllocatableMedicineSelect from '@/components/forms/AllocatableMedicineSelect.vue'
import AppInput from '@/components/forms/AppInput.vue'
import BatchSelect from '@/components/forms/BatchSelect.vue'
import {
  draftItemToAllocationFormValues,
  emptyAllocationItemForm,
  formValuesToAllocationDraftItem,
  validateAllocationItemForm,
  type AllocationDraftItem,
  type AllocationItemFormErrors,
  type AllocationItemFormValues,
} from '@/services'
import type { Medicine, MedicineBatch } from '@/types'
import { formatDate, formatQuantity } from '@/utils'

const SOURCE_LOCATION = 'loc-main-pharmacy'

const props = defineProps<{
  pendingItems: AllocationDraftItem[]
  editingItem: AllocationDraftItem | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  save: [item: AllocationDraftItem]
  cancelEdit: []
}>()

const values = ref<AllocationItemFormValues>(emptyAllocationItemForm())
const errors = ref<AllocationItemFormErrors>({})
const selectedMedicine = ref<Medicine | null>(null)
const selectedBatch = ref<MedicineBatch | null>(null)

const isEditing = computed(() => Boolean(props.editingItem))

/** Qty staged on other pending lines for a batch (current edit line excluded). */
const reservedByBatchId = computed(() => {
  const map: Record<string, number> = {}
  for (const item of props.pendingItems) {
    if (props.editingItem?.id === item.id) continue
    map[item.batchId] = (map[item.batchId] ?? 0) + item.quantity
  }
  return map
})

/** Qty staged per medicine so the select shows remaining after the cart. */
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

watch(
  () => props.editingItem,
  (item) => {
    if (item) {
      values.value = draftItemToAllocationFormValues(item)
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
        locationId: SOURCE_LOCATION,
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
  values.value = emptyAllocationItemForm()
  selectedMedicine.value = null
  selectedBatch.value = null
  errors.value = {}
}

function onSave() {
  errors.value = validateAllocationItemForm(values.value, {
    availableQuantity: availableQuantity.value,
    pendingItems: props.pendingItems,
    editingId: props.editingItem?.id,
  })
  if (Object.keys(errors.value).length) return
  if (!selectedBatch.value) {
    errors.value = { ...errors.value, batchId: 'Batch is required.' }
    return
  }

  const item = formValuesToAllocationDraftItem(
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
  )
  emit('save', item)
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
      :title="isEditing ? 'Edit Allocation Line' : 'Add Medicine'"
      description="Only available, non-expired batches with remaining quantity are shown"
    />

    <form class="space-y-4" @submit.prevent="onSave">
      <div class="grid gap-3 lg:grid-cols-3">
        <div class="lg:col-span-2">
          <AllocatableMedicineSelect
            v-model="values.medicineId"
            required
            :disabled="disabled"
            :error="errors.medicineId"
            :location-id="SOURCE_LOCATION"
            :reserved-by-medicine-id="reservedByMedicineId"
            @select="onMedicineSelect"
          />
        </div>
        <BatchSelect
          v-model="values.batchId"
          :medicine-id="values.medicineId"
          :location-id="SOURCE_LOCATION"
          :reserved-by-batch-id="reservedByBatchId"
          required
          :disabled="disabled"
          :error="errors.batchId"
          @select="onBatchSelect"
        />
        <AppInput
          v-model="values.quantity"
          label="Quantity"
          type="number"
          required
          :disabled="disabled"
          :error="errors.quantity"
          placeholder="0"
          :hint="
            selectedBatch
              ? `Available on batch: ${formatQuantity(availableQuantity)} · Exp ${formatDate(selectedBatch.expiryDate)}`
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
        <AppButton type="submit" :disabled="disabled">
          {{ isEditing ? 'Update Line' : 'Save' }}
        </AppButton>
      </div>

      <p v-if="errors.form" class="text-xs text-danger">{{ errors.form }}</p>
    </form>
  </section>
</template>
