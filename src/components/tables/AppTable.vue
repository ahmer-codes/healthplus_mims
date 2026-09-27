<script setup lang="ts">
import { cn } from '@/utils'

export interface TableColumn {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
  className?: string
}

withDefaults(
  defineProps<{
    columns: TableColumn[]
    rows?: Record<string, unknown>[]
    emptyMessage?: string
  }>(),
  {
    rows: () => [],
    emptyMessage: 'No records to display.',
  },
)

function alignClass(align?: 'left' | 'center' | 'right') {
  if (align === 'center') return 'text-center'
  if (align === 'right') return 'text-right'
  return 'text-left'
}
</script>

<template>
  <div class="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
    <div class="overflow-x-auto">
      <table class="table-cols-stripe w-full min-w-[40rem] border-collapse text-sm">
        <thead>
          <tr class="border-b border-border bg-surface-muted/80">
            <th
              v-for="column in columns"
              :key="column.key"
              scope="col"
              :class="
                cn(
                  'px-4 py-3 font-medium text-ink-secondary whitespace-nowrap',
                  alignClass(column.align),
                  column.className,
                )
              "
            >
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!rows.length">
            <td :colspan="columns.length" class="px-4 py-10 text-center text-ink-muted">
              {{ emptyMessage }}
            </td>
          </tr>
          <tr
            v-for="(row, index) in rows"
            :key="index"
            class="border-b border-border last:border-b-0"
          >
            <td
              v-for="column in columns"
              :key="column.key"
              :class="cn('px-4 py-3 text-ink', alignClass(column.align), column.className)"
            >
              <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]">
                {{ row[column.key] ?? '-' }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
