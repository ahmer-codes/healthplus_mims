<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppDatePicker from '@/components/forms/AppDatePicker.vue'
import AppInput from '@/components/forms/AppInput.vue'
import AppSelect, { type SelectOption } from '@/components/forms/AppSelect.vue'
import {
  batchService,
  type BatchBoardRow,
  type BatchEditInput,
  type SensitiveBatchField,
} from '@/services'

const props = defineProps<{
  open: boolean
  row: BatchBoardRow | null
  locationOptions: SelectOption[]
  saving?: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [payload: { input: BatchEditInput; confirmed: boolean; sensitiveFields: SensitiveBatchField[] }]
}>()

const form = ref<BatchEditInput>({})
const errors = ref<Record<string, string>>({})
const confirmOpen = ref(false)
const pendingSensitive = ref<SensitiveBatchField[]>([])

const medicineLabel = computed(() => props.row?.medicine.displayName ?? '')

watch(
  () => [props.open, props.row] as const,
  ([open, row]) => {
    if (!open || !row) return
    form.value = {
      manufacturerName: row.batch.manufacturerName,
      batchNo: row.batch.batchNo,
      manufacturingDate: row.batch.manufacturingDate,
      expiryDate: row.batch.expiryDate,
      remainingQuantity: row.batch.remainingQuantity,
      unitPrice: row.batch.unitPrice,
      locationId: row.batch.locationId,
    }
    errors.value = {}
    confirmOpen.value = false
  },
)

function validateLocal(): boolean {
  const next: Record<string, string> = {}
  if (!form.value.manufacturerName?.trim()) next.manufacturerName = 'Manufacturer is required.'
  if (!form.value.batchNo?.trim()) next.batchNo = 'Batch number is required.'
  if (!form.value.manufacturingDate) next.manufacturingDate = 'Manufacturing date is required.'
  if (!form.value.expiryDate) next.expiryDate = 'Expiry date is required.'
  if (
    form.value.manufacturingDate &&
    form.value.expiryDate &&
    form.value.expiryDate < form.value.manufacturingDate
  ) {
    next.expiryDate = 'Expiry cannot be before manufacturing date.'
  }
  if (
    form.value.remainingQuantity === undefined ||
    Number.isNaN(Number(form.value.remainingQuantity))
  ) {
    next.remainingQuantity = 'Remaining quantity is required.'
  } else if (Number(form.value.remainingQuantity) < 0) {
    next.remainingQuantity = 'Remaining quantity cannot be negative.'
  }
  if (form.value.unitPrice === undefined || Number.isNaN(Number(form.value.unitPrice))) {
    next.unitPrice = 'Unit price is required.'
  } else if (Number(form.value.unitPrice) < 0) {
    next.unitPrice = 'Unit price cannot be negative.'
  }
  if (!form.value.locationId) next.locationId = 'Location is required.'
  errors.value = next
  return Object.keys(next).length === 0
}

function onSubmit() {
  if (!props.row || !validateLocal()) return

  const preview = batchService.previewEdit(props.row.batch, {
    ...form.value,
    remainingQuantity: Number(form.value.remainingQuantity),
    unitPrice: Number(form.value.unitPrice),
  })

  if (!Object.keys(preview.input).length) {
    emit('close')
    return
  }

  if (preview.requiresConfirmation) {
    pendingSensitive.value = preview.sensitiveFields
    confirmOpen.value = true
    return
  }

  emit('save', {
    input: {
      ...form.value,
      remainingQuantity: Number(form.value.remainingQuantity),
      unitPrice: Number(form.value.unitPrice),
    },
    confirmed: false,
    sensitiveFields: [],
  })
}

function onConfirmSensitive() {
  confirmOpen.value = false
  emit('save', {
    input: {
      ...form.value,
      remainingQuantity: Number(form.value.remainingQuantity),
      unitPrice: Number(form.value.unitPrice),
    },
    confirmed: true,
    sensitiveFields: pendingSensitive.value,
  })
}
</script>

<template>
  <AppModal
    :open="open"
    title="Edit batch"
    :description="medicineLabel"
    size="lg"
    @close="emit('close')"
  >
    <div v-if="row" class="grid gap-3 sm:grid-cols-2">
      <AppInput
        :model-value="form.manufacturerName ?? ''"
        label="Manufacturer"
        required
        :error="errors.manufacturerName"
        @update:model-value="form.manufacturerName = $event"
      />
      <AppInput
        :model-value="form.batchNo ?? ''"
        label="Batch number"
        required
        :error="errors.batchNo"
        @update:model-value="form.batchNo = $event"
      />
      <AppDatePicker
        :model-value="form.manufacturingDate ?? ''"
        label="Manufacturing date"
        required
        :error="errors.manufacturingDate"
        @update:model-value="form.manufacturingDate = $event"
      />
      <AppDatePicker
        :model-value="form.expiryDate ?? ''"
        label="Expiry date"
        required
        :error="errors.expiryDate"
        :min="form.manufacturingDate || undefined"
        @update:model-value="form.expiryDate = $event"
      />
      <AppInput
        :model-value="form.remainingQuantity === undefined ? '' : String(form.remainingQuantity)"
        label="Remaining quantity"
        type="number"
        required
        :error="errors.remainingQuantity"
        @update:model-value="form.remainingQuantity = $event === '' ? undefined : Number($event)"
      />
      <AppInput
        :model-value="form.unitPrice === undefined ? '' : String(form.unitPrice)"
        label="Unit price"
        type="number"
        required
        :error="errors.unitPrice"
        @update:model-value="form.unitPrice = $event === '' ? undefined : Number($event)"
      />
      <div class="sm:col-span-2">
        <AppSelect
          :model-value="form.locationId ?? ''"
          label="Location"
          :options="locationOptions"
          required
          :error="errors.locationId"
          @update:model-value="form.locationId = $event"
        />
      </div>
      <p class="sm:col-span-2 text-xs text-ink-muted leading-relaxed">
        Changes to batch number, quantities, price, location, or dates require confirmation.
        Received quantity is historical and is not editable here.
      </p>
    </div>

    <template #footer>
      <AppButton variant="outline" :disabled="saving" @click="emit('close')">Cancel</AppButton>
      <AppButton :loading="saving" @click="onSubmit">Save changes</AppButton>
    </template>
  </AppModal>

  <AppModal
    :open="confirmOpen"
    title="Confirm sensitive changes"
    description="These fields affect inventory integrity."
    size="sm"
    @close="confirmOpen = false"
  >
    <p class="text-sm text-ink-secondary leading-relaxed">
      You are changing:
      <span class="font-medium text-ink">{{ pendingSensitive.join(', ') }}</span>.
      Continue only if this correction is intentional.
    </p>
    <template #footer>
      <AppButton variant="outline" @click="confirmOpen = false">Back</AppButton>
      <AppButton @click="onConfirmSensitive">Confirm &amp; save</AppButton>
    </template>
  </AppModal>
</template>
