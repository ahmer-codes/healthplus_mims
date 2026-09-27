<script setup lang="ts">
import { Check, ChevronsUpDown, Search } from '@lucide/vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { batchService } from '@/services'
import type { Medicine } from '@/types'
import { cn, formatQuantity } from '@/utils'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    label?: string
    error?: string
    required?: boolean
    disabled?: boolean
    locationId?: string
    placeholder?: string
    /** Qty already staged on pending lines, keyed by medicine id (edit line excluded by caller). */
    reservedByMedicineId?: Record<string, number>
  }>(),
  {
    modelValue: '',
    label: 'Medicine',
    required: false,
    disabled: false,
    placeholder: 'Search allocatable stock…',
    reservedByMedicineId: () => ({}),
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  select: [medicine: Medicine | null]
}>()

const open = ref(false)
const query = ref('')
const rows = ref<Array<{ medicine: Medicine; availableQty: number }>>([])
const loading = ref(false)
const root = ref<HTMLElement | null>(null)

const selected = computed(
  () => rows.value.find((row) => row.medicine.id === props.modelValue) ?? null,
)

function displayAvailable(medicineId: string, availableQty: number) {
  const reserved = props.reservedByMedicineId[medicineId] ?? 0
  return Math.max(0, availableQty - reserved)
}

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return rows.value
  return rows.value.filter((row) => {
    const m = row.medicine
    const haystack = [m.displayName, m.genericName, m.strength, m.dosageForm, m.volume]
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
})

async function load() {
  loading.value = true
  try {
    rows.value = await batchService.listAllocatableMedicines(props.locationId)
  } finally {
    loading.value = false
  }
}

function choose(medicine: Medicine) {
  emit('update:modelValue', medicine.id)
  emit('select', medicine)
  open.value = false
  query.value = ''
}

function clear() {
  emit('update:modelValue', '')
  emit('select', null)
}

function onPointerDown(event: MouseEvent) {
  if (!root.value?.contains(event.target as Node)) open.value = false
}

watch(
  () => props.modelValue,
  (id) => {
    if (!id) emit('select', null)
  },
)

watch(
  () => props.locationId,
  () => {
    void load()
  },
)

onMounted(() => {
  void load()
  document.addEventListener('mousedown', onPointerDown)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', onPointerDown)
})

defineExpose({ reload: load })
</script>

<template>
  <div ref="root" class="flex flex-col gap-1.5">
    <label v-if="label" class="text-sm font-medium text-ink">
      {{ label }}
      <span v-if="required" class="text-brand-500">*</span>
    </label>

    <div class="relative">
      <button
        type="button"
        :disabled="disabled"
        :class="
          cn(
            'flex w-full items-center gap-2 h-9.5 rounded-[var(--radius-md)] border bg-surface px-3 text-left text-sm transition-colors',
            error ? 'border-danger' : 'border-border hover:border-border-strong',
            disabled && 'opacity-60 cursor-not-allowed',
          )
        "
        :aria-expanded="open"
        aria-haspopup="listbox"
        @click="open = !open"
      >
        <span
          class="min-w-0 flex-1 truncate"
          :class="selected ? 'text-ink' : 'text-ink-faint'"
          :title="selected?.medicine.displayName"
        >
          {{ selected?.medicine.displayName || placeholder }}
        </span>
        <ChevronsUpDown class="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
      </button>

      <div
        v-if="open"
        class="absolute z-40 mt-1.5 w-full overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface shadow-[var(--shadow-md)]"
        role="listbox"
      >
        <div class="border-b border-border p-2">
          <div class="relative">
            <Search
              class="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint"
              aria-hidden="true"
            />
            <input
              v-model="query"
              type="search"
              class="h-9 w-full rounded-[var(--radius-sm)] border border-border bg-surface-muted pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400"
              placeholder="Generic, strength, form…"
              @keydown.esc="open = false"
            />
          </div>
        </div>

        <div class="max-h-64 overflow-y-auto py-1">
          <p v-if="loading" class="px-3 py-4 text-xs text-ink-muted">Loading stocked medicines…</p>
          <p v-else-if="!filtered.length" class="px-3 py-4 text-xs text-ink-muted">
            No allocatable stock found. Receive stock via Stock In first.
          </p>
          <button
            v-for="row in filtered"
            :key="row.medicine.id"
            type="button"
            class="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-surface-muted transition-colors"
            :class="row.medicine.id === modelValue ? 'bg-primary-subtle/60' : ''"
            @click="choose(row.medicine)"
          >
            <Check
              class="mt-0.5 size-3.5 shrink-0"
              :class="row.medicine.id === modelValue ? 'text-brand-600' : 'text-transparent'"
              aria-hidden="true"
            />
            <span class="min-w-0 flex-1">
              <span
                class="block text-sm font-medium text-ink leading-snug line-clamp-2 break-words"
                :title="row.medicine.displayName"
              >
                {{ row.medicine.displayName }}
              </span>
              <span class="mt-0.5 block text-[11px] text-ink-muted truncate">
                {{ row.medicine.genericName }}
                · {{ row.medicine.strength }}
                · {{ row.medicine.dosageForm }}
                <template v-if="row.medicine.volume"> · {{ row.medicine.volume }}</template>
              </span>
            </span>
            <span class="shrink-0 text-[11px] tabular-nums text-ink-secondary">
              {{ formatQuantity(displayAvailable(row.medicine.id, row.availableQty)) }} avail.
            </span>
          </button>
        </div>

        <div v-if="selected" class="border-t border-border p-2">
          <button
            type="button"
            class="w-full rounded-[var(--radius-sm)] px-2 py-1.5 text-xs text-ink-muted hover:bg-surface-muted hover:text-ink"
            @click="clear"
          >
            Clear selection
          </button>
        </div>
      </div>
    </div>

    <p v-if="error" class="text-xs text-danger">{{ error }}</p>
  </div>
</template>
