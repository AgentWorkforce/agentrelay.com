'use client';
import { useEffect, useRef } from 'react';
import { usePostHog } from '@posthog/next';
import { journeyId } from '../../lib/flow-analytics';
import { isFlowsGoogleAuthHref, withFlowsJourney } from '../../lib/flows-cloud';

export function FlowLandingAnalytics() {
  const ph = usePostHog();
  const viewed = useRef(false);
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || !ph || ph.has_opted_out_capturing()) return;
    let id: string;
    try { id = journeyId(sessionStorage, () => crypto.randomUUID()); } catch { id = crypto.randomUUID(); }
    for (const link of document.querySelectorAll<HTMLAnchorElement>('a[data-flows-auth]')) {
      link.href = withFlowsJourney(link.href, id);
    }
    const capture = (event: string, properties = {}) => {
      try { ph.capture(event, { ...properties, journey_id: id, funnel_version: 2 }); } catch { /* Optional. */ }
    };
    if (!viewed.current) { capture('flows_landing_viewed'); viewed.current = true; }
    const click = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.('a[href]');
      if (!(link instanceof HTMLAnchorElement)) return;
      const url = new URL(link.href);
      if (!isFlowsGoogleAuthHref(url.toString())) return;
      const placement = url.searchParams.get('utm_content');
      capture('flows_onboarding_entry_clicked', { placement: ['hero', 'nav', 'mobile_nav'].includes(placement ?? '') ? placement : 'other' });
    };
    document.addEventListener('click', click);
    return () => document.removeEventListener('click', click);
  }, [ph]);
  return null;
}
