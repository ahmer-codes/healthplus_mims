<script setup lang="ts">
import { Check, ChevronsUpDown, Search } from '@lucide/vue'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { medicineService } from '@/services'
import type { Medicine } from '@/types'
import { cn } from '@/utils'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    label?: string
    error?: string
    required?: boolean
    disabled?: boolean
    placeholder?: string
  }>(),
  {
    modelValue: '',
    label: 'Medicine',
    required: false,
    disabled: false,
    placeholder: 'Search medicine catalog…',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  select: [medicine: Medicine | null]
}>()

const open = ref(false)
const query = ref('')
const medicines = ref<Medicine[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)
const highlightIndex = ref(-1)
const root = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const listEl = ref<HTMLElement | null>(null)

const selected = computed(
  () => medicines.value.find((medicine) => medicine.id === props.modelValue) ?? null,
)

/** Multi-token match across generic name, strength, dosage form, volume, category. */
const filtered = computed(() => {
  const tokens = query.value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)

  let rows = medicines.value
  if (tokens.length) {
    rows = rows.filter((medicine) => {
      const haystack = [
        medicine.displayName,
        medicine.genericName,
        medicine.strength,
        medicine.dosageForm,
        medicine.volume,
        medicine.category ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return tokens.every((token) => haystack.includes(token))
    })
  }

  return rows.slice(0, 80)
})

async function loadMedicines() {
  loading.value = true
  loadError.value = null
  try {
    medicines.value = await medicineService.listActive()
    if (!medicines.value.length) {
      loadError.value = 'No medicines in catalog. Check Firebase rules or refresh Settings.'
    }
  } catch (error) {
    loadError.value =
      error instanceof Error ? error.message : 'Unable to load medicine catalog.'
    medicines.value = []
  } finally {
    loading.value = false
  }
}

async function openList() {
  if (props.disabled) return
  open.value = true
  highlightIndex.value = filtered.value.findIndex((m) => m.id === props.modelValue)
  if (highlightIndex.value < 0 && filtered.value.length) highlightIndex.value = 0
  await nextTick()
  searchInput.value?.focus()
  scrollHighlightedIntoView()
}

function closeList() {
  open.value = false
  query.value = ''
  highlightIndex.value = -1
}

function choose(medicine: Medicine) {
  emit('update:modelValue', medicine.id)
  emit('select', medicine)
  closeList()
}

function clear() {
  emit('update:modelValue', '')
  emit('select', null)
  closeList()
}

function scrollHighlightedIntoView() {
  const list = listEl.value
  if (!list || highlightIndex.value < 0) return
  const option = list.querySelector<HTMLElement>(`[data-index="${highlightIndex.value}"]`)
  option?.scrollIntoView({ block: 'nearest' })
}

function onTriggerKeydown(event: KeyboardEvent) {
  if (props.disabled) return
  if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    void openList()
  }
}

function onSearchKeydown(event: KeyboardEvent) {
  const count = filtered.value.length

  if (event.key === 'Escape') {
    event.preventDefault()
    closeList()
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (!count) return
    highlightIndex.value = (highlightIndex.value + 1) % count
    scrollHighlightedIntoView()
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (!count) return
    highlightIndex.value = highlightIndex.value <= 0 ? count - 1 : highlightIndex.value - 1
    scrollHighlightedIntoView()
    return
  }

  if (event.key === 'Home') {
    event.preventDefault()
    if (!count) return
    highlightIndex.value = 0
    scrollHighlightedIntoView()
    return
  }

  if (event.key === 'End') {
    event.preventDefault()
    if (!count) return
    highlightIndex.value = count - 1
    scrollHighlightedIntoView()
    return
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    const medicine = filtered.value[highlightIndex.value]
    if (medicine) choose(medicine)
  }
}

function onPointerDown(event: MouseEvent) {
  if (!root.value?.contains(event.target as Node)) {
    closeList()
  }
}

watch(query, () => {
  highlightIndex.value = filtered.value.length ? 0 : -1
  void nextTick(() => scrollHighlightedIntoView())
})

watch(
  () => props.modelValue,
  (id) => {
    if (!id) emit('select', null)
  },
)

onMounted(() => {
  void loadMedicines()
  document.addEventListener('mousedown', onPointerDown)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', onPointerDown)
})
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
        :aria-controls="open ? 'medicine-select-listbox' : undefined"
        @click="open ? closeList() : openList()"
        @keydown="onTriggerKeydown"
      >
        <span
          class="min-w-0 flex-1 truncate"
          :class="selected ? 'text-ink' : 'text-ink-faint'"
          :title="selected?.displayName"
        >
          {{ selected?.displayName || placeholder }}
        </span>
        <ChevronsUpDown class="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
      </button>

      <div
        v-if="open"
        id="medicine-select-listbox"
        class="absolute z-40 mt-1.5 w-full overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface shadow-[var(--shadow-md)]"
        role="listbox"
        :aria-activedescendant="
          highlightIndex >= 0 ? `medicine-option-${filtered[highlightIndex]?.id}` : undefined
        "
      >
        <div class="border-b border-border p-2">
          <div class="relative">
            <Search
              class="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint"
              aria-hidden="true"
            />
            <input
              ref="searchInput"
              v-model="query"
              type="search"
              class="h-9 w-full rounded-[var(--radius-sm)] border border-border bg-surface-muted pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400"
              placeholder="Generic, strength, form, volume…"
              aria-autocomplete="list"
              aria-controls="medicine-select-listbox"
              @keydown="onSearchKeydown"
            />
          </div>
        </div>

        <div ref="listEl" class="max-h-64 overflow-y-auto py-1">
          <p v-if="loading" class="px-3 py-4 text-xs text-ink-muted">Loading catalog…</p>
          <div v-else-if="loadError" class="px-3 py-6 text-center text-xs text-danger">
            {{ loadError }}
            <button
              type="button"
              class="mt-2 block w-full text-xs font-medium text-primary"
              @click="loadMedicines"
            >
              Retry
            </button>
          </div>
          <p v-else-if="!filtered.length" class="px-3 py-6 text-center text-xs text-ink-muted">
            No medicines match your search.
            <span class="mt-1 block text-ink-faint">Try generic name, strength, or dosage form.</span>
          </p>
          <button
            v-for="(medicine, index) in filtered"
            :id="`medicine-option-${medicine.id}`"
            :key="medicine.id"
            type="button"
            role="option"
            :data-index="index"
            :aria-selected="medicine.id === modelValue"
            class="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors"
            :class="
              cn(
                medicine.id === modelValue && 'bg-primary-subtle/60',
                index === highlightIndex && 'bg-surface-muted',
                'hover:bg-surface-muted',
              )
            "
            @click="choose(medicine)"
            @mouseenter="highlightIndex = index"
          >
            <Check
              class="mt-0.5 size-3.5 shrink-0"
              :class="medicine.id === modelValue ? 'text-brand-600' : 'text-transparent'"
              aria-hidden="true"
            />
            <span class="min-w-0 flex-1">
              <span
                class="block text-sm font-medium text-ink leading-snug line-clamp-2 break-words"
                :title="medicine.displayName"
              >
                {{ medicine.displayName }}
              </span>
              <span class="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-ink-muted">
                <span class="truncate">{{ medicine.genericName }}</span>
                <span aria-hidden="true">·</span>
                <span>{{ medicine.strength || '-' }}</span>
                <span aria-hidden="true">·</span>
                <span>{{ medicine.dosageForm }}</span>
                <template v-if="medicine.volume">
                  <span aria-hidden="true">·</span>
                  <span>{{ medicine.volume }}</span>
                </template>
                <template v-if="medicine.category">
                  <span
                    class="rounded-[var(--radius-sm)] bg-neutral-subtle px-1 py-px text-[10px] text-neutral"
                  >
                    {{ medicine.category }}
                  </span>
                </template>
              </span>
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
