import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SignupTracker } from '../agent-signup-analytics';
import { maskSignupNetworkRequest, sanitizeSignupAnalytics } from '../signup-analytics-privacy';

const journeyId = '537e4857-5590-42e8-8731-66441b466542';
const storage = () => {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
};
const ph = { __loaded: true, has_opted_out_capturing: vi.fn(() => false), get_distinct_id: vi.fn(() => 'anon-visitor'), capture: vi.fn() };
beforeEach(() => { ph.__loaded = true; ph.has_opted_out_capturing.mockReturnValue(false); ph.capture.mockReset(); });

describe('agent signup funnel', () => {
  it.each(['teams', 'flows'] as const)('joins %s entry, copy, and server handoff across reloads', product => {
    const store = storage();
    const first = new SignupTracker(ph, product, store, () => journeyId, () => 1000);
    first.track('entry_clicked');
    expect(first.context()).toEqual({ journeyId, distinctId: 'anon-visitor' });
    const reload = new SignupTracker(ph, product, store, () => { throw new Error('must reuse journey'); }, () => 2000);
    reload.track('page_viewed'); reload.track('prompt_copied'); reload.track('page_left', 3);
    const events = ph.capture.mock.calls;
    expect(events.map(([event]) => event)).toEqual(['agent_signup_entry_clicked', 'agent_signup_page_viewed', 'agent_signup_prompt_copied', 'agent_signup_page_left']);
    for (const [, properties] of events) expect(properties).toMatchObject({ journey_id: journeyId, product, funnel: 'agent_signup', funnel_version: 1 });
    expect(events.at(-1)?.[1]).toMatchObject({ step: 3 });
    expect(events.at(-1)?.[2]).toEqual({ transport: 'sendBeacon' });
  });
  it('creates distinct journeys by product and explicit restart', () => {
    const uuid = vi.fn().mockReturnValueOnce(journeyId).mockReturnValueOnce('637e4857-5590-42e8-8731-66441b466542').mockReturnValueOnce('737e4857-5590-42e8-8731-66441b466542');
    const store = storage();
    const teams = new SignupTracker(ph, 'teams', store, uuid);
    const flows = new SignupTracker(ph, 'flows', store, uuid);
    expect(teams.context()?.journeyId).not.toBe(flows.context()?.journeyId);
    teams.restart();
    expect(teams.context()?.journeyId).not.toBe(journeyId);
  });
  it('deduplicates pagehide plus SPA unmount and does not seed a new journey when restarting', () => {
    const uuid = vi.fn(() => journeyId);
    const tracker = new SignupTracker(ph, 'teams', storage(), uuid);
    tracker.context(); tracker.leave(3); tracker.leave(3);
    expect(ph.capture.mock.calls.map(([event]) => event)).toEqual(['agent_signup_page_left']);
    tracker.resume(); tracker.leave(4);
    expect(ph.capture).toHaveBeenCalledTimes(2);
    tracker.restart(); tracker.leave(4);
    expect(ph.capture.mock.calls.map(([event]) => event)).toEqual(['agent_signup_page_left', 'agent_signup_page_left', 'agent_signup_restarted']);
    expect(uuid).toHaveBeenCalledTimes(1);
  });
  it('waits briefly for the SDK so early events and the session POST share one journey', async () => {
    ph.__loaded = false;
    const tracker = new SignupTracker(ph, 'flows', storage(), () => journeyId);
    const pending = tracker.contextWhenReady(500);
    ph.__loaded = true;
    await expect(pending).resolves.toEqual({ journeyId, distinctId: 'anon-visitor' });
  });
  it('returns undefined without blocking setup when the SDK never loads', async () => {
    ph.__loaded = false;
    const tracker = new SignupTracker(ph, 'flows', storage(), () => journeyId);
    await expect(tracker.contextWhenReady(50)).resolves.toBeUndefined();
    expect(ph.capture).not.toHaveBeenCalled();
  });
  it('does not send browser or server context when unconfigured or opted out', () => {
    const tracker = new SignupTracker(ph, 'teams', storage(), () => journeyId);
    ph.__loaded = false;
    expect(tracker.context()).toBeUndefined(); tracker.track('page_viewed');
    ph.__loaded = true; ph.has_opted_out_capturing.mockReturnValue(true);
    expect(tracker.context()).toBeUndefined(); tracker.track('prompt_copied');
    expect(ph.capture).not.toHaveBeenCalled();
  });
  it('keeps working with unavailable storage, a broken SDK, or malformed stored data', () => {
    const broken = { getItem: () => { throw new Error(); }, setItem: () => { throw new Error(); }, removeItem: () => { throw new Error(); } };
    const tracker = new SignupTracker(ph, 'teams', broken, () => journeyId);
    expect(tracker.context()?.journeyId).toBe(journeyId);
    ph.capture.mockImplementation(() => { throw new Error(); });
    expect(() => tracker.track('page_viewed')).not.toThrow();
    expect(() => tracker.restart()).not.toThrow();
  });
  it('drops replay network entries including serialized capability-bearing bodies and headers', () => {
    for (const name of ['https://agentrelay.com/cloud/api/v1/signup/agent/sessions', '/cloud/api/v1/signup/agent/sessions/' + journeyId, 'https://cloud.example/api/v1/signup/agent/sessions/' + journeyId]) {
      const entry = { name, requestBody: JSON.stringify({ product: 'teams' }),
        responseBody: JSON.stringify({ id: journeyId, writeToken: 'a'.repeat(64) }),
        requestHeaders: { Authorization: 'Bearer private' } };
      expect(maskSignupNetworkRequest(entry)).toBeNull();
    }
    const safe = { name: 'https://agentrelay.com/api/v1/flows/catalog' };
    expect(maskSignupNetworkRequest(safe)).toBe(safe);
  });
  it('scrubs SDK URL enrichment and nested replay metadata without mutating the original event', () => {
    const id = '637e4857-5590-42e8-8731-66441b466542';
    const event = { event: '$pageleave', properties: { $current_url: `https://agentrelay.com/signup/teams?session=${id}&utm_source=docs`, $referrer: `http://localhost:3100/signup/teams?session=${id}`, prompt: 'private prompt with token', writeToken: 'secret', journey_id: journeyId, nested: [{ url: `https://agentrelay.com/cloud/api/v1/signup/agent/sessions/${id}` }] } };
    const clean = sanitizeSignupAnalytics(event)!;
    expect(JSON.stringify(clean)).not.toContain(id);
    expect(JSON.stringify(clean)).not.toContain('private prompt');
    expect(JSON.stringify(clean)).not.toContain('secret');
    expect(clean.properties.journey_id).toBe(journeyId);
    expect(clean.properties.$current_url).toContain('utm_source=docs');
    expect(event.properties.writeToken).toBe('secret');
  });
});
