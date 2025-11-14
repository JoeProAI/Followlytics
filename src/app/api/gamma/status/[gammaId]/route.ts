// Check status of Gamma generation and get download URLs
import { NextRequest, NextResponse } from 'next/server'
import { getGammaClient } from '@/lib/gamma-client'
import { adminDb } from '@/lib/firebase-admin'
import { Resend } from 'resend'

// Initialize Resend only if API key exists
let resend: Resend | null = null
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY)
  console.log('[Gamma Status] ✅ Resend initialized')
} else {
  console.warn('[Gamma Status] ⚠️ RESEND_API_KEY not set - emails will not be sent')
}

export async function GET(
  request: NextRequest,
  { params }: { params: { gammaId: string } }
) {
  try {
    const gammaId = params.gammaId

    if (!gammaId) {
      return NextResponse.json({ error: 'Gamma ID required' }, { status: 400 })
    }

    console.log(`[Gamma Status] Checking status for: ${gammaId}`)
    const gamma = getGammaClient()
    const result = await gamma.getFileUrls(gammaId)

    console.log(`[Gamma Status] Result:`, result)

    // If still processing, return 202 status
    if (result.status === 'processing' || result.status === 'pending') {
      return NextResponse.json({
        success: true,
        gammaId: result.gamma_id,
        status: result.status,
        message: result.message || 'Still generating...'
      }, { status: 202 })
    }

    // If completed, send email if not already sent (wrapped to not break main response)
    if (result.status === 'completed' && result.urls?.view) {
      try {
        // Check if email already sent
        const gammaGenDoc = await adminDb.collectionGroup('gamma_generations')
          .where('gammaId', '==', gammaId)
          .limit(1)
          .get()
        
        if (!gammaGenDoc.empty) {
          const genData = gammaGenDoc.docs[0].data()
          const genRef = gammaGenDoc.docs[0].ref
          
          console.log('[Gamma Status] Found generation record:', {
            username: genData.username,
            emailSent: genData.emailSent,
            resendAvailable: !!resend
          })
          
          // Send email if not already sent
          if (!genData.emailSent && resend) {
            console.log('[Gamma Status] Preparing to send email notification...')
            
            // Get user email from follower_database
            const followerDoc = await adminDb.collection('follower_database').doc(genData.username).get()
            const customerEmail = followerDoc.data()?.customerEmail
            
            if (customerEmail) {
              console.log(`[Gamma Status] Sending email to ${customerEmail}`)
              
              await resend.emails.send({
                from: 'Followlytics <notifications@followlytics.joepro.ai>',
                to: customerEmail,
                subject: `🎨 Your Audience Intelligence Presentation is Ready!`,
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #000;">Your Presentation is Ready! 🎉</h2>
                    <p>We've analyzed your @${genData.username} followers and created a professional presentation showcasing your audience insights.</p>
                    
                    <a href="${result.urls.view}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">View Presentation</a>
                    
                    <p style="color: #666; font-size: 14px;">This presentation includes:</p>
                    <ul style="color: #666; font-size: 14px;">
                      <li>Your top influential followers</li>
                      <li>Audience reach analysis</li>
                      <li>Geographic distribution</li>
                      <li>Actionable insights</li>
                    </ul>
                    
                    <p style="color: #999; font-size: 12px; margin-top: 30px;">Powered by Followlytics</p>
                  </div>
                `
              })
              
              console.log(`[Gamma Status] ✅ Email sent successfully`)
              
              // Mark as sent (with error handling) - use set with merge to avoid FAILED_PRECONDITION
              try {
                await genRef.set({ 
                  emailSent: true,
                  completedAt: new Date(),
                  viewUrl: result.urls.view
                }, { merge: true })
                console.log('[Gamma Status] ✅ Marked as sent in database')
              } catch (updateErr) {
                console.error('[Gamma Status] Warning: Could not update emailSent flag:', updateErr)
                // Continue anyway - email was sent
              }
            } else {
              console.log('[Gamma Status] ⚠️ No customer email found, skipping notification')
            }
          } else if (genData.emailSent) {
            console.log('[Gamma Status] Email already sent for this presentation')
          } else if (!resend) {
            console.error('[Gamma Status] ❌ RESEND_API_KEY not configured - cannot send email')
          }
        } else {
          console.log('[Gamma Status] No generation record found in database')
        }
      } catch (emailProcessErr) {
        console.error('[Gamma Status] Email process error (non-fatal):', emailProcessErr)
        // Don't throw - just log and continue to return the URLs
      }
    }
    
    // Return URLs
    return NextResponse.json({
      success: true,
      gammaId: result.gamma_id,
      status: result.status,
      urls: result.urls,
      message: result.message
    })

  } catch (error: any) {
    console.error('[Gamma Status] Error:', error)
    return NextResponse.json({
      error: 'Failed to check status',
      details: error.message
    }, { status: 500 })
  }
}
