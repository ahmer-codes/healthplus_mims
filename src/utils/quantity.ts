const QTY = new Intl.NumberFormat('en-PK', {
  maximumFractionDigits: 3,
})

/** Formats a stock quantity, optionally with a unit suffix. */
export function formatQuantity(
  quantity: number | null | undefined,
  unit?: string | null,
): string {
  if (quantity === null || quantity === undefined || Number.isNaN(quantity)) {
    return '-'
  }
  const formatted = QTY.format(quantity)
  const trimmedUnit = unit?.trim()
  return trimmedUnit ? `${formatted} ${trimmedUnit}` : formatted
}

export function isPositiveQuantity(quantity: number): boolean {
  return Number.isFinite(quantity) && quantity > 0
}
