// Clean Database Script
// Removes all old follower data to start fresh with sanitized usernames

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin using environment variables
if (!getApps().length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  
  if (!privateKey || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PROJECT_ID) {
    console.error('❌ Missing Firebase environment variables!')
    console.error('Required: FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, FIREBASE_PROJECT_ID')
    process.exit(1)
  }

  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey
    })
  })
}

const db = getFirestore()

async function cleanDatabase() {
  console.log('🧹 Starting database cleanup...')
  
  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get()
    console.log(`📊 Found ${usersSnapshot.size} users`)
    
    let totalFollowersDeleted = 0
    let totalExportsDeleted = 0
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id
      console.log(`\n🔍 Processing user: ${userId}`)
      
      // Clean followers collection
      const followersSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('followers')
        .get()
      
      if (!followersSnapshot.empty) {
        console.log(`  📦 Found ${followersSnapshot.size} followers to clean`)
        
        // Delete in batches of 500
        let batch = db.batch()
        let count = 0
        
        for (const doc of followersSnapshot.docs) {
          batch.delete(doc.ref)
          count++
          totalFollowersDeleted++
          
          if (count === 500) {
            await batch.commit()
            console.log(`    ✅ Deleted batch of 500`)
            batch = db.batch()
            count = 0
          }
        }
        
        if (count > 0) {
          await batch.commit()
          console.log(`    ✅ Deleted final batch of ${count}`)
        }
      }
      
      // Clean follower_exports collection
      const exportsSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('follower_exports')
        .get()
      
      if (!exportsSnapshot.empty) {
        console.log(`  📤 Found ${exportsSnapshot.size} exports to clean`)
        
        for (const exportDoc of exportsSnapshot.docs) {
          // Delete export subcollection first
          const followersSubCollection = await exportDoc.ref
            .collection('followers')
            .get()
          
          if (!followersSubCollection.empty) {
            let batch = db.batch()
            let count = 0
            
            for (const doc of followersSubCollection.docs) {
              batch.delete(doc.ref)
              count++
              
              if (count === 500) {
                await batch.commit()
                batch = db.batch()
                count = 0
              }
            }
            
            if (count > 0) {
              await batch.commit()
            }
          }
          
          // Delete export document
          await exportDoc.ref.delete()
          totalExportsDeleted++
        }
        
        console.log(`    ✅ Cleaned ${exportsSnapshot.size} exports`)
      }
      
      // Clean tracked_accounts
      const trackedAccountsSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('tracked_accounts')
        .get()
      
      if (!trackedAccountsSnapshot.empty) {
        let batch = db.batch()
        for (const doc of trackedAccountsSnapshot.docs) {
          batch.delete(doc.ref)
        }
        await batch.commit()
        console.log(`    ✅ Cleaned ${trackedAccountsSnapshot.size} tracked accounts`)
      }
    }
    
    // Clean follower_database (legacy)
    console.log('\n🗂️  Cleaning legacy follower_database...')
    const followerDbSnapshot = await db.collection('follower_database').get()
    
    if (!followerDbSnapshot.empty) {
      console.log(`  📦 Found ${followerDbSnapshot.size} documents`)
      
      for (const doc of followerDbSnapshot.docs) {
        // Delete subcollection
        const subCollection = await doc.ref.collection('followers').get()
        if (!subCollection.empty) {
          let batch = db.batch()
          let count = 0
          
          for (const subDoc of subCollection.docs) {
            batch.delete(subDoc.ref)
            count++
            
            if (count === 500) {
              await batch.commit()
              batch = db.batch()
              count = 0
            }
          }
          
          if (count > 0) {
            await batch.commit()
          }
        }
        
        // Delete main document
        await doc.ref.delete()
      }
      
      console.log(`    ✅ Cleaned ${followerDbSnapshot.size} legacy documents`)
    }
    
    // Clean follower_cache
    console.log('\n💾 Cleaning follower_cache...')
    const cacheSnapshot = await db.collection('follower_cache').get()
    
    if (!cacheSnapshot.empty) {
      let batch = db.batch()
      for (const doc of cacheSnapshot.docs) {
        batch.delete(doc.ref)
      }
      await batch.commit()
      console.log(`    ✅ Cleaned ${cacheSnapshot.size} cache entries`)
    }
    
    console.log('\n✅ DATABASE CLEANUP COMPLETE!')
    console.log(`📊 Summary:`)
    console.log(`   - Followers deleted: ${totalFollowersDeleted}`)
    console.log(`   - Exports deleted: ${totalExportsDeleted}`)
    console.log(`   - Legacy data cleaned`)
    console.log(`   - Cache cleared`)
    console.log('\n🚀 Ready for fresh extraction with clean data!')
    
  } catch (error) {
    console.error('❌ Error cleaning database:', error)
    throw error
  }
}

// Run the cleanup
cleanDatabase()
  .then(() => {
    console.log('\n✨ All done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
