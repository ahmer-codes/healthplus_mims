import type { EntityId } from '@/types'
import { createEntityId, isPositiveQuantity } from '@/utils'

/** Staged transfer line. inventory not yet moved. */
export interface TransferDraftItem {
  id: EntityId
  medicineId: EntityId
  medicineDisplayName: string
  batchId: EntityId
  batchNo: string
  expiryDate: string
  availableQuantity: number
  quantity: number
}

export interface TransferDraftMaster {
  date: string
  voucherNo: string
  fromLocationId: string
  toLocationId: string
}

export interface TransferItemFormValues {
  medicineId: string
  batchId: string
  quantity: string
}

export interface TransferItemFormErrors {
  medicineId?: string
  batchId?: string
  quantity?: string
  form?: string
}

export interface TransferMasterFormErrors {
  date?: string
  voucherNo?: string
  fromLocationId?: string
  toLocationId?: string
}

export function emptyTransferItemForm(): TransferItemFormValues {
  return {
    medicineId: '',
    batchId: '',
    quantity: '',
  }
}

export function validateTransferMaster(master: TransferDraftMaster): TransferMasterFormErrors {
  const errors: TransferMasterFormErrors = {}
  if (!master.date) errors.date = 'Transfer date is required.'
  if (!master.voucherNo.trim()) errors.voucherNo = 'Voucher number is required.'
  if (!master.fromLocationId) errors.fromLocationId = 'From location is required.'
  if (!master.toLocationId) errors.toLocationId = 'To location is required.'
  if (
    master.fromLocationId &&
    master.toLocationId &&
    master.fromLocationId === master.toLocationId
  ) {
    errors.toLocationId = 'To location must differ from From location.'
  }
  return errors
}

export function validateTransferItemForm(
  values: TransferItemFormValues,
  options: {
    availableQuantity: number
    pendingItems?: TransferDraftItem[]
    editingId?: string
  },
): TransferItemFormErrors {
  const errors: TransferItemFormErrors = {}

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
        ?.filter((item) => item.batchId === values.batchId && item.id !== options.editingId)
        .reduce((sum, item) => sum + item.quantity, 0) ?? 0
    const remainingForLine = options.availableQuantity - pendingOnBatch
    if (quantity > remainingForLine) {
      errors.quantity =
        remainingForLine <= 0
          ? 'This batch is fully reserved in pending transfers.'
          : `Quantity exceeds available (${remainingForLine}).`
    }
  }

  return errors
}

export function formValuesToTransferDraftItem(
  values: TransferItemFormValues,
  meta: {
    medicineDisplayName: string
    batchNo: string
    expiryDate: string
    availableQuantity: number
  },
  existingId?: string,
): TransferDraftItem {
  return {
    id: existingId ?? createEntityId('tpend'),
    medicineId: values.medicineId,
    medicineDisplayName: meta.medicineDisplayName,
    batchId: values.batchId,
    batchNo: meta.batchNo,
    expiryDate: meta.expiryDate,
    availableQuantity: meta.availableQuantity,
    quantity: Number(values.quantity),
  }
}

export function draftItemToTransferFormValues(item: TransferDraftItem): TransferItemFormValues {
  return {
    medicineId: item.medicineId,
    batchId: item.batchId,
    quantity: String(item.quantity),
  }
}
