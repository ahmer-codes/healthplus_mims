const PKR = new Intl.NumberFormat('en-PK', {
  style: 'currency',
  currency: 'PKR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const PKR_COMPACT = new Intl.NumberFormat('en-PK', {
  style: 'currency',
  currency: 'PKR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

/** Formats an amount as Pakistani Rupees (e.g. "Rs 1,250.00"). */
export function formatCurrency(amount: number | null | undefined, compact = false): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '-'
  return (compact ? PKR_COMPACT : PKR).format(amount)
}

/** Line total helper used by stock-in and pricing services. */
export function calculateLineTotal(quantity: number, unitPrice: number): number {
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return 0
  return roundMoney(quantity * unitPrice)
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
