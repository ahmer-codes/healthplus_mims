/**
 * Allocate module verification via Vite SSR module loader.
 * Run: node scripts/verify-allocate.mjs
 */
import { createServer } from 'vite'
import { writeFileSync, readFileSync, unlinkSync } from 'node:fs'
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
  createElement: () => ({
    click() {},
    href: '',
    download: '',
  }),
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
  const {
    validateAllocationMaster,
    validateAllocationItemForm,
    formValuesToAllocationDraftItem,
    emptyAllocationItemForm,
    allocationService,
    allocationPdfService,
    stockInService,
    batchService,
  } = await server.ssrLoadModule('/src/services/index.ts')

  const { localInventoryDb } = await server.ssrLoadModule(
    '/src/repositories/local/inventory-db.ts',
  )
  const { medicineRepository } = await server.ssrLoadModule('/src/repositories/index.ts')

  console.log('\n1. Master validation')
  {
    const empty = validateAllocationMaster({
      date: '',
      voucherNo: '',
      destinationLocationId: '',
      receiverName: '',
      receiverDesignation: '',
    })
    assert(Boolean(empty.date), 'Date required')
    assert(Boolean(empty.voucherNo), 'Voucher required')
    assert(Boolean(empty.destinationLocationId), 'Destination required')

    const ok = validateAllocationMaster({
      date: '2026-09-24',
      voucherNo: 'ALC-1',
      destinationLocationId: 'loc-emergency',
      receiverName: '',
      receiverDesignation: '',
    })
    assert(!ok.date && !ok.voucherNo && !ok.destinationLocationId, 'Valid master passes')
  }

  console.log('\n2. Item validation')
  {
    const blank = validateAllocationItemForm(emptyAllocationItemForm(), {
      availableQuantity: 10,
    })
    assert(Boolean(blank.medicineId), 'Medicine required')
    assert(Boolean(blank.batchId), 'Batch required')
    assert(Boolean(blank.quantity), 'Quantity required')

    const over = validateAllocationItemForm(
      {
        medicineId: 'med-1',
        batchId: 'bat-1',
        quantity: '50',
      },
      { availableQuantity: 20 },
    )
    assert(Boolean(over.quantity), 'Qty exceeding available rejected')
  }

  console.log('\n3. Seed stock via Stock In, then allocate')
  {
    storage.clear()
    const medicines = await medicineRepository.list()
    const med = medicines.find((m) => m.id === 'med-paracetamol-500mg-tab')
    assert(Boolean(med), 'Catalog medicine available')

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
        purchaseOrderNo: 'PO-ALLOC-SEED',
        receivingDate: '2026-09-20',
        locationId: 'loc-main-pharmacy',
      },
      items: [
        {
          id: 'pend_seed',
          medicineId: med.id,
          medicineDisplayName: med.displayName,
          manufacturerName: 'GSK',
          batchNo: 'SEED-BATCH',
          manufacturingDate: '2025-09-01',
          expiryDate: '2027-09-01',
          quantity: 100,
          unitPrice: 2,
          totalPrice: 200,
        },
      ],
      createdBy: user,
    })

    const available = await batchService.getAvailableForMedicine(
      med.id,
      'loc-main-pharmacy',
    )
    assert(available.length === 1, 'Allocatable batch present')
    assert(available[0].remainingQuantity === 100, 'Full quantity available')

    const held = { ...available[0], status: 'hold' }
    assert(!batchService.isAllocatable(held), 'Hold batches not allocatable')

    const allocatableMeds = await batchService.listAllocatableMedicines('loc-main-pharmacy')
    assert(
      allocatableMeds.some((row) => row.medicine.id === med.id),
      'Medicine appears in allocatable selector list',
    )

    const draftItem = formValuesToAllocationDraftItem(
      {
        medicineId: med.id,
        batchId: available[0].id,
        quantity: '25',
      },
      {
        medicineDisplayName: med.displayName,
        batchNo: available[0].batchNo,
        expiryDate: available[0].expiryDate,
        availableQuantity: available[0].remainingQuantity,
      },
    )

    const result = await allocationService.finalize({
      master: {
        date: '2026-09-24',
        voucherNo: 'ALC-2048',
        destinationLocationId: 'loc-emergency',
        receiverName: 'Dr. Ali',
        receiverDesignation: 'MO',
      },
      items: [draftItem],
      createdBy: user,
    })

    assert(result.allocation.status === 'posted', 'Allocation posted')
    assert(result.pdfBlob instanceof Blob && result.pdfBlob.size > 400, 'PDF generated')

    const after = await batchService.getById(available[0].id)
    assert(after.remainingQuantity === 75, 'Inventory deducted by 25')

    const pdfPath = resolve(__dirname, '.tmp-allocation.pdf')
    writeFileSync(pdfPath, Buffer.from(await result.pdfBlob.arrayBuffer()))
    assert(readFileSync(pdfPath).subarray(0, 5).toString() === '%PDF-', 'PDF valid')
    unlinkSync(pdfPath)

    allocationPdfService.download(result.pdfBlob, result.allocation.voucherNo)
    assert(true, 'PDF download helper runs')

    let overBlocked = false
    try {
      await allocationService.finalize({
        master: {
          date: '2026-09-24',
          voucherNo: 'ALC-2049',
          destinationLocationId: 'loc-icu',
          receiverName: '',
          receiverDesignation: '',
        },
        items: [
          formValuesToAllocationDraftItem(
            {
              medicineId: med.id,
              batchId: available[0].id,
              quantity: '999',
            },
            {
              medicineDisplayName: med.displayName,
              batchNo: available[0].batchNo,
              expiryDate: available[0].expiryDate,
              availableQuantity: 75,
            },
          ),
        ],
        createdBy: user,
      })
    } catch (error) {
      overBlocked = error instanceof Error && /insufficient|exceed/i.test(error.message)
    }
    assert(overBlocked, 'Over-allocation blocked')

    const still = await batchService.getById(available[0].id)
    assert(still.remainingQuantity === 75, 'Failed finalize did not deduct')

    assert(localInventoryDb.listAllocations().length === 1, 'Only successful allocation kept')
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed\n`)
  process.exitCode = failed ? 1 : 0
} finally {
  await server.close()
}
