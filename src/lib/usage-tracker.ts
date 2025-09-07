// Usage tracking middleware for API calls
export async function trackAPIUsage(userId: string, endpoint: string, cost: number = 1) {
  try {
    // Initialize Firebase Admin dynamically
    const { getApps, initializeApp, cert } = await import('firebase-admin/app')
    const { getFirestore, FieldValue } = await import('firebase-admin/firestore')
    
    if (getApps().length === 0) {
      // Try using service account key first (if available)
      const serviceAccountKey = process.env.FIREBASE_ADMIN_SDK_KEY
      
      if (serviceAccountKey) {
        try {
          console.log('Attempting to parse service account JSON, length:', serviceAccountKey.length)
          const serviceAccount = JSON.parse(serviceAccountKey)
          console.log('Service account parsed successfully, project_id:', serviceAccount.project_id)
          initializeApp({
            credential: cert(serviceAccount)
          })
        } catch (jsonError) {
          console.error('Failed to parse service account JSON:', jsonError)
          console.log('Service account key preview:', serviceAccountKey.substring(0, 100) + '...')
          // Fall through to individual environment variables instead of throwing
        }
      }
      
      // Use individual environment variables (either as fallback or primary)
      if (getApps().length === 0) {
        // Fallback to individual environment variables
        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
        let privateKey = process.env.FIREBASE_PRIVATE_KEY
        
        if (privateKey) {
          // Enhanced private key processing
          privateKey = privateKey
            .replace(/^["']|["']$/g, '') // Remove outer quotes
            .replace(/\\n/g, '\n') // Convert escaped newlines
            .trim()
          
          // Validate PEM format
          // More flexible PEM validation - check for key boundaries after processing
          const hasBeginMarker = privateKey.includes('-----BEGIN PRIVATE KEY-----') || privateKey.includes('-----BEGIN RSA PRIVATE KEY-----')
          const hasEndMarker = privateKey.includes('-----END PRIVATE KEY-----') || privateKey.includes('-----END RSA PRIVATE KEY-----')
          
          if (!hasBeginMarker || !hasEndMarker) {
            console.log('Private key validation failed. Key preview:', privateKey.substring(0, 50) + '...')
            console.log('Has begin marker:', hasBeginMarker, 'Has end marker:', hasEndMarker)
            throw new Error('Invalid private key format - must be PEM format')
          }
        }
        
        if (!projectId || !clientEmail || !privateKey) {
          throw new Error(`Missing Firebase config: projectId=${projectId || 'MISSING'}, clientEmail=${clientEmail || 'MISSING'}, privateKey=${privateKey ? 'SET' : 'MISSING'}`)
        }
        
        initializeApp({
          credential: cert({
            projectId: projectId,
            clientEmail: clientEmail,
            privateKey: privateKey
          })
        })
      }
    }
    
    const db = getFirestore()
    const today = new Date().toISOString().split('T')[0]
    const usageRef = db.collection('usage').doc(`${userId}_${today}`)
    
    // Update usage
    await usageRef.set({
      userId,
      date: today,
      calls: FieldValue.increment(cost),
      endpoints: {
        [endpoint]: FieldValue.increment(cost)
      },
      lastUpdated: new Date().toISOString()
    }, { merge: true })
    
    // Check limits
    const [usageDoc, userDoc] = await Promise.all([
      usageRef.get(),
      db.collection('users').doc(userId).get()
    ])
    
    const usage = usageDoc.data()
    const user = userDoc.data()
    const tier = user?.subscription?.tier || 'starter'
    
    const limits = {
      starter: 10000,
      professional: 100000,
      business: 500000,
      enterprise: 999999999
    }
    
    const limit = limits[tier as keyof typeof limits]
    const currentUsage = usage?.calls || 0
    
    if (currentUsage > limit) {
      throw new Error(`API limit exceeded (${currentUsage}/${limit}). Please upgrade your plan.`)
    }
    
    return {
      usage: currentUsage,
      limit,
      remaining: limit - currentUsage,
      tier
    }
    
  } catch (error) {
    console.error('Usage tracking error:', error)
    throw error
  }
}

export async function checkUsageLimit(userId: string): Promise<{ canProceed: boolean; usage: any }> {
  try {
    const { getApps, initializeApp, cert } = await import('firebase-admin/app')
    const { getFirestore } = await import('firebase-admin/firestore')
    
    if (getApps().length === 0) {
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
      let privateKey = process.env.FIREBASE_PRIVATE_KEY
      
      if (privateKey) {
        privateKey = privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n')
      }
      
      if (!projectId || !clientEmail || !privateKey) {
        throw new Error(`Missing Firebase config in checkUsageLimit: projectId=${projectId || 'MISSING'}, clientEmail=${clientEmail || 'MISSING'}, privateKey=${privateKey ? 'SET' : 'MISSING'}`)
      }
      
      initializeApp({
        credential: cert({
          projectId: projectId,
          clientEmail: clientEmail,
          privateKey: privateKey
        })
      })
    }
    
    const db = getFirestore()
    const today = new Date().toISOString().split('T')[0]
    
    const [usageDoc, userDoc] = await Promise.all([
      db.collection('usage').doc(`${userId}_${today}`).get(),
      db.collection('users').doc(userId).get()
    ])
    
    const usage = usageDoc.data()
    const user = userDoc.data()
    const tier = user?.subscription?.tier || 'starter'
    
    const limits = {
      starter: 10000,
      professional: 100000,
      business: 500000,
      enterprise: 999999999
    }
    
    const limit = limits[tier as keyof typeof limits]
    const currentUsage = usage?.calls || 0
    
    return {
      canProceed: currentUsage < limit,
      usage: {
        current: currentUsage,
        limit,
        remaining: limit - currentUsage,
        tier,
        percentage: (currentUsage / limit) * 100
      }
    }
    
  } catch (error) {
    console.error('Usage check error:', error)
    return { canProceed: false, usage: null }
  }
}
