import Link from "next/link"
import { TrendingDown } from "lucide-react"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="px-4 lg:px-6 h-14 flex items-center border-b bg-white">
        <Link className="flex items-center justify-center" href="/">
          <TrendingDown className="h-6 w-6 mr-2" />
          <span className="font-bold">Followlytics</span>
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
            <p>When you use Followlytics, we collect:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your X (Twitter) username and public profile information</li>
              <li>Your follower list and follower changes over time</li>
              <li>Public tweets for AI analysis (premium users only)</li>
              <li>Usage analytics to improve our service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Track follower changes and provide analytics</li>
              <li>Generate AI insights about engagement patterns</li>
              <li>Send notifications about follower activity</li>
              <li>Process payments and manage subscriptions</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
            <p>We implement industry-standard security measures including:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encrypted data transmission (HTTPS)</li>
              <li>Secure cloud storage with Firebase</li>
              <li>Regular security audits</li>
              <li>Limited data retention periods</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal data</li>
              <li>Delete your account and data</li>
              <li>Export your data</li>
              <li>Opt out of notifications</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
            <p>For privacy questions, contact us at: privacy@followlytics.com</p>
          </section>
        </div>
      </main>
    </div>
  )
}
