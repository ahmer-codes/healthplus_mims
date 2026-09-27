<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppSelect, { type SelectOption } from '@/components/forms/AppSelect.vue'
import { batchService } from '@/services'
import type { MedicineBatch } from '@/types'
import { formatDate, formatQuantity } from '@/utils'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    medicineId?: string
    locationId?: string
    /** Qty already staged on other pending lines (excluded from “left” labels). */
    reservedByBatchId?: Record<string, number>
    label?: string
    error?: string
    required?: boolean
    disabled?: boolean
  }>(),
  {
    modelValue: '',
    medicineId: '',
    reservedByBatchId: () => ({}),
    label: 'Batch',
    required: false,
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  select: [batch: MedicineBatch | null]
}>()

const batches = ref<MedicineBatch[]>([])
const loading = ref(false)

function displayLeft(batch: MedicineBatch): number {
  const reserved = props.reservedByBatchId[batch.id] ?? 0
  return Math.max(0, batch.remainingQuantity - reserved)
}

const options = computed<SelectOption[]>(() =>
  batches.value.map((batch) => ({
    value: batch.id,
    label: `${batch.batchNo} · Exp ${formatDate(batch.expiryDate)} · ${formatQuantity(displayLeft(batch))} left`,
  })),
)

async function load() {
  if (!props.medicineId) {
    batches.value = []
    return
  }
  loading.value = true
  try {
    batches.value = await batchService.getAvailableForMedicine(
      props.medicineId,
      props.locationId,
    )
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.medicineId, props.locationId] as const,
  async ([medicineId], previous) => {
    const prevMedicineId = previous?.[0]
    await load()
    if (prevMedicineId !== undefined && medicineId !== prevMedicineId) {
      emit('update:modelValue', '')
      emit('select', null)
      return
    }
    if (props.modelValue) {
      const batch = batches.value.find((row) => row.id === props.modelValue) ?? null
      emit('select', batch)
      if (!batch && prevMedicineId !== undefined) emit('update:modelValue', '')
    }
  },
  { immediate: true },
)

watch(
  () => props.modelValue,
  (id) => {
    if (!id) {
      emit('select', null)
      return
    }
    const batch = batches.value.find((row) => row.id === id) ?? null
    emit('select', batch)
  },
)

function onUpdate(value: string) {
  emit('update:modelValue', value)
  const batch = batches.value.find((row) => row.id === value) ?? null
  emit('select', batch)
}

defineExpose({ reload: load, batches })
</script>

<template>
  <AppSelect
    :model-value="modelValue"
    :label="label"
    :options="options"
    :required="required"
    :disabled="disabled || !medicineId || loading"
    :error="error"
    :placeholder="
      !medicineId
        ? 'Select a medicine first'
        : loading
          ? 'Loading batches…'
          : options.length
            ? 'Select eligible batch…'
            : 'No eligible batches'
    "
    @update:model-value="onUpdate"
  />
</template>
