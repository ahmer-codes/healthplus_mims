/**
 * Contacts & Medicine Demands verification.
 * Run: node scripts/verify-contacts-demands.mjs
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
  const { contactService, demandService, stockInService, DomainError } = await server.ssrLoadModule(
    '/src/services/index.ts',
  )
  const { medicineRepository } = await server.ssrLoadModule('/src/repositories/index.ts')

  console.log('\nContacts & Medicine Demands')
  storage.clear()

  // —— Contacts ——
  const contact = await contactService.create({
    name: 'Dr. Ayesha Khan',
    designation: 'Ward In-Charge',
    department: 'Ward A',
    phone: '+92-300-1112233',
    email: 'ayesha.khan@healthplus.local',
    notes: 'Prefers morning calls',
  })
  assert(!!contact.id, 'Create contact')
  assert(contact.name === 'Dr. Ayesha Khan', 'Contact name stored')

  let listed = await contactService.list({ query: 'ayesha' })
  assert(listed.length === 1, 'Search contacts by name')

  listed = await contactService.list({ department: 'Ward A' })
  assert(listed.length === 1, 'Filter contacts by department')

  await contactService.update(contact.id, {
    name: 'Dr. Ayesha Khan',
    designation: 'Senior Ward In-Charge',
    department: 'Ward A',
    phone: '+92-300-1112233',
    email: 'ayesha.khan@healthplus.local',
  })
  const updated = await contactService.getById(contact.id)
  assert(updated?.designation === 'Senior Ward In-Charge', 'Update contact')

  await contactService.remove(contact.id)
  assert((await contactService.getById(contact.id)) === null, 'Delete contact')

  // —— Demands ——
  const med = (await medicineRepository.list()).find((m) => m.id === 'med-paracetamol-500mg-tab')
  assert(!!med, 'Medicine catalog available')

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
      purchaseOrderNo: 'PO-DEM-1',
      receivingDate: iso(0),
      locationId: 'loc-main-pharmacy',
    },
    items: [
      {
        id: 'd1',
        medicineId: med.id,
        medicineDisplayName: med.displayName,
        manufacturerName: 'Test Pharma',
        batchNo: 'DEM-B1',
        manufacturingDate: iso(-30),
        expiryDate: iso(180),
        quantity: 100,
        unitPrice: 2.5,
        totalPrice: 250,
      },
    ],
    createdBy: user,
  })

  const available = await demandService.getAvailableQuantity(med.id)
  assert(available === 100, `Available qty after stock-in (${available})`)

  const demand = await demandService.create({
    medicineId: med.id,
    requestedQuantity: 40,
    requestingDepartment: 'Ward A',
    requestedBy: 'Nurse Fatima',
    priority: 'high',
    notes: 'Morning round',
  })
  assert(demand.status === 'pending', 'New demand starts pending')
  assert(demand.priority === 'high', 'Priority stored')

  const board = await demandService.listBoard()
  assert(board.length === 1, 'Demand appears on board')
  assert(board[0].availableQuantity === 100, 'Board shows available quantity')
  assert(board[0].canEdit === true, 'Pending demand is editable')

  await demandService.update(demand.id, {
    medicineId: med.id,
    requestedQuantity: 50,
    requestingDepartment: 'Ward A',
    requestedBy: 'Nurse Fatima',
    priority: 'urgent',
    requestDate: demand.requestDate,
    notes: 'Updated qty',
  })
  const edited = await demandService.getById(demand.id)
  assert(edited?.requestedQuantity === 50 && edited?.priority === 'urgent', 'Edit pending demand')

  let threw = false
  try {
    await demandService.updateStatus(demand.id, { status: 'fulfilled' })
  } catch (e) {
    threw = e instanceof DomainError
  }
  assert(threw, 'Cannot jump pending → fulfilled')

  await demandService.updateStatus(demand.id, { status: 'approved' })
  const approved = await demandService.getById(demand.id)
  assert(approved?.status === 'approved', 'Approve demand')

  threw = false
  try {
    await demandService.update(demand.id, {
      medicineId: med.id,
      requestedQuantity: 60,
      requestingDepartment: 'Ward A',
      requestedBy: 'Nurse Fatima',
      priority: 'urgent',
      requestDate: demand.requestDate,
    })
  } catch (e) {
    threw = e instanceof DomainError
  }
  assert(threw, 'Cannot edit non-pending demand')

  await demandService.updateStatus(demand.id, { status: 'fulfilled' })
  const fulfilled = await demandService.getById(demand.id)
  assert(fulfilled?.status === 'fulfilled', 'Fulfill demand explicitly')

  const stillAvailable = await demandService.getAvailableQuantity(med.id)
  assert(stillAvailable === 100, 'Fulfill does not deduct inventory')

  const summary = await demandService.getSummary()
  assert(summary.fulfilled === 1 && summary.pending === 0, 'Summary counts')

  console.log(`\n${passed} passed, ${failed} failed\n`)
  if (failed) process.exitCode = 1
} finally {
  await server.close()
}
