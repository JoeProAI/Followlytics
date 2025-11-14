'use client'

import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <Link href="/" className="text-xl font-light hover:text-gray-300 transition-colors">
            Followlytics
          </Link>
          <span className="text-xs text-gray-500">Terms of Service</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10 text-sm text-gray-200">
        <section>
          <h1 className="text-3xl font-light mb-4">Terms of Service</h1>
          <p className="text-gray-400">
            These Terms of Service ("Terms") govern your access to and use of Followlytics (the "Service").
            By using the Service, you agree to be bound by these Terms. This text is provided for convenience
            and product clarity only and does not replace independent legal advice.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-light mb-2">1. What Followlytics Does</h2>
          <p className="text-gray-400 mb-2">
            Followlytics analyzes public X profiles and follower data and presents that information back to you in
            the form of reports, exports and dashboards. We focus on read-only analytics and do not provide posting
            or account management features.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-light mb-2">2. No Control Over Your X Account</h2>
          <p className="text-gray-400 mb-2">
            Followlytics does not:
          </p>
          <ul className="list-disc list-inside text-gray-400 space-y-1">
            <li>Ask for your X password.</li>
            <li>Post, like, reply, DM, or otherwise act on your behalf on X.</li>
            <li>Change your X account settings, profile, or security configuration.</li>
          </ul>
          <p className="text-gray-400 mt-3">
            Where the Service uses authenticated access (for example, via official X APIs), such access is used only to
            read data necessary to provide analytics and exports. You can revoke such access at any time from within X.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-light mb-2">3. Data Sources & Third-Party Platforms</h2>
          <p className="text-gray-400 mb-2">
            The Service relies on data from X and other third‑party providers (including APIs and scraping
            infrastructure). Followlytics has no control over the availability, accuracy, or behavior of these
            third‑party platforms.
          </p>
          <p className="text-gray-400">
            X may change its API, rate limits, policies, or enforcement at any time. We cannot guarantee that data will
            always be available, up‑to‑date, or complete.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-light mb-2">4. No Guarantees About Outcomes</h2>
          <p className="text-gray-400">
            Reports, analytics, and recommendations provided by the Service are for informational purposes only.
            Followlytics does not guarantee any particular business outcome, follower growth, revenue, engagement,
            or account performance. You are solely responsible for how you use the information provided by the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-light mb-2">5. Your Responsibilities</h2>
          <p className="text-gray-400 mb-2">
            You agree to:
          </p>
          <ul className="list-disc list-inside text-gray-400 space-y-1">
            <li>Use the Service in compliance with all applicable laws and X's own terms and policies.</li>
            <li>Not use Followlytics to harass, spam, or otherwise abuse other users on X.</li>
            <li>Not attempt to reverse engineer, bypass rate limits, or otherwise misuse the Service.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-light mb-2">6. Account Safety & Responsibility</h2>
          <p className="text-gray-400 mb-2">
            Followlytics takes full responsibility for operating the infrastructure and external integrations that
            gather and process data on your behalf. We design the Service to minimize risk to your X account by
            focusing on read‑only access and public information where possible.
          </p>
          <p className="text-gray-400">
            However, we cannot control X's own decisions. If X chooses to restrict, limit, or take action on an account
            for any reason, that decision is made solely by X and is outside of Followlytics' control.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-light mb-2">7. Disclaimers</h2>
          <p className="text-gray-400 mb-2">
            The Service is provided on an "as is" and "as available" basis. To the maximum extent permitted by law,
            Followlytics disclaims all warranties, whether express, implied, or statutory, including without limitation
            any implied warranties of merchantability, fitness for a particular purpose, and non‑infringement.
          </p>
          <p className="text-gray-400">
            We do not warrant that the Service will be uninterrupted, error‑free, secure, or that any data or content
            will be accurate or complete.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-light mb-2">8. Limitation of Liability</h2>
          <p className="text-gray-400 mb-2">
            To the maximum extent permitted by law, in no event will Followlytics, its founders, employees, or
            contractors be liable for any indirect, incidental, special, consequential, or punitive damages, including
            without limitation lost profits, lost revenue, loss of data, or business interruption, arising out of or in
            connection with your use of the Service.
          </p>
          <p className="text-gray-400">
            To the maximum extent permitted by law, Followlytics' total aggregate liability for any and all claims
            arising out of or related to the Service, whether in contract, tort, or otherwise, is limited to the lesser
            of (a) the amount you paid for the Service in the twelve (12) months preceding the event giving rise to the
            claim, or (b) <span className="font-semibold">$100 USD</span>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-light mb-2">9. Indemnity</h2>
          <p className="text-gray-400">
            You agree to indemnify and hold harmless Followlytics from and against any claims, liabilities, damages,
            losses, and expenses (including reasonable attorneys' fees) arising out of or in any way connected with your
            use of the Service, your violation of these Terms, or your violation of any rights of another person or
            entity.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-light mb-2">10. Changes to the Service or Terms</h2>
          <p className="text-gray-400 mb-2">
            We may update the Service and these Terms from time to time. If we make material changes, we will update
            this page with a new "Last updated" date. Your continued use of the Service after changes take effect
            constitutes acceptance of the updated Terms.
          </p>
          <p className="text-gray-400">
            Last updated: {new Date().getFullYear()}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-light mb-2">11. Contact</h2>
          <p className="text-gray-400">
            If you have questions about these Terms, you can contact us at{' '}
            <a href="mailto:support@followlytics.com" className="underline hover:text-gray-300">
              support@followlytics.com
            </a>.
          </p>
        </section>
      </main>
    </div>
  )
}
