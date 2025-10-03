import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getAuth, Auth } from 'firebase-admin/auth'
import { getFirestore, Firestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin with error handling
let adminApp: App | null = null
let adminAuthInstance: Auth | null = null
let adminDbInstance: Firestore | null = null

// Safe for build time - only initializes when actually called at runtime
function getFirebaseAdminApp(): App {
  // Skip initialization during build (Next.js static analysis)
  if (typeof window !== 'undefined') {
    throw new Error('Firebase Admin should not be used on the client side')
  }

  if (!adminApp) {
    try {
      let serviceAccount: any
      
      // Try to use FIREBASE_SERVICE_ACCOUNT_JSON first (new approach)
      if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
      } else {
        // Fallback to individual environment variables
        const privateKey = process.env.FIREBASE_PRIVATE_KEY
        
        if (!privateKey || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
          // During build, env vars might not be available - return mock
          if (process.env.NODE_ENV === 'production' && !privateKey) {
            console.warn('Firebase credentials not available during build - this is expected')
            throw new Error('Firebase not initialized - credentials missing')
          }
          
          throw new Error(
            'Missing Firebase credentials. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in Vercel environment variables.'
          )
        }
        
        serviceAccount = {
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }
      }
      
      const firebaseAdminConfig = {
        credential: cert(serviceAccount),
      }

      adminApp = getApps().find(app => app.name === 'admin') as App || 
        initializeApp(firebaseAdminConfig, 'admin')
    } catch (error) {
      console.error('Failed to initialize Firebase Admin:', error)
      throw error
    }
  }
  return adminApp
}

// Lazy getters that only initialize when accessed at runtime
export const adminAuth: Auth = new Proxy({} as Auth, {
  get: (target, prop) => {
    if (!adminAuthInstance) {
      adminAuthInstance = getAuth(getFirebaseAdminApp())
    }
    return (adminAuthInstance as any)[prop]
  }
})

export const adminDb: Firestore = new Proxy({} as Firestore, {
  get: (target, prop) => {
    if (!adminDbInstance) {
      adminDbInstance = getFirestore(getFirebaseAdminApp())
    }
    return (adminDbInstance as any)[prop]
  }
})

export default getFirebaseAdminApp
