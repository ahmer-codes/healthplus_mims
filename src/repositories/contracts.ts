import type {
  Allocation,
  BatchFilter,
  CreateAllocationInput,
  CreateBatchInput,
  Contact,
  CreateContactInput,
  CreateDemandInput,
  CreateLocationInput,
  CreateMedicineInput,
  CreateStockInInput,
  CreateStockTransferInput,
  HospitalLocation,
  Medicine,
  MedicineBatch,
  MedicineDemand,
  MedicineFilter,
  Report,
  ReportRequest,
  StockIn,
  StockTransfer,
  UpdateBatchInput,
  UpdateContactInput,
  UpdateDemandInput,
  UpdateDemandStatusInput,
  UpdateMedicineInput,
} from '@/types'

export interface MedicineRepository {
  list(filter?: MedicineFilter): Promise<Medicine[]>
  getById(id: string): Promise<Medicine | null>
  search(query: string): Promise<Medicine[]>
  create(input: CreateMedicineInput): Promise<Medicine>
  update(id: string, input: UpdateMedicineInput): Promise<Medicine>
  findByIdentity(
    genericName: string,
    strength: string,
    dosageForm: string,
    volume?: string,
  ): Promise<Medicine | null>
}

export interface BatchRepository {
  list(filter?: BatchFilter): Promise<MedicineBatch[]>
  getById(id: string): Promise<MedicineBatch | null>
  listByMedicine(medicineId: string): Promise<MedicineBatch[]>
  listByLocation(locationId: string): Promise<MedicineBatch[]>
  findByMedicineAndBatchNo(medicineId: string, batchNo: string): Promise<MedicineBatch | null>
  create(input: CreateBatchInput): Promise<MedicineBatch>
  update(id: string, input: UpdateBatchInput): Promise<MedicineBatch>
  createMany(inputs: CreateBatchInput[]): Promise<MedicineBatch[]>
  remove?(id: string): Promise<void>
  /**
   * Atomically deduct quantity if the batch remains allocatable.
   * Local DB does a conditional write; Firestore should use a transaction.
   */
  deductQuantity(id: string, quantity: number): Promise<MedicineBatch>
  /**
   * Atomically move quantity from a source batch to the destination location.
   * Firestore should execute this inside runTransaction.
   */
  transferQuantity(
    sourceBatchId: string,
    toLocationId: string,
    quantity: number,
  ): Promise<{
    source: MedicineBatch
    destination: MedicineBatch
    destinationCreated: boolean
  }>
}

export interface LocationRepository {
  list(activeOnly?: boolean): Promise<HospitalLocation[]>
  getById(id: string): Promise<HospitalLocation | null>
  create(input: CreateLocationInput): Promise<HospitalLocation>
  update(id: string, input: Partial<CreateLocationInput>): Promise<HospitalLocation>
}

export interface StockInRepository {
  list(): Promise<StockIn[]>
  getById(id: string): Promise<StockIn | null>
  create(input: CreateStockInInput): Promise<StockIn>
  /**
   * Atomically create stock-in document and medicine batch lots (Firestore transaction).
   */
  finalize(input: CreateStockInInput): Promise<{ stockIn: StockIn; batches: MedicineBatch[] }>
  updateStatus(id: string, status: StockIn['status'], reportId?: string): Promise<StockIn>
  remove(id: string): Promise<void>
}

export interface AllocationRepository {
  list(): Promise<Allocation[]>
  getById(id: string): Promise<Allocation | null>
  create(input: CreateAllocationInput): Promise<Allocation>
  /**
   * Atomically create allocation and deduct batch quantities (Firestore transaction).
   */
  finalize(input: CreateAllocationInput): Promise<Allocation>
  updateStatus(id: string, status: Allocation['status'], reportId?: string): Promise<Allocation>
  remove(id: string): Promise<void>
}

export interface TransferRepository {
  list(): Promise<StockTransfer[]>
  getById(id: string): Promise<StockTransfer | null>
  create(input: CreateStockTransferInput): Promise<StockTransfer>
  /**
   * Atomically create transfer and move batch quantities source→destination
   * (Firestore transaction).
   */
  finalize(input: CreateStockTransferInput): Promise<StockTransfer>
  updateStatus(id: string, status: StockTransfer['status'], reportId?: string): Promise<StockTransfer>
  remove(id: string): Promise<void>
}

export interface ContactRepository {
  list(): Promise<Contact[]>
  getById(id: string): Promise<Contact | null>
  create(input: CreateContactInput): Promise<Contact>
  update(id: string, input: UpdateContactInput): Promise<Contact>
  remove(id: string): Promise<void>
}

export interface DemandRepository {
  list(): Promise<MedicineDemand[]>
  getById(id: string): Promise<MedicineDemand | null>
  create(input: CreateDemandInput): Promise<MedicineDemand>
  update(id: string, input: UpdateDemandInput): Promise<MedicineDemand>
  updateStatus(id: string, input: UpdateDemandStatusInput): Promise<MedicineDemand>
  remove(id: string): Promise<void>
}

export interface ReportRepository {
  list(): Promise<Report[]>
  getById(id: string): Promise<Report | null>
  create(input: ReportRequest): Promise<Report>
}
