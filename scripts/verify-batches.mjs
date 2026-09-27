/**
 * Batch Management verification.
 * Run: node scripts/verify-batches.mjs
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
  const { batchService, stockInService } = await server.ssrLoadModule('/src/services/index.ts')
  const { medicineRepository } = await server.ssrLoadModule('/src/repositories/index.ts')

  console.log('\nBatch management')
  storage.clear()

  const medicines = await medicineRepository.list()
  const med = medicines.find((m) => m.id === 'med-paracetamol-500mg-tab')
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

  await stockInService.finalize({
    master: {
      purchaseOrderNo: 'PO-BATCH-MGMT',
      receivingDate: '2026-09-20',
      locationId: 'loc-main-pharmacy',
    },
    items: [
      {
        id: 'pend1',
        medicineId: med.id,
        medicineDisplayName: med.displayName,
        manufacturerName: 'GSK',
        batchNo: 'BM-001',
        manufacturingDate: '2025-01-01',
        expiryDate: '2027-06-01',
        quantity: 50,
        unitPrice: 2,
        totalPrice: 100,
      },
      {
        id: 'pend2',
        medicineId: med.id,
        medicineDisplayName: med.displayName,
        manufacturerName: 'Abbott',
        batchNo: 'BM-002',
        manufacturingDate: '2024-01-01',
        expiryDate: '2026-10-01',
        quantity: 20,
        unitPrice: 3,
        totalPrice: 60,
      },
    ],
    createdBy: user,
  })

  const summary = await batchService.getBoardSummary()
  assert(summary.total === 2, 'Summary total = 2')
  assert(summary.available === 2, 'Both available initially')

  const board = await batchService.listBoard({ sortBy: 'expiryDate', sortDir: 'asc' })
  assert(board.length === 2, 'Board lists both batches')
  assert(board[0].medicine.genericName === 'Paracetamol', 'Medicine enrichment present')

  const availableBefore = await batchService.getAvailableForMedicine(
    med.id,
    'loc-main-pharmacy',
  )
  assert(availableBefore.length === 2, 'Both allocatable before hold')

  const holdTarget = availableBefore[0]
  await batchService.setHold(holdTarget.id, true)
  const held = await batchService.getById(holdTarget.id)
  assert(held.status === 'hold', 'Hold status applied')
  assert(held.remainingQuantity === holdTarget.remainingQuantity, 'Quantity preserved on hold')

  const availableAfter = await batchService.getAvailableForMedicine(
    med.id,
    'loc-main-pharmacy',
  )
  assert(availableAfter.length === 1, 'Held batch excluded from allocation selector')
  assert(
    !availableAfter.some((b) => b.id === holdTarget.id),
    'Held batch id not in allocatable list',
  )

  let blocked = false
  try {
    await batchService.requireAllocatable(holdTarget.id)
  } catch {
    blocked = true
  }
  assert(blocked, 'requireAllocatable rejects hold')

  await batchService.setHold(holdTarget.id, false)
  const released = await batchService.getById(holdTarget.id)
  assert(released.status === 'available', 'Make available restores status')

  const preview = batchService.previewEdit(released, {
    remainingQuantity: released.remainingQuantity - 1,
    manufacturerName: 'GSK Updated',
  })
  assert(preview.requiresConfirmation, 'Sensitive remaining qty needs confirmation')
  assert(preview.sensitiveFields.includes('remainingQuantity'), 'remainingQuantity flagged')

  let needsConfirm = false
  try {
    await batchService.applyEdit(released.id, { remainingQuantity: 5 }, false)
  } catch (error) {
    needsConfirm = error instanceof Error && /confirm/i.test(error.message)
  }
  assert(needsConfirm, 'Unconfirmed sensitive edit blocked')

  await batchService.applyEdit(released.id, { remainingQuantity: 5 }, true)
  const edited = await batchService.getById(released.id)
  assert(edited.remainingQuantity === 5, 'Confirmed edit applied')

  const unused = availableAfter[0]
  const removeResult = await batchService.remove(unused.id)
  assert(removeResult.mode === 'hard', 'Unused batch hard-deleted')
  const gone = await batchService.getById(unused.id)
  assert(!gone, 'Hard-deleted batch gone')

  const summaryEnd = await batchService.getBoardSummary()
  assert(summaryEnd.total === 1, 'Summary reflects remaining batch')

  console.log(`\nResult: ${passed} passed, ${failed} failed\n`)
  process.exitCode = failed ? 1 : 0
} finally {
  await server.close()
}
