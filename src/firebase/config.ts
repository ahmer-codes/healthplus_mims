/**
 * Firebase app bootstrap. configuration only.
 * Auth/data access goes through repositories and services.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
  type Auth,
} from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
}

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let persistenceReady: Promise<Auth> | null = null

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId,
  )
}

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null
  if (!app) {
    app = initializeApp(firebaseConfig)
  }
  return app
}

export function getFirebaseAuth(): Auth | null {
  const firebaseApp = getFirebaseApp()
  if (!firebaseApp) return null
  if (!auth) {
    auth = getAuth(firebaseApp)
  }
  return auth
}

/**
 * Ensures Auth uses Firebase's normal local persistence before any sign-in.
 */
export async function getPersistedFirebaseAuth(): Promise<Auth> {
  const instance = getFirebaseAuth()
  if (!instance) {
    throw new Error('Firebase Authentication is not configured. Check your environment variables.')
  }

  if (!persistenceReady) {
    persistenceReady = setPersistence(instance, browserLocalPersistence).then(() => instance)
  }

  return persistenceReady
}

export function getFirestoreDb(): Firestore | null {
  const firebaseApp = getFirebaseApp()
  if (!firebaseApp) return null
  if (!db) {
    db = getFirestore(firebaseApp)
  }
  return db
}
