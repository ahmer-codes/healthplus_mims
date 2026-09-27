/** Firestore collection names. single source of truth. */
export const COLLECTIONS = {
  users: 'users',
  medicines: 'medicines',
  batches: 'medicineBatches',
  locations: 'locations',
  stockIns: 'stockIns',
  allocations: 'allocations',
  transfers: 'stockTransfers',
  contacts: 'contacts',
  demands: 'medicineDemands',
} as const

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS]
