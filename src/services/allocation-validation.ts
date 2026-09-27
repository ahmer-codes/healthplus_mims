import type { EntityId } from '@/types'
import { createEntityId, isPositiveQuantity } from '@/utils'

/** Staged allocation line. inventory not yet deducted. */
export interface AllocationDraftItem {
  id: EntityId
  medicineId: EntityId
  medicineDisplayName: string
  batchId: EntityId
  batchNo: string
  expiryDate: string
  availableQuantity: number
  quantity: number
}

export interface AllocationDraftMaster {
  date: string
  voucherNo: string
  destinationLocationId: string
  receiverName: string
  receiverDesignation: string
}

export interface AllocationItemFormValues {
  medicineId: string
  batchId: string
  quantity: string
}

export interface AllocationItemFormErrors {
  medicineId?: string
  batchId?: string
  quantity?: string
  form?: string
}

export interface AllocationMasterFormErrors {
  date?: string
  voucherNo?: string
  destinationLocationId?: string
}

export function emptyAllocationItemForm(): AllocationItemFormValues {
  return {
    medicineId: '',
    batchId: '',
    quantity: '',
  }
}

export function validateAllocationMaster(
  master: AllocationDraftMaster,
): AllocationMasterFormErrors {
  const errors: AllocationMasterFormErrors = {}
  if (!master.date) errors.date = 'Allocation date is required.'
  if (!master.voucherNo.trim()) errors.voucherNo = 'Voucher number is required.'
  if (!master.destinationLocationId) {
    errors.destinationLocationId = 'Destination is required.'
  }
  return errors
}

export function validateAllocationItemForm(
  values: AllocationItemFormValues,
  options: {
    availableQuantity: number
    pendingItems?: AllocationDraftItem[]
    editingId?: string
  },
): AllocationItemFormErrors {
  const errors: AllocationItemFormErrors = {}

  if (!values.medicineId) errors.medicineId = 'Medicine is required.'
  if (!values.batchId) errors.batchId = 'Batch is required.'

  const quantity = Number(values.quantity)
  if (values.quantity.trim() === '' || Number.isNaN(quantity)) {
    errors.quantity = 'Quantity is required.'
  } else if (!isPositiveQuantity(quantity)) {
    errors.quantity = 'Quantity must be greater than zero.'
  } else {
    const pendingOnBatch =
      options.pendingItems
        ?.filter(
          (item) => item.batchId === values.batchId && item.id !== options.editingId,
        )
        .reduce((sum, item) => sum + item.quantity, 0) ?? 0
    const remainingForLine = options.availableQuantity - pendingOnBatch
    if (quantity > remainingForLine) {
      errors.quantity =
        remainingForLine <= 0
          ? 'This batch is fully reserved in pending allocations.'
          : `Quantity exceeds available (${remainingForLine}).`
    }
  }

  return errors
}

export function formValuesToAllocationDraftItem(
  values: AllocationItemFormValues,
  meta: {
    medicineDisplayName: string
    batchNo: string
    expiryDate: string
    availableQuantity: number
  },
  existingId?: string,
): AllocationDraftItem {
  return {
    id: existingId ?? createEntityId('apend'),
    medicineId: values.medicineId,
    medicineDisplayName: meta.medicineDisplayName,
    batchId: values.batchId,
    batchNo: meta.batchNo,
    expiryDate: meta.expiryDate,
    availableQuantity: meta.availableQuantity,
    quantity: Number(values.quantity),
  }
}

export function draftItemToAllocationFormValues(
  item: AllocationDraftItem,
): AllocationItemFormValues {
  return {
    medicineId: item.medicineId,
    batchId: item.batchId,
    quantity: String(item.quantity),
  }
}
