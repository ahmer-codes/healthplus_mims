/**
 * Firebase-backed repository implementations.
 * UI and services depend on contracts. not these classes directly.
 */
export { COLLECTIONS } from './collections'
export { requireFirestore, collectionRef, docRef } from './firestore'
export { medicineRepository, FirebaseMedicineRepository } from './medicine.repository'
export { batchRepository, FirebaseBatchRepository } from './batch.repository'
export { locationRepository, FirebaseLocationRepository } from './location.repository'
export { stockInRepository, FirebaseStockInRepository } from './stock-in.repository'
export { allocationRepository, FirebaseAllocationRepository } from './allocation.repository'
export { transferRepository, FirebaseTransferRepository } from './transfer.repository'
export { demandRepository, FirebaseDemandRepository } from './demand.repository'
export { contactRepository, FirebaseContactRepository } from './contact.repository'
export { reportRepository, FirebaseReportRepository } from './report.repository'
