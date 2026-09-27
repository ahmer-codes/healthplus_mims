<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { UserPlus } from '@lucide/vue'
import AppButton from '@/components/common/AppButton.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import EmptyState from '@/components/feedback/EmptyState.vue'
import ConfirmDialog from '@/components/feedback/ConfirmDialog.vue'
import LoadingState from '@/components/feedback/LoadingState.vue'
import ContactFilters from '@/components/contacts/ContactFilters.vue'
import ContactFormModal from '@/components/contacts/ContactFormModal.vue'
import ContactTable from '@/components/contacts/ContactTable.vue'
import ContactViewModal from '@/components/contacts/ContactViewModal.vue'
import { useAppPage, useAuth, useToast } from '@/composables'
import { DomainError, contactService } from '@/services'
import type { Contact, CreateContactInput } from '@/types'
import type { SelectOption } from '@/components/forms/AppSelect.vue'
import { HOSPITAL_LOCATION_SEEDS } from '@/data/hospital-locations'

const { setPage } = useAppPage()
const { hasRole, user } = useAuth()
const toast = useToast()

const canManage = computed(() => hasRole('admin', 'pharmacist', 'staff'))

const loading = ref(true)
const saving = ref(false)
const rows = ref<Contact[]>([])
const query = ref('')
const department = ref('all')
const departmentOptions = ref<SelectOption[]>([])

const viewOpen = ref(false)
const formOpen = ref(false)
const active = ref<Contact | null>(null)

const confirmOpen = ref(false)
const confirmAction = ref<null | (() => Promise<void>)>(null)

async function refreshDepartments() {
  const fromContacts = await contactService.listDepartments()
  const seeded = HOSPITAL_LOCATION_SEEDS.map((l) => l.name)
  const merged = [...new Set([...seeded, ...fromContacts])].sort((a, b) => a.localeCompare(b))
  departmentOptions.value = merged.map((name) => ({ value: name, label: name }))
}

async function load() {
  loading.value = true
  try {
    rows.value = await contactService.list({
      query: query.value,
      department: department.value,
    })
  } catch (error) {
    toast.error(
      'Could not load contacts',
      error instanceof Error ? error.message : 'Unexpected error',
    )
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  setPage({
    title: 'Contacts',
    subtitle: 'Hospital directory',
    breadcrumbs: [{ label: 'Home', to: '/dashboard' }, { label: 'Contacts' }],
  })
  await refreshDepartments()
  await load()
})

watch([query, department], () => {
  void load()
})

function openCreate() {
  active.value = null
  formOpen.value = true
}

function openView(row: Contact) {
  active.value = row
  viewOpen.value = true
}

function openEdit(row: Contact) {
  active.value = row
  viewOpen.value = false
  formOpen.value = true
}

function onEditFromView() {
  if (active.value) openEdit(active.value)
}

async function onSave(input: CreateContactInput) {
  saving.value = true
  try {
    if (active.value) {
      await contactService.update(active.value.id, input)
      toast.success('Contact updated')
    } else {
      await contactService.create(input)
      toast.success('Contact added')
    }
    formOpen.value = false
    active.value = null
    await refreshDepartments()
    await load()
  } catch (error) {
    toast.error(
      'Could not save contact',
      error instanceof DomainError ? error.message : 'Unexpected error',
    )
  } finally {
    saving.value = false
  }
}

function askRemove(row: Contact) {
  confirmAction.value = async () => {
    await contactService.remove(row.id)
    toast.success('Contact deleted')
    viewOpen.value = false
    await refreshDepartments()
    await load()
  }
  confirmOpen.value = true
}

async function onConfirmRemove() {
  if (!confirmAction.value) return
  try {
    await confirmAction.value()
  } catch (error) {
    toast.error(
      'Could not delete',
      error instanceof DomainError ? error.message : 'Unexpected error',
    )
  } finally {
    confirmOpen.value = false
    confirmAction.value = null
  }
}
</script>

<template>
  <div class="space-y-5">
    <PageHeader
      title="Contacts"
      description="Compact directory for hospital staff involved in stock and ward requests."
    >
      <template #actions>
        <AppButton v-if="canManage" @click="openCreate">
          <UserPlus class="size-4" />
          Add contact
        </AppButton>
      </template>
    </PageHeader>

    <ContactFilters
      v-model:query="query"
      v-model:department="department"
      :department-options="departmentOptions"
    />

    <p v-if="!loading" class="text-xs text-ink-muted">
      {{ rows.length }} contact{{ rows.length === 1 ? '' : 's' }}
      <span v-if="user"> · signed in as {{ user.displayName }}</span>
    </p>

    <div v-if="loading" class="surface-panel">
      <LoadingState label="Loading contacts…" />
    </div>

    <template v-else-if="rows.length || query || department !== 'all'">
      <ContactTable
        :rows="rows"
        :can-manage="canManage"
        @view="openView"
        @edit="openEdit"
        @remove="askRemove"
      />
    </template>

    <div v-else class="surface-panel">
      <EmptyState
        title="No contacts yet"
        description="Add ward, clinic, and pharmacy contacts so staff can reach the right person quickly."
      >
        <template v-if="canManage" #action>
          <AppButton @click="openCreate">
            <UserPlus class="size-4" />
            Add contact
          </AppButton>
        </template>
      </EmptyState>
    </div>

    <ContactViewModal
      :open="viewOpen"
      :contact="active"
      :can-manage="canManage"
      @close="viewOpen = false"
      @edit="onEditFromView"
    />

    <ContactFormModal
      :open="formOpen"
      :contact="active"
      :department-options="departmentOptions"
      :saving="saving"
      @close="formOpen = false"
      @save="onSave"
    />

    <ConfirmDialog
      :open="confirmOpen"
      title="Delete contact?"
      message="This removes the contact from the directory. This action cannot be undone."
      confirm-label="Delete"
      danger
      @close="confirmOpen = false"
      @confirm="onConfirmRemove"
    />
  </div>
</template>
