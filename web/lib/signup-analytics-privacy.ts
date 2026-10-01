/** Scrub signup read capabilities from SDK-enriched URLs and replay metadata. */
export function sanitizeSignupAnalytics<T>(event: T | null): T | null {
  const seen = new WeakMap<object, unknown>();
  function clean(value: unknown, key = ''): unknown {
    if (/^(writeToken|write_token|progress_token|device_code|access_token|refresh_token|prompt)$/i.test(key)) return '[redacted]';
    if (typeof value === 'string') return value
      .replace(/([?&]session=)[^&#\s"']+/gi, '$1[redacted]')
      .replace(/(\/api\/v1\/signup\/agent\/sessions\/)[0-9a-f-]{36}/gi, '$1[redacted]');
    if (!value || typeof value !== 'object') return value;
    if (seen.has(value)) return seen.get(value);
    if (Array.isArray(value)) {
      const result: unknown[] = []; seen.set(value, result);
      value.forEach(item => result.push(clean(item))); return result;
    }
    if (Object.getPrototypeOf(value) !== Object.prototype) return value;
    const result: Record<string, unknown> = {}; seen.set(value, result);
    for (const [k, v] of Object.entries(value)) result[k] = clean(v, k);
    return result;
  }
  return clean(event) as T | null;
}

/** Drop request AND response bodies/headers before the replay recorder sees them. */
export function maskSignupNetworkRequest<T extends { name: string }>(request: T): T | null {
  try {
    const path = new URL(request.name, 'https://agentrelay.com').pathname;
    if (/\/(?:cloud\/)?api\/v1\/signup\/agent\/sessions(?:\/|$)/.test(path)) return null;
  } catch { /* A non-URL performance entry has no signup payload. */ }
  return request;
}
