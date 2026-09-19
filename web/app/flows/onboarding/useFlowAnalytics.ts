'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePostHog } from '@posthog/next';
import { FlowJourneySession, flowMetrics, type FlowStage, type FlowTrack } from '../../../lib/flow-analytics';
import type { FactoryDraft } from '../../../lib/flow-onboarding';

export function useFlowAnalytics(draft: FactoryDraft, stage: FlowStage, enabled: boolean) {
  const ph = usePostHog();
  const tracker = useRef<FlowJourneySession | null>(null);
  const mounted = useRef<object | null>(null);
  const currentDraft = useRef(draft);
  currentDraft.current = draft;
  useEffect(() => {
    if (!enabled || !process.env.NEXT_PUBLIC_POSTHOG_KEY || !ph || ph.has_opted_out_capturing()) return;
    if (!tracker.current) {
      tracker.current = new FlowJourneySession((event, properties, beacon) => {
        ph.capture(event, properties, beacon ? { transport: 'sendBeacon' } : undefined);
      }, { getItem: key => sessionStorage.getItem(key), setItem: (key, value) => sessionStorage.setItem(key, value) },
      () => crypto.randomUUID(), Date.now, () => flowMetrics(currentDraft.current));
    }
    tracker.current.view(stage);
    const linger = window.setTimeout(() => {
      if (document.visibilityState === 'visible') tracker.current?.track('step_lingered', { threshold_ms: 60_000 });
    }, 60_000);
    return () => clearTimeout(linger);
  }, [enabled, stage, ph]);
  useEffect(() => {
    const visibility = () => document.visibilityState === 'hidden' ? tracker.current?.pause() : tracker.current?.resume();
    const hide = () => tracker.current?.leave('pagehide');
    const show = () => tracker.current?.resume();
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', hide); window.addEventListener('pageshow', show);
    // Delay unmount accounting one microtask to ignore React Strict Mode's
    // setup/cleanup probe, but still count SPA exits out of onboarding.
    let disposed = false;
    const token = {};
    mounted.current = token;
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', hide); window.removeEventListener('pageshow', show);
      queueMicrotask(() => { if (disposed && mounted.current === token) tracker.current?.leave('unmount'); });
    };
  }, []);
  const track: FlowTrack = useCallback((event, properties = {}) => tracker.current?.track(event, properties), []);
  // PostHog's anonymous device id for this visitor, carried into the Cloud
  // handoff so Cloud can join the two apps' people even when same-origin
  // browser storage did not survive the trip. Never sent when PostHog is
  // absent or the visitor opted out.
  const getDistinctId = useCallback(() => {
    try {
      if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || !ph || ph.has_opted_out_capturing()) return undefined;
      return ph.get_distinct_id() || undefined;
    } catch { return undefined; }
  }, [ph]);
  return { track, getJourneyId: () => ph && !ph.has_opted_out_capturing() ? tracker.current?.id : undefined, getDistinctId,
    markOutcome: (outcome: 'cloud_handoff' | 'local_kit_downloaded') => tracker.current?.markOutcome(outcome) };
}
