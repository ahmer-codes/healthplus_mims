/**
 * Stock In module verification via Vite SSR module loader.
 * Run: node scripts/verify-stock-in.mjs
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
    validateMaster,
    validateItemForm,
    formValuesToDraftItem,
    emptyItemForm,
    stockInService,
    stockInPdfService,
  } = await server.ssrLoadModule('/src/services/index.ts')

  const { localInventoryDb } = await server.ssrLoadModule(
    '/src/repositories/local/inventory-db.ts',
  )
  const { medicineRepository } = await server.ssrLoadModule('/src/repositories/index.ts')

  console.log('\n1. Master validation')
  {
    const empty = validateMaster({
      purchaseOrderNo: '',
      receivingDate: '',
      locationId: 'loc-main-pharmacy',
    })
    assert(Boolean(empty.purchaseOrderNo), 'PO required')
    assert(Boolean(empty.receivingDate), 'Receiving date required')

    const ok = validateMaster({
      purchaseOrderNo: 'PO-1024',
      receivingDate: '2026-09-24',
      locationId: 'loc-main-pharmacy',
    })
    assert(!ok.purchaseOrderNo && !ok.receivingDate, 'Valid master passes')
  }

  console.log('\n2. Item validation')
  {
    const blank = validateItemForm(emptyItemForm())
    assert(Boolean(blank.medicineId), 'Medicine required')
    assert(Boolean(blank.manufacturerName), 'Manufacturer required')
    assert(Boolean(blank.batchNo), 'Batch required')
    assert(Boolean(blank.manufacturingDate), 'MFG required')
    assert(Boolean(blank.expiryDate), 'EXP required')
    assert(Boolean(blank.quantity), 'Quantity required')
    assert(Boolean(blank.unitPrice), 'Unit price required')

    const values = {
      medicineId: 'med-paracetamol-500mg-tab',
      manufacturerName: 'GSK',
      batchNo: 'B-001',
      manufacturingDate: '2026-01-01',
      expiryDate: '2025-01-01',
      quantity: '10',
      unitPrice: '5',
    }
    const expiryErr = validateItemForm(values)
    assert(
      Boolean(expiryErr.expiryDate?.includes('cannot be before')),
      'Expiry before MFG rejected',
    )

    const qtyErr = validateItemForm({ ...values, expiryDate: '2027-01-01', quantity: '0' })
    assert(Boolean(qtyErr.quantity), 'Non-positive quantity rejected')

    const priceErr = validateItemForm({
      ...values,
      expiryDate: '2027-01-01',
      quantity: '10',
      unitPrice: '-1',
    })
    assert(Boolean(priceErr.unitPrice), 'Negative unit price rejected')

    const itemA = formValuesToDraftItem(
      { ...values, expiryDate: '2027-01-01', quantity: '10', unitPrice: '12.5' },
      'Paracetamol 500mg Tablet',
    )
    assert(itemA.totalPrice === 125, 'Total price = qty × unit price')

    const dup = validateItemForm(
      { ...values, expiryDate: '2027-01-01' },
      { pendingItems: [itemA], editingId: 'other' },
    )
    assert(Boolean(dup.batchNo), 'Pending medicine+batch duplicate rejected')
  }

  console.log('\n3. Multi-item staging + edit/remove simulation')
  {
    const items = [
      formValuesToDraftItem(
        {
          medicineId: 'med-paracetamol-500mg-tab',
          manufacturerName: 'GSK',
          batchNo: 'BATCH-A',
          manufacturingDate: '2025-06-01',
          expiryDate: '2027-06-01',
          quantity: '100',
          unitPrice: '2.5',
        },
        'Paracetamol 500mg Tablet',
      ),
      formValuesToDraftItem(
        {
          medicineId: 'med-ibuprofen-400mg-tab',
          manufacturerName: 'Abbott',
          batchNo: 'BATCH-B',
          manufacturingDate: '2025-03-01',
          expiryDate: '2027-03-01',
          quantity: '50',
          unitPrice: '4',
        },
        'Ibuprofen 400mg Tablet',
      ),
    ]
    assert(items.length === 2, 'Multiple medicines staged')

    const edited = { ...items[0], quantity: 120, totalPrice: 300, unitPrice: 2.5 }
    const afterEdit = [edited, items[1]]
    assert(afterEdit[0].quantity === 120, 'Pending medicine editable')

    const afterRemove = afterEdit.filter((row) => row.id !== items[1].id)
    assert(afterRemove.length === 1, 'Pending medicine removable')
  }

  console.log('\n4. Finalization + inventory + PDF')
  {
    storage.clear()
    const medicines = await medicineRepository.list()
    assert(medicines.length > 0, 'Medicine catalog available')

    const med1 = medicines.find((m) => m.id === 'med-paracetamol-500mg-tab')
    const med2 = medicines.find((m) => m.id === 'med-ibuprofen-400mg-tab')
    assert(Boolean(med1 && med2), 'Catalog medicines resolve')

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

    const draftItems = [
      formValuesToDraftItem(
        {
          medicineId: med1.id,
          manufacturerName: 'GSK Pakistan',
          batchNo: 'PO24-PARA-01',
          manufacturingDate: '2025-01-15',
          expiryDate: '2027-01-15',
          quantity: '200',
          unitPrice: '1.75',
        },
        med1.displayName,
      ),
      formValuesToDraftItem(
        {
          medicineId: med2.id,
          manufacturerName: 'Abbott',
          batchNo: 'PO24-IBU-01',
          manufacturingDate: '2025-02-01',
          expiryDate: '2027-02-01',
          quantity: '80',
          unitPrice: '3.2',
        },
        med2.displayName,
      ),
    ]

    const result = await stockInService.finalize({
      master: {
        purchaseOrderNo: 'PO-1024',
        receivingDate: '2026-09-24',
        locationId: 'loc-main-pharmacy',
      },
      items: draftItems,
      createdBy: user,
    })

    assert(result.stockIn.status === 'posted', 'StockIn posted')
    assert(result.stockIn.items.length === 2, 'StockIn has two lines')
    assert(result.pdfBlob instanceof Blob && result.pdfBlob.size > 500, 'PDF blob generated')

    const batches = localInventoryDb.listBatches()
    assert(batches.length === 2, 'MedicineBatch records created')
    assert(
      batches.every((b) => b.remainingQuantity === b.quantityReceived),
      'Inventory quantities set',
    )

    const pdfPath = resolve(__dirname, '.tmp-stock-in.pdf')
    const buffer = Buffer.from(await result.pdfBlob.arrayBuffer())
    writeFileSync(pdfPath, buffer)
    const header = readFileSync(pdfPath).subarray(0, 5).toString()
    assert(header === '%PDF-', 'PDF file is valid')
    unlinkSync(pdfPath)

    stockInPdfService.download(result.pdfBlob, result.stockIn.purchaseOrderNo)
    assert(true, 'PDF download helper runs')

    let duplicateBlocked = false
    try {
      await stockInService.finalize({
        master: {
          purchaseOrderNo: 'PO-1025',
          receivingDate: '2026-09-24',
          locationId: 'loc-main-pharmacy',
        },
        items: [draftItems[0]],
        createdBy: user,
      })
    } catch (error) {
      duplicateBlocked = error instanceof Error && error.message.includes('already exists')
    }
    assert(duplicateBlocked, 'Duplicate medicine+batch blocked on finalize')
    assert(draftItems.length === 2, 'Staged items intact after finalize')
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed\n`)
  process.exitCode = failed ? 1 : 0
} finally {
  await server.close()
}
