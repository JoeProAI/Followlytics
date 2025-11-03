import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import SpeedBackdrop from '@/components/ui/SpeedBackdrop'
import { PostHogProvider } from '@/components/providers/PostHogProvider'
import '@/instrumentation-client'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Followlytics - Competitive Intelligence for X',
  description: 'Track competitors, analyze engagement patterns, discover viral content, and monitor your X presence with sharp analytics.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PostHogProvider>
          <div className="min-h-screen bg-background text-foreground relative">
            <SpeedBackdrop />
            <AuthProvider>
              {children}
            </AuthProvider>
          </div>
        </PostHogProvider>
      </body>
    </html>
  )
}

