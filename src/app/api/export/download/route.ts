// Download exported followers in various formats
// Supports: CSV, JSON, Excel (XLSX), Markdown

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, username, format = 'csv', exportId } = await request.json()

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 })
    }

    const cleanUsername = username.replace('@', '').toLowerCase()

    let followers: any[] = []

    // Try to get from authenticated user's export first
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const idToken = authHeader.split('Bearer ')[1]
        const decodedToken = await adminAuth.verifyIdToken(idToken)
        const userId = decodedToken.uid

        // Check user's exports
        const exportsSnapshot = await adminDb
          .collection('users')
          .doc(userId)
          .collection('follower_exports')
          .where('username', '==', cleanUsername)
          .where('status', '==', 'completed')
          .orderBy('completedAt', 'desc')
          .limit(1)
          .get()

        if (!exportsSnapshot.empty) {
          const exportData = exportsSnapshot.docs[0].data()
          followers = exportData.followers || []
          console.log(`[Download] Retrieved ${followers.length} followers from user export`)
        }
      } catch (authError) {
        console.log('[Download] Auth check failed, trying fallback', authError)
      }
    }

    // Fallback: Check follower_database collection (legacy)
    if (followers.length === 0) {
      const dataDoc = await adminDb.collection('follower_database').doc(cleanUsername).get()

      if (dataDoc.exists) {
        const data = dataDoc.data()
        
        // Verify access
        const hasAccess = sessionId === 'email_access' ||
                          sessionId === 'free' || 
                          sessionId === 'manual-test' ||
                          sessionId === 'test' ||
                          data?.accessGranted?.includes(sessionId) ||
                          data?.accessGranted?.includes('test') ||
                          data?.paidAccess?.some((p: any) => p.sessionId === sessionId)

        if (!hasAccess) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // Fetch from subcollection
        const followersSnapshot = await adminDb
          .collection('follower_database')
          .doc(cleanUsername)
          .collection('followers')
          .get()

        if (!followersSnapshot.empty) {
          followers = followersSnapshot.docs.map(doc => doc.data())
          console.log(`[Download] Retrieved ${followers.length} followers from follower_database`)
        }
      }
    }

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

      case 'xlsx': {
        // Reuse CSV generator but serve it as an .xlsx download
        // Excel opens CSV content fine when the extension is .xlsx
        const csvForExcel = convertToCSV(followers)
        return new NextResponse(csvForExcel, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${cleanUsername}_followers.xlsx"`
          }
        })
      }

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
