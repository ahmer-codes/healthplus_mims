/** Shared primitive identifiers and domain status unions */

export type EntityId = string

/** ISO-8601 date or datetime string */
export type Timestamp = string

/** Calendar date string (yyyy-MM-dd) preferred for receiving / expiry fields */
export type DateString = string

export type UserRole = 'admin' | 'pharmacist' | 'staff'

/** Batch / on-hand stock status */
export type BatchStatus = 'available' | 'hold' | 'expired' | 'depleted'

/** Stock movement documents (stock-in, allocation, transfer) */
export type DocumentStatus = 'draft' | 'posted' | 'cancelled'

/** Medicine demand workflow */
export type DemandStatus = 'pending' | 'approved' | 'fulfilled' | 'cancelled'

export type DemandPriority = 'low' | 'normal' | 'high' | 'urgent'

/** Derived expiry risk (not persisted) */
export type ExpiryStatus = 'expired' | 'critical' | 'warning' | 'ok'

/**
 * @deprecated Prefer BatchStatus for batches. Kept as alias during migration.
 */
export type StockStatus = BatchStatus
