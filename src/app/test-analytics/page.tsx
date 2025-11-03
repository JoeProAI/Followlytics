'use client';

import { analytics } from '@/lib/analytics/posthog-analytics';
import * as Sentry from '@sentry/nextjs';

export default function TestAnalyticsPage() {
  const testPostHog = () => {
    analytics.track('test_event', {
      test_property: 'test_value',
      timestamp: new Date().toISOString(),
    });
    alert('PostHog event sent! Check your PostHog dashboard.');
  };

  const testSentry = () => {
    try {
      throw new Error('Test error for Sentry');
    } catch (error) {
      Sentry.captureException(error);
      alert('Sentry error sent! Check your Sentry dashboard.');
    }
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-black">
          Analytics Test Page
        </h1>

        <div className="space-y-4 flex flex-col gap-4">
          <button
            onClick={testPostHog}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700"
          >
            Test PostHog Event
          </button>

          <button
            onClick={testSentry}
            className="bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700"
          >
            Test Sentry Error
          </button>
        </div>

        <div className="bg-gray-100 p-4 rounded-md">
          <h2 className="font-semibold mb-2 text-black">What to check:</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-black">
            <li>PostHog: Dashboard → Live Events → Look for "test_event"</li>
            <li>Sentry: Issues → Look for "Test error for Sentry"</li>
            <li>Both should appear within 30 seconds</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
