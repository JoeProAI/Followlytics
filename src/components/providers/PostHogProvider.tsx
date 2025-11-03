'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { analytics } from '@/lib/analytics/posthog-analytics';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      const url = window.origin + pathname;
      const search = searchParams?.toString();
      const fullUrl = search ? `${url}?${search}` : url;
      
      analytics.pageview(fullUrl);
    }
  }, [pathname, searchParams]);

  return <>{children}</>;
}
