import type { Medicine, StockIn, UserProfile } from '@/types'
import { reportService } from './report.service'
import { downloadPdfBlob, safeFilenamePart } from './pdf/hospital-pdf'

export interface StockInPdfContext {
  stockIn: StockIn
  medicinesById: Record<string, Medicine>
  preparedBy: Pick<UserProfile, 'displayName' | 'username' | 'role'>
  includePrices?: boolean
  locationName?: string
}

/** Thin wrapper. PDF layout lives in reportService / hospital-pdf. */
export const stockInPdfService = {
  async generate(context: StockInPdfContext): Promise<Blob> {
    return reportService.generateStockInPdf(context)
  },

  download(blob: Blob, purchaseOrderNo: string): void {
    downloadPdfBlob(blob, `HealthPlus_StockIn_${safeFilenamePart(purchaseOrderNo)}.pdf`)
  },
}
