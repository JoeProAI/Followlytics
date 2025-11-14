import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(request: NextRequest) {
  try {
    const { to } = await request.json()
    
    if (!to) {
      return NextResponse.json({ error: 'Email address required' }, { status: 400 })
    }

    // Check if API key is set
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ 
        error: 'RESEND_API_KEY not configured in environment variables',
        hint: 'Add RESEND_API_KEY to Vercel environment variables'
      }, { status: 500 })
    }

    console.log('[Email Test] Initializing Resend with API key:', process.env.RESEND_API_KEY?.substring(0, 10) + '...')
    const resend = new Resend(process.env.RESEND_API_KEY)

    console.log('[Email Test] Sending test email to:', to)
    
    const result = await resend.emails.send({
      from: 'Followlytics <notifications@followlytics.joepro.ai>',
      to: to,
      subject: '✅ Email Test - Followlytics',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1DA1F2;">🎉 Email System Working!</h1>
          <p>This is a test email from Followlytics.</p>
          <p>If you received this, your email integration is working correctly.</p>
          
          <div style="background: #f5f8fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">✅ Configuration Status:</h3>
            <ul>
              <li><strong>RESEND_API_KEY:</strong> Configured</li>
              <li><strong>Sender:</strong> notifications@followlytics.joepro.ai</li>
              <li><strong>Test sent at:</strong> ${new Date().toLocaleString()}</li>
            </ul>
          </div>
          
          <p style="color: #657786; font-size: 12px; margin-top: 30px;">
            This email was sent from your Followlytics production environment.
          </p>
        </div>
      `
    })

    console.log('[Email Test] Resend API response:', result)

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully!',
      emailId: result.data?.id,
      details: result
    })

  } catch (error: any) {
    console.error('[Email Test] Error:', error)
    return NextResponse.json({
      error: 'Failed to send test email',
      details: error.message,
      fullError: error
    }, { status: 500 })
  }
}
