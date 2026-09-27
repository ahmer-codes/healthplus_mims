import { EXPIRY_WATCH_WINDOWS, type ExpiryWatchMonths } from '@/constants'
import {
  batchRepository,
  medicineRepository,
} from '@/repositories'
import type { Medicine, MedicineBatch, UserProfile } from '@/types'
import {
  formatDate,
  formatQuantity,
  getDaysUntilExpiry,
  refreshBatchStatus,
} from '@/utils'
import { DomainError } from './errors'
import { locationService } from './location.service'
import {
  createHospitalPdf,
  downloadPdfBlob,
  drawDataTable,
  drawMetaGrid,
  drawPreparedFooter,
  drawSectionTitle,
} from './pdf/hospital-pdf'

export type ExpiryWatchStatus = 'expired' | 'critical' | 'expiring_soon' | 'upcoming'

export interface ExpiryWatchRow {
  batch: MedicineBatch
  medicine: Medicine
  locationName: string
  daysRemaining: number
  watchStatus: ExpiryWatchStatus
  remainingQuantity: number
}

export interface ExpiryWatchSummary {
  within1Month: number
  within3Months: number
  within6Months: number
  alreadyExpired: number
  /** Remaining units (not batch counts) for chart totals */
  quantityWithin1Month: number
  quantityWithin3Months: number
  quantityWithin6Months: number
  quantityExpired: number
}

export interface ExpiryChartBand {
  status: ExpiryWatchStatus
  label: string
  quantity: number
}

export interface ExpiryMedicineQuantity {
  medicineId: string
  medicineName: string
  totalQuantity: number
  byStatus: Record<ExpiryWatchStatus, number>
  worstStatus: ExpiryWatchStatus
}

export interface ExpiryWatchFilter {
  windowMonths: ExpiryWatchMonths
  locationId?: string
  medicineId?: string
  status?: ExpiryWatchStatus | ''
  query?: string
}

export interface ExpiryWatchBoard {
  summary: ExpiryWatchSummary
  rows: ExpiryWatchRow[]
  chartBands: ExpiryChartBand[]
  medicineQuantities: ExpiryMedicineQuantity[]
  windowDays: number
}

const STATUS_ORDER: Record<ExpiryWatchStatus, number> = {
  expired: 0,
  critical: 1,
  expiring_soon: 2,
  upcoming: 3,
}

const STATUS_LABEL: Record<ExpiryWatchStatus, string> = {
  expired: 'Expired',
  critical: 'Critical',
  expiring_soon: 'Expiring Soon',
  upcoming: 'Upcoming',
}

function windowDaysFor(months: ExpiryWatchMonths): number {
  return EXPIRY_WATCH_WINDOWS.find((w) => w.months === months)?.days ?? 180
}

/**
 * Operational expiry classification for the watch board.
 * Critical ≤ 30d, Expiring Soon ≤ 90d, Upcoming beyond that within the window.
 */
export function classifyExpiryWatchStatus(daysRemaining: number): ExpiryWatchStatus {
  if (daysRemaining < 0) return 'expired'
  if (daysRemaining <= 30) return 'critical'
  if (daysRemaining <= 90) return 'expiring_soon'
  return 'upcoming'
}

function isWithinWindow(daysRemaining: number, windowDays: number): boolean {
  if (daysRemaining < 0) return true
  return daysRemaining <= windowDays
}

function countBatchesExpiringWithin(
  rows: Array<{ daysRemaining: number; remainingQuantity: number }>,
  days: number,
): { batches: number; quantity: number } {
  let batches = 0
  let quantity = 0
  for (const row of rows) {
    if (row.daysRemaining >= 0 && row.daysRemaining <= days) {
      batches += 1
      quantity += row.remainingQuantity
    }
  }
  return { batches, quantity }
}

/**
 * Expiry Management domain service. watch windows, urgency ranking, and PDF export.
 */
export const expiryService = {
  windows: EXPIRY_WATCH_WINDOWS,
  statusLabel: STATUS_LABEL,

  classify: classifyExpiryWatchStatus,

  async getBoard(filter: ExpiryWatchFilter): Promise<ExpiryWatchBoard> {
    const windowDays = windowDaysFor(filter.windowMonths)
    const [batches, medicines, locations] = await Promise.all([
      batchRepository.list({ includeDeleted: false }),
      medicineRepository.list(),
      locationService.list(false),
    ])

    const medicineById = Object.fromEntries(medicines.map((m) => [m.id, m]))
    const locationById = Object.fromEntries(locations.map((l) => [l.id, l]))

    const enriched = batches
      .map((batch) => refreshBatchStatus(batch))
      .filter((batch) => !batch.deletedAt)
      .filter((batch) => batch.remainingQuantity > 0 || batch.status === 'expired')
      .map((batch) => {
        const daysRemaining = getDaysUntilExpiry(batch.expiryDate) ?? 0
        return {
          batch,
          medicine: medicineById[batch.medicineId] ?? {
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
          locationName: locationById[batch.locationId]?.name ?? batch.locationId,
          daysRemaining,
          watchStatus: classifyExpiryWatchStatus(daysRemaining),
          remainingQuantity: batch.remainingQuantity,
        } satisfies ExpiryWatchRow
      })

    const summaryBase = enriched.map((row) => ({
      daysRemaining: row.daysRemaining,
      remainingQuantity: row.remainingQuantity,
    }))
    const m1 = countBatchesExpiringWithin(summaryBase, 30)
    const m3 = countBatchesExpiringWithin(summaryBase, 90)
    const m6 = countBatchesExpiringWithin(summaryBase, 180)
    const expiredRows = enriched.filter((row) => row.daysRemaining < 0)

    const summary: ExpiryWatchSummary = {
      within1Month: m1.batches,
      within3Months: m3.batches,
      within6Months: m6.batches,
      alreadyExpired: expiredRows.length,
      quantityWithin1Month: m1.quantity,
      quantityWithin3Months: m3.quantity,
      quantityWithin6Months: m6.quantity,
      quantityExpired: expiredRows.reduce((sum, row) => sum + row.remainingQuantity, 0),
    }

    let rows = enriched.filter((row) => isWithinWindow(row.daysRemaining, windowDays))

    if (filter.locationId) {
      rows = rows.filter((row) => row.batch.locationId === filter.locationId)
    }
    if (filter.medicineId) {
      rows = rows.filter((row) => row.batch.medicineId === filter.medicineId)
    }
    if (filter.status) {
      rows = rows.filter((row) => row.watchStatus === filter.status)
    }
    if (filter.query?.trim()) {
      const q = filter.query.trim().toLowerCase()
      rows = rows.filter((row) => {
        const haystack = [
          row.medicine.displayName,
          row.medicine.genericName,
          row.batch.batchNo,
          row.batch.manufacturerName,
          row.locationName,
        ]
          .join(' ')
          .toLowerCase()
        return haystack.includes(q)
      })
    }

    rows.sort((a, b) => {
      const statusCmp = STATUS_ORDER[a.watchStatus] - STATUS_ORDER[b.watchStatus]
      if (statusCmp !== 0) return statusCmp
      return a.daysRemaining - b.daysRemaining
    })

    const bandMap: Record<ExpiryWatchStatus, number> = {
      expired: 0,
      critical: 0,
      expiring_soon: 0,
      upcoming: 0,
    }
    for (const row of rows) {
      bandMap[row.watchStatus] += row.remainingQuantity
    }
    const chartBands: ExpiryChartBand[] = (
      ['expired', 'critical', 'expiring_soon', 'upcoming'] as ExpiryWatchStatus[]
    )
      .filter((status) => bandMap[status] > 0)
      .map((status) => ({
        status,
        label: STATUS_LABEL[status],
        quantity: bandMap[status],
      }))

    const medicineMap = new Map<string, ExpiryMedicineQuantity>()
    for (const row of rows) {
      const existing = medicineMap.get(row.medicine.id) ?? {
        medicineId: row.medicine.id,
        medicineName: row.medicine.displayName,
        totalQuantity: 0,
        byStatus: {
          expired: 0,
          critical: 0,
          expiring_soon: 0,
          upcoming: 0,
        },
        worstStatus: row.watchStatus,
      }
      existing.totalQuantity += row.remainingQuantity
      existing.byStatus[row.watchStatus] += row.remainingQuantity
      if (STATUS_ORDER[row.watchStatus] < STATUS_ORDER[existing.worstStatus]) {
        existing.worstStatus = row.watchStatus
      }
      medicineMap.set(row.medicine.id, existing)
    }

    const medicineQuantities = [...medicineMap.values()]
      .sort((a, b) => {
        const statusCmp = STATUS_ORDER[a.worstStatus] - STATUS_ORDER[b.worstStatus]
        if (statusCmp !== 0) return statusCmp
        return b.totalQuantity - a.totalQuantity
      })
      .slice(0, 12)

    return {
      summary,
      rows,
      chartBands,
      medicineQuantities,
      windowDays,
    }
  },

  async generatePdf(input: {
    filter: ExpiryWatchFilter
    preparedBy: Pick<UserProfile, 'displayName' | 'role'>
  }): Promise<Blob> {
    const board = await this.getBoard(input.filter)
    const window = EXPIRY_WATCH_WINDOWS.find((w) => w.months === input.filter.windowMonths)
    const { doc } = createHospitalPdf('EXPIRY WATCH REPORT', {
      title: `Expiry Watch: ${window?.label ?? 'Window'}`,
      subject: 'Medicines approaching expiry',
      keywords: 'expiry,pharmacy,FEFO',
    })

    drawSectionTitle(doc, 'Watch summary')
    const afterMeta = drawMetaGrid(doc, [
      ['Window', window?.label ?? String(input.filter.windowMonths)],
      ['Batches listed', String(board.rows.length)],
      ['Within 1 month', String(board.summary.within1Month)],
      ['Within 3 months', String(board.summary.within3Months)],
      ['Within 6 months', String(board.summary.within6Months)],
      ['Already expired', String(board.summary.alreadyExpired)],
    ])

    const body = board.rows.map((row, index) => [
      String(index + 1),
      row.medicine.displayName,
      row.batch.batchNo,
      formatDate(row.batch.expiryDate),
      formatQuantity(row.remainingQuantity),
      row.locationName,
      row.daysRemaining < 0 ? `${Math.abs(row.daysRemaining)}d overdue` : `${row.daysRemaining}d`,
      STATUS_LABEL[row.watchStatus],
    ])

    const tableEnd = drawDataTable(doc, {
      startY: afterMeta + 4,
      head: ['#', 'Medicine', 'Batch', 'Expiry', 'Qty', 'Location', 'Days', 'Status'],
      body: body.length
        ? body
        : [['-', 'No batches in this window', '-', '-', '-', '-', '-', '-']],
      columnStyles: {
        0: { cellWidth: 8 },
        4: { halign: 'right', cellWidth: 16 },
        6: { halign: 'right', cellWidth: 22 },
      },
    })

    drawPreparedFooter(doc, input.preparedBy, tableEnd)
    return doc.output('blob')
  },

  downloadPdf(blob: Blob, windowMonths: ExpiryWatchMonths): void {
    downloadPdfBlob(blob, `HealthPlus_ExpiryWatch_${windowMonths}Month.pdf`)
  },

  async exportPdf(input: {
    filter: ExpiryWatchFilter
    preparedBy: Pick<UserProfile, 'displayName' | 'role'>
  }): Promise<void> {
    if (!input.preparedBy?.displayName) {
      throw new DomainError('expiry/export', 'Prepared-by user is required for export.')
    }
    const blob = await this.generatePdf(input)
    this.downloadPdf(blob, input.filter.windowMonths)
  },
}
