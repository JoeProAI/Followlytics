import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

// Validate Firebase environment variables
function validateFirebaseConfig() {
  const requiredVars = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY
  }

  const missing = Object.entries(requiredVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    throw new Error(`Missing Firebase Admin SDK environment variables: ${missing.join(', ')}`)
  }

  return requiredVars
}

// Initialize Firebase Admin with error handling
let adminApp: any = null

function getFirebaseAdminApp() {
  if (!adminApp) {
    try {
      const config = validateFirebaseConfig()
      
      const firebaseAdminConfig = {
        credential: cert({
          projectId: config.projectId,
          clientEmail: config.clientEmail,
          privateKey: config.privateKey?.replace(/\\n/g, '\n'),
        }),
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
