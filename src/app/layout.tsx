import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Followlytics - Twitter Follower Tracker',
  description: 'Track your Twitter followers and identify unfollowers with detailed analytics',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-background text-foreground">
          <AuthProvider>
            {children}
          </AuthProvider>
        </div>
      </body>
    </html>
  )
}
