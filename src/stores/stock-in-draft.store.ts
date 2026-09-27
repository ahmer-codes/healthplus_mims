import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { todayDateString } from '@/utils'
import type { StockInDraftItem, StockInDraftMaster } from '@/services/stock-in-validation'

const STORAGE_KEY = 'healthplus.stock-in-draft.v1'
const DEFAULT_LOCATION = 'loc-main-pharmacy'

interface PersistedDraft {
  master: StockInDraftMaster
  items: StockInDraftItem[]
  editingId: string | null
}

function loadDraft(): PersistedDraft {
  if (typeof localStorage === 'undefined') {
    return {
      master: {
        purchaseOrderNo: '',
        receivingDate: todayDateString(),
        locationId: DEFAULT_LOCATION,
      },
      items: [],
      editingId: null,
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {
        master: {
          purchaseOrderNo: '',
          receivingDate: todayDateString(),
          locationId: DEFAULT_LOCATION,
        },
        items: [],
        editingId: null,
      }
    }
    const parsed = JSON.parse(raw) as PersistedDraft
    return {
      master: {
        purchaseOrderNo: parsed.master?.purchaseOrderNo ?? '',
        receivingDate: parsed.master?.receivingDate || todayDateString(),
        locationId: parsed.master?.locationId || DEFAULT_LOCATION,
      },
      items: Array.isArray(parsed.items) ? parsed.items : [],
      editingId: parsed.editingId ?? null,
    }
  } catch {
    return {
      master: {
        purchaseOrderNo: '',
        receivingDate: todayDateString(),
        locationId: DEFAULT_LOCATION,
      },
      items: [],
      editingId: null,
    }
  }
}

/**
 * Temporary receiving cart for Stock In.
 * Persists staged lines locally; finalized inventory goes through repositories.
 */
export const useStockInDraftStore = defineStore('stock-in-draft', () => {
  const initial = loadDraft()
  const master = ref<StockInDraftMaster>({ ...initial.master })
  const items = ref<StockInDraftItem[]>([...initial.items])
  const editingId = ref<string | null>(initial.editingId)

  const itemCount = computed(() => items.value.length)
  const grandTotal = computed(() =>
    items.value.reduce((sum, item) => sum + item.totalPrice, 0),
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

  function setMaster(partial: Partial<StockInDraftMaster>) {
    master.value = { ...master.value, ...partial }
  }

  function addItem(item: StockInDraftItem) {
    items.value = [...items.value, item]
  }

  function updateItem(id: string, item: StockInDraftItem) {
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
    master.value = {
      purchaseOrderNo: '',
      receivingDate: todayDateString(),
      locationId: DEFAULT_LOCATION,
    }
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
    grandTotal,
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
