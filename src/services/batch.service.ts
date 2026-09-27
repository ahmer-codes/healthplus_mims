import {
  allocationRepository,
  batchRepository,
  medicineRepository,
  transferRepository,
} from '@/repositories'
import { INVENTORY_THRESHOLDS } from '@/constants'
import type {
  BatchBoardSummary,
  BatchExpiryFilter,
  BatchFilter,
  BatchStatus,
  CreateBatchInput,
  ExpiryStatus,
  Medicine,
  MedicineBatch,
  UpdateBatchInput,
} from '@/types'
import {
  addDays,
  calculateLineTotal,
  deriveBatchStatus,
  getDaysUntilExpiry,
  getExpiryStatus,
  isPositiveQuantity,
  refreshBatchStatus,
  summarizeStockLevels,
  sumRemainingQuantity,
  todayDateString,
} from '@/utils'
import { DomainError } from './errors'
import { locationService } from './location.service'

function normalizeBatchInput(input: CreateBatchInput): CreateBatchInput {
  if (!input.medicineId) throw new DomainError('batch/invalid', 'Medicine is required.')
  if (!input.locationId) throw new DomainError('batch/invalid', 'Location is required.')
  if (!input.batchNo?.trim()) throw new DomainError('batch/invalid', 'Batch number is required.')
  if (!input.manufacturerName?.trim()) {
    throw new DomainError('batch/invalid', 'Manufacturer name is required.')
  }
  if (!isPositiveQuantity(input.quantityReceived)) {
    throw new DomainError('batch/invalid', 'Quantity received must be greater than zero.')
  }
  if (!Number.isFinite(input.unitPrice) || input.unitPrice < 0) {
    throw new DomainError('batch/invalid', 'Unit price must be zero or greater.')
  }
  if (!input.expiryDate) throw new DomainError('batch/invalid', 'Expiry date is required.')
  if (!input.receivingDate) throw new DomainError('batch/invalid', 'Receiving date is required.')

  const remainingQuantity = input.remainingQuantity ?? input.quantityReceived
  const totalPrice = input.totalPrice ?? calculateLineTotal(input.quantityReceived, input.unitPrice)
  const status =
    input.status ??
    deriveBatchStatus({
      remainingQuantity,
      expiryDate: input.expiryDate,
    })

  return {
    ...input,
    batchNo: input.batchNo.trim(),
    manufacturerName: input.manufacturerName.trim(),
    purchaseOrderNo: input.purchaseOrderNo.trim(),
    remainingQuantity,
    totalPrice,
    status,
  }
}

export interface BatchBoardRow {
  batch: MedicineBatch
  medicine: Medicine
  locationName: string
  locationCode: string
  expiryStatus: ExpiryStatus
  daysUntilExpiry: number | null
}

export interface BatchManagementQuery {
  query?: string
  medicineId?: string
  batchNo?: string
  locationId?: string
  status?: BatchStatus | ''
  manufacturer?: string
  expiry?: BatchExpiryFilter
  includeDeleted?: boolean
  sortBy?:
    | 'medicine'
    | 'batchNo'
    | 'expiryDate'
    | 'remainingQuantity'
    | 'status'
    | 'location'
    | 'manufacturer'
  sortDir?: 'asc' | 'desc'
}

export interface BatchEditInput {
  manufacturerName?: string
  batchNo?: string
  manufacturingDate?: string
  expiryDate?: string
  remainingQuantity?: number
  unitPrice?: number
  locationId?: string
}

export type SensitiveBatchField =
  | 'batchNo'
  | 'remainingQuantity'
  | 'unitPrice'
  | 'locationId'
  | 'expiryDate'
  | 'manufacturingDate'

export interface BatchEditPreview {
  input: UpdateBatchInput
  sensitiveFields: SensitiveBatchField[]
  requiresConfirmation: boolean
}

function matchesExpiryFilter(batch: MedicineBatch, expiry?: BatchExpiryFilter): boolean {
  if (!expiry || expiry === 'all') return true
  const status = getExpiryStatus(batch.expiryDate)
  if (expiry === 'expiring_soon') {
    const days = getDaysUntilExpiry(batch.expiryDate)
    return (
      days !== null &&
      days >= 0 &&
      days <= INVENTORY_THRESHOLDS.expiringSoonDays &&
      batch.status !== 'expired'
    )
  }
  return status === expiry
}

/**
 * Batch domain service. inventory eligibility, hold, edit, and soft-delete rules.
 */
export const batchService = {
  async list(filter?: BatchFilter): Promise<MedicineBatch[]> {
    const batches = await batchRepository.list(filter)
    return batches.map((batch) => refreshBatchStatus(batch)).filter((batch) => !batch.deletedAt)
  },

  async getById(id: string): Promise<MedicineBatch | null> {
    const batch = await batchRepository.getById(id)
    return batch ? refreshBatchStatus(batch) : null
  },

  async listByMedicine(medicineId: string): Promise<MedicineBatch[]> {
    return this.list({ medicineId })
  },

  /** True when a batch may be issued (available, in-date, remaining > 0, not deleted). */
  isAllocatable(batch: MedicineBatch): boolean {
    if (batch.deletedAt) return false
    const refreshed = refreshBatchStatus(batch)
    return refreshed.status === 'available' && refreshed.remainingQuantity > 0
  },

  async requireAllocatable(batchId: string): Promise<MedicineBatch> {
    const batch = await this.getById(batchId)
    if (!batch) throw new DomainError('batch/not-found', 'Batch not found.')
    if (!this.isAllocatable(batch)) {
      throw new DomainError(
        'batch/unavailable',
        `Batch ${batch.batchNo} is not available for allocation (${batch.status}).`,
      )
    }
    return batch
  },

  /**
   * Eligible batches for allocation. excludes hold, expired, depleted, deleted, and zero remaining.
   * Sorted FEFO (earliest expiry first).
   */
  async getAvailableForMedicine(
    medicineId: string,
    locationId?: string,
  ): Promise<MedicineBatch[]> {
    const batches = await this.list({
      medicineId,
      locationId,
    })
    return batches
      .filter((batch) => this.isAllocatable(batch))
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))
  },

  async listAllocatableMedicines(locationId?: string): Promise<
    Array<{ medicine: Medicine; availableQty: number }>
  > {
    const [medicines, batches] = await Promise.all([
      medicineRepository.list({ isActive: true }),
      this.list(locationId ? { locationId } : undefined),
    ])

    const qtyByMedicine = new Map<string, number>()
    for (const batch of batches) {
      if (!this.isAllocatable(batch)) continue
      qtyByMedicine.set(
        batch.medicineId,
        (qtyByMedicine.get(batch.medicineId) ?? 0) + batch.remainingQuantity,
      )
    }

    return medicines
      .filter((medicine) => (qtyByMedicine.get(medicine.id) ?? 0) > 0)
      .map((medicine) => ({
        medicine,
        availableQty: qtyByMedicine.get(medicine.id) ?? 0,
      }))
      .sort((a, b) => a.medicine.displayName.localeCompare(b.medicine.displayName))
  },

  async create(input: CreateBatchInput): Promise<MedicineBatch> {
    const medicine = await medicineRepository.getById(input.medicineId)
    if (!medicine || !medicine.isActive) {
      throw new DomainError('batch/invalid-medicine', 'Selected medicine variant is not available.')
    }
    return batchRepository.create(normalizeBatchInput(input))
  },

  async createMany(inputs: CreateBatchInput[]): Promise<MedicineBatch[]> {
    const normalized = inputs.map(normalizeBatchInput)
    for (const input of normalized) {
      const medicine = await medicineRepository.getById(input.medicineId)
      if (!medicine || !medicine.isActive) {
        throw new DomainError(
          'batch/invalid-medicine',
          `Medicine variant not available: ${input.medicineId}`,
        )
      }
    }
    return batchRepository.createMany(normalized)
  },

  async update(id: string, input: UpdateBatchInput): Promise<MedicineBatch> {
    const existing = await batchRepository.getById(id)
    if (!existing || existing.deletedAt) {
      throw new DomainError('batch/not-found', 'Batch not found.')
    }

    const remainingQuantity = input.remainingQuantity ?? existing.remainingQuantity
    if (remainingQuantity < 0) {
      throw new DomainError('batch/invalid', 'Remaining quantity cannot be negative.')
    }

    const expiryDate = input.expiryDate ?? existing.expiryDate
    if (
      input.manufacturingDate &&
      expiryDate &&
      expiryDate < input.manufacturingDate
    ) {
      throw new DomainError('batch/invalid', 'Expiry date cannot be before manufacturing date.')
    }
    if (
      !input.manufacturingDate &&
      input.expiryDate &&
      input.expiryDate < existing.manufacturingDate
    ) {
      throw new DomainError('batch/invalid', 'Expiry date cannot be before manufacturing date.')
    }

    if (input.unitPrice !== undefined && (!Number.isFinite(input.unitPrice) || input.unitPrice < 0)) {
      throw new DomainError('batch/invalid', 'Unit price must be zero or greater.')
    }

    if (input.locationId) {
      await locationService.requireById(input.locationId)
    }

    if (input.batchNo?.trim()) {
      const clash = await batchRepository.findByMedicineAndBatchNo(
        existing.medicineId,
        input.batchNo,
      )
      if (clash && clash.id !== id && !clash.deletedAt) {
        throw new DomainError(
          'batch/duplicate',
          `Batch ${input.batchNo.trim()} already exists for this medicine.`,
        )
      }
    }

    const status =
      input.status ??
      deriveBatchStatus({
        remainingQuantity,
        expiryDate,
        currentStatus: existing.status,
      })

    return batchRepository.update(id, {
      ...input,
      remainingQuantity,
      status,
      totalPrice:
        input.unitPrice !== undefined
          ? calculateLineTotal(existing.quantityReceived, input.unitPrice)
          : input.totalPrice,
    })
  },

  /** Preview edit payload and flag sensitive field changes that need confirmation. */
  previewEdit(existing: MedicineBatch, input: BatchEditInput): BatchEditPreview {
    const sensitiveFields: SensitiveBatchField[] = []
    const next: UpdateBatchInput = {}

    if (
      input.manufacturerName !== undefined &&
      input.manufacturerName.trim() !== existing.manufacturerName
    ) {
      next.manufacturerName = input.manufacturerName.trim()
    }
    if (input.batchNo !== undefined && input.batchNo.trim() !== existing.batchNo) {
      next.batchNo = input.batchNo.trim()
      sensitiveFields.push('batchNo')
    }
    if (
      input.manufacturingDate !== undefined &&
      input.manufacturingDate !== existing.manufacturingDate
    ) {
      next.manufacturingDate = input.manufacturingDate
      sensitiveFields.push('manufacturingDate')
    }
    if (input.expiryDate !== undefined && input.expiryDate !== existing.expiryDate) {
      next.expiryDate = input.expiryDate
      sensitiveFields.push('expiryDate')
    }
    if (
      input.remainingQuantity !== undefined &&
      input.remainingQuantity !== existing.remainingQuantity
    ) {
      next.remainingQuantity = input.remainingQuantity
      sensitiveFields.push('remainingQuantity')
    }
    if (input.unitPrice !== undefined && input.unitPrice !== existing.unitPrice) {
      next.unitPrice = input.unitPrice
      sensitiveFields.push('unitPrice')
    }
    if (input.locationId !== undefined && input.locationId !== existing.locationId) {
      next.locationId = input.locationId
      sensitiveFields.push('locationId')
    }

    return {
      input: next,
      sensitiveFields,
      requiresConfirmation: sensitiveFields.length > 0,
    }
  },

  async applyEdit(id: string, input: BatchEditInput, confirmed = false): Promise<MedicineBatch> {
    const existing = await this.getById(id)
    if (!existing || existing.deletedAt) {
      throw new DomainError('batch/not-found', 'Batch not found.')
    }

    const preview = this.previewEdit(existing, input)
    if (!Object.keys(preview.input).length) {
      return existing
    }
    if (preview.requiresConfirmation && !confirmed) {
      throw new DomainError(
        'batch/confirm-required',
        `Confirm sensitive changes: ${preview.sensitiveFields.join(', ')}.`,
      )
    }
    return this.update(id, preview.input)
  },

  async setHold(id: string, hold: boolean): Promise<MedicineBatch> {
    const existing = await this.getById(id)
    if (!existing || existing.deletedAt) {
      throw new DomainError('batch/not-found', 'Batch not found.')
    }

    const refreshed = refreshBatchStatus(existing)
    if (refreshed.status === 'expired' || refreshed.status === 'depleted') {
      throw new DomainError(
        'batch/invalid-status',
        `Cannot ${hold ? 'hold' : 'release'} a ${refreshed.status} batch.`,
      )
    }

    if (hold) {
      if (refreshed.status === 'hold') return refreshed
      return this.update(id, { status: 'hold' })
    }

    if (refreshed.status !== 'hold') return refreshed
    return this.update(id, { status: 'available' })
  },

  async hasHistoricalReferences(batchId: string): Promise<boolean> {
    const [allocations, transfers] = await Promise.all([
      allocationRepository.list(),
      transferRepository.list(),
    ])
    const inAllocations = allocations.some((doc) =>
      doc.items.some((item) => item.batchId === batchId),
    )
    if (inAllocations) return true
    return transfers.some((doc) => doc.items.some((item) => item.batchId === batchId))
  },

  /**
   * Soft-delete when history exists; hard-delete only when the batch has never been used.
   * Soft-deleted batches stay resolvable for historical documents.
   */
  async remove(id: string): Promise<{ mode: 'soft' | 'hard' }> {
    const existing = await this.getById(id)
    if (!existing || existing.deletedAt) {
      throw new DomainError('batch/not-found', 'Batch not found.')
    }

    const hasHistory = await this.hasHistoricalReferences(id)
    if (hasHistory) {
      await batchRepository.update(id, { deletedAt: new Date().toISOString(), status: existing.status })
      return { mode: 'soft' }
    }

    if (batchRepository.remove) {
      await batchRepository.remove(id)
    } else {
      await batchRepository.update(id, { deletedAt: new Date().toISOString() })
      return { mode: 'soft' }
    }
    return { mode: 'hard' }
  },

  summarizeBoard(batches: MedicineBatch[]): BatchBoardSummary {
    const refreshed = batches.map((batch) => refreshBatchStatus(batch)).filter((b) => !b.deletedAt)
    const soonLimit = INVENTORY_THRESHOLDS.expiringSoonDays

    return {
      total: refreshed.length,
      available: refreshed.filter((b) => b.status === 'available').length,
      hold: refreshed.filter((b) => b.status === 'hold').length,
      expired: refreshed.filter((b) => b.status === 'expired').length,
      depleted: refreshed.filter((b) => b.status === 'depleted').length,
      expiringSoon: refreshed.filter((b) => {
        if (b.status === 'expired' || b.status === 'depleted') return false
        const days = getDaysUntilExpiry(b.expiryDate)
        return days !== null && days >= 0 && days <= soonLimit
      }).length,
    }
  },

  async getBoardSummary(): Promise<BatchBoardSummary> {
    const batches = await this.list()
    return this.summarizeBoard(batches)
  },

  async listBoard(query: BatchManagementQuery = {}): Promise<BatchBoardRow[]> {
    const filter: BatchFilter = {
      medicineId: query.medicineId || undefined,
      locationId: query.locationId || undefined,
      manufacturer: query.manufacturer || undefined,
      batchNo: query.batchNo || undefined,
      query: query.query || undefined,
      status: query.status || undefined,
      includeDeleted: query.includeDeleted ?? false,
    }

    const [batches, medicines, locations] = await Promise.all([
      batchRepository.list(filter),
      medicineRepository.list(),
      locationService.list(false),
    ])

    const medicineById = Object.fromEntries(medicines.map((m) => [m.id, m]))
    const locationById = Object.fromEntries(locations.map((l) => [l.id, l]))

    let rows: BatchBoardRow[] = batches
      .map((batch) => refreshBatchStatus(batch))
      .filter((batch) => (query.includeDeleted ? true : !batch.deletedAt))
      .filter((batch) => matchesExpiryFilter(batch, query.expiry))
      .map((batch) => {
        const medicine = medicineById[batch.medicineId]
        const location = locationById[batch.locationId]
        return {
          batch,
          medicine: medicine ?? {
            id: batch.medicineId,
            genericName: 'Unknown',
            strength: '',
            dosageForm: '',
            volume: '',
            displayName: batch.medicineId,
            isActive: false,
            createdAt: '',
            updatedAt: '',
          },
          locationName: location?.name ?? batch.locationId,
          locationCode: location?.code ?? '',
          expiryStatus: getExpiryStatus(batch.expiryDate),
          daysUntilExpiry: getDaysUntilExpiry(batch.expiryDate),
        }
      })

    // Free-text also matches medicine display fields
    if (query.query?.trim()) {
      const q = query.query.trim().toLowerCase()
      rows = rows.filter((row) => {
        const haystack = [
          row.medicine.displayName,
          row.medicine.genericName,
          row.medicine.strength,
          row.medicine.dosageForm,
          row.batch.batchNo,
          row.batch.manufacturerName,
          row.locationName,
        ]
          .join(' ')
          .toLowerCase()
        return haystack.includes(q)
      })
    }

    const sortBy = query.sortBy ?? 'expiryDate'
    const dir = query.sortDir === 'desc' ? -1 : 1
    rows.sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case 'medicine':
          cmp = a.medicine.displayName.localeCompare(b.medicine.displayName)
          break
        case 'batchNo':
          cmp = a.batch.batchNo.localeCompare(b.batch.batchNo)
          break
        case 'remainingQuantity':
          cmp = a.batch.remainingQuantity - b.batch.remainingQuantity
          break
        case 'status':
          cmp = a.batch.status.localeCompare(b.batch.status)
          break
        case 'location':
          cmp = a.locationName.localeCompare(b.locationName)
          break
        case 'manufacturer':
          cmp = a.batch.manufacturerName.localeCompare(b.batch.manufacturerName)
          break
        case 'expiryDate':
        default:
          cmp = a.batch.expiryDate.localeCompare(b.batch.expiryDate)
          break
      }
      return cmp * dir
    })

    return rows
  },

  async listManufacturers(): Promise<string[]> {
    const batches = await this.list()
    return [...new Set(batches.map((b) => b.manufacturerName).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b),
    )
  },

  /** Convenience for filter UIs. batches expiring on/before a horizon date. */
  expiringBeforeHorizon(days = INVENTORY_THRESHOLDS.expiringSoonDays): string {
    return addDays(todayDateString(), days)
  },

  async deductQuantity(id: string, quantity: number): Promise<MedicineBatch> {
    if (!isPositiveQuantity(quantity)) {
      throw new DomainError('batch/invalid', 'Deduction quantity must be greater than zero.')
    }
    await this.requireAllocatable(id)
    try {
      return await batchRepository.deductQuantity(id, quantity)
    } catch (error) {
      throw new DomainError(
        'batch/insufficient',
        error instanceof Error ? error.message : 'Unable to deduct batch quantity.',
      )
    }
  },

  async transferQuantity(
    sourceBatchId: string,
    toLocationId: string,
    quantity: number,
  ): Promise<{
    source: MedicineBatch
    destination: MedicineBatch
    destinationCreated: boolean
  }> {
    if (!isPositiveQuantity(quantity)) {
      throw new DomainError('batch/invalid', 'Transfer quantity must be greater than zero.')
    }
    const source = await this.requireAllocatable(sourceBatchId)
    if (source.locationId === toLocationId) {
      throw new DomainError('batch/invalid', 'Cannot transfer to the same location.')
    }
    try {
      return await batchRepository.transferQuantity(sourceBatchId, toLocationId, quantity)
    } catch (error) {
      throw new DomainError(
        'batch/transfer-failed',
        error instanceof Error ? error.message : 'Unable to transfer batch quantity.',
      )
    }
  },

  summarize(batches: MedicineBatch[], medicineId: string, locationId?: string) {
    return summarizeStockLevels(batches, medicineId, locationId)
  },

  totalOnHand(batches: MedicineBatch[], medicineId: string, locationId?: string) {
    return sumRemainingQuantity(batches, {
      medicineId,
      locationId,
      statuses: ['available', 'hold'],
    })
  },
}
