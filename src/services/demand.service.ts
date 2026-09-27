import { DEMAND_PRIORITIES, DEMAND_STATUSES } from '@/constants'
import { batchRepository, demandRepository, medicineRepository } from '@/repositories'
import type {
  CreateDemandInput,
  DemandFilter,
  DemandPriority,
  DemandStatus,
  Medicine,
  MedicineDemand,
  UpdateDemandInput,
  UpdateDemandStatusInput,
} from '@/types'
import { isPositiveQuantity, summarizeStockLevels, todayDateString } from '@/utils'
import { DomainError } from './errors'

const ALLOWED_TRANSITIONS: Record<DemandStatus, DemandStatus[]> = {
  pending: ['approved', 'cancelled'],
  approved: ['fulfilled', 'cancelled'],
  fulfilled: [],
  cancelled: [],
}

const PRIORITY_RANK: Record<DemandPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
}

export interface DemandBoardRow {
  demand: MedicineDemand
  medicine: Medicine
  /** Allocatable on-hand quantity across locations (informational). */
  availableQuantity: number
  /** Total remaining including hold/expired lots (informational). */
  totalRemaining: number
  nextStatuses: DemandStatus[]
  canEdit: boolean
}

export interface DemandSummary {
  total: number
  pending: number
  approved: number
  fulfilled: number
  cancelled: number
  urgentOpen: number
}

function validateDemandFields(input: {
  medicineId: string
  requestedQuantity: number
  requestingDepartment: string
  requestedBy: string
  requestDate?: string
}): void {
  if (!input.medicineId) {
    throw new DomainError('demand/invalid', 'Medicine is required.')
  }
  if (!isPositiveQuantity(input.requestedQuantity)) {
    throw new DomainError('demand/invalid', 'Requested quantity must be greater than zero.')
  }
  if (!input.requestingDepartment?.trim()) {
    throw new DomainError('demand/invalid', 'Requesting department is required.')
  }
  if (!input.requestedBy?.trim()) {
    throw new DomainError('demand/invalid', 'Requester name is required.')
  }
  if (input.requestDate !== undefined && !input.requestDate) {
    throw new DomainError('demand/invalid', 'Request date is required.')
  }
}

async function availableForMedicine(medicineId: string): Promise<{
  availableQuantity: number
  totalRemaining: number
}> {
  const batches = (await batchRepository.list({ medicineId })).filter((b) => !b.deletedAt)
  const summary = summarizeStockLevels(batches, medicineId)
  return {
    availableQuantity: summary.availableRemaining,
    totalRemaining: summary.totalRemaining,
  }
}

export const demandService = {
  priorities: DEMAND_PRIORITIES,
  statuses: DEMAND_STATUSES,

  nextStatuses(status: DemandStatus): DemandStatus[] {
    return [...ALLOWED_TRANSITIONS[status]]
  },

  async list(): Promise<MedicineDemand[]> {
    return demandRepository.list()
  },

  async getById(id: string): Promise<MedicineDemand | null> {
    return demandRepository.getById(id)
  },

  async getSummary(): Promise<DemandSummary> {
    const rows = await demandRepository.list()
    return {
      total: rows.length,
      pending: rows.filter((r) => r.status === 'pending').length,
      approved: rows.filter((r) => r.status === 'approved').length,
      fulfilled: rows.filter((r) => r.status === 'fulfilled').length,
      cancelled: rows.filter((r) => r.status === 'cancelled').length,
      urgentOpen: rows.filter(
        (r) => r.priority === 'urgent' && (r.status === 'pending' || r.status === 'approved'),
      ).length,
    }
  },

  async listBoard(filter?: DemandFilter): Promise<DemandBoardRow[]> {
    const [demands, medicines, batches] = await Promise.all([
      demandRepository.list(),
      medicineRepository.list(),
      batchRepository.list(),
    ])

    const medicineMap = new Map(medicines.map((m) => [m.id, m]))
    const activeBatches = batches.filter((b) => !b.deletedAt)

    let rows: DemandBoardRow[] = demands
      .map((demand) => {
        const medicine = medicineMap.get(demand.medicineId)
        if (!medicine) return null
        const stock = summarizeStockLevels(activeBatches, demand.medicineId)
        return {
          demand,
          medicine,
          availableQuantity: stock.availableRemaining,
          totalRemaining: stock.totalRemaining,
          nextStatuses: [...ALLOWED_TRANSITIONS[demand.status]],
          canEdit: demand.status === 'pending',
        }
      })
      .filter((row): row is DemandBoardRow => row !== null)

    const status = filter?.status
    if (status && status !== 'all') {
      rows = rows.filter((r) => r.demand.status === status)
    }

    const priority = filter?.priority
    if (priority && priority !== 'all') {
      rows = rows.filter((r) => r.demand.priority === priority)
    }

    const department = filter?.department?.trim()
    if (department && department !== 'all') {
      rows = rows.filter((r) => r.demand.requestingDepartment === department)
    }

    const medicineId = filter?.medicineId?.trim()
    if (medicineId) {
      rows = rows.filter((r) => r.demand.medicineId === medicineId)
    }

    const q = filter?.query?.trim().toLowerCase()
    if (q) {
      rows = rows.filter((r) => {
        const haystack = [
          r.medicine.displayName,
          r.medicine.genericName,
          r.demand.requestingDepartment,
          r.demand.requestedBy,
          r.demand.notes ?? '',
          r.demand.status,
          r.demand.priority,
        ]
          .join(' ')
          .toLowerCase()
        return haystack.includes(q)
      })
    }

    // Open + higher priority first, then earliest request date
    rows.sort((a, b) => {
      const statusRank = (s: DemandStatus) =>
        s === 'pending' ? 0 : s === 'approved' ? 1 : s === 'fulfilled' ? 2 : 3
      const byStatus = statusRank(a.demand.status) - statusRank(b.demand.status)
      if (byStatus !== 0) return byStatus
      const byPriority = PRIORITY_RANK[a.demand.priority] - PRIORITY_RANK[b.demand.priority]
      if (byPriority !== 0) return byPriority
      return a.demand.requestDate.localeCompare(b.demand.requestDate)
    })

    return rows
  },

  async getAvailableQuantity(medicineId: string): Promise<number> {
    const stock = await availableForMedicine(medicineId)
    return stock.availableQuantity
  },

  async create(input: CreateDemandInput): Promise<MedicineDemand> {
    validateDemandFields(input)

    const medicine = await medicineRepository.getById(input.medicineId)
    if (!medicine?.isActive) {
      throw new DomainError('demand/invalid-medicine', 'Selected medicine variant is not available.')
    }

    return demandRepository.create({
      ...input,
      requestingDepartment: input.requestingDepartment.trim(),
      requestedBy: input.requestedBy.trim(),
      priority: input.priority ?? 'normal',
      requestDate: input.requestDate ?? todayDateString(),
      notes: input.notes?.trim() || undefined,
    })
  },

  async update(id: string, input: UpdateDemandInput): Promise<MedicineDemand> {
    const existing = await demandRepository.getById(id)
    if (!existing) throw new DomainError('demand/not-found', 'Demand not found.')
    if (existing.status !== 'pending') {
      throw new DomainError(
        'demand/not-editable',
        'Only pending demands can be edited. Change status separately.',
      )
    }

    validateDemandFields(input)

    const medicine = await medicineRepository.getById(input.medicineId)
    if (!medicine?.isActive) {
      throw new DomainError('demand/invalid-medicine', 'Selected medicine variant is not available.')
    }

    return demandRepository.update(id, {
      ...input,
      requestingDepartment: input.requestingDepartment.trim(),
      requestedBy: input.requestedBy.trim(),
      notes: input.notes?.trim() || undefined,
    })
  },

  async updateStatus(id: string, input: UpdateDemandStatusInput): Promise<MedicineDemand> {
    const existing = await demandRepository.getById(id)
    if (!existing) throw new DomainError('demand/not-found', 'Demand not found.')

    const allowed = ALLOWED_TRANSITIONS[existing.status]
    if (!allowed.includes(input.status)) {
      throw new DomainError(
        'demand/invalid-transition',
        `Cannot change demand status from ${existing.status} to ${input.status}.`,
      )
    }

    // Explicit business action only. no inventory deduction on approve/fulfill
    return demandRepository.updateStatus(id, input)
  },

  async listDepartments(): Promise<string[]> {
    const rows = await demandRepository.list()
    return [...new Set(rows.map((d) => d.requestingDepartment).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b),
    )
  },
}
