<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppDatePicker from '@/components/forms/AppDatePicker.vue'
import AppInput from '@/components/forms/AppInput.vue'
import AppSelect, { type SelectOption } from '@/components/forms/AppSelect.vue'
import AppTextarea from '@/components/forms/AppTextarea.vue'
import MedicineSelect from '@/components/forms/MedicineSelect.vue'
import { DEMAND_PRIORITIES, STATUS_LABELS } from '@/constants'
import { demandService, type DemandBoardRow } from '@/services'
import type { CreateDemandInput, DemandPriority, UpdateDemandInput } from '@/types'
import { formatQuantity, todayDateString } from '@/utils'

const props = defineProps<{
  open: boolean
  row: DemandBoardRow | null
  departmentOptions: SelectOption[]
  defaultRequestedBy?: string
  saving?: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [payload: { mode: 'create' | 'edit'; input: CreateDemandInput | UpdateDemandInput }]
}>()

const form = ref({
  medicineId: '',
  requestedQuantity: '',
  requestingDepartment: '',
  requestedBy: '',
  priority: 'normal' as DemandPriority,
  requestDate: todayDateString(),
  notes: '',
})
const errors = ref<Record<string, string>>({})
const availableQty = ref<number | null>(null)
const loadingStock = ref(false)
const customDepartment = ref(false)

const isEdit = computed(() => !!props.row)
const title = computed(() => (isEdit.value ? 'Edit demand' : 'New medicine demand'))

const priorityOptions = computed<SelectOption[]>(() =>
  DEMAND_PRIORITIES.map((p) => ({ value: p, label: STATUS_LABELS[p] })),
)

const deptSelectOptions = computed<SelectOption[]>(() => [
  ...props.departmentOptions,
  { value: '__custom__', label: 'Other…' },
])

const stockHint = computed(() => {
  if (availableQty.value === null) return 'Select a medicine to see on-hand stock.'
  const avail = availableQty.value
  const req = Number(form.value.requestedQuantity)
  if (!Number.isFinite(req) || req <= 0) {
    return `Current available quantity: ${formatQuantity(avail)} (informational)`
  }
  if (avail <= 0) return `No allocatable stock on hand. Requested ${formatQuantity(req)}.`
  if (avail < req) {
    return `Available ${formatQuantity(avail)}, short by ${formatQuantity(req - avail)}. Does not block this request.`
  }
  return `Available ${formatQuantity(avail)}, covers this request. Informational only.`
})

watch(
  () => [props.open, props.row] as const,
  async ([open, row]) => {
    if (!open) return
    errors.value = {}
    if (row) {
      form.value = {
        medicineId: row.demand.medicineId,
        requestedQuantity: String(row.demand.requestedQuantity),
        requestingDepartment: row.demand.requestingDepartment,
        requestedBy: row.demand.requestedBy,
        priority: row.demand.priority,
        requestDate: row.demand.requestDate,
        notes: row.demand.notes ?? '',
      }
      availableQty.value = row.availableQuantity
      const known = props.departmentOptions.some((o) => o.value === row.demand.requestingDepartment)
      customDepartment.value = !known
    } else {
      form.value = {
        medicineId: '',
        requestedQuantity: '',
        requestingDepartment: props.departmentOptions[0]?.value ?? '',
        requestedBy: props.defaultRequestedBy ?? '',
        priority: 'normal',
        requestDate: todayDateString(),
        notes: '',
      }
      availableQty.value = null
      customDepartment.value = !props.departmentOptions.length
    }
  },
)

watch(
  () => form.value.medicineId,
  async (medicineId) => {
    if (!medicineId || !props.open) {
      if (!medicineId) availableQty.value = null
      return
    }
    loadingStock.value = true
    try {
      availableQty.value = await demandService.getAvailableQuantity(medicineId)
    } catch {
      availableQty.value = null
    } finally {
      loadingStock.value = false
    }
  },
)

function onDepartmentSelect(value: string) {
  if (value === '__custom__') {
    customDepartment.value = true
    form.value.requestingDepartment = ''
    return
  }
  customDepartment.value = false
  form.value.requestingDepartment = value
}

function validate(): boolean {
  const next: Record<string, string> = {}
  if (!form.value.medicineId) next.medicineId = 'Medicine is required.'
  const qty = Number(form.value.requestedQuantity)
  if (!form.value.requestedQuantity || Number.isNaN(qty) || qty <= 0) {
    next.requestedQuantity = 'Enter a quantity greater than zero.'
  }
  if (!form.value.requestingDepartment.trim()) {
    next.requestingDepartment = 'Department is required.'
  }
  if (!form.value.requestedBy.trim()) next.requestedBy = 'Requester is required.'
  if (!form.value.requestDate) next.requestDate = 'Date is required.'
  errors.value = next
  return Object.keys(next).length === 0
}

function onSubmit() {
  if (!validate()) return
  const input: UpdateDemandInput = {
    medicineId: form.value.medicineId,
    requestedQuantity: Number(form.value.requestedQuantity),
    requestingDepartment: form.value.requestingDepartment.trim(),
    requestedBy: form.value.requestedBy.trim(),
    priority: form.value.priority,
    requestDate: form.value.requestDate,
    notes: form.value.notes.trim() || undefined,
  }
  emit('save', { mode: isEdit.value ? 'edit' : 'create', input })
}
</script>

<template>
  <AppModal
    :open="open"
    :title="title"
    description="Request against hospital inventory. Stock figures are informational only"
    size="lg"
    @close="emit('close')"
  >
    <form class="grid gap-3 sm:grid-cols-2" @submit.prevent="onSubmit">
      <div class="sm:col-span-2">
        <MedicineSelect
          v-model="form.medicineId"
          required
          :error="errors.medicineId"
          :disabled="isEdit"
        />
        <p class="mt-1.5 text-xs" :class="availableQty !== null && availableQty < Number(form.requestedQuantity || 0) ? 'text-warning' : 'text-ink-muted'">
          <span v-if="loadingStock">Checking inventory…</span>
          <span v-else>{{ stockHint }}</span>
        </p>
      </div>

      <AppInput
        v-model="form.requestedQuantity"
        label="Requested quantity"
        required
        type="number"
        :error="errors.requestedQuantity"
      />
      <AppSelect
        v-model="form.priority"
        label="Priority"
        required
        :options="priorityOptions"
      />

      <AppSelect
        v-if="!customDepartment"
        :model-value="form.requestingDepartment"
        label="Requesting department"
        required
        :options="deptSelectOptions"
        :error="errors.requestingDepartment"
        @update:model-value="onDepartmentSelect"
      />
      <AppInput
        v-else
        v-model="form.requestingDepartment"
        label="Requesting department"
        required
        :error="errors.requestingDepartment"
      />

      <AppInput
        v-model="form.requestedBy"
        label="Requested by"
        required
        :error="errors.requestedBy"
      />

      <AppDatePicker
        v-model="form.requestDate"
        label="Date"
        required
        :error="errors.requestDate"
      />

      <AppTextarea
        v-model="form.notes"
        class="sm:col-span-2"
        label="Notes"
        :rows="2"
        placeholder="Clinical context or delivery notes"
      />
    </form>

    <template #footer>
      <AppButton variant="outline" :disabled="saving" @click="emit('close')">Cancel</AppButton>
      <AppButton :loading="saving" @click="onSubmit">
        {{ isEdit ? 'Save changes' : 'Create demand' }}
      </AppButton>
    </template>
  </AppModal>
</template>
