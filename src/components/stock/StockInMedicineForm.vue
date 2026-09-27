<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import SectionHeader from '@/components/common/SectionHeader.vue'
import AppDatePicker from '@/components/forms/AppDatePicker.vue'
import AppInput from '@/components/forms/AppInput.vue'
import MedicineSelect from '@/components/forms/MedicineSelect.vue'
import { batchRepository } from '@/repositories'
import {
  draftItemToFormValues,
  emptyItemForm,
  formValuesToDraftItem,
  validateItemForm,
  type StockInDraftItem,
  type StockInItemFormErrors,
  type StockInItemFormValues,
} from '@/services'
import type { Medicine } from '@/types'
import { calculateLineTotal, formatCurrency } from '@/utils'

const props = defineProps<{
  pendingItems: StockInDraftItem[]
  editingItem: StockInDraftItem | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  save: [item: StockInDraftItem]
  cancelEdit: []
}>()

const values = ref<StockInItemFormValues>(emptyItemForm())
const errors = ref<StockInItemFormErrors>({})
const selectedMedicine = ref<Medicine | null>(null)

const computedTotal = computed(() => {
  const quantity = Number(values.value.quantity)
  const unitPrice = Number(values.value.unitPrice)
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return 0
  return calculateLineTotal(quantity, unitPrice)
})

const isEditing = computed(() => Boolean(props.editingItem))

watch(
  () => props.editingItem,
  (item) => {
    if (item) {
      values.value = draftItemToFormValues(item)
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
      errors.value = {}
    }
  },
)

function onMedicineSelect(medicine: Medicine | null) {
  selectedMedicine.value = medicine
  if (medicine) values.value.medicineId = medicine.id
  else values.value.medicineId = ''
}

function resetForm() {
  values.value = emptyItemForm()
  selectedMedicine.value = null
  errors.value = {}
}

async function onSave() {
  errors.value = validateItemForm(values.value, {
    pendingItems: props.pendingItems,
    editingId: props.editingItem?.id,
  })
  if (Object.keys(errors.value).length) return

  // Surface inventory batch conflicts before they reach finalization.
  try {
    const existing = await batchRepository.findByMedicineAndBatchNo(
      values.value.medicineId,
      values.value.batchNo,
    )
    if (existing) {
      errors.value = {
        ...errors.value,
        batchNo: 'This medicine + batch already exists in inventory.',
      }
      return
    }
  } catch {
    // Repository lookup failure should not block staging; finalize re-checks.
  }

  const displayName =
    selectedMedicine.value?.displayName ||
    props.editingItem?.medicineDisplayName ||
    values.value.medicineId

  const item = formValuesToDraftItem(values.value, displayName, props.editingItem?.id)
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
      :title="isEditing ? 'Edit Medicine' : 'Add Medicine'"
      description="Save medicines to the pending list before finalizing inventory"
    />

    <form class="space-y-4" @submit.prevent="onSave">
      <div class="grid gap-3 lg:grid-cols-2">
        <div class="lg:col-span-2">
          <MedicineSelect
            v-model="values.medicineId"
            required
            :disabled="disabled"
            :error="errors.medicineId"
            @select="onMedicineSelect"
          />
        </div>

        <AppInput
          v-model="values.manufacturerName"
          label="Manufacturer Name"
          required
          :disabled="disabled"
          :error="errors.manufacturerName"
          placeholder="Manufacturer / supplier"
        />
        <AppInput
          v-model="values.batchNo"
          label="Batch Number"
          required
          :disabled="disabled"
          :error="errors.batchNo"
          placeholder="Batch / lot number"
        />
        <AppDatePicker
          v-model="values.manufacturingDate"
          label="Manufacturing Date"
          required
          :disabled="disabled"
          :error="errors.manufacturingDate"
        />
        <AppDatePicker
          v-model="values.expiryDate"
          label="Expiry Date"
          required
          :disabled="disabled"
          :error="errors.expiryDate"
          :min="values.manufacturingDate || undefined"
        />
        <AppInput
          v-model="values.quantity"
          label="Quantity"
          type="number"
          required
          :disabled="disabled"
          :error="errors.quantity"
          placeholder="0"
        />
        <AppInput
          v-model="values.unitPrice"
          label="Unit Price"
          type="number"
          required
          :disabled="disabled"
          :error="errors.unitPrice"
          placeholder="0.00"
        />
      </div>

      <div
        class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-[var(--radius-md)] border border-border bg-surface-muted/60 px-3 py-3"
      >
        <div>
          <p class="text-xs text-ink-muted">Total Price</p>
          <p class="text-display text-lg font-semibold tabular-nums text-ink">
            {{ formatCurrency(computedTotal) }}
          </p>
          <p class="text-[11px] text-ink-faint">Calculated as quantity × unit price</p>
        </div>
        <div class="flex flex-wrap gap-2">
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
            {{ isEditing ? 'Update Medicine' : 'Save Medicine' }}
          </AppButton>
        </div>
      </div>

      <p v-if="errors.form" class="text-xs text-danger">{{ errors.form }}</p>
    </form>
  </section>
</template>
