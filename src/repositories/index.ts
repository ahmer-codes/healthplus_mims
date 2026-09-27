export { RepositoryError, notImplemented } from './base'
export type { RepositoryResult } from './base'
export type {
  MedicineRepository,
  BatchRepository,
  LocationRepository,
  StockInRepository,
  AllocationRepository,
  TransferRepository,
  ContactRepository,
  DemandRepository,
  ReportRepository,
} from './contracts'

/**
 * Application repository singletons. Firebase Auth + Firestore adapters.
 * Swap implementations here without touching pages or services.
 */
export {
  medicineRepository,
  batchRepository,
  locationRepository,
  stockInRepository,
  allocationRepository,
  transferRepository,
  demandRepository,
  contactRepository,
  reportRepository,
  COLLECTIONS,
} from './firebase'

export { userRepository, UserRepository } from './user.repository'
export { authRepository, AuthRepository } from './auth.repository'
