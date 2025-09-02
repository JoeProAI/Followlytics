import Link from "next/link"
import { TrendingDown } from "lucide-react"

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
        
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Service Description</h2>
            <p>Followlytics provides X (Twitter) follower analytics and AI-powered insights to help users understand their audience engagement patterns.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Acceptable Use</h2>
            <p>You agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the service for legitimate analytics purposes only</li>
              <li>Not attempt to circumvent rate limits or security measures</li>
              <li>Not share your account credentials with others</li>
              <li>Comply with X's Terms of Service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Subscription Terms</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Subscriptions are billed monthly in advance</li>
              <li>You can cancel anytime from your account settings</li>
              <li>Refunds are provided on a case-by-case basis</li>
              <li>Price changes will be communicated 30 days in advance</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
            <p>Followlytics is provided "as is" without warranties. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Contact</h2>
            <p>Questions about these terms? Contact us at: legal@followlytics.com</p>
          </section>
        </div>
      </main>
    </div>
  )
}
