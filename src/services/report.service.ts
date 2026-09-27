import {
  allocationRepository,
  batchRepository,
  medicineRepository,
  reportRepository,
  stockInRepository,
  transferRepository,
} from '@/repositories'
import type {
  Allocation,
  DocumentStatus,
  HospitalLocation,
  Medicine,
  Report,
  ReportRequest,
  ReportType,
  StockIn,
  StockTransfer,
  UserProfile,
} from '@/types'
import { formatCurrency, formatDate, formatQuantity, getExpiryStatus } from '@/utils'
import { DomainError } from './errors'
import { locationService } from './location.service'
import {
  createHospitalPdf,
  downloadPdfBlob,
  drawDataTable,
  drawGrandTotal,
  drawMetaGrid,
  drawPreparedFooter,
  drawSectionTitle,
  safeFilenamePart,
  type PdfPreparedBy,
} from './pdf/hospital-pdf'

export type ReportPriceMode = 'with_price' | 'without_price'

export interface ReportDocumentFilter {
  dateFrom?: string
  dateTo?: string
  query?: string
  locationId?: string
  status?: DocumentStatus | ''
}

export interface ReportListItem {
  id: string
  type: 'stock_in' | 'allocation' | 'transfer'
  reference: string
  date: string
  subtitle: string
  secondary?: string
  lineCount: number
  status: DocumentStatus
  hasPricing: boolean
  grandTotal?: number
  createdAt: string
}

export interface StockInReportDetail {
  kind: 'stock_in'
  document: StockIn
  locationName: string
  medicinesById: Record<string, Medicine>
  grandTotal: number
  hasPricing: true
}

export interface AllocationReportDetail {
  kind: 'allocation'
  document: Allocation
  destinationName: string
  medicinesById: Record<string, Medicine>
  batchLabels: Record<string, string>
  hasPricing: false
}

export interface TransferReportDetail {
  kind: 'transfer'
  document: StockTransfer
  fromName: string
  toName: string
  medicinesById: Record<string, Medicine>
  batchLabels: Record<string, string>
  hasPricing: false
}

export type ReportDetail =
  | StockInReportDetail
  | AllocationReportDetail
  | TransferReportDetail

function defaultTitle(type: ReportType): string {
  switch (type) {
    case 'stock_in':
      return 'Stock In Report'
    case 'allocation':
      return 'Allocation Report'
    case 'transfer':
      return 'Stock Transfer Report'
    case 'expiry':
      return 'Expiry Watch Report'
    case 'inventory_summary':
      return 'Inventory Summary'
    case 'demand':
      return 'Medicine Demands Report'
    default:
      return 'Inventory Report'
  }
}

function inDateRange(date: string, filter: ReportDocumentFilter): boolean {
  if (filter.dateFrom && date < filter.dateFrom) return false
  if (filter.dateTo && date > filter.dateTo) return false
  return true
}

function matchesQuery(haystack: string, query?: string): boolean {
  const q = query?.trim().toLowerCase()
  if (!q) return true
  return haystack.toLowerCase().includes(q)
}

async function medicineMap(): Promise<Record<string, Medicine>> {
  const medicines = await medicineRepository.list()
  return Object.fromEntries(medicines.map((medicine) => [medicine.id, medicine]))
}

async function batchLabelMap(batchIds: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(batchIds)]
  const labels: Record<string, string> = {}
  await Promise.all(
    unique.map(async (id) => {
      const batch = await batchRepository.getById(id)
      labels[id] = batch?.batchNo ?? id
    }),
  )
  return labels
}

function preparedByLabel(
  preparedBy: Pick<UserProfile, 'displayName' | 'role'> | PdfPreparedBy,
): PdfPreparedBy {
  return {
    displayName: preparedBy.displayName,
    role: preparedBy.role,
  }
}

/**
 * Report orchestration. document lists, detail views, and PDF generation.
 * Price inclusion is controlled at generation time so PDFs never contain
 * hidden price columns when exporting without price.
 */
export const reportService = {
  supportsPricing(type: 'stock_in' | 'allocation' | 'transfer'): boolean {
    return type === 'stock_in'
  },

  async list(): Promise<Report[]> {
    return reportRepository.list()
  },

  async getById(id: string): Promise<Report | null> {
    return reportRepository.getById(id)
  },

  async create(request: ReportRequest): Promise<Report> {
    if (!request.generatedBy) {
      throw new DomainError('report/invalid', 'Report author is required.')
    }

    return reportRepository.create({
      ...request,
      title: request.title?.trim() || defaultTitle(request.type),
      format: request.format ?? 'pdf',
    })
  },

  async createForStockIn(stockInId: string, generatedBy: string): Promise<Report> {
    const doc = await stockInRepository.getById(stockInId)
    if (!doc) throw new DomainError('report/source-missing', 'Stock-in document not found.')

    return this.create({
      type: 'stock_in',
      title: `Stock In: ${doc.purchaseOrderNo}`,
      generatedBy,
      sourceDocumentId: doc.id,
      dateFrom: doc.receivingDate,
      dateTo: doc.receivingDate,
      locationId: doc.locationId,
    })
  },

  async createForAllocation(allocationId: string, generatedBy: string): Promise<Report> {
    const doc = await allocationRepository.getById(allocationId)
    if (!doc) throw new DomainError('report/source-missing', 'Allocation not found.')

    return this.create({
      type: 'allocation',
      title: `Allocation: ${doc.voucherNo}`,
      generatedBy,
      sourceDocumentId: doc.id,
      dateFrom: doc.date,
      dateTo: doc.date,
      locationId: doc.destinationLocationId,
    })
  },

  async createForTransfer(transferId: string, generatedBy: string): Promise<Report> {
    const doc = await transferRepository.getById(transferId)
    if (!doc) throw new DomainError('report/source-missing', 'Transfer not found.')

    return this.create({
      type: 'transfer',
      title: `Transfer: ${doc.voucherNo}`,
      generatedBy,
      sourceDocumentId: doc.id,
      dateFrom: doc.date,
      dateTo: doc.date,
      locationId: doc.toLocationId,
    })
  },

  async getExpiryBoard() {
    const batches = await batchRepository.list({ status: ['available', 'hold', 'expired'] })
    return batches
      .map((batch) => ({
        batch,
        expiryStatus: getExpiryStatus(batch.expiryDate),
      }))
      .filter((row) => row.expiryStatus !== 'ok')
      .sort((a, b) => a.batch.expiryDate.localeCompare(b.batch.expiryDate))
  },

  async listStockInReports(filter: ReportDocumentFilter = {}): Promise<ReportListItem[]> {
    const [docs, locations] = await Promise.all([
      stockInRepository.list(),
      locationService.list(false),
    ])
    const locationById = Object.fromEntries(locations.map((l) => [l.id, l]))

    return docs
      .filter((doc) => inDateRange(doc.receivingDate, filter))
      .filter((doc) => !filter.locationId || doc.locationId === filter.locationId)
      .filter((doc) => !filter.status || doc.status === filter.status)
      .filter((doc) =>
        matchesQuery(
          `${doc.purchaseOrderNo} ${doc.id} ${locationById[doc.locationId]?.name ?? ''}`,
          filter.query,
        ),
      )
      .map((doc) => ({
        id: doc.id,
        type: 'stock_in' as const,
        reference: doc.purchaseOrderNo,
        date: doc.receivingDate,
        subtitle: locationById[doc.locationId]?.name ?? doc.locationId,
        lineCount: doc.items.length,
        status: doc.status,
        hasPricing: true,
        grandTotal: doc.items.reduce((sum, item) => sum + item.totalPrice, 0),
        createdAt: doc.createdAt,
      }))
  },

  async listAllocationReports(filter: ReportDocumentFilter = {}): Promise<ReportListItem[]> {
    const [docs, locations] = await Promise.all([
      allocationRepository.list(),
      locationService.list(false),
    ])
    const locationById = Object.fromEntries(locations.map((l) => [l.id, l]))

    return docs
      .filter((doc) => inDateRange(doc.date, filter))
      .filter((doc) => !filter.locationId || doc.destinationLocationId === filter.locationId)
      .filter((doc) => !filter.status || doc.status === filter.status)
      .filter((doc) =>
        matchesQuery(
          `${doc.voucherNo} ${doc.receiverName} ${locationById[doc.destinationLocationId]?.name ?? ''}`,
          filter.query,
        ),
      )
      .map((doc) => ({
        id: doc.id,
        type: 'allocation' as const,
        reference: doc.voucherNo,
        date: doc.date,
        subtitle: locationById[doc.destinationLocationId]?.name ?? doc.destinationLocationId,
        secondary: [doc.receiverName, doc.receiverDesignation].filter(Boolean).join(' · ') || undefined,
        lineCount: doc.items.length,
        status: doc.status,
        hasPricing: false,
        createdAt: doc.createdAt,
      }))
  },

  async listTransferReports(filter: ReportDocumentFilter = {}): Promise<ReportListItem[]> {
    const [docs, locations] = await Promise.all([
      transferRepository.list(),
      locationService.list(false),
    ])
    const locationById = Object.fromEntries(locations.map((l) => [l.id, l]))

    return docs
      .filter((doc) => inDateRange(doc.date, filter))
      .filter(
        (doc) =>
          !filter.locationId ||
          doc.fromLocationId === filter.locationId ||
          doc.toLocationId === filter.locationId,
      )
      .filter((doc) => !filter.status || doc.status === filter.status)
      .filter((doc) =>
        matchesQuery(
          `${doc.voucherNo} ${locationById[doc.fromLocationId]?.name ?? ''} ${locationById[doc.toLocationId]?.name ?? ''}`,
          filter.query,
        ),
      )
      .map((doc) => ({
        id: doc.id,
        type: 'transfer' as const,
        reference: doc.voucherNo,
        date: doc.date,
        subtitle: `${locationById[doc.fromLocationId]?.name ?? doc.fromLocationId} → ${locationById[doc.toLocationId]?.name ?? doc.toLocationId}`,
        lineCount: doc.items.length,
        status: doc.status,
        hasPricing: false,
        createdAt: doc.createdAt,
      }))
  },

  async getStockInDetail(id: string): Promise<StockInReportDetail> {
    const document = await stockInRepository.getById(id)
    if (!document) throw new DomainError('report/source-missing', 'Stock-in document not found.')
    const [medicinesById, location] = await Promise.all([
      medicineMap(),
      locationService.getById(document.locationId),
    ])
    return {
      kind: 'stock_in',
      document,
      locationName: location?.name ?? document.locationId,
      medicinesById,
      grandTotal: document.items.reduce((sum, item) => sum + item.totalPrice, 0),
      hasPricing: true,
    }
  },

  async getAllocationDetail(id: string): Promise<AllocationReportDetail> {
    const document = await allocationRepository.getById(id)
    if (!document) throw new DomainError('report/source-missing', 'Allocation not found.')
    const [medicinesById, location, batchLabels] = await Promise.all([
      medicineMap(),
      locationService.getById(document.destinationLocationId),
      batchLabelMap(document.items.map((item) => item.batchId)),
    ])
    return {
      kind: 'allocation',
      document,
      destinationName: location?.name ?? document.destinationLocationId,
      medicinesById,
      batchLabels,
      hasPricing: false,
    }
  },

  async getTransferDetail(id: string): Promise<TransferReportDetail> {
    const document = await transferRepository.getById(id)
    if (!document) throw new DomainError('report/source-missing', 'Transfer not found.')
    const [medicinesById, from, to, batchLabels] = await Promise.all([
      medicineMap(),
      locationService.getById(document.fromLocationId),
      locationService.getById(document.toLocationId),
      batchLabelMap(document.items.map((item) => item.batchId)),
    ])
    return {
      kind: 'transfer',
      document,
      fromName: from?.name ?? document.fromLocationId,
      toName: to?.name ?? document.toLocationId,
      medicinesById,
      batchLabels,
      hasPricing: false,
    }
  },

  /**
   * Stock In PDF. When includePrices is false, price columns and grand total
   * are omitted from the document entirely (not merely hidden).
   */
  async generateStockInPdf(input: {
    stockIn: StockIn
    medicinesById: Record<string, Medicine>
    preparedBy: Pick<UserProfile, 'displayName' | 'username' | 'role'>
    includePrices?: boolean
    locationName?: string
  }): Promise<Blob> {
    const includePrices = input.includePrices ?? true
    const { stockIn, medicinesById, preparedBy } = input
    const { doc } = createHospitalPdf('STOCK IN REPORT', {
      title: `Stock In: ${stockIn.purchaseOrderNo}`,
      subject: includePrices
        ? 'Stock receiving report with pricing'
        : 'Stock receiving report without pricing',
      keywords: `stock-in,${includePrices ? 'with-price' : 'without-price'}`,
    })

    drawSectionTitle(doc, 'Receiving details')
    const afterMeta = drawMetaGrid(doc, [
      ['Purchase Order Number', stockIn.purchaseOrderNo],
      ['Receiving Date', formatDate(stockIn.receivingDate)],
      ['Location', input.locationName ?? stockIn.locationId],
      ['Status', stockIn.status.toUpperCase()],
      ['Document ID', stockIn.id],
      ['Lines', String(stockIn.items.length)],
    ])

    const head = includePrices
      ? [
          '#',
          'Medicine',
          'Manufacturer',
          'Batch',
          'MFG Date',
          'EXP Date',
          'Qty',
          'Unit Price',
          'Total Price',
        ]
      : ['#', 'Medicine', 'Manufacturer', 'Batch', 'MFG Date', 'EXP Date', 'Qty']

    const body = stockIn.items.map((item, index) => {
      const base: Array<string | number> = [
        String(index + 1),
        medicinesById[item.medicineId]?.displayName ?? item.medicineId,
        item.manufacturerName,
        item.batchNo,
        formatDate(item.manufacturingDate),
        formatDate(item.expiryDate),
        formatQuantity(item.quantity),
      ]
      if (includePrices) {
        base.push(formatCurrency(item.unitPrice), formatCurrency(item.totalPrice))
      }
      return base
    })

    let tableEnd = drawDataTable(doc, {
      startY: afterMeta + 4,
      head,
      body,
      columnStyles: includePrices
        ? {
            0: { cellWidth: 8 },
            6: { halign: 'right' },
            7: { halign: 'right' },
            8: { halign: 'right' },
          }
        : {
            0: { cellWidth: 8 },
            6: { halign: 'right', cellWidth: 22 },
          },
    })

    if (includePrices) {
      const grandTotal = stockIn.items.reduce((sum, item) => sum + item.totalPrice, 0)
      tableEnd = drawGrandTotal(doc, 'Grand Total', formatCurrency(grandTotal), tableEnd)
    }

    drawPreparedFooter(doc, preparedByLabel(preparedBy), tableEnd)
    return doc.output('blob')
  },

  async generateAllocationPdf(input: {
    allocation: Allocation
    destination: HospitalLocation | { name: string }
    medicinesById: Record<string, Medicine>
    batchLabels: Record<string, string>
    preparedBy: Pick<UserProfile, 'displayName' | 'username' | 'role'>
  }): Promise<Blob> {
    const { allocation, destination, medicinesById, batchLabels, preparedBy } = input
    const { doc } = createHospitalPdf('ALLOCATION REPORT', {
      title: `Allocation: ${allocation.voucherNo}`,
      subject: 'Department stock allocation report',
      keywords: 'allocation,issue,pharmacy',
    })

    drawSectionTitle(doc, 'Allocation details')
    const afterMeta = drawMetaGrid(doc, [
      ['Date', formatDate(allocation.date)],
      ['Voucher Number', allocation.voucherNo],
      ['Destination', destination.name],
      ['Document ID', allocation.id],
      ['Receiver Name', allocation.receiverName || '-'],
      ['Receiver Designation', allocation.receiverDesignation || '-'],
    ])

    const body = allocation.items.map((item, index) => [
      String(index + 1),
      medicinesById[item.medicineId]?.displayName ?? item.medicineId,
      batchLabels[item.batchId] ?? item.batchId,
      formatQuantity(item.quantity),
    ])

    const tableEnd = drawDataTable(doc, {
      startY: afterMeta + 4,
      head: ['#', 'Medicine', 'Batch', 'Quantity'],
      body,
      columnStyles: {
        0: { cellWidth: 10 },
        3: { halign: 'right', cellWidth: 28 },
      },
    })

    drawPreparedFooter(doc, preparedByLabel(preparedBy), tableEnd)
    return doc.output('blob')
  },

  async generateStockTransferPdf(input: {
    transfer: StockTransfer
    fromLocation: HospitalLocation | { name: string }
    toLocation: HospitalLocation | { name: string }
    medicinesById: Record<string, Medicine>
    batchLabels: Record<string, string>
    preparedBy: Pick<UserProfile, 'displayName' | 'username' | 'role'>
  }): Promise<Blob> {
    const { transfer, fromLocation, toLocation, medicinesById, batchLabels, preparedBy } = input
    const { doc } = createHospitalPdf('STOCK TRANSFER REPORT', {
      title: `Transfer: ${transfer.voucherNo}`,
      subject: 'Inter-location stock transfer report',
      keywords: 'transfer,stock-movement',
    })

    drawSectionTitle(doc, 'Transfer details')
    const afterMeta = drawMetaGrid(doc, [
      ['Date', formatDate(transfer.date)],
      ['Voucher Number', transfer.voucherNo],
      ['From', fromLocation.name],
      ['To', toLocation.name],
      ['Document ID', transfer.id],
      ['Status', transfer.status.toUpperCase()],
    ])

    const body = transfer.items.map((item, index) => [
      String(index + 1),
      medicinesById[item.medicineId]?.displayName ?? item.medicineId,
      batchLabels[item.batchId] ?? item.batchId,
      formatQuantity(item.quantity),
    ])

    const tableEnd = drawDataTable(doc, {
      startY: afterMeta + 4,
      head: ['#', 'Medicine', 'Batch', 'Quantity'],
      body,
      columnStyles: {
        0: { cellWidth: 10 },
        3: { halign: 'right', cellWidth: 28 },
      },
    })

    drawPreparedFooter(doc, preparedByLabel(preparedBy), tableEnd)
    return doc.output('blob')
  },

  /** Export a listed document by id with optional pricing mode. */
  async exportDocumentPdf(input: {
    type: 'stock_in' | 'allocation' | 'transfer'
    id: string
    preparedBy: Pick<UserProfile, 'displayName' | 'username' | 'role'>
    priceMode?: ReportPriceMode
  }): Promise<{ blob: Blob; filename: string }> {
    if (input.type === 'stock_in') {
      const detail = await this.getStockInDetail(input.id)
      const includePrices = input.priceMode !== 'without_price'
      const blob = await this.generateStockInPdf({
        stockIn: detail.document,
        medicinesById: detail.medicinesById,
        preparedBy: input.preparedBy,
        includePrices,
        locationName: detail.locationName,
      })
      const suffix = includePrices ? 'WithPrice' : 'WithoutPrice'
      return {
        blob,
        filename: `HealthPlus_StockIn_${safeFilenamePart(detail.document.purchaseOrderNo)}_${suffix}.pdf`,
      }
    }

    if (input.type === 'allocation') {
      const detail = await this.getAllocationDetail(input.id)
      const blob = await this.generateAllocationPdf({
        allocation: detail.document,
        destination: { name: detail.destinationName },
        medicinesById: detail.medicinesById,
        batchLabels: detail.batchLabels,
        preparedBy: input.preparedBy,
      })
      return {
        blob,
        filename: `HealthPlus_Allocation_${safeFilenamePart(detail.document.voucherNo)}.pdf`,
      }
    }

    const detail = await this.getTransferDetail(input.id)
    const blob = await this.generateStockTransferPdf({
      transfer: detail.document,
      fromLocation: { name: detail.fromName },
      toLocation: { name: detail.toName },
      medicinesById: detail.medicinesById,
      batchLabels: detail.batchLabels,
      preparedBy: input.preparedBy,
    })
    return {
      blob,
      filename: `HealthPlus_Transfer_${safeFilenamePart(detail.document.voucherNo)}.pdf`,
    }
  },

  downloadPdf(blob: Blob, filename: string): void {
    downloadPdfBlob(blob, filename)
  },

  downloadStockTransferPdf(blob: Blob, voucherNo: string): void {
    downloadPdfBlob(blob, `HealthPlus_Transfer_${safeFilenamePart(voucherNo)}.pdf`)
  },
}

/** @deprecated Prefer reportService.generateStockTransferPdf context object */
export type StockTransferPdfContext = {
  transfer: StockTransfer
  fromLocation: HospitalLocation
  toLocation: HospitalLocation
  medicinesById: Record<string, Medicine>
  batchLabels: Record<string, string>
  preparedBy: Pick<UserProfile, 'displayName' | 'username' | 'role'>
}
