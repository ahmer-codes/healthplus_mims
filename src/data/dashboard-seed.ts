/**
 * Isolated development seed for the operational dashboard.
 *
 * Used only when live Firestore inventory data is unavailable.
 * Do not import this from Vue components. go through dashboardService.
 */

import type { BatchStatus, DateString } from '@/types'

export interface DashboardSeedBatch {
  id: string
  medicineId: string
  medicineName: string
  batchNo: string
  locationId: string
  locationName: string
  remainingQuantity: number
  unitPrice: number
  expiryDate: DateString
  status: BatchStatus
}

export interface DashboardSeedMovementDay {
  date: DateString
  stockIn: number
  allocation: number
  transfer: number
}

export interface DashboardSeedActivity {
  id: string
  kind: 'stock_in' | 'allocation' | 'transfer'
  title: string
  subtitle: string
  at: string
  href?: string
}

export interface DashboardSeedMedicineThreshold {
  medicineId: string
  medicineName: string
  threshold: number
}

function daysFromNow(days: number): DateString {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function daysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

export const DASHBOARD_SEED_THRESHOLDS: readonly DashboardSeedMedicineThreshold[] = [
  { medicineId: 'med-paracetamol-500mg-tab', medicineName: 'Paracetamol 500mg Tablet', threshold: 200 },
  { medicineId: 'med-amoxicillin-500mg-cap', medicineName: 'Amoxicillin 500mg Capsule', threshold: 120 },
  { medicineId: 'med-ibuprofen-100mg5ml-susp-60ml', medicineName: 'Ibuprofen 100mg/5ml Suspension 60ml', threshold: 40 },
  { medicineId: 'med-ceftriaxone-1g-inj', medicineName: 'Ceftriaxone 1g Injection', threshold: 50 },
  { medicineId: 'med-ors-20-5g-sachet', medicineName: 'Oral Rehydration Salts 20.5g Sachet', threshold: 80 },
  { medicineId: 'med-ns-0-9-500ml-inf', medicineName: 'Sodium Chloride 0.9% Infusion 500ml', threshold: 60 },
]

export const DASHBOARD_SEED_BATCHES: readonly DashboardSeedBatch[] = [
  {
    id: 'seed-b1',
    medicineId: 'med-paracetamol-500mg-tab',
    medicineName: 'Paracetamol 500mg Tablet',
    batchNo: 'PCT-2401',
    locationId: 'loc-main-pharmacy',
    locationName: 'Main Pharmacy',
    remainingQuantity: 840,
    unitPrice: 1.2,
    expiryDate: daysFromNow(410),
    status: 'available',
  },
  {
    id: 'seed-b2',
    medicineId: 'med-paracetamol-500mg-tab',
    medicineName: 'Paracetamol 500mg Tablet',
    batchNo: 'PCT-2388',
    locationId: 'loc-emergency',
    locationName: 'Emergency',
    remainingQuantity: 120,
    unitPrice: 1.2,
    expiryDate: daysFromNow(55),
    status: 'available',
  },
  {
    id: 'seed-b3',
    medicineId: 'med-amoxicillin-500mg-cap',
    medicineName: 'Amoxicillin 500mg Capsule',
    batchNo: 'AMX-1190',
    locationId: 'loc-main-pharmacy',
    locationName: 'Main Pharmacy',
    remainingQuantity: 95,
    unitPrice: 4.5,
    expiryDate: daysFromNow(140),
    status: 'available',
  },
  {
    id: 'seed-b4',
    medicineId: 'med-ibuprofen-100mg5ml-susp-60ml',
    medicineName: 'Ibuprofen 100mg/5ml Suspension 60ml',
    batchNo: 'IBU-60-221',
    locationId: 'loc-pediatrics',
    locationName: 'Pediatrics',
    remainingQuantity: 18,
    unitPrice: 85,
    expiryDate: daysFromNow(28),
    status: 'available',
  },
  {
    id: 'seed-b5',
    medicineId: 'med-ibuprofen-100mg5ml-susp-30ml',
    medicineName: 'Ibuprofen 100mg/5ml Suspension 30ml',
    batchNo: 'IBU-30-104',
    locationId: 'loc-opd',
    locationName: 'OPD',
    remainingQuantity: 42,
    unitPrice: 55,
    expiryDate: daysFromNow(95),
    status: 'available',
  },
  {
    id: 'seed-b6',
    medicineId: 'med-ceftriaxone-1g-inj',
    medicineName: 'Ceftriaxone 1g Injection',
    batchNo: 'CTX-7781',
    locationId: 'loc-icu',
    locationName: 'ICU',
    remainingQuantity: 36,
    unitPrice: 210,
    expiryDate: daysFromNow(70),
    status: 'available',
  },
  {
    id: 'seed-b7',
    medicineId: 'med-ceftriaxone-1g-inj',
    medicineName: 'Ceftriaxone 1g Injection',
    batchNo: 'CTX-7602',
    locationId: 'loc-main-pharmacy',
    locationName: 'Main Pharmacy',
    remainingQuantity: 14,
    unitPrice: 210,
    expiryDate: daysFromNow(18),
    status: 'available',
  },
  {
    id: 'seed-b8',
    medicineId: 'med-metronidazole-500mg100ml-inf',
    medicineName: 'Metronidazole 500mg/100ml Infusion 100ml',
    batchNo: 'MTZ-INF-55',
    locationId: 'loc-indoor-pharmacy',
    locationName: 'Indoor Pharmacy',
    remainingQuantity: 64,
    unitPrice: 95,
    expiryDate: daysFromNow(160),
    status: 'available',
  },
  {
    id: 'seed-b9',
    medicineId: 'med-ors-20-5g-sachet',
    medicineName: 'Oral Rehydration Salts 20.5g Sachet',
    batchNo: 'ORS-330',
    locationId: 'loc-opd',
    locationName: 'OPD',
    remainingQuantity: 22,
    unitPrice: 18,
    expiryDate: daysFromNow(200),
    status: 'available',
  },
  {
    id: 'seed-b10',
    medicineId: 'med-ns-0-9-500ml-inf',
    medicineName: 'Sodium Chloride 0.9% Infusion 500ml',
    batchNo: 'NS-500-901',
    locationId: 'loc-ward-a',
    locationName: 'Ward A',
    remainingQuantity: 48,
    unitPrice: 72,
    expiryDate: daysFromNow(300),
    status: 'available',
  },
  {
    id: 'seed-b11',
    medicineId: 'med-ns-0-9-500ml-inf',
    medicineName: 'Sodium Chloride 0.9% Infusion 500ml',
    batchNo: 'NS-500-812',
    locationId: 'loc-emergency',
    locationName: 'Emergency',
    remainingQuantity: 12,
    unitPrice: 72,
    expiryDate: daysFromNow(45),
    status: 'hold',
  },
  {
    id: 'seed-b12',
    medicineId: 'med-adrenaline-1mg1ml-inj',
    medicineName: 'Adrenaline 1mg/1ml Injection 1ml',
    batchNo: 'ADR-019',
    locationId: 'loc-emergency',
    locationName: 'Emergency',
    remainingQuantity: 8,
    unitPrice: 45,
    expiryDate: daysFromNow(-12),
    status: 'expired',
  },
  {
    id: 'seed-b13',
    medicineId: 'med-omeprazole-40mg-inj',
    medicineName: 'Omeprazole 40mg Injection',
    batchNo: 'OME-441',
    locationId: 'loc-ward-b',
    locationName: 'Ward B',
    remainingQuantity: 27,
    unitPrice: 160,
    expiryDate: daysFromNow(110),
    status: 'available',
  },
  {
    id: 'seed-b14',
    medicineId: 'med-insulin-regular-100iu-ml-vial-10ml',
    medicineName: 'Insulin Regular (Human) 100 IU/ml Vial 10ml',
    batchNo: 'INS-R-77',
    locationId: 'loc-main-pharmacy',
    locationName: 'Main Pharmacy',
    remainingQuantity: 19,
    unitPrice: 480,
    expiryDate: daysFromNow(88),
    status: 'available',
  },
  {
    id: 'seed-b15',
    medicineId: 'med-vancomycin-1g-inj',
    medicineName: 'Vancomycin 1g Injection',
    batchNo: 'VAN-220',
    locationId: 'loc-icu',
    locationName: 'ICU',
    remainingQuantity: 11,
    unitPrice: 920,
    expiryDate: daysFromNow(36),
    status: 'available',
  },
]

export const DASHBOARD_SEED_MOVEMENT: readonly DashboardSeedMovementDay[] = [
  { date: daysFromNow(-27), stockIn: 420, allocation: 180, transfer: 40 },
  { date: daysFromNow(-24), stockIn: 80, allocation: 210, transfer: 55 },
  { date: daysFromNow(-21), stockIn: 260, allocation: 150, transfer: 30 },
  { date: daysFromNow(-18), stockIn: 40, allocation: 190, transfer: 70 },
  { date: daysFromNow(-15), stockIn: 510, allocation: 240, transfer: 45 },
  { date: daysFromNow(-12), stockIn: 120, allocation: 175, transfer: 60 },
  { date: daysFromNow(-9), stockIn: 90, allocation: 220, transfer: 35 },
  { date: daysFromNow(-6), stockIn: 340, allocation: 160, transfer: 80 },
  { date: daysFromNow(-3), stockIn: 70, allocation: 200, transfer: 50 },
  { date: daysFromNow(0), stockIn: 180, allocation: 130, transfer: 25 },
]

export const DASHBOARD_SEED_ACTIVITY: readonly DashboardSeedActivity[] = [
  {
    id: 'act-1',
    kind: 'stock_in',
    title: 'Stock in PO-4521 posted',
    subtitle: '18 lines · Main Pharmacy',
    at: daysAgo(0.3),
    href: '/stock/stock-in',
  },
  {
    id: 'act-2',
    kind: 'allocation',
    title: 'Allocation VCH-118 to ICU',
    subtitle: 'Ceftriaxone · 12 vials',
    at: daysAgo(0.8),
    href: '/stock/allocate',
  },
  {
    id: 'act-3',
    kind: 'transfer',
    title: 'Transfer TR-77 Emergency → Ward A',
    subtitle: 'NS 0.9% · 20 bags',
    at: daysAgo(1.4),
    href: '/stock/transfer',
  },
  {
    id: 'act-4',
    kind: 'allocation',
    title: 'Allocation VCH-116 to Pediatrics',
    subtitle: 'Ibuprofen suspension · 6 bottles',
    at: daysAgo(2.1),
    href: '/stock/allocate',
  },
  {
    id: 'act-5',
    kind: 'stock_in',
    title: 'Stock in PO-4498 posted',
    subtitle: 'Antibiotics · Indoor Pharmacy',
    at: daysAgo(3.2),
    href: '/stock/stock-in',
  },
]
