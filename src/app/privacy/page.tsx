export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
          
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Our Privacy-First Approach</h2>
              <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-800">
                      <strong>We do NOT store your X session data, cookies, or login credentials.</strong>
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Followlytics is built with privacy as the foundation. We use a "live extraction" approach that processes your follower data in real-time without storing any personal authentication information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">What We Store</h2>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold text-gray-800">✅ What We DO Store:</h3>
                  <ul className="mt-2 text-gray-600 space-y-1">
                    <li>• Your email address (for account management)</li>
                    <li>• Extracted follower data (usernames and display names only)</li>
                    <li>• Scan results and analytics</li>
                    <li>• OAuth tokens (for future API features - not for authentication)</li>
                  </ul>
                </div>
                
                <div className="border-l-4 border-red-500 pl-4">
                  <h3 className="font-semibold text-gray-800">❌ What We DO NOT Store:</h3>
                  <ul className="mt-2 text-gray-600 space-y-1">
                    <li>• Your X password</li>
                    <li>• Session cookies or authentication tokens</li>
                    <li>• Personal messages or private data</li>
                    <li>• Any data beyond public follower information</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">How Live Extraction Works</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <ol className="text-gray-700 space-y-2">
                  <li><strong>1.</strong> You sign into X in your own browser</li>
                  <li><strong>2.</strong> We create a temporary, isolated sandbox environment</li>
                  <li><strong>3.</strong> You authorize the extraction to begin</li>
                  <li><strong>4.</strong> We extract public follower data in real-time</li>
                  <li><strong>5.</strong> The sandbox is destroyed immediately after extraction</li>
                  <li><strong>6.</strong> No session data is retained</li>
                </ol>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Data Retention</h2>
              <p className="text-gray-600 leading-relaxed">
                We only retain the follower data you explicitly choose to extract. This includes usernames and display names of your followers, which are used to provide analytics and insights. You can delete this data at any time from your dashboard.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Your Rights</h2>
              <ul className="text-gray-600 space-y-2">
                <li>• <strong>Delete your data:</strong> Remove all stored follower data at any time</li>
                <li>• <strong>Export your data:</strong> Download your follower data in JSON format</li>
                <li>• <strong>Account deletion:</strong> Permanently delete your account and all associated data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Contact</h2>
              <p className="text-gray-600">
                If you have any questions about our privacy practices, please contact us at{' '}
                <a href="mailto:privacy@followlytics.com" className="text-blue-600 hover:text-blue-800">
                  privacy@followlytics.com
                </a>
              </p>
            </section>

            <div className="border-t pt-8 mt-8">
              <p className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

