import posthog from 'posthog-js';

export const analytics = {
  // Page views
  pageview: (url: string) => {
    if (typeof window !== 'undefined') {
      posthog?.capture('$pageview', { url });
    }
  },

  // Custom events
  track: (event: string, properties?: Record<string, any>) => {
    if (typeof window !== 'undefined') {
      posthog?.capture(event, properties);
    }
  },

  // Identify user
  identify: (userId: string, traits?: Record<string, any>) => {
    if (typeof window !== 'undefined') {
      posthog?.identify(userId, traits);
    }
  },

  // Reset on logout
  reset: () => {
    if (typeof window !== 'undefined') {
      posthog?.reset();
    }
  },
};
