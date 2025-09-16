import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin with error handling
let adminApp: any = null

function getFirebaseAdminApp() {
  if (!adminApp) {
    try {
      let serviceAccount: any
      
      // Try to use FIREBASE_SERVICE_ACCOUNT_JSON first (new approach)
      if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
      } else {
        // Fallback to individual environment variables
        serviceAccount = {
          projectId: process.env.FIREBASE_PROJECT_ID!,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
          privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
        }
      }
      
      const firebaseAdminConfig = {
        credential: cert(serviceAccount),
      }

      adminApp = getApps().find(app => app.name === 'admin') || 
        initializeApp(firebaseAdminConfig, 'admin')
    } catch (error) {
      console.error('Failed to initialize Firebase Admin:', error)
      throw error
    }
  }
  return adminApp
}

export const adminAuth = getAuth(getFirebaseAdminApp())
export const adminDb = getFirestore(getFirebaseAdminApp())

export default getFirebaseAdminApp()
