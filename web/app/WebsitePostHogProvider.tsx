'use client';
// The public client provider shares @posthog/next's hook context. Keeping
// configuration here lets before_send run without serializing a function
// through the server-component boundary, and before the first SDK capture.
import { PostHogProvider } from '@posthog/next/pages';
import type { ReactNode } from 'react';
import { maskSignupNetworkRequest, sanitizeSignupAnalytics } from '../lib/signup-analytics-privacy';

export function WebsitePostHogProvider({ apiKey, host, children }: { apiKey: string; host: string; children: ReactNode }) {
  return <PostHogProvider apiKey={apiKey} clientOptions={{
    api_host: host, autocapture: true, capture_exceptions: true, capture_heatmaps: true,
    capture_pageview: false, capture_pageleave: true,
    session_recording: { maskAllInputs: true, blockSelector: '.ph-sensitive', maskCapturedNetworkRequestFn: maskSignupNetworkRequest },
    before_send: sanitizeSignupAnalytics,
  }}>{children}</PostHogProvider>;
}
