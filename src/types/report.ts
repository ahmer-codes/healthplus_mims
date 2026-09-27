import type { DateString, EntityId, Timestamp } from './common'

export type ReportType =
  | 'stock_in'
  | 'allocation'
  | 'transfer'
  | 'expiry'
  | 'inventory_summary'
  | 'demand'

export type ReportFormat = 'pdf' | 'csv' | 'xlsx'

export interface Report {
  id: EntityId
  type: ReportType
  title: string
  format: ReportFormat
  generatedBy: EntityId
  generatedAt: Timestamp
  dateFrom?: DateString
  dateTo?: DateString
  locationId?: EntityId
  sourceDocumentId?: EntityId
  filters?: Record<string, string | number | boolean>
  fileUrl?: string
}

export interface ReportRequest {
  type: ReportType
  title: string
  format?: ReportFormat
  generatedBy: EntityId
  dateFrom?: DateString
  dateTo?: DateString
  locationId?: EntityId
  sourceDocumentId?: EntityId
  filters?: Record<string, string | number | boolean>
}
