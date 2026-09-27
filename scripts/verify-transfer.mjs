/**
 * Stock Transfer verification via Vite SSR module loader.
 * Run: node scripts/verify-transfer.mjs
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
    validateTransferMaster,
    validateTransferItemForm,
    formValuesToTransferDraftItem,
    emptyTransferItemForm,
    transferService,
    reportService,
    stockInService,
    batchService,
  } = await server.ssrLoadModule('/src/services/index.ts')

  const { localInventoryDb } = await server.ssrLoadModule(
    '/src/repositories/local/inventory-db.ts',
  )
  const { medicineRepository } = await server.ssrLoadModule('/src/repositories/index.ts')

  console.log('\n1. Master validation')
  {
    const empty = validateTransferMaster({
      date: '',
      voucherNo: '',
      fromLocationId: '',
      toLocationId: '',
    })
    assert(Boolean(empty.date), 'Date required')
    assert(Boolean(empty.voucherNo), 'Voucher required')
    assert(Boolean(empty.fromLocationId), 'From required')
    assert(Boolean(empty.toLocationId), 'To required')

    const same = validateTransferMaster({
      date: '2026-09-24',
      voucherNo: 'TRF-1',
      fromLocationId: 'loc-main-pharmacy',
      toLocationId: 'loc-main-pharmacy',
    })
    assert(Boolean(same.toLocationId), 'Same location rejected')
  }

  console.log('\n2. Item validation')
  {
    const blank = validateTransferItemForm(emptyTransferItemForm(), { availableQuantity: 10 })
    assert(Boolean(blank.medicineId && blank.batchId && blank.quantity), 'Line fields required')

    const over = validateTransferItemForm(
      { medicineId: 'm1', batchId: 'b1', quantity: '40' },
      { availableQuantity: 10 },
    )
    assert(Boolean(over.quantity), 'Over-available qty rejected')
  }

  console.log('\n3. Seed stock, transfer, PDF, atomic rules')
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
        purchaseOrderNo: 'PO-TRF-SEED',
        receivingDate: '2026-09-20',
        locationId: 'loc-main-pharmacy',
      },
      items: [
        {
          id: 'pend_seed',
          medicineId: med.id,
          medicineDisplayName: med.displayName,
          manufacturerName: 'GSK',
          batchNo: 'TRF-BATCH',
          manufacturingDate: '2025-09-01',
          expiryDate: '2027-09-01',
          quantity: 100,
          unitPrice: 2,
          totalPrice: 200,
        },
      ],
      createdBy: user,
    })

    const sourceBatches = await batchService.getAvailableForMedicine(
      med.id,
      'loc-main-pharmacy',
    )
    assert(sourceBatches.length === 1, 'Source stock present')
    const sourceId = sourceBatches[0].id

    const draftItem = formValuesToTransferDraftItem(
      {
        medicineId: med.id,
        batchId: sourceId,
        quantity: '30',
      },
      {
        medicineDisplayName: med.displayName,
        batchNo: sourceBatches[0].batchNo,
        expiryDate: sourceBatches[0].expiryDate,
        availableQuantity: 100,
      },
    )

    const result = await transferService.finalize({
      master: {
        date: '2026-09-24',
        voucherNo: 'TRF-110',
        fromLocationId: 'loc-main-pharmacy',
        toLocationId: 'loc-emergency',
      },
      items: [draftItem],
      createdBy: user,
    })

    assert(result.transfer.status === 'posted', 'Transfer posted')
    assert(result.pdfBlob instanceof Blob && result.pdfBlob.size > 400, 'PDF generated')

    const afterSource = await batchService.getById(sourceId)
    assert(afterSource.remainingQuantity === 70, 'Source deducted by 30')

    const destBatches = await batchService.getAvailableForMedicine(med.id, 'loc-emergency')
    assert(destBatches.length === 1, 'Destination stock created')
    assert(destBatches[0].remainingQuantity === 30, 'Destination received 30')
    assert(destBatches[0].batchNo === 'TRF-BATCH', 'Batch identity preserved')

    const pdfPath = resolve(__dirname, '.tmp-transfer.pdf')
    writeFileSync(pdfPath, Buffer.from(await result.pdfBlob.arrayBuffer()))
    assert(readFileSync(pdfPath).subarray(0, 5).toString() === '%PDF-', 'PDF valid')
    unlinkSync(pdfPath)

    reportService.downloadStockTransferPdf(result.pdfBlob, result.transfer.voucherNo)
    assert(true, 'PDF download via reportService')

    const reports = await reportService.list()
    assert(reports.some((r) => r.type === 'transfer'), 'Report metadata recorded')

    // Second transfer to same dest should merge batch
    await transferService.finalize({
      master: {
        date: '2026-09-24',
        voucherNo: 'TRF-111',
        fromLocationId: 'loc-main-pharmacy',
        toLocationId: 'loc-emergency',
      },
      items: [
        formValuesToTransferDraftItem(
          { medicineId: med.id, batchId: sourceId, quantity: '10' },
          {
            medicineDisplayName: med.displayName,
            batchNo: 'TRF-BATCH',
            expiryDate: '2027-09-01',
            availableQuantity: 70,
          },
        ),
      ],
      createdBy: user,
    })

    const destAfterMerge = await batchService.getAvailableForMedicine(med.id, 'loc-emergency')
    assert(destAfterMerge.length === 1, 'Destination batches merged')
    assert(destAfterMerge[0].remainingQuantity === 40, 'Merged destination qty = 40')

    let overBlocked = false
    try {
      await transferService.finalize({
        master: {
          date: '2026-09-24',
          voucherNo: 'TRF-999',
          fromLocationId: 'loc-main-pharmacy',
          toLocationId: 'loc-icu',
        },
        items: [
          formValuesToTransferDraftItem(
            { medicineId: med.id, batchId: sourceId, quantity: '999' },
            {
              medicineDisplayName: med.displayName,
              batchNo: 'TRF-BATCH',
              expiryDate: '2027-09-01',
              availableQuantity: 60,
            },
          ),
        ],
        createdBy: user,
      })
    } catch (error) {
      overBlocked = error instanceof Error && /insufficient/i.test(error.message)
    }
    assert(overBlocked, 'Over-transfer blocked')

    const sourceFinal = await batchService.getById(sourceId)
    assert(sourceFinal.remainingQuantity === 60, 'Failed transfer did not deduct')
    assert(localInventoryDb.listTransfers().length === 2, 'Only successful transfers kept')
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed\n`)
  process.exitCode = failed ? 1 : 0
} finally {
  await server.close()
}
