import { differenceInCalendarDays, isValid, parseISO, startOfDay } from 'date-fns'
import type { BatchStatus, ExpiryStatus } from '@/types'

function toDate(value: string | Date): Date | null {
  const date = typeof value === 'string' ? parseISO(value) : value
  return isValid(date) ? startOfDay(date) : null
}

export interface ExpiryThresholds {
  /** Days remaining at or below this → critical (default 30) */
  criticalDays: number
  /** Days remaining at or below this → warning (default 90) */
  warningDays: number
}

const DEFAULT_THRESHOLDS: ExpiryThresholds = {
  criticalDays: 30,
  warningDays: 90,
}

/**
 * Classifies expiry risk for UI badges and filtering.
 * Pure function. does not mutate batch records.
 */
export function getExpiryStatus(
  expiryDate: string | Date | null | undefined,
  asOf: Date = new Date(),
  thresholds: ExpiryThresholds = DEFAULT_THRESHOLDS,
): ExpiryStatus {
  if (!expiryDate) return 'ok'
  const expiry = toDate(expiryDate)
  if (!expiry) return 'ok'

  const days = differenceInCalendarDays(expiry, startOfDay(asOf))
  if (days < 0) return 'expired'
  if (days <= thresholds.criticalDays) return 'critical'
  if (days <= thresholds.warningDays) return 'warning'
  return 'ok'
}

export function getDaysUntilExpiry(
  expiryDate: string | Date | null | undefined,
  asOf: Date = new Date(),
): number | null {
  if (!expiryDate) return null
  const expiry = toDate(expiryDate)
  if (!expiry) return null
  return differenceInCalendarDays(expiry, startOfDay(asOf))
}

export function isExpired(
  expiryDate: string | Date | null | undefined,
  asOf: Date = new Date(),
): boolean {
  return getExpiryStatus(expiryDate, asOf) === 'expired'
}

/**
 * Derives the authoritative batch status from quantity + expiry.
 * Explicit "hold" is preserved unless the batch is depleted or expired.
 */
export function deriveBatchStatus(input: {
  remainingQuantity: number
  expiryDate: string | Date
  currentStatus?: BatchStatus
  asOf?: Date
}): BatchStatus {
  const asOf = input.asOf ?? new Date()

  if (input.remainingQuantity <= 0) return 'depleted'
  if (isExpired(input.expiryDate, asOf)) return 'expired'
  if (input.currentStatus === 'hold') return 'hold'
  return 'available'
}
