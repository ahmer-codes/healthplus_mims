/** Operational inventory thresholds used by dashboard and stock health. */
export const INVENTORY_THRESHOLDS = {
  /** Remaining units at or below this count as low stock (global default). */
  lowStockUnits: 25,
  /** Batches expiring within this many days appear in “Expiring Soon”. */
  expiringSoonDays: 180,
  /** Critical window for near-term expiry badges. */
  criticalExpiryDays: 30,
} as const

/** Configurable expiry watch windows for the Expiry Management page. */
export const EXPIRY_WATCH_WINDOWS = [
  { months: 1 as const, days: 30, label: '1 Month' },
  { months: 3 as const, days: 90, label: '3 Months' },
  { months: 6 as const, days: 180, label: '6 Months' },
] as const

export type ExpiryWatchMonths = (typeof EXPIRY_WATCH_WINDOWS)[number]['months']
