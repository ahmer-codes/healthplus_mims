import type { Report, ReportRequest } from '@/types'
import { createEntityId, nowIso } from '@/utils'
import type { ReportRepository } from '../contracts'

/**
 * Report metadata is generated client-side for PDF audit labels.
 * Operational documents live in stockIns / allocations / stockTransfers -
 * no separate Firestore reports collection (per collection inventory).
 */
export class FirebaseReportRepository implements ReportRepository {
  async list(): Promise<Report[]> {
    return []
  }

  async getById(_id: string): Promise<Report | null> {
    return null
  }

  async create(input: ReportRequest): Promise<Report> {
    return {
      id: createEntityId('rpt'),
      type: input.type,
      title: input.title?.trim() || input.type,
      generatedBy: input.generatedBy,
      generatedAt: nowIso(),
      format: input.format ?? 'pdf',
      sourceDocumentId: input.sourceDocumentId,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      locationId: input.locationId,
      filters: input.filters,
    }
  }
}

export const reportRepository = new FirebaseReportRepository()
