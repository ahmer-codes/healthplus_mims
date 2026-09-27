export const STATUS_LABELS = {
  // documents
  draft: 'Draft',
  posted: 'Posted',
  cancelled: 'Cancelled',
  // batches
  available: 'Available',
  hold: 'On Hold',
  expired: 'Expired',
  depleted: 'Depleted',
  // demands
  pending: 'Pending',
  approved: 'Approved',
  fulfilled: 'Fulfilled',
  // demand priority
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
  // expiry risk (derived)
  critical: 'Critical',
  warning: 'Warning',
  ok: 'OK',
  // expiry watch board
  expiring_soon: 'Expiring Soon',
  upcoming: 'Upcoming',
} as const

export type StatusKey = keyof typeof STATUS_LABELS

export const DEMAND_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const
export const DEMAND_STATUSES = ['pending', 'approved', 'fulfilled', 'cancelled'] as const
