// Download exported followers in various formats
// Supports: CSV, JSON, Excel (XLSX), Markdown

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')
    const format = searchParams.get('format') || 'csv'

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 })
    }

    const cleanUsername = username.replace('@', '').toLowerCase()

    // Get followers from cache
    const cacheDoc = await adminDb.collection('follower_cache').doc(cleanUsername).get()

    if (!cacheDoc.exists) {
      return NextResponse.json({ error: 'No data found for this username' }, { status: 404 })
    }

    const cacheData = cacheDoc.data()
    const followers = cacheData!.followers || []

    if (followers.length === 0) {
      return NextResponse.json({ error: 'No followers data available' }, { status: 404 })
    }

    // Format data based on request
    switch (format.toLowerCase()) {
      case 'json':
        return new NextResponse(JSON.stringify(followers, null, 2), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${cleanUsername}_followers.json"`
          }
        })

      case 'csv':
        const csv = convertToCSV(followers)
        return new NextResponse(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${cleanUsername}_followers.csv"`
          }
        })

      case 'xlsx':
        // For Excel, return JSON with instructions to convert client-side
        return NextResponse.json({
          data: followers,
          format: 'xlsx',
          message: 'Use client-side library to convert to Excel'
        })

      case 'md':
      case 'markdown':
        const markdown = convertToMarkdown(followers, cleanUsername)
        return new NextResponse(markdown, {
          status: 200,
          headers: {
            'Content-Type': 'text/markdown',
            'Content-Disposition': `attachment; filename="${cleanUsername}_followers.md"`
          }
        })

      case 'txt':
        const txt = followers.map((f: any) => `@${f.username}\t${f.name}\t${f.followersCount}`).join('\n')
        return new NextResponse(txt, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="${cleanUsername}_followers.txt"`
          }
        })

      default:
        return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
    }

  } catch (error: any) {
    console.error('[Export Download] Error:', error)
    return NextResponse.json({
      error: 'Failed to download export',
      details: error.message
    }, { status: 500 })
  }
}

function convertToCSV(followers: any[]): string {
  if (followers.length === 0) return ''

  // CSV headers
  const headers = ['Username', 'Name', 'Bio', 'Followers', 'Following', 'Tweets', 'Verified', 'Created At', 'Location', 'Website']
  
  // CSV rows
  const rows = followers.map(f => [
    f.username || '',
    f.name || '',
    (f.bio || '').replace(/[\r\n,]/g, ' '), // Clean bio for CSV
    f.followersCount || 0,
    f.followingCount || 0,
    f.tweetsCount || 0,
    f.isVerified ? 'Yes' : 'No',
    f.createdAt || '',
    (f.location || '').replace(/,/g, ' '),
    f.website || ''
  ])

  // Build CSV
  const csvLines = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ]

  return csvLines.join('\n')
}

function convertToMarkdown(followers: any[], username: string): string {
  let md = `# Followers of @${username}\n\n`
  md += `Total Followers: ${followers.length.toLocaleString()}\n\n`
  md += `---\n\n`
  
  md += `| Username | Name | Followers | Following | Verified |\n`
  md += `|----------|------|-----------|-----------|----------|\n`
  
  followers.forEach(f => {
    md += `| @${f.username} | ${f.name || '-'} | ${(f.followersCount || 0).toLocaleString()} | ${(f.followingCount || 0).toLocaleString()} | ${f.isVerified ? '✓' : ''} |\n`
  })
  
  return md
}
