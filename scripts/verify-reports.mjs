/**
 * Reports PDF verification — with/without price must change document content.
 * Run: node scripts/verify-reports.mjs
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

async function pdfText(blob) {
  const buf = Buffer.from(await blob.arrayBuffer())
  // Extract readable strings from PDF content streams (best-effort).
  return buf.toString('latin1')
}

const server = await createServer({
  root,
  configFile: resolve(root, 'vite.config.ts'),
  server: { middlewareMode: true },
  appType: 'custom',
})

try {
  const { reportService, stockInService, allocationService, transferService, batchService } =
    await server.ssrLoadModule('/src/services/index.ts')
  const { medicineRepository } = await server.ssrLoadModule('/src/repositories/index.ts')

  console.log('\nReports')
  storage.clear()

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

  const stockInResult = await stockInService.finalize({
    master: {
      purchaseOrderNo: 'PO-RPT-100',
      receivingDate: '2026-09-20',
      locationId: 'loc-main-pharmacy',
    },
    items: [
      {
        id: 'p1',
        medicineId: med.id,
        medicineDisplayName: med.displayName,
        manufacturerName: 'GSK',
        batchNo: 'RPT-B1',
        manufacturingDate: '2025-01-01',
        expiryDate: '2027-01-01',
        quantity: 40,
        unitPrice: 12.5,
        totalPrice: 500,
      },
    ],
    createdBy: user,
  })

  assert(reportService.supportsPricing('stock_in'), 'Stock In supports pricing exports')
  assert(!reportService.supportsPricing('allocation'), 'Allocation has no pricing export')
  assert(!reportService.supportsPricing('transfer'), 'Transfer has no pricing export')

  const list = await reportService.listStockInReports({})
  assert(list.length === 1, 'Stock-in appears in report list')
  assert(list[0].hasPricing === true, 'Stock-in list item has pricing')
  assert(list[0].grandTotal === 500, 'List grand total present')

  const withPrice = await reportService.exportDocumentPdf({
    type: 'stock_in',
    id: stockInResult.stockIn.id,
    preparedBy: user,
    priceMode: 'with_price',
  })
  const withoutPrice = await reportService.exportDocumentPdf({
    type: 'stock_in',
    id: stockInResult.stockIn.id,
    preparedBy: user,
    priceMode: 'without_price',
  })

  const withText = await pdfText(withPrice.blob)
  const withoutText = await pdfText(withoutPrice.blob)

  assert(withPrice.blob.size > 400, 'With-price PDF generated')
  assert(withoutPrice.blob.size > 400, 'Without-price PDF generated')
  assert(withPrice.filename.includes('WithPrice'), 'With-price filename')
  assert(withoutPrice.filename.includes('WithoutPrice'), 'Without-price filename')
  assert(withText.includes('Grand Total') || withText.includes('Unit Price'), 'With-price PDF has price labels')
  assert(!withoutText.includes('Grand Total'), 'Without-price PDF omits Grand Total')
  assert(!withoutText.includes('Unit Price'), 'Without-price PDF omits Unit Price')
  assert(!withoutText.includes('Total Price'), 'Without-price PDF omits Total Price')
  // Monetary amount from unit price should not appear in without-price export
  assert(!withoutText.includes('12.50') && !withoutText.includes('500.00'), 'Without-price PDF omits monetary amounts')

  const batches = await batchService.getAvailableForMedicine(med.id, 'loc-main-pharmacy')
  const batch = batches[0]

  await allocationService.finalize({
    master: {
      date: '2026-09-21',
      voucherNo: 'ALC-RPT-1',
      destinationLocationId: 'loc-emergency',
      receiverName: 'Dr. Ali',
      receiverDesignation: 'MO',
    },
    items: [
      {
        id: 'a1',
        medicineId: med.id,
        medicineDisplayName: med.displayName,
        batchId: batch.id,
        batchNo: batch.batchNo,
        expiryDate: batch.expiryDate,
        availableQuantity: batch.remainingQuantity,
        quantity: 5,
      },
    ],
    createdBy: user,
  })

  const allocList = await reportService.listAllocationReports({})
  assert(allocList.length === 1 && allocList[0].hasPricing === false, 'Allocation report has no pricing')

  const allocExport = await reportService.exportDocumentPdf({
    type: 'allocation',
    id: allocList[0].id,
    preparedBy: user,
  })
  assert(allocExport.filename.includes('Allocation'), 'Allocation PDF filename')
  const allocText = await pdfText(allocExport.blob)
  assert(!allocText.includes('Unit Price'), 'Allocation PDF has no unit price')
  assert(!allocText.includes('Grand Total'), 'Allocation PDF has no grand total')

  await transferService.finalize({
    master: {
      date: '2026-09-22',
      voucherNo: 'TRF-RPT-1',
      fromLocationId: 'loc-main-pharmacy',
      toLocationId: 'loc-icu',
    },
    items: [
      {
        id: 't1',
        medicineId: med.id,
        medicineDisplayName: med.displayName,
        batchId: batch.id,
        batchNo: batch.batchNo,
        expiryDate: batch.expiryDate,
        availableQuantity: 35,
        quantity: 3,
      },
    ],
    createdBy: user,
  })

  const trfList = await reportService.listTransferReports({ query: 'TRF-RPT' })
  assert(trfList.length === 1, 'Transfer report listed')
  const trfExport = await reportService.exportDocumentPdf({
    type: 'transfer',
    id: trfList[0].id,
    preparedBy: user,
  })
  assert(trfExport.blob.size > 400, 'Transfer PDF generated')

  console.log(`\nResult: ${passed} passed, ${failed} failed\n`)
  process.exitCode = failed ? 1 : 0
} finally {
  await server.close()
}
