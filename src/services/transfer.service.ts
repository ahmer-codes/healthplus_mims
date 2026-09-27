import { medicineRepository, transferRepository } from '@/repositories'
import type { CreateStockTransferInput, StockTransfer, UserProfile } from '@/types'
import { isPositiveQuantity } from '@/utils'
import { batchService } from './batch.service'
import { DomainError } from './errors'
import { locationService } from './location.service'
import { reportService } from './report.service'
import {
  validateTransferMaster,
  type TransferDraftItem,
  type TransferDraftMaster,
} from './transfer-validation'

export interface FinalizeTransferResult {
  transfer: StockTransfer
  pdfBlob: Blob
}

async function assertTransferItems(
  items: TransferDraftItem[],
  fromLocationId: string,
): Promise<void> {
  if (!items.length) {
    throw new DomainError('transfer/invalid', 'Add at least one medicine before finalizing.')
  }

  const byBatch = new Map<string, number>()
  for (const item of items) {
    byBatch.set(item.batchId, (byBatch.get(item.batchId) ?? 0) + item.quantity)
  }

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]!
    const label = `Item ${i + 1}`
    if (!item.medicineId || !item.batchId) {
      throw new DomainError('transfer/invalid', `${label}: medicine and batch are required.`)
    }
    if (!isPositiveQuantity(item.quantity)) {
      throw new DomainError('transfer/invalid', `${label}: quantity must be greater than zero.`)
    }

    const batch = await batchService.requireAllocatable(item.batchId)
    if (batch.medicineId !== item.medicineId) {
      throw new DomainError('transfer/batch-mismatch', `${label}: batch does not match medicine.`)
    }
    if (batch.locationId !== fromLocationId) {
      throw new DomainError(
        'transfer/location-mismatch',
        `${label}: batch is not at the source location.`,
      )
    }
  }

  for (const [batchId, totalQty] of byBatch) {
    const batch = await batchService.requireAllocatable(batchId)
    if (batch.remainingQuantity < totalQty) {
      throw new DomainError(
        'transfer/insufficient',
        `Insufficient remaining quantity on batch ${batch.batchNo}.`,
      )
    }
  }
}

/**
 * Transfer business rules. Inventory movement runs inside
 * transferRepository.finalize (Firestore transaction).
 */
export const transferService = {
  async list(): Promise<StockTransfer[]> {
    return transferRepository.list()
  },

  async getById(id: string): Promise<StockTransfer | null> {
    return transferRepository.getById(id)
  },

  /**
   * Finalize staged transfer cart:
   * validate → atomic transfer + batch moves → PDF.
   */
  async finalize(input: {
    master: TransferDraftMaster
    items: TransferDraftItem[]
    createdBy: UserProfile
  }): Promise<FinalizeTransferResult> {
    const masterErrors = validateTransferMaster(input.master)
    if (
      masterErrors.date ||
      masterErrors.voucherNo ||
      masterErrors.fromLocationId ||
      masterErrors.toLocationId
    ) {
      throw new DomainError(
        'transfer/invalid',
        masterErrors.date ||
          masterErrors.voucherNo ||
          masterErrors.fromLocationId ||
          masterErrors.toLocationId ||
          'Master information is incomplete.',
      )
    }

    const fromLocation = await locationService.requireById(input.master.fromLocationId)
    const toLocation = await locationService.requireById(input.master.toLocationId)
    await assertTransferItems(input.items, input.master.fromLocationId)

    const payload: CreateStockTransferInput = {
      date: input.master.date,
      voucherNo: input.master.voucherNo.trim(),
      fromLocationId: input.master.fromLocationId,
      toLocationId: input.master.toLocationId,
      createdBy: input.createdBy.id,
      status: 'posted',
      items: input.items.map((item) => ({
        medicineId: item.medicineId,
        batchId: item.batchId,
        quantity: item.quantity,
      })),
    }

    const transfer = await transferRepository.finalize(payload)

    const medicines = await medicineRepository.list()
    const medicinesById = Object.fromEntries(medicines.map((medicine) => [medicine.id, medicine]))
    const batchLabels: Record<string, string> = {}
    for (const item of input.items) {
      batchLabels[item.batchId] = item.batchNo
    }

    const pdfBlob = await reportService.generateStockTransferPdf({
      transfer,
      fromLocation,
      toLocation,
      medicinesById,
      batchLabels,
      preparedBy: input.createdBy,
    })

    await reportService.createForTransfer(transfer.id, input.createdBy.id)

    return { transfer, pdfBlob }
  },
}
