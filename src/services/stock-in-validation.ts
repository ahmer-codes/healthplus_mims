import type { EntityId } from '@/types'
import { calculateLineTotal, createEntityId } from '@/utils'

/** Staged receiving line. not yet inventory. */
export interface StockInDraftItem {
  id: EntityId
  medicineId: EntityId
  medicineDisplayName: string
  manufacturerName: string
  batchNo: string
  manufacturingDate: string
  expiryDate: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface StockInDraftMaster {
  purchaseOrderNo: string
  receivingDate: string
  locationId: EntityId
}

export interface StockInItemFormValues {
  medicineId: string
  manufacturerName: string
  batchNo: string
  manufacturingDate: string
  expiryDate: string
  quantity: string
  unitPrice: string
}

export interface StockInItemFormErrors {
  medicineId?: string
  manufacturerName?: string
  batchNo?: string
  manufacturingDate?: string
  expiryDate?: string
  quantity?: string
  unitPrice?: string
  form?: string
}

export interface StockInMasterFormErrors {
  purchaseOrderNo?: string
  receivingDate?: string
}

export function emptyItemForm(): StockInItemFormValues {
  return {
    medicineId: '',
    manufacturerName: '',
    batchNo: '',
    manufacturingDate: '',
    expiryDate: '',
    quantity: '',
    unitPrice: '',
  }
}

export function batchIdentityKey(medicineId: string, batchNo: string): string {
  return `${medicineId}::${batchNo.trim().toLowerCase()}`
}

export function validateMaster(
  master: StockInDraftMaster,
): StockInMasterFormErrors {
  const errors: StockInMasterFormErrors = {}
  if (!master.purchaseOrderNo.trim()) {
    errors.purchaseOrderNo = 'Purchase order number is required.'
  }
  if (!master.receivingDate) {
    errors.receivingDate = 'Receiving date is required.'
  }
  return errors
}

export function validateItemForm(
  values: StockInItemFormValues,
  options?: { pendingKeys?: Set<string>; editingId?: string; pendingItems?: StockInDraftItem[] },
): StockInItemFormErrors {
  const errors: StockInItemFormErrors = {}

  if (!values.medicineId) errors.medicineId = 'Medicine is required.'
  if (!values.manufacturerName.trim()) errors.manufacturerName = 'Manufacturer name is required.'
  if (!values.batchNo.trim()) errors.batchNo = 'Batch number is required.'
  if (!values.manufacturingDate) errors.manufacturingDate = 'Manufacturing date is required.'
  if (!values.expiryDate) errors.expiryDate = 'Expiry date is required.'

  if (
    values.manufacturingDate &&
    values.expiryDate &&
    values.expiryDate < values.manufacturingDate
  ) {
    errors.expiryDate = 'Expiry date cannot be before manufacturing date.'
  }

  const quantity = Number(values.quantity)
  if (values.quantity.trim() === '' || Number.isNaN(quantity)) {
    errors.quantity = 'Quantity is required.'
  } else if (quantity <= 0) {
    errors.quantity = 'Quantity must be greater than zero.'
  }

  const unitPrice = Number(values.unitPrice)
  if (values.unitPrice.trim() === '' || Number.isNaN(unitPrice)) {
    errors.unitPrice = 'Unit price is required.'
  } else if (unitPrice < 0) {
    errors.unitPrice = 'Unit price cannot be negative.'
  }

  if (values.medicineId && values.batchNo.trim()) {
    const key = batchIdentityKey(values.medicineId, values.batchNo)
    const duplicatePending = options?.pendingItems?.some(
      (item) =>
        item.id !== options.editingId &&
        batchIdentityKey(item.medicineId, item.batchNo) === key,
    )
    if (duplicatePending || options?.pendingKeys?.has(key)) {
      errors.batchNo = 'This medicine + batch is already in pending medicines.'
    }
  }

  return errors
}

export function formValuesToDraftItem(
  values: StockInItemFormValues,
  medicineDisplayName: string,
  existingId?: string,
): StockInDraftItem {
  const quantity = Number(values.quantity)
  const unitPrice = Number(values.unitPrice)
  return {
    id: existingId ?? createEntityId('pend'),
    medicineId: values.medicineId,
    medicineDisplayName,
    manufacturerName: values.manufacturerName.trim(),
    batchNo: values.batchNo.trim(),
    manufacturingDate: values.manufacturingDate,
    expiryDate: values.expiryDate,
    quantity,
    unitPrice,
    totalPrice: calculateLineTotal(quantity, unitPrice),
  }
}

export function draftItemToFormValues(item: StockInDraftItem): StockInItemFormValues {
  return {
    medicineId: item.medicineId,
    manufacturerName: item.manufacturerName,
    batchNo: item.batchNo,
    manufacturingDate: item.manufacturingDate,
    expiryDate: item.expiryDate,
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice),
  }
}
