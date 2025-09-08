import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET(request: NextRequest) {
  try {
    // Path to the extension zip file
    const filePath = join(process.cwd(), 'public', 'followlytics-extension.zip')
    
    // Read the file
    const fileBuffer = readFileSync(filePath)
    
    // Return the file as a download
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="followlytics-extension.zip"',
        'Content-Length': fileBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error serving extension file:', error)
    return NextResponse.json(
      { error: 'Extension file not found' },
      { status: 404 }
    )
  }
}
