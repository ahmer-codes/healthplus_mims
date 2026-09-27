<script setup lang="ts">
import { Eye, EllipsisVertical, Pencil, Trash2 } from '@lucide/vue'
import Dropdown from '@/components/common/Dropdown.vue'
import type { Contact } from '@/types'

defineProps<{
  rows: Contact[]
  canManage?: boolean
}>()

const emit = defineEmits<{
  view: [row: Contact]
  edit: [row: Contact]
  remove: [row: Contact]
}>()
</script>

<template>
  <div class="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
    <div class="overflow-x-auto">
      <table class="table-cols-stripe w-full min-w-[48rem] border-collapse text-sm">
        <thead>
          <tr class="border-b border-border bg-surface-muted/80 text-left text-xs text-ink-muted">
            <th class="px-3 py-2.5 font-medium">Name</th>
            <th class="px-3 py-2.5 font-medium">Designation</th>
            <th class="px-3 py-2.5 font-medium">Department</th>
            <th class="px-3 py-2.5 font-medium">Phone</th>
            <th class="px-3 py-2.5 font-medium">Email</th>
            <th class="px-3 py-2.5 font-medium w-16">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!rows.length">
            <td colspan="6" class="px-4 py-10 text-center text-ink-muted">
              No contacts match the current filters.
            </td>
          </tr>
          <tr
            v-for="row in rows"
            :key="row.id"
            class="border-b border-border last:border-b-0 cursor-pointer"
            @click="emit('view', row)"
          >
            <td class="px-3 py-2.5 font-medium text-ink">{{ row.name }}</td>
            <td class="px-3 py-2.5 text-ink-secondary">{{ row.designation }}</td>
            <td class="px-3 py-2.5 text-ink-secondary">{{ row.department }}</td>
            <td class="px-3 py-2.5 tabular-nums text-ink">
              <a
                :href="`tel:${row.phone}`"
                class="hover:text-brand-600"
                @click.stop
              >{{ row.phone }}</a>
            </td>
            <td class="px-3 py-2.5 text-ink-secondary max-w-[14rem] truncate">
              <a
                :href="`mailto:${row.email}`"
                class="hover:text-brand-600"
                @click.stop
              >{{ row.email }}</a>
            </td>
            <td class="px-3 py-2.5" @click.stop>
              <Dropdown label="Row actions" align="right" variant="icon">
                <template #trigger>
                  <EllipsisVertical class="size-4" aria-hidden="true" />
                </template>
                <template #default="{ close }">
                  <button
                    type="button"
                    role="menuitem"
                    class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-ink transition-colors duration-[var(--duration-fast)] hover:bg-surface-muted"
                    @click="emit('view', row); close()"
                  >
                    <Eye class="size-3.5 text-ink-muted" /> View
                  </button>
                  <button
                    v-if="canManage"
                    type="button"
                    role="menuitem"
                    class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-ink transition-colors duration-[var(--duration-fast)] hover:bg-surface-muted"
                    @click="emit('edit', row); close()"
                  >
                    <Pencil class="size-3.5 text-ink-muted" /> Edit
                  </button>
                  <div v-if="canManage" class="my-1 border-t border-border" role="separator" />
                  <button
                    v-if="canManage"
                    type="button"
                    role="menuitem"
                    class="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-danger transition-colors duration-[var(--duration-fast)] hover:bg-danger-subtle"
                    @click="emit('remove', row); close()"
                  >
                    <Trash2 class="size-3.5" /> Delete
                  </button>
                </template>
              </Dropdown>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
