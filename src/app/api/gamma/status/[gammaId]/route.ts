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

    const gamma = getGammaClient()
    const result = await gamma.getFileUrls(gammaId)

    return NextResponse.json({
      success: true,
      gammaId: result.gamma_id,
      status: result.status,
      urls: result.urls
    })

  } catch (error: any) {
    console.error('[Gamma Status] Error:', error)
    return NextResponse.json({
      error: 'Failed to check status',
      details: error.message
    }, { status: 500 })
  }
}
