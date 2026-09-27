import { allocationRepository, medicineRepository } from '@/repositories'
import type { Allocation, CreateAllocationInput, UserProfile } from '@/types'
import { isPositiveQuantity } from '@/utils'
import { allocationPdfService } from './allocation-pdf.service'
import {
  validateAllocationMaster,
  type AllocationDraftItem,
  type AllocationDraftMaster,
} from './allocation-validation'
import { batchService } from './batch.service'
import { DomainError } from './errors'
import { locationService } from './location.service'

export interface FinalizeAllocationResult {
  allocation: Allocation
  pdfBlob: Blob
}

async function assertAllocatableItems(items: AllocationDraftItem[]): Promise<void> {
  if (!items.length) {
    throw new DomainError('allocation/invalid', 'Add at least one medicine before finalizing.')
  }

  const byBatch = new Map<string, number>()
  for (const item of items) {
    byBatch.set(item.batchId, (byBatch.get(item.batchId) ?? 0) + item.quantity)
  }

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]!
    const label = `Item ${i + 1}`
    if (!item.medicineId || !item.batchId) {
      throw new DomainError('allocation/invalid', `${label}: medicine and batch are required.`)
    }
    if (!isPositiveQuantity(item.quantity)) {
      throw new DomainError('allocation/invalid', `${label}: quantity must be greater than zero.`)
    }

    const batch = await batchService.requireAllocatable(item.batchId)
    if (batch.medicineId !== item.medicineId) {
      throw new DomainError('allocation/batch-mismatch', `${label}: batch does not match medicine.`)
    }
  }

  for (const [batchId, totalQty] of byBatch) {
    const batch = await batchService.requireAllocatable(batchId)
    if (batch.remainingQuantity < totalQty) {
      throw new DomainError(
        'allocation/insufficient',
        `Insufficient remaining quantity on batch ${batch.batchNo}.`,
      )
    }
  }
}

/**
 * Allocation business rules. Inventory deduction runs inside
 * allocationRepository.finalize (Firestore transaction).
 */
export const allocationService = {
  async list(): Promise<Allocation[]> {
    return allocationRepository.list()
  },

  async getById(id: string): Promise<Allocation | null> {
    return allocationRepository.getById(id)
  },

  /**
   * Finalize staged allocation cart:
   * validate → atomic allocation + batch deductions → PDF.
   */
  async finalize(input: {
    master: AllocationDraftMaster
    items: AllocationDraftItem[]
    createdBy: UserProfile
  }): Promise<FinalizeAllocationResult> {
    const masterErrors = validateAllocationMaster(input.master)
    if (masterErrors.date || masterErrors.voucherNo || masterErrors.destinationLocationId) {
      throw new DomainError(
        'allocation/invalid',
        masterErrors.date ||
          masterErrors.voucherNo ||
          masterErrors.destinationLocationId ||
          'Master information is incomplete.',
      )
    }

    const destination = await locationService.requireById(input.master.destinationLocationId)
    await assertAllocatableItems(input.items)

    const payload: CreateAllocationInput = {
      date: input.master.date,
      voucherNo: input.master.voucherNo.trim(),
      destinationLocationId: input.master.destinationLocationId,
      receiverName: input.master.receiverName.trim(),
      receiverDesignation: input.master.receiverDesignation.trim(),
      createdBy: input.createdBy.id,
      status: 'posted',
      items: input.items.map((item) => ({
        medicineId: item.medicineId,
        batchId: item.batchId,
        quantity: item.quantity,
      })),
    }

    const allocation = await allocationRepository.finalize(payload)

    const medicines = await medicineRepository.list()
    const medicinesById = Object.fromEntries(medicines.map((medicine) => [medicine.id, medicine]))

    const batchLabels: Record<string, string> = {}
    for (const item of input.items) {
      batchLabels[item.batchId] = item.batchNo
    }

    const pdfBlob = await allocationPdfService.generate({
      allocation,
      destination,
      medicinesById,
      batchLabels,
      preparedBy: input.createdBy,
    })

    return { allocation, pdfBlob }
  },
}
