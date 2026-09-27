import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { TransferDraftItem, TransferDraftMaster } from '@/services/transfer-validation'
import { todayDateString } from '@/utils'

const STORAGE_KEY = 'healthplus.transfer-draft.v1'

interface PersistedDraft {
  master: TransferDraftMaster
  items: TransferDraftItem[]
  editingId: string | null
}

function emptyMaster(): TransferDraftMaster {
  return {
    date: todayDateString(),
    voucherNo: '',
    fromLocationId: 'loc-main-pharmacy',
    toLocationId: '',
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
        fromLocationId: parsed.master?.fromLocationId || 'loc-main-pharmacy',
        toLocationId: parsed.master?.toLocationId ?? '',
      },
      items: Array.isArray(parsed.items) ? parsed.items : [],
      editingId: parsed.editingId ?? null,
    }
  } catch {
    return { master: emptyMaster(), items: [], editingId: null }
  }
}

/** Temporary transfer cart. inventory moves only on finalize. */
export const useTransferDraftStore = defineStore('transfer-draft', () => {
  const initial = loadDraft()
  const master = ref<TransferDraftMaster>({ ...initial.master })
  const items = ref<TransferDraftItem[]>([...initial.items])
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
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          master: master.value,
          items: items.value,
          editingId: editingId.value,
        } satisfies PersistedDraft),
      )
    },
    { deep: true },
  )

  function setMaster(partial: Partial<TransferDraftMaster>) {
    master.value = { ...master.value, ...partial }
  }

  function addItem(item: TransferDraftItem) {
    items.value = [...items.value, item]
  }

  function updateItem(id: string, item: TransferDraftItem) {
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

  function clearItems() {
    items.value = []
    editingId.value = null
  }

  function clearAll() {
    master.value = emptyMaster()
    items.value = []
    editingId.value = null
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY)
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
    clearItems,
    clearAll,
  }
})
