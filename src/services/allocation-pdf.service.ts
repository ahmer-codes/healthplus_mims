import type { Allocation, HospitalLocation, Medicine, UserProfile } from '@/types'
import { reportService } from './report.service'
import { downloadPdfBlob, safeFilenamePart } from './pdf/hospital-pdf'

export interface AllocationPdfContext {
  allocation: Allocation
  destination: HospitalLocation
  medicinesById: Record<string, Medicine>
  batchLabels: Record<string, string>
  preparedBy: Pick<UserProfile, 'displayName' | 'username' | 'role'>
}

/** Thin wrapper. PDF layout lives in reportService / hospital-pdf. */
export const allocationPdfService = {
  async generate(context: AllocationPdfContext): Promise<Blob> {
    return reportService.generateAllocationPdf(context)
  },

  download(blob: Blob, voucherNo: string): void {
    downloadPdfBlob(blob, `HealthPlus_Allocation_${safeFilenamePart(voucherNo)}.pdf`)
  },
}
