import type { BatchStatus, DateString, EntityId } from './common'

export type DashboardDataSource = 'live' | 'seed'

export interface DashboardMetric {
  id: string
  label: string
  value: number
  displayValue: string
  hint: string
  tone: 'neutral' | 'brand' | 'warning' | 'danger' | 'success'
}

export interface ExpiryOverviewItem {
  medicineId: EntityId
  medicineName: string
  quantity: number
  daysUntilExpiry: number
}

export interface LocationStockItem {
  locationId: EntityId
  locationName: string
  quantity: number
}

export interface MovementPoint {
  date: DateString
  label: string
  stockIn: number
  allocation: number
  transfer: number
}

export interface StockHealthBreakdown {
  available: number
  lowStock: number
  hold: number
  expiringSoon: number
  expired: number
}

export interface UpcomingExpiryRow {
  id: EntityId
  medicineName: string
  batchNo: string
  expiryDate: DateString
  remainingQuantity: number
  locationName: string
  status: BatchStatus
  expiryLabel: string
}

export interface LowStockRow {
  medicineId: EntityId
  medicineName: string
  remainingQuantity: number
  threshold: number
  locationName: string
}

export type ActivityKind = 'stock_in' | 'allocation' | 'transfer'

export interface RecentActivityItem {
  id: EntityId
  kind: ActivityKind
  title: string
  subtitle: string
  at: string
  href?: string
}

export interface DashboardSnapshot {
  generatedAt: string
  source: DashboardDataSource
  metrics: DashboardMetric[]
  expiryOverview: ExpiryOverviewItem[]
  stockByLocation: LocationStockItem[]
  movementSeries: MovementPoint[]
  stockHealth: StockHealthBreakdown
  upcomingExpiry: UpcomingExpiryRow[]
  lowStock: LowStockRow[]
  recentActivity: RecentActivityItem[]
}
