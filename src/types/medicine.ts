import type { EntityId, Timestamp } from './common'

/**
 * A selectable medicine variant identified by generic name + strength +
 * dosage form + volume. never by brand name.
 *
 * Distinct combinations are distinct records, e.g.:
 * - Ibuprofen 100mg/5ml Suspension 30ml
 * - Ibuprofen 100mg/5ml Suspension 60ml
 * - Ibuprofen 200mg Tablet
 */
export type MedicineCategory =
  | 'Analgesic'
  | 'Antibiotic'
  | 'Antacid'
  | 'Antihistamine'
  | 'Antidiabetic'
  | 'Antihypertensive'
  | 'Respiratory'
  | 'Gastrointestinal'
  | 'Anthelmintic'
  | 'Dermatological'
  | 'Vitamins'
  | 'Emergency'
  | 'Other'

export interface Medicine {
  id: EntityId
  genericName: string
  strength: string
  dosageForm: string
  /** Pack / bottle volume when applicable (e.g. "60ml"). Empty for unit-dose tablets. */
  volume: string
  /** Canonical label: "{genericName} {strength} {dosageForm} {volume}".trim() */
  displayName: string
  isActive: boolean
  category?: MedicineCategory
  createdAt: Timestamp
  updatedAt: Timestamp
}

/** Input for creating a medicine variant (displayName may be omitted and derived). */
export interface CreateMedicineInput {
  genericName: string
  strength: string
  dosageForm: string
  volume?: string
  displayName?: string
  isActive?: boolean
  category?: MedicineCategory
}

export interface UpdateMedicineInput {
  genericName?: string
  strength?: string
  dosageForm?: string
  volume?: string
  displayName?: string
  isActive?: boolean
  category?: MedicineCategory
}

export interface MedicineFilter {
  query?: string
  genericName?: string
  dosageForm?: string
  category?: MedicineCategory
  isActive?: boolean
}
