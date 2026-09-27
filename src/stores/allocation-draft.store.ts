import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { AllocationDraftItem, AllocationDraftMaster } from '@/services/allocation-validation'
import { todayDateString } from '@/utils'

const STORAGE_KEY = 'healthplus.allocation-draft.v1'

interface PersistedDraft {
  master: AllocationDraftMaster
  items: AllocationDraftItem[]
  editingId: string | null
}

function emptyMaster(): AllocationDraftMaster {
  return {
    date: todayDateString(),
    voucherNo: '',
    destinationLocationId: '',
    receiverName: '',
    receiverDesignation: '',
  }
}

function loadDraft(): PersistedDraft {
  if (typeof localStorage === 'undefined') {
    return { master: emptyMaster(), items: [], editingId: null }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { master: emptyMaster(), items: [], editingId: null }
    const parsed = JSON.parse(raw) as PersistedDraft
    return {
      master: {
        date: parsed.master?.date || todayDateString(),
        voucherNo: parsed.master?.voucherNo ?? '',
        destinationLocationId: parsed.master?.destinationLocationId ?? '',
        receiverName: parsed.master?.receiverName ?? '',
        receiverDesignation: parsed.master?.receiverDesignation ?? '',
      },
      items: Array.isArray(parsed.items) ? parsed.items : [],
      editingId: parsed.editingId ?? null,
    }
  } catch {
    return { master: emptyMaster(), items: [], editingId: null }
  }
}

/**
 * Temporary allocation cart.
 * Persists staged lines locally; inventory deduction happens only on finalize.
 */
export const useAllocationDraftStore = defineStore('allocation-draft', () => {
  const initial = loadDraft()
  const master = ref<AllocationDraftMaster>({ ...initial.master })
  const items = ref<AllocationDraftItem[]>([...initial.items])
  const editingId = ref<string | null>(initial.editingId)

  const itemCount = computed(() => items.value.length)
  const totalQuantity = computed(() =>
    items.value.reduce((sum, item) => sum + item.quantity, 0),
  )
  const editingItem = computed(
    () => items.value.find((item) => item.id === editingId.value) ?? null,
  )

  watch(
    [master, items, editingId],
    () => {
      if (typeof localStorage === 'undefined') return
      const payload: PersistedDraft = {
        master: master.value,
        items: items.value,
        editingId: editingId.value,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    },
    { deep: true },
  )

  function setMaster(partial: Partial<AllocationDraftMaster>) {
    master.value = { ...master.value, ...partial }
  }

  function addItem(item: AllocationDraftItem) {
    items.value = [...items.value, item]
  }

  function updateItem(id: string, item: AllocationDraftItem) {
    items.value = items.value.map((row) => (row.id === id ? { ...item, id } : row))
    editingId.value = null
  }

  function removeItem(id: string) {
    items.value = items.value.filter((row) => row.id !== id)
    if (editingId.value === id) editingId.value = null
  }

  function startEdit(id: string) {
    editingId.value = id
  }

  function cancelEdit() {
    editingId.value = null
  }

  function clearAll() {
    master.value = emptyMaster()
    items.value = []
    editingId.value = null
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  return {
    master,
    items,
    editingId,
    itemCount,
    totalQuantity,
    editingItem,
    setMaster,
    addItem,
    updateItem,
    removeItem,
    startEdit,
    cancelEdit,
    clearAll,
  }
})
