'use client';

import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';

// Initialize Sentry
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    environment: process.env.NODE_ENV,
  });
}

// Initialize PostHog (non-blocking)
if (typeof window !== 'undefined') {
  setTimeout(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') {
          posthog.debug();
        }
      },
      capture_pageview: false, // We'll handle this manually
      capture_pageleave: true,
    });
  }, 0);
}

export { posthog };

// Export Sentry router transition handler
export function onRouterTransitionStart() {
  // Called on route transitions for Sentry
}
