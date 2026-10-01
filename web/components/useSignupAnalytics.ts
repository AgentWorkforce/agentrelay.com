'use client';
import { useMemo } from 'react';
import { usePostHog } from '@posthog/next';
import type { AgentSignupProduct } from '../lib/agent-signup';
import { SignupTracker } from '../lib/agent-signup-analytics';

export function useSignupAnalytics(product: AgentSignupProduct) {
  const ph = usePostHog();
  return useMemo(() => new SignupTracker(ph, product, {
    getItem: key => sessionStorage.getItem(key),
    setItem: (key, value) => sessionStorage.setItem(key, value),
    removeItem: key => sessionStorage.removeItem(key),
  }), [ph, product]);
}
