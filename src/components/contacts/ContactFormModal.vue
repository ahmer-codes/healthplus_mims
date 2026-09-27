<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppInput from '@/components/forms/AppInput.vue'
import AppSelect, { type SelectOption } from '@/components/forms/AppSelect.vue'
import AppTextarea from '@/components/forms/AppTextarea.vue'
import type { Contact, CreateContactInput } from '@/types'

const props = defineProps<{
  open: boolean
  contact: Contact | null
  departmentOptions: SelectOption[]
  saving?: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [input: CreateContactInput]
}>()

const form = ref<CreateContactInput>({
  name: '',
  designation: '',
  department: '',
  phone: '',
  email: '',
  notes: '',
})
const errors = ref<Record<string, string>>({})
const customDepartment = ref(false)

const isEdit = computed(() => !!props.contact)
const title = computed(() => (isEdit.value ? 'Edit contact' : 'Add contact'))

const deptSelectOptions = computed<SelectOption[]>(() => [
  ...props.departmentOptions,
  { value: '__custom__', label: 'Other…' },
])

watch(
  () => [props.open, props.contact] as const,
  ([open, contact]) => {
    if (!open) return
    errors.value = {}
    if (contact) {
      form.value = {
        name: contact.name,
        designation: contact.designation,
        department: contact.department,
        phone: contact.phone,
        email: contact.email,
        notes: contact.notes ?? '',
      }
      const known = props.departmentOptions.some((o) => o.value === contact.department)
      customDepartment.value = !known
    } else {
      form.value = {
        name: '',
        designation: '',
        department: props.departmentOptions[0]?.value ?? '',
        phone: '',
        email: '',
        notes: '',
      }
      customDepartment.value = !props.departmentOptions.length
    }
  },
)

function onDepartmentSelect(value: string) {
  if (value === '__custom__') {
    customDepartment.value = true
    form.value.department = ''
    return
  }
  customDepartment.value = false
  form.value.department = value
}

function validate(): boolean {
  const next: Record<string, string> = {}
  if (!form.value.name.trim()) next.name = 'Name is required.'
  if (!form.value.designation.trim()) next.designation = 'Designation is required.'
  if (!form.value.department.trim()) next.department = 'Department is required.'
  if (!form.value.phone.trim()) next.phone = 'Phone is required.'
  if (!form.value.email.trim()) next.email = 'Email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email.trim())) {
    next.email = 'Enter a valid email.'
  }
  errors.value = next
  return Object.keys(next).length === 0
}

function onSubmit() {
  if (!validate()) return
  emit('save', {
    name: form.value.name.trim(),
    designation: form.value.designation.trim(),
    department: form.value.department.trim(),
    phone: form.value.phone.trim(),
    email: form.value.email.trim(),
    notes: form.value.notes?.trim() || undefined,
  })
}
</script>

<template>
  <AppModal
    :open="open"
    :title="title"
    description="Hospital contact for pharmacy coordination"
    size="md"
    @close="emit('close')"
  >
    <form class="grid gap-3 sm:grid-cols-2" @submit.prevent="onSubmit">
      <AppInput
        v-model="form.name"
        label="Name"
        required
        :error="errors.name"
        autocomplete="name"
      />
      <AppInput
        v-model="form.designation"
        label="Designation"
        required
        :error="errors.designation"
        placeholder="e.g. Ward In-Charge"
      />
      <div class="sm:col-span-2 grid gap-3 sm:grid-cols-2">
        <AppSelect
          v-if="!customDepartment"
          :model-value="form.department"
          label="Department"
          required
          :options="deptSelectOptions"
          :error="errors.department"
          @update:model-value="onDepartmentSelect"
        />
        <AppInput
          v-else
          v-model="form.department"
          label="Department"
          required
          :error="errors.department"
          placeholder="Department name"
        />
        <AppInput
          v-model="form.phone"
          label="Phone"
          required
          type="tel"
          :error="errors.phone"
          autocomplete="tel"
        />
      </div>
      <AppInput
        v-model="form.email"
        class="sm:col-span-2"
        label="Email"
        required
        type="email"
        :error="errors.email"
        autocomplete="email"
      />
      <AppTextarea
        v-model="form.notes"
        class="sm:col-span-2"
        label="Notes"
        :rows="2"
        placeholder="Optional context for dispensary staff"
      />
    </form>

    <template #footer>
      <AppButton variant="outline" :disabled="saving" @click="emit('close')">Cancel</AppButton>
      <AppButton :loading="saving" @click="onSubmit">
        {{ isEdit ? 'Save changes' : 'Add contact' }}
      </AppButton>
    </template>
  </AppModal>
</template>
