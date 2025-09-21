import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    
    // Verify the Firebase token
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    console.log('🔍 Checking OAuth tokens for user:', userId)

    // Get all x_tokens documents (for debugging - normally would just get current user)
    const tokensSnapshot = await adminDb.collection('x_tokens').get()
    
    if (tokensSnapshot.empty) {
      return NextResponse.json({ 
        message: 'No OAuth tokens found in x_tokens collection',
        userTokens: null,
        allTokensCount: 0
      })
    }

    const allTokens: any[] = []
    let userTokens = null

    tokensSnapshot.forEach(doc => {
      const data = doc.data()
      const tokenInfo = {
        userId: doc.id,
        screenName: data.screenName || 'N/A',
        xUserId: data.xUserId || 'N/A',
        hasAccessToken: !!data.accessToken,
        hasAccessTokenSecret: !!data.accessTokenSecret,
        accessTokenLength: data.accessToken ? data.accessToken.length : 0,
        secretLength: data.accessTokenSecret ? data.accessTokenSecret.length : 0,
        accessTokenPreview: data.accessToken ? data.accessToken.substring(0, 15) + '...' : 'MISSING',
        secretPreview: data.accessTokenSecret ? data.accessTokenSecret.substring(0, 15) + '...' : 'MISSING',
        created: data.createdAt ? data.createdAt.toDate().toISOString() : 'N/A',
        isCurrentUser: doc.id === userId
      }
      
      allTokens.push(tokenInfo)
      
      if (doc.id === userId) {
        userTokens = {
          ...tokenInfo,
          // Include full tokens for current user (for testing)
          fullAccessToken: data.accessToken,
          fullAccessTokenSecret: data.accessTokenSecret
        }
      }
    })

    return NextResponse.json({
      message: `Found ${tokensSnapshot.size} OAuth token records`,
      currentUserId: userId,
      userTokens,
      allTokens,
      summary: {
        totalUsers: allTokens.length,
        usersWithValidTokens: allTokens.filter(t => t.hasAccessToken && t.hasAccessTokenSecret).length,
        currentUserHasTokens: !!userTokens?.hasAccessToken && !!userTokens?.hasAccessTokenSecret
      }
    })

  } catch (error) {
    console.error('Error checking OAuth tokens:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
