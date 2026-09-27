import { batchRepository, medicineRepository, stockInRepository } from '@/repositories'
import type { CreateStockInInput, StockIn, UserProfile } from '@/types'
import { calculateLineTotal, isPositiveQuantity } from '@/utils'
import { DomainError } from './errors'
import { locationService } from './location.service'
import { stockInPdfService } from './stock-in-pdf.service'
import {
  batchIdentityKey,
  type StockInDraftItem,
  type StockInDraftMaster,
  validateMaster,
} from './stock-in-validation'

export interface FinalizeStockInResult {
  stockIn: StockIn
  pdfBlob: Blob
}

function assertDates(item: StockInDraftItem, index: number): void {
  const label = `Item ${index + 1}`
  if (!item.manufacturingDate) {
    throw new DomainError('stock-in/invalid', `${label}: manufacturing date is required.`)
  }
  if (!item.expiryDate) {
    throw new DomainError('stock-in/invalid', `${label}: expiry date is required.`)
  }
  if (item.expiryDate < item.manufacturingDate) {
    throw new DomainError(
      'stock-in/invalid',
      `${label}: expiry date cannot be before manufacturing date.`,
    )
  }
}

/**
 * Stock-in business rules. Inventory writes go through stockInRepository.finalize
 * (Firestore transaction: document + batches).
 */
export const stockInService = {
  calculateItemTotal(quantity: number, unitPrice: number): number {
    return calculateLineTotal(quantity, unitPrice)
  },

  calculateDocumentTotal(items: Array<{ quantity: number; unitPrice: number }>): number {
    return items.reduce((sum, item) => sum + calculateLineTotal(item.quantity, item.unitPrice), 0)
  },

  async list(): Promise<StockIn[]> {
    return stockInRepository.list()
  },

  async getById(id: string): Promise<StockIn | null> {
    return stockInRepository.getById(id)
  },

  async assertNoDuplicateBatches(items: StockInDraftItem[]): Promise<void> {
    const seen = new Set<string>()
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i]!
      const key = batchIdentityKey(item.medicineId, item.batchNo)
      if (seen.has(key)) {
        throw new DomainError(
          'stock-in/duplicate-batch',
          `Duplicate medicine + batch in pending list: ${item.medicineDisplayName} / ${item.batchNo}`,
        )
      }
      seen.add(key)

      const existing = await batchRepository.findByMedicineAndBatchNo(
        item.medicineId,
        item.batchNo,
      )
      if (existing) {
        throw new DomainError(
          'stock-in/duplicate-batch',
          `Batch ${item.batchNo} for ${item.medicineDisplayName} already exists in inventory.`,
        )
      }
    }
  },

  /**
   * Finalize staged receiving cart:
   * validate → atomic stock-in + batches → PDF.
   */
  async finalize(input: {
    master: StockInDraftMaster
    items: StockInDraftItem[]
    createdBy: UserProfile
  }): Promise<FinalizeStockInResult> {
    const masterErrors = validateMaster(input.master)
    if (masterErrors.purchaseOrderNo || masterErrors.receivingDate) {
      throw new DomainError(
        'stock-in/invalid',
        masterErrors.purchaseOrderNo || masterErrors.receivingDate || 'Master information is incomplete.',
      )
    }
    if (!input.items.length) {
      throw new DomainError('stock-in/invalid', 'Add at least one medicine before finalizing.')
    }

    await locationService.requireById(input.master.locationId)

    for (let i = 0; i < input.items.length; i += 1) {
      const item = input.items[i]!
      assertDates(item, i)
      if (!item.medicineId) {
        throw new DomainError('stock-in/invalid', `Item ${i + 1}: medicine is required.`)
      }
      if (!item.manufacturerName.trim()) {
        throw new DomainError('stock-in/invalid', `Item ${i + 1}: manufacturer is required.`)
      }
      if (!item.batchNo.trim()) {
        throw new DomainError('stock-in/invalid', `Item ${i + 1}: batch number is required.`)
      }
      if (!isPositiveQuantity(item.quantity)) {
        throw new DomainError('stock-in/invalid', `Item ${i + 1}: quantity must be greater than zero.`)
      }
      if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
        throw new DomainError('stock-in/invalid', `Item ${i + 1}: unit price is invalid.`)
      }

      const medicine = await medicineRepository.getById(item.medicineId)
      if (!medicine?.isActive) {
        throw new DomainError(
          'stock-in/invalid-medicine',
          `Item ${i + 1}: medicine variant is not available.`,
        )
      }
    }

    await this.assertNoDuplicateBatches(input.items)

    const payload: CreateStockInInput = {
      purchaseOrderNo: input.master.purchaseOrderNo.trim(),
      receivingDate: input.master.receivingDate,
      locationId: input.master.locationId,
      createdBy: input.createdBy.id,
      status: 'posted',
      items: input.items.map((item) => ({
        medicineId: item.medicineId,
        manufacturerName: item.manufacturerName,
        batchNo: item.batchNo,
        manufacturingDate: item.manufacturingDate,
        expiryDate: item.expiryDate,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    }

    const { stockIn } = await stockInRepository.finalize(payload)

    const medicines = await medicineRepository.list()
    const medicinesById = Object.fromEntries(medicines.map((medicine) => [medicine.id, medicine]))

    const pdfBlob = await stockInPdfService.generate({
      stockIn,
      medicinesById,
      preparedBy: input.createdBy,
    })

    return { stockIn, pdfBlob }
  },
}
