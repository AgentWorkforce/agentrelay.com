'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePostHog } from '@posthog/next';
import { FlowJourneyTracker, flowMetrics, journeyId, type FlowStage, type FlowTrack } from '../../../lib/flow-analytics';
import type { FactoryDraft } from '../../../lib/flow-onboarding';

export function useFlowAnalytics(draft: FactoryDraft, stage: FlowStage, enabled: boolean) {
  const ph = usePostHog();
  const tracker = useRef<FlowJourneyTracker | null>(null);
  const mounted = useRef<object | null>(null);
  const currentDraft = useRef(draft);
  currentDraft.current = draft;
  useEffect(() => {
    if (!enabled || !process.env.NEXT_PUBLIC_POSTHOG_KEY || !ph || ph.has_opted_out_capturing()) return;
    if (!tracker.current) {
      let id: string;
      try { id = journeyId(sessionStorage, () => crypto.randomUUID()); } catch { id = crypto.randomUUID(); }
      tracker.current = new FlowJourneyTracker((event, properties, beacon) => {
        ph.capture(event, properties, beacon ? { transport: 'sendBeacon' } : undefined);
      }, id, Date.now, () => flowMetrics(currentDraft.current));
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
  return { track, getJourneyId: () => ph && !ph.has_opted_out_capturing() ? tracker.current?.id : undefined,
    markOutcome: (outcome: 'cloud_handoff' | 'local_kit_downloaded') => tracker.current?.markOutcome(outcome) };
}
