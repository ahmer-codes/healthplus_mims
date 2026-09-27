/**
 * Configurable HealthPlus hospital locations / departments.
 * Seeded locally; repositories can later sync these to Firestore.
 */

export interface LocationSeed {
  id: string
  name: string
  code: string
  type: 'pharmacy' | 'emergency' | 'opd' | 'ward' | 'icu' | 'store' | 'other'
  sortOrder: number
}

export const HOSPITAL_LOCATION_SEEDS: readonly LocationSeed[] = [
  { id: 'loc-main-pharmacy', name: 'Main Pharmacy', code: 'MAIN', type: 'pharmacy', sortOrder: 10 },
  { id: 'loc-emergency', name: 'Emergency', code: 'ER', type: 'emergency', sortOrder: 20 },
  { id: 'loc-opd', name: 'OPD', code: 'OPD', type: 'opd', sortOrder: 30 },
  { id: 'loc-indoor-pharmacy', name: 'Indoor Pharmacy', code: 'INDR', type: 'pharmacy', sortOrder: 40 },
  { id: 'loc-ward-a', name: 'Ward A', code: 'WA', type: 'ward', sortOrder: 50 },
  { id: 'loc-ward-b', name: 'Ward B', code: 'WB', type: 'ward', sortOrder: 60 },
  { id: 'loc-pediatrics', name: 'Pediatrics', code: 'PED', type: 'ward', sortOrder: 70 },
  { id: 'loc-icu', name: 'ICU', code: 'ICU', type: 'icu', sortOrder: 80 },
] as const
