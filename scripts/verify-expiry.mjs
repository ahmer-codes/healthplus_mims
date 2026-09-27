/**
 * Expiry Management verification.
 * Run: node scripts/verify-expiry.mjs
 */
import { createServer } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const storage = new Map()
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
  key: (index) => [...storage.keys()][index] ?? null,
  get length() {
    return storage.size
  },
}
globalThis.document = {
  createElement: () => ({ click() {}, href: '', download: '' }),
}
URL.createObjectURL = () => 'blob:mock'
URL.revokeObjectURL = () => undefined

let passed = 0
let failed = 0
function assert(condition, label) {
  if (condition) {
    passed += 1
    console.log(`  ✓ ${label}`)
  } else {
    failed += 1
    console.error(`  ✗ ${label}`)
  }
}

const server = await createServer({
  root,
  configFile: resolve(root, 'vite.config.ts'),
  server: { middlewareMode: true },
  appType: 'custom',
})

try {
  const { expiryService, stockInService } = await server.ssrLoadModule('/src/services/index.ts')
  const { medicineRepository } = await server.ssrLoadModule('/src/repositories/index.ts')

  console.log('\nExpiry Management')
  storage.clear()

  assert(expiryService.classify(-5) === 'expired', 'Negative days → expired')
  assert(expiryService.classify(10) === 'critical', '≤30 days → critical')
  assert(expiryService.classify(60) === 'expiring_soon', '≤90 days → expiring soon')
  assert(expiryService.classify(120) === 'upcoming', '>90 days → upcoming')

  const med = (await medicineRepository.list()).find((m) => m.id === 'med-paracetamol-500mg-tab')
  const user = {
    id: 'user-test',
    username: 'hospital',
    displayName: 'Hospital Pharmacist',
    email: 'hospital@healthplus.local',
    role: 'pharmacist',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const today = new Date()
  const iso = (days) => {
    const d = new Date(today)
    d.setDate(d.getDate() + days)
    return d.toISOString().slice(0, 10)
  }

  await stockInService.finalize({
    master: {
      purchaseOrderNo: 'PO-EXP-1',
      receivingDate: iso(-10),
      locationId: 'loc-main-pharmacy',
    },
    items: [
      {
        id: 'e1',
        medicineId: med.id,
        medicineDisplayName: med.displayName,
        manufacturerName: 'GSK',
        batchNo: 'EXP-CRIT',
        manufacturingDate: iso(-400),
        expiryDate: iso(20),
        quantity: 30,
        unitPrice: 2,
        totalPrice: 60,
      },
      {
        id: 'e2',
        medicineId: med.id,
        medicineDisplayName: med.displayName,
        manufacturerName: 'GSK',
        batchNo: 'EXP-SOON',
        manufacturingDate: iso(-400),
        expiryDate: iso(60),
        quantity: 15,
        unitPrice: 2,
        totalPrice: 30,
      },
      {
        id: 'e3',
        medicineId: med.id,
        medicineDisplayName: med.displayName,
        manufacturerName: 'GSK',
        batchNo: 'EXP-UP',
        manufacturingDate: iso(-400),
        expiryDate: iso(150),
        quantity: 40,
        unitPrice: 2,
        totalPrice: 80,
      },
      {
        id: 'e4',
        medicineId: med.id,
        medicineDisplayName: med.displayName,
        manufacturerName: 'GSK',
        batchNo: 'EXP-OLD',
        manufacturingDate: iso(-800),
        expiryDate: iso(-5),
        quantity: 8,
        unitPrice: 2,
        totalPrice: 16,
      },
    ],
    createdBy: user,
  })

  const board1 = await expiryService.getBoard({ windowMonths: 1 })
  assert(board1.summary.alreadyExpired >= 1, 'Summary counts expired')
  assert(board1.summary.within1Month >= 1, 'Summary counts 1-month window')
  assert(
    board1.rows.every((r) => r.daysRemaining < 0 || r.daysRemaining <= 30),
    '1-month window filters rows',
  )
  assert(board1.rows[0].watchStatus === 'expired' || board1.rows[0].watchStatus === 'critical', 'Urgent first')

  const board6 = await expiryService.getBoard({ windowMonths: 6 })
  assert(board6.rows.length >= 4, '6-month window includes more lots')
  assert(board6.medicineQuantities.length >= 1, 'Quantity chart data present')
  assert(board6.chartBands.some((b) => b.quantity > 0), 'Urgency bands have qty')

  const filtered = await expiryService.getBoard({
    windowMonths: 6,
    status: 'critical',
  })
  assert(filtered.rows.every((r) => r.watchStatus === 'critical'), 'Status filter works')

  const pdf = await expiryService.generatePdf({
    filter: { windowMonths: 3 },
    preparedBy: user,
  })
  assert(pdf instanceof Blob && pdf.size > 400, 'Expiry PDF generated')

  console.log(`\nResult: ${passed} passed, ${failed} failed\n`)
  process.exitCode = failed ? 1 : 0
} finally {
  await server.close()
}
