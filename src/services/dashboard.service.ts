import { format, parseISO, subDays } from 'date-fns'
import { INVENTORY_THRESHOLDS } from '@/constants'
import { isFirebaseConfigured } from '@/firebase'
import {
  allocationRepository,
  batchRepository,
  locationRepository,
  medicineRepository,
  stockInRepository,
  transferRepository,
} from '@/repositories'
import type {
  DashboardMetric,
  DashboardSnapshot,
  ExpiryOverviewItem,
  LowStockRow,
  MedicineBatch,
  MovementPoint,
  RecentActivityItem,
  StockHealthBreakdown,
  UpcomingExpiryRow,
} from '@/types'
import {
  formatCurrency,
  formatQuantity,
  getDaysUntilExpiry,
  getExpiryStatus,
  roundMoney,
} from '@/utils'

interface OperationalBatch {
  id: string
  medicineId: string
  medicineName: string
  batchNo: string
  locationId: string
  locationName: string
  remainingQuantity: number
  unitPrice: number
  expiryDate: string
  status: MedicineBatch['status']
}

function formatMovementLabel(date: string): string {
  try {
    return format(parseISO(date), 'dd MMM')
  } catch {
    return date
  }
}

function buildMetrics(batches: OperationalBatch[]): DashboardMetric[] {
  const active = batches.filter((b) => b.remainingQuantity > 0)
  const availableUnits = active
    .filter((b) => b.status === 'available')
    .reduce((sum, b) => sum + b.remainingQuantity, 0)

  const byMedicine = new Map<string, number>()
  for (const batch of active.filter((b) => b.status === 'available' || b.status === 'hold')) {
    byMedicine.set(
      batch.medicineId,
      (byMedicine.get(batch.medicineId) ?? 0) + batch.remainingQuantity,
    )
  }

  let lowStockItems = 0
  for (const qty of byMedicine.values()) {
    if (qty <= INVENTORY_THRESHOLDS.lowStockUnits) lowStockItems += 1
  }

  const expiringSoon = active.filter((batch) => {
    const days = getDaysUntilExpiry(batch.expiryDate)
    return (
      days !== null &&
      days >= 0 &&
      days <= INVENTORY_THRESHOLDS.expiringSoonDays &&
      batch.status !== 'expired'
    )
  }).length

  const stockValue = active.reduce(
    (sum, batch) => sum + batch.remainingQuantity * batch.unitPrice,
    0,
  )

  return [
    {
      id: 'batches',
      label: 'Total Medicine Batches',
      value: active.length,
      displayValue: String(active.length),
      hint: 'Lots with remaining quantity',
      tone: 'neutral',
    },
    {
      id: 'available',
      label: 'Available Stock',
      value: availableUnits,
      displayValue: formatQuantity(availableUnits),
      hint: 'Units ready to allocate',
      tone: 'success',
    },
    {
      id: 'low',
      label: 'Low Stock Items',
      value: lowStockItems,
      displayValue: String(lowStockItems),
      hint: `At or below threshold (≤ ${INVENTORY_THRESHOLDS.lowStockUnits})`,
      tone: lowStockItems > 0 ? 'warning' : 'neutral',
    },
    {
      id: 'expiring',
      label: 'Expiring Soon',
      value: expiringSoon,
      displayValue: String(expiringSoon),
      hint: 'Within 6 months',
      tone: expiringSoon > 0 ? 'warning' : 'neutral',
    },
    {
      id: 'value',
      label: 'Inventory Value',
      value: stockValue,
      displayValue: formatCurrency(roundMoney(stockValue)),
      hint: 'Remaining qty × unit price',
      tone: 'brand',
    },
  ]
}

function buildExpiryOverview(batches: OperationalBatch[]): ExpiryOverviewItem[] {
  return batches
    .filter((batch) => batch.remainingQuantity > 0)
    .map((batch) => ({
      medicineId: batch.medicineId,
      medicineName: batch.medicineName,
      quantity: batch.remainingQuantity,
      daysUntilExpiry: getDaysUntilExpiry(batch.expiryDate) ?? 9999,
    }))
    .filter((row) => row.daysUntilExpiry <= INVENTORY_THRESHOLDS.expiringSoonDays)
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
    .slice(0, 8)
}

function buildStockByLocation(batches: OperationalBatch[]) {
  const map = new Map<string, { locationId: string; locationName: string; quantity: number }>()
  for (const batch of batches) {
    if (batch.remainingQuantity <= 0) continue
    const current = map.get(batch.locationId)
    if (current) {
      current.quantity += batch.remainingQuantity
    } else {
      map.set(batch.locationId, {
        locationId: batch.locationId,
        locationName: batch.locationName,
        quantity: batch.remainingQuantity,
      })
    }
  }
  return [...map.values()].sort((a, b) => b.quantity - a.quantity)
}

function buildStockHealth(batches: OperationalBatch[]): StockHealthBreakdown {
  const active = batches.filter((b) => b.remainingQuantity > 0)
  let available = 0
  let hold = 0
  let expired = 0
  let expiringSoon = 0

  const byMedicine = new Map<string, number>()

  for (const batch of active) {
    if (batch.status === 'hold') hold += batch.remainingQuantity
    else if (batch.status === 'expired') expired += batch.remainingQuantity
    else available += batch.remainingQuantity

    const days = getDaysUntilExpiry(batch.expiryDate)
    if (
      days !== null &&
      days >= 0 &&
      days <= INVENTORY_THRESHOLDS.expiringSoonDays &&
      batch.status !== 'expired'
    ) {
      expiringSoon += batch.remainingQuantity
    }

    if (batch.status === 'available' || batch.status === 'hold') {
      byMedicine.set(
        batch.medicineId,
        (byMedicine.get(batch.medicineId) ?? 0) + batch.remainingQuantity,
      )
    }
  }

  let lowStock = 0
  for (const qty of byMedicine.values()) {
    if (qty <= INVENTORY_THRESHOLDS.lowStockUnits) lowStock += 1
  }

  return { available, lowStock, hold, expiringSoon, expired }
}

function buildUpcomingExpiry(batches: OperationalBatch[]): UpcomingExpiryRow[] {
  return batches
    .filter((batch) => batch.remainingQuantity > 0)
    .map((batch) => {
      const days = getDaysUntilExpiry(batch.expiryDate)
      const expiry = getExpiryStatus(batch.expiryDate)
      return {
        row: {
          id: batch.id,
          medicineName: batch.medicineName,
          batchNo: batch.batchNo,
          expiryDate: batch.expiryDate,
          remainingQuantity: batch.remainingQuantity,
          locationName: batch.locationName,
          status: batch.status,
          expiryLabel:
            days === null
              ? '-'
              : days < 0
                ? 'Expired'
                : days === 0
                  ? 'Today'
                  : `${days}d`,
        } satisfies UpcomingExpiryRow,
        days: days ?? 99999,
        expiry,
      }
    })
    .filter((item) => item.expiry === 'critical' || item.expiry === 'warning' || item.expiry === 'expired')
    .sort((a, b) => a.days - b.days)
    .slice(0, 8)
    .map((item) => item.row)
}

function buildLowStock(batches: OperationalBatch[]): LowStockRow[] {
  const totals = new Map<
    string,
    { medicineId: string; medicineName: string; qty: number; locationName: string }
  >()

  for (const batch of batches) {
    if (batch.remainingQuantity <= 0) continue
    if (batch.status !== 'available' && batch.status !== 'hold') continue
    const key = `${batch.medicineId}::${batch.locationId}`
    const current = totals.get(key)
    if (current) {
      current.qty += batch.remainingQuantity
    } else {
      totals.set(key, {
        medicineId: batch.medicineId,
        medicineName: batch.medicineName,
        qty: batch.remainingQuantity,
        locationName: batch.locationName,
      })
    }
  }

  return [...totals.values()]
    .map((row) => ({
      medicineId: row.medicineId,
      medicineName: row.medicineName,
      remainingQuantity: row.qty,
      threshold: INVENTORY_THRESHOLDS.lowStockUnits,
      locationName: row.locationName,
    }))
    .filter((row) => row.remainingQuantity <= row.threshold)
    .sort((a, b) => a.remainingQuantity - b.remainingQuantity)
    .slice(0, 6)
}

function emptyMovementSeries(): MovementPoint[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = format(subDays(new Date(), 6 - index), 'yyyy-MM-dd')
    return {
      date,
      label: formatMovementLabel(date),
      stockIn: 0,
      allocation: 0,
      transfer: 0,
    }
  })
}

async function buildMovementSeries(): Promise<MovementPoint[]> {
  const series = emptyMovementSeries()
  const byDate = new Map(series.map((point) => [point.date, point]))

  try {
    const [stockIns, allocations, transfers] = await Promise.all([
      stockInRepository.list(),
      allocationRepository.list(),
      transferRepository.list(),
    ])

    for (const doc of stockIns) {
      const point = byDate.get(doc.receivingDate)
      if (point) {
        point.stockIn += doc.items.reduce((sum, item) => sum + item.quantity, 0)
      }
    }
    for (const doc of allocations) {
      const point = byDate.get(doc.date)
      if (point) {
        point.allocation += doc.items.reduce((sum, item) => sum + item.quantity, 0)
      }
    }
    for (const doc of transfers) {
      const point = byDate.get(doc.date)
      if (point) {
        point.transfer += doc.items.reduce((sum, item) => sum + item.quantity, 0)
      }
    }
  } catch {
    // Keep zero series if history collections are unavailable.
  }

  return series
}

async function buildRecentActivity(): Promise<RecentActivityItem[]> {
  const items: RecentActivityItem[] = []
  try {
    const [stockIns, allocations, transfers] = await Promise.all([
      stockInRepository.list(),
      allocationRepository.list(),
      transferRepository.list(),
    ])

    for (const doc of stockIns.slice(0, 8)) {
      items.push({
        id: doc.id,
        kind: 'stock_in',
        title: `Stock In ${doc.purchaseOrderNo}`,
        subtitle: `${doc.items.length} line(s)`,
        at: doc.createdAt || doc.receivingDate,
        href: '/reports/stock-in',
      })
    }
    for (const doc of allocations.slice(0, 8)) {
      items.push({
        id: doc.id,
        kind: 'allocation',
        title: `Allocation ${doc.voucherNo}`,
        subtitle: doc.receiverName || 'Department issue',
        at: doc.createdAt || doc.date,
        href: '/reports/allocate',
      })
    }
    for (const doc of transfers.slice(0, 8)) {
      items.push({
        id: doc.id,
        kind: 'transfer',
        title: `Transfer ${doc.voucherNo}`,
        subtitle: `${doc.items.length} line(s)`,
        at: doc.createdAt || doc.date,
        href: '/reports/transfers',
      })
    }
  } catch {
    return []
  }

  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8)
}

async function loadLiveBatches(): Promise<OperationalBatch[]> {
  const [batches, medicines, locations] = await Promise.all([
    batchRepository.list(),
    medicineRepository.list(),
    locationRepository.list(false),
  ])

  const medicineById = new Map(medicines.map((medicine) => [medicine.id, medicine]))
  const locationById = new Map(locations.map((location) => [location.id, location]))

  return batches
    .filter((batch) => !batch.deletedAt)
    .map((batch) => ({
      id: batch.id,
      medicineId: batch.medicineId,
      medicineName: medicineById.get(batch.medicineId)?.displayName ?? batch.medicineId,
      batchNo: batch.batchNo,
      locationId: batch.locationId,
      locationName: locationById.get(batch.locationId)?.name ?? batch.locationId,
      remainingQuantity: batch.remainingQuantity,
      unitPrice: batch.unitPrice,
      expiryDate: batch.expiryDate,
      status: batch.status,
    }))
}

function emptySnapshot(source: DashboardSnapshot['source']): DashboardSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    source,
    metrics: buildMetrics([]),
    expiryOverview: [],
    stockByLocation: [],
    movementSeries: emptyMovementSeries(),
    stockHealth: { available: 0, lowStock: 0, hold: 0, expiringSoon: 0, expired: 0 },
    upcomingExpiry: [],
    lowStock: [],
    recentActivity: [],
  }
}

/**
 * Dashboard aggregation from live Firestore inventory.
 * No fake seed data when Firebase is configured.
 */
export const dashboardService = {
  async getSnapshot(): Promise<DashboardSnapshot> {
    if (!isFirebaseConfigured()) {
      return emptySnapshot('seed')
    }

    try {
      const batches = await loadLiveBatches()
      const [movementSeries, recentActivity] = await Promise.all([
        buildMovementSeries(),
        buildRecentActivity(),
      ])

      return {
        generatedAt: new Date().toISOString(),
        source: 'live',
        metrics: buildMetrics(batches),
        expiryOverview: buildExpiryOverview(batches),
        stockByLocation: buildStockByLocation(batches),
        movementSeries,
        stockHealth: buildStockHealth(batches),
        upcomingExpiry: buildUpcomingExpiry(batches),
        lowStock: buildLowStock(batches),
        recentActivity,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load dashboard.'
      throw new Error(message)
    }
  },
}
