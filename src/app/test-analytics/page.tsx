'use client';

import { analytics } from '@/lib/analytics/posthog-analytics';
import { posthog } from 'posthog-js';

export default function TestAnalyticsPage() {
  const testPostHog = () => {
    analytics.track('test_event', {
      test_property: 'test_value',
      timestamp: new Date().toISOString(),
    });
    alert('PostHog event sent! Check your PostHog dashboard.');
  };

  const testPageview = () => {
    analytics.pageview(window.location.href);
    alert('Pageview sent! Check PostHog → Live Events');
  };

  const testCapture = () => {
    posthog.capture('button_clicked', {
      button_name: 'test_capture',
      page: '/test-analytics'
    });
    alert('Direct capture sent! Check PostHog dashboard.');
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-black">
          PostHog Analytics Test
        </h1>

        <div className="space-y-4 flex flex-col gap-4">
          <button
            onClick={testPostHog}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700"
          >
            Test Custom Event (via analytics helper)
          </button>

          <button
            onClick={testPageview}
            className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700"
          >
            Test Pageview
          </button>

          <button
            onClick={testCapture}
            className="bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700"
          >
            Test Direct Capture (via posthog.capture)
          </button>
        </div>

        <div className="bg-gray-100 p-4 rounded-md">
          <h2 className="font-semibold mb-2 text-black">What to check:</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-black">
            <li>PostHog Dashboard → Live Events → Look for events</li>
            <li>Should see: $pageview, test_event, button_clicked</li>
            <li>Events appear within 5-10 seconds</li>
            <li>URL: https://us.i.posthog.com/project/YOUR_PROJECT</li>
          </ul>
        </div>

        <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
          <h2 className="font-semibold mb-2 text-blue-900">PostHog Setup Status:</h2>
          <div className="text-sm text-blue-800 space-y-1">
            <p>✅ PostHog installed via: instrumentation-client.ts</p>
            <p>✅ Key: {process.env.NEXT_PUBLIC_POSTHOG_KEY ? 'Configured' : '❌ Missing'}</p>
            <p>✅ Host: {process.env.NEXT_PUBLIC_POSTHOG_HOST || 'Not set'}</p>
            <p>✅ Auto pageview tracking: Enabled</p>
          </div>
        </div>
      </div>
    </div>
  );
}
