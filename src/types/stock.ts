import type { DateString, DocumentStatus, EntityId, Timestamp } from './common'

export interface StockInItem {
  id: EntityId
  medicineId: EntityId
  manufacturerName: string
  batchNo: string
  manufacturingDate: DateString
  expiryDate: DateString
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface StockIn {
  id: EntityId
  purchaseOrderNo: string
  receivingDate: DateString
  items: StockInItem[]
  createdBy: EntityId
  createdAt: Timestamp
  status: DocumentStatus
  reportId?: EntityId
  /** Default receiving location for created batches */
  locationId: EntityId
  updatedAt: Timestamp
}

export interface CreateStockInItemInput {
  medicineId: EntityId
  manufacturerName: string
  batchNo: string
  manufacturingDate: DateString
  expiryDate: DateString
  quantity: number
  unitPrice: number
}

export interface CreateStockInInput {
  purchaseOrderNo: string
  receivingDate: DateString
  locationId: EntityId
  items: CreateStockInItemInput[]
  createdBy: EntityId
  status?: DocumentStatus
}

export interface AllocationItem {
  id: EntityId
  medicineId: EntityId
  batchId: EntityId
  quantity: number
}

export interface Allocation {
  id: EntityId
  date: DateString
  voucherNo: string
  destinationLocationId: EntityId
  /** Optional receiver details */
  receiverName: string
  receiverDesignation: string
  items: AllocationItem[]
  createdBy: EntityId
  createdAt: Timestamp
  status: DocumentStatus
  reportId?: EntityId
  updatedAt: Timestamp
}

export interface CreateAllocationItemInput {
  medicineId: EntityId
  batchId: EntityId
  quantity: number
}

export interface CreateAllocationInput {
  date: DateString
  voucherNo: string
  destinationLocationId: EntityId
  receiverName?: string
  receiverDesignation?: string
  items: CreateAllocationItemInput[]
  createdBy: EntityId
  status?: DocumentStatus
}

export interface StockTransferItem {
  id: EntityId
  medicineId: EntityId
  batchId: EntityId
  quantity: number
}

export interface StockTransfer {
  id: EntityId
  date: DateString
  voucherNo: string
  fromLocationId: EntityId
  toLocationId: EntityId
  items: StockTransferItem[]
  createdBy: EntityId
  createdAt: Timestamp
  status: DocumentStatus
  reportId?: EntityId
  updatedAt: Timestamp
}

export interface CreateStockTransferItemInput {
  medicineId: EntityId
  batchId: EntityId
  quantity: number
}

export interface CreateStockTransferInput {
  date: DateString
  voucherNo: string
  fromLocationId: EntityId
  toLocationId: EntityId
  items: CreateStockTransferItemInput[]
  createdBy: EntityId
  status?: DocumentStatus
}
