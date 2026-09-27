/**
 * Firebase wiring verification (static / structural).
 * Run: node scripts/verify-firebase.mjs
 *
 * Live Auth + Firestore checks require .env.local credentials and a Firebase project.
 */
import { createServer } from 'vite'
import { resolve, dirname, join } from 'node:path'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

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

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, acc)
    else if (/\.(ts|vue|js|mjs)$/.test(name)) acc.push(p)
  }
  return acc
}

console.log('\nFirebase wiring')

const envExample = readFileSync(resolve(root, '.env.example'), 'utf8')
assert(envExample.includes('VITE_FIREBASE_API_KEY'), '.env.example has API key placeholder')
assert(envExample.includes('VITE_DEMO_AUTH_EMAIL'), '.env.example documents demo email')
assert(envExample.includes('hospital'), '.env.example mentions hospital demo')
assert(!/AIza[0-9A-Za-z_-]{20,}/.test(envExample), '.env.example has no hardcoded API key')

const rules = readFileSync(resolve(root, 'firestore.rules'), 'utf8')
assert(
  !/^\s*allow\s+read\s*,\s*write\s*:\s*if\s+true/m.test(rules),
  'Rules are not open (no allow if true)',
)
assert(rules.includes('request.auth'), 'Rules require authentication')
assert(rules.includes('hasRole'), 'Rules structure role helpers for expansion')
assert(rules.includes('medicineBatches'), 'Rules cover medicineBatches')
assert(rules.includes('stockTransfers'), 'Rules cover stockTransfers')
assert(rules.includes('medicineDemands'), 'Rules cover medicineDemands')

assert(existsSync(resolve(root, 'firebase.json')), 'firebase.json present')
assert(existsSync(resolve(root, 'firestore.indexes.json')), 'firestore.indexes.json present')

const server = await createServer({
  root,
  configFile: resolve(root, 'vite.config.ts'),
  server: { middlewareMode: true },
  appType: 'custom',
})

try {
  const { COLLECTIONS } = await server.ssrLoadModule('/src/repositories/firebase/collections.ts')
  const expected = [
    'users',
    'medicines',
    'medicineBatches',
    'locations',
    'stockIns',
    'allocations',
    'stockTransfers',
    'contacts',
    'medicineDemands',
  ]
  for (const name of expected) {
    assert(Object.values(COLLECTIONS).includes(name), `Collection includes ${name}`)
  }
  assert(!Object.values(COLLECTIONS).includes('reports'), 'No unnecessary reports collection')

  const repos = await server.ssrLoadModule('/src/repositories/index.ts')
  assert(typeof repos.stockInRepository.finalize === 'function', 'stockInRepository.finalize')
  assert(typeof repos.allocationRepository.finalize === 'function', 'allocationRepository.finalize')
  assert(typeof repos.transferRepository.finalize === 'function', 'transferRepository.finalize')
  assert(typeof repos.batchRepository.deductQuantity === 'function', 'batchRepository.deductQuantity')
  assert(typeof repos.batchRepository.transferQuantity === 'function', 'batchRepository.transferQuantity')
  assert(typeof repos.contactRepository.list === 'function', 'contactRepository wired')
  assert(typeof repos.demandRepository.list === 'function', 'demandRepository wired')
  assert(typeof repos.userRepository.upsertProfile === 'function', 'userRepository.upsertProfile')
  assert(typeof repos.authRepository.signInWithEmail === 'function', 'authRepository.signInWithEmail')

  const { isFirebaseConfigured } = await server.ssrLoadModule('/src/firebase/index.ts')
  assert(typeof isFirebaseConfigured === 'function', 'Firebase init exports isFirebaseConfigured')

  const { authService } = await server.ssrLoadModule('/src/services/auth.service.ts')
  assert(typeof authService.login === 'function', 'authService.login')
  assert(typeof authService.logout === 'function', 'authService.logout')

  const { resolveAuthAccountByUsername } = await server.ssrLoadModule(
    '/src/constants/auth-accounts.ts',
  )
  const mapping = resolveAuthAccountByUsername('hospital')
  assert(!!mapping, 'Username hospital maps to Firebase email')
  assert(mapping.firebaseEmail.includes('@'), 'Mapped identity is an email')

  const files = walk(join(root, 'src'))
  const localDbHits = files.filter((f) => {
    const text = readFileSync(f, 'utf8')
    return (
      text.includes('localInventoryDb') ||
      text.includes('localOpsDb') ||
      text.includes('healthplus.inventory.v1') ||
      text.includes('healthplus.ops.v1')
    )
  })
  assert(localDbHits.length === 0, 'No localInventoryDb / localOpsDb usage in src')

  const firestoreInUi = files.filter((f) => {
    const norm = f.replace(/\\/g, '/')
    if (!norm.includes('/pages/') && !norm.includes('/components/')) return false
    const text = readFileSync(f, 'utf8')
    return text.includes('firebase/firestore') || text.includes('getFirestore')
  })
  assert(firestoreInUi.length === 0, 'Vue pages/components do not import Firestore')

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed) process.exitCode = 1

  if (!isFirebaseConfigured()) {
    console.log(
      '\nNote: Firebase env vars are not set in this environment.\n' +
        'Copy .env.example → .env.local, create the hospital Auth user, deploy firestore.rules,\n' +
        'then verify login / stock-in / allocation / transfer against your project.\n',
    )
  }
} finally {
  await server.close()
}
