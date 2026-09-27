<script setup lang="ts">
import AppButton from '@/components/common/AppButton.vue'
import AppModal from '@/components/common/AppModal.vue'
import type { Contact } from '@/types'
import { formatDate } from '@/utils'

defineProps<{
  open: boolean
  contact: Contact | null
  canManage?: boolean
}>()

const emit = defineEmits<{
  close: []
  edit: []
}>()
</script>

<template>
  <AppModal
    :open="open"
    title="Contact details"
    description="Directory record"
    size="md"
    @close="emit('close')"
  >
    <div v-if="contact" class="space-y-4">
      <div>
        <p class="text-base font-semibold text-ink">{{ contact.name }}</p>
        <p class="text-sm text-ink-muted mt-0.5">
          {{ contact.designation }} · {{ contact.department }}
        </p>
      </div>

      <dl class="grid gap-3 sm:grid-cols-2 text-sm">
        <div>
          <dt class="text-xs text-ink-muted">Phone</dt>
          <dd class="font-medium mt-0.5">
            <a :href="`tel:${contact.phone}`" class="hover:text-brand-600">{{ contact.phone }}</a>
          </dd>
        </div>
        <div>
          <dt class="text-xs text-ink-muted">Email</dt>
          <dd class="font-medium mt-0.5 break-all">
            <a :href="`mailto:${contact.email}`" class="hover:text-brand-600">{{ contact.email }}</a>
          </dd>
        </div>
        <div class="sm:col-span-2" v-if="contact.notes">
          <dt class="text-xs text-ink-muted">Notes</dt>
          <dd class="mt-0.5 text-ink-secondary whitespace-pre-wrap">{{ contact.notes }}</dd>
        </div>
        <div>
          <dt class="text-xs text-ink-muted">Added</dt>
          <dd class="font-medium mt-0.5">{{ formatDate(contact.createdAt, 'dd MMM yyyy') }}</dd>
        </div>
        <div>
          <dt class="text-xs text-ink-muted">Updated</dt>
          <dd class="font-medium mt-0.5">
            {{ formatDate(contact.updatedAt, 'dd MMM yyyy, HH:mm') }}
          </dd>
        </div>
      </dl>
    </div>

    <template #footer>
      <AppButton variant="outline" @click="emit('close')">Close</AppButton>
      <AppButton v-if="canManage" @click="emit('edit')">Edit</AppButton>
    </template>
  </AppModal>
</template>
