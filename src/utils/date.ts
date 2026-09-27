import { addDays as dfAddDays, format, formatDistanceToNow, isValid, parseISO } from 'date-fns'

export function formatDate(value: string | Date | null | undefined, pattern = 'dd MMM yyyy'): string {
  if (!value) return '-'
  const date = typeof value === 'string' ? parseISO(value) : value
  if (!isValid(date)) return '-'
  return format(date, pattern)
}

export function formatDateTime(value: string | Date | null | undefined): string {
  return formatDate(value, 'dd MMM yyyy, HH:mm')
}

export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return '-'
  const date = typeof value === 'string' ? parseISO(value) : value
  if (!isValid(date)) return '-'
  return formatDistanceToNow(date, { addSuffix: true })
}

/** Today as yyyy-MM-dd for form defaults. */
export function todayDateString(asOf: Date = new Date()): string {
  return format(asOf, 'yyyy-MM-dd')
}

export function addDays(date: string | Date, days: number): string {
  const base = typeof date === 'string' ? parseISO(date) : date
  return format(dfAddDays(base, days), 'yyyy-MM-dd')
}

export function nowIso(asOf: Date = new Date()): string {
  return asOf.toISOString()
}
