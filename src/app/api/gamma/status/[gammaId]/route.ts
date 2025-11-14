// Check status of Gamma generation and get download URLs
import { NextRequest, NextResponse } from 'next/server'
import { getGammaClient } from '@/lib/gamma-client'

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

    // If completed, return URLs
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
