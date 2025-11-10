import { NextRequest, NextResponse } from 'next/server'
import { adminDb as db } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code || !state) {
      return new NextResponse(
        `<html><body><script>window.close();</script><p>Authorization failed. You can close this window.</p></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Verify state
    const stateDoc = await db.collection('x_oauth_states').doc(state).get()
    
    if (!stateDoc.exists) {
      return new NextResponse(
        `<html><body><script>window.close();</script><p>Invalid state. You can close this window.</p></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    const stateData = stateDoc.data()!
    const userId = stateData.userId

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`
        ).toString('base64')}`
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/x-auth/callback`,
        code_verifier: 'challenge'
      }).toString()
    })

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text())
      throw new Error('Failed to exchange code for token')
    }

    const tokenData = await tokenResponse.json()

    // Get user info
    const userResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    })

    const userData = await userResponse.json()

    // Store tokens in Firestore
    await db.collection('x_tokens').doc(userId).set({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope,
      username: userData.data?.username,
      user_id: userData.data?.id,
      created_at: new Date().toISOString(),
      last_sync: new Date().toISOString()
    })

    // Update user document with X connection status and username
    await db.collection('users').doc(userId).update({
      xConnected: true,
      xUsername: userData.data?.username,
      xUserId: userData.data?.id,
      xConnectedAt: new Date().toISOString()
    })

    console.log(`✅ X OAuth complete for user ${userId} (@${userData.data?.username})`)

    // Delete used state
    await db.collection('x_oauth_states').doc(state).delete()

    return new NextResponse(
      `<html><body><script>window.close();</script><p>✅ Successfully connected! You can close this window.</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )

  } catch (error: any) {
    console.error('X auth callback error:', error)
    return new NextResponse(
      `<html><body><script>window.close();</script><p>Error: ${error.message}. You can close this window.</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }
}
