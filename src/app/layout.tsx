import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import SpeedBackdrop from '@/components/ui/SpeedBackdrop'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Followlytics - X Analytics',
  description: 'Sharp analytics for X: followers, engagement, insights.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-background text-foreground relative">
          <SpeedBackdrop />
          <AuthProvider>
            {children}
          </AuthProvider>
        </div>
      </body>
    </html>
  )
}
