import { describe, expect, it, vi } from 'vitest';
import { FlowJourneySession, JOURNEY_TIMEOUT_MS, FlowJourneyTracker, flowMetrics, journeyId, JOURNEY_STORAGE_KEY, lengthBucket } from '../flow-analytics';
import { cloudConnectionsHref, DEFAULT_FACTORY } from '../flow-onboarding';

const id = '00000000-0000-4000-8000-000000000001';
const freshId = '00000000-0000-4000-8000-000000000002';
function fixture() {
  let now = 0;
  const sink = vi.fn();
  const tracker = new FlowJourneyTracker(sink, id, () => now);
  return { tracker, sink, advance: (ms: number) => { now += ms; } };
}

describe('onboarding funnel accounting', () => {
  it('counts Cursor and OpenCode as supported agents', () => {
    expect(flowMetrics({ ...DEFAULT_FACTORY, agents: ['cursor', 'opencode', 'pi'] })).toMatchObject({
      supported_agent_count: 2, requested_agent_count: 1,
    });
  });
  it('deduplicates rerenders and counts real backwards navigation as a revisit', () => {
    const { tracker, sink, advance } = fixture();
    tracker.view('sources'); tracker.view('sources');
    advance(1000); tracker.view('agents'); tracker.view('sources');
    const views = sink.mock.calls.filter(([event]) => event.endsWith('step_viewed'));
    expect(views).toHaveLength(3);
    expect(views[2][1]).toMatchObject({ stage: 'sources', is_revisit: true, visit_number: 2, journey_id: id });
    expect(sink.mock.calls[1][1]).toMatchObject({ reason: 'route_change', exit_signal: false, active_ms: 1000 });
  });

  it('excludes hidden-tab time and deduplicates exit signals', () => {
    const { tracker, sink, advance } = fixture();
    tracker.view('task'); advance(1000); tracker.pause(); tracker.pause();
    advance(10_000); tracker.resume(); advance(2000);
    tracker.track('choice_changed', { field: 'workflow', to: 'simple' });
    tracker.leave('pagehide'); tracker.leave('unmount');
    const exits = sink.mock.calls.filter(([event]) => event.endsWith('step_left'));
    expect(exits).toHaveLength(1);
    expect(exits[0]).toEqual(['flows_onboarding_step_left', expect.objectContaining({ active_ms: 3000, elapsed_ms: 13_000, choice_changes: 1, exit_signal: true }), true]);
    tracker.resume();
    expect(sink.mock.lastCall?.[1]).toMatchObject({ visit_number: 2, active_ms: 0 });
  });

  it('distinguishes intended handoffs from unexplained exits and sends them immediately', () => {
    const { tracker, sink } = fixture();
    tracker.view('connections'); tracker.track('cloud_handoff_started');
    expect(sink.mock.lastCall?.[2]).toBe(true);
    tracker.markOutcome('cloud_handoff'); tracker.leave('pagehide');
    expect(sink.mock.lastCall?.[1]).toMatchObject({ last_outcome: 'cloud_handoff' });
  });

  it('does not break the product if analytics throws', () => {
    const tracker = new FlowJourneyTracker(() => { throw Error('blocked'); }, id);
    expect(() => { tracker.view('intro'); tracker.track('intro_completed'); tracker.leave('pagehide'); }).not.toThrow();
  });
});

describe('safe analytics payloads and correlation', () => {
  it('reports configuration shape without sending user-entered values', () => {
    const metrics = flowMetrics({ ...DEFAULT_FACTORY, sources: ['github', 'slack'], agents: ['claude', 'pi'],
      sourceSettings: { github: { repository: 'private/repo', labels: 'secret-label' }, slack: { channel: '#secret', mentioned: true } },
      otherAgent: 'Private Agent Name', otherAgentSelected: true, task: 'Confidential instructions' });
    expect(metrics).toMatchObject({ sources: ['github', 'slack'], supported_agent_count: 1, requested_agent_count: 1, other_agent_selected: true,
      configured_filters: ['github.repository', 'github.labels', 'slack.channel', 'slack.mentioned'] });
    for (const secret of ['private/repo', 'secret-label', '#secret', 'Private Agent Name', 'Confidential instructions']) expect(JSON.stringify(metrics)).not.toContain(secret);
    expect([0, 1, 20, 21, 100, 101].map(lengthBucket)).toEqual(['empty', '1-20', '1-20', '21-100', '21-100', '101+']);
  });

  it('reuses a recent journey, expires stale or invalid timestamps, and tolerates blocked storage', () => {
    const storage = { getItem: vi.fn(), setItem: vi.fn() };
    storage.getItem.mockReturnValue(JSON.stringify({ id, updatedAt: 1000 }));
    expect(journeyId(storage, () => freshId, 2000)).toBe(id);
    expect(storage.setItem).toHaveBeenCalledWith(JOURNEY_STORAGE_KEY, JSON.stringify({ id, updatedAt: 2000 }));
    for (const updatedAt of [0, 4_000_000, 'invalid']) {
      storage.getItem.mockReturnValue(JSON.stringify({ id, updatedAt }));
      expect(journeyId(storage, () => freshId, 3_000_000)).toBe(freshId);
    }
    storage.getItem.mockImplementation(() => { throw Error('blocked'); });
    storage.setItem.mockImplementation(() => { throw Error('blocked'); });
    expect(journeyId(storage, () => freshId)).toBe(freshId);
  });

  it('carries an optional journey across Cloud auth without adding it to the URL query', () => {
    const draft = { ...DEFAULT_FACTORY, workflow: 'simple' as const, sources: ['markdown' as const], agents: ['claude' as const], step: 3 };
    const url = new URL(cloudConnectionsHref(draft, freshId, id));
    expect(url.search).toBe('');
    expect(JSON.parse(decodeURIComponent(url.hash.slice(1))).analytics).toEqual({ journeyId: id });
    expect(JSON.parse(decodeURIComponent(new URL(cloudConnectionsHref(draft, freshId)).hash.slice(1))).analytics).toBeUndefined();
  });

  it('carries the anonymous PostHog distinct id beside the journey, and only when given', () => {
    // Both apps are same-origin in production, so Cloud usually reads the same
    // anonymous distinct_id from shared storage. Sending it in the handoff is
    // what lets Cloud tell that continuity held, and alias the two people when
    // it did not. It is a device id, never anything the visitor typed.
    const draft = { ...DEFAULT_FACTORY, workflow: 'simple' as const, sources: ['markdown' as const], agents: ['claude' as const], step: 3 };
    const distinctId = '0198f0aa-1c2d-7c3e-8f10-b2c3d4e5f607';
    const analytics = (href: string) => JSON.parse(decodeURIComponent(new URL(href).hash.slice(1))).analytics;
    expect(analytics(cloudConnectionsHref(draft, freshId, id, distinctId))).toEqual({ journeyId: id, distinctId });
    // A journey can expire or be opted out of while PostHog still has an id,
    // and PostHog can be absent while the journey exists; neither may drag the
    // other into the payload or leave an empty analytics object behind.
    expect(analytics(cloudConnectionsHref(draft, freshId, undefined, distinctId))).toEqual({ distinctId });
    expect(analytics(cloudConnectionsHref(draft, freshId, id))).toEqual({ journeyId: id });
    expect(analytics(cloudConnectionsHref(draft, freshId, id, ''))).toEqual({ journeyId: id });
    expect(analytics(cloudConnectionsHref(draft, freshId, '', ''))).toBeUndefined();
    // The id must stay in the fragment: a query would reach Cloud's server
    // access logs and OAuth state.
    expect(new URL(cloudConnectionsHref(draft, freshId, id, distinctId)).search).toBe('');
  });
});

describe('mounted journey expiration', () => {
  it('resumes short absences, refreshes activity, and replaces expired trackers', () => {
    let now = 0;
    let saved: string | null = null;
    const sink = vi.fn();
    const createId = vi.fn().mockReturnValueOnce(id).mockReturnValue(freshId);
    const storage = { getItem: () => saved, setItem: (_key: string, value: string) => { saved = value; } };
    const session = new FlowJourneySession(sink, storage, createId, () => now);
    session.view('task');
    now = 1000; session.pause();
    now += JOURNEY_TIMEOUT_MS - 1; session.resume();
    expect(session.id).toBe(id);
    expect(JSON.parse(saved!)).toEqual({ id, updatedAt: now });
    expect(sink.mock.lastCall?.[1]).toMatchObject({ stage: 'task', journey_id: id, active_ms: 1000 });
    now += 1000; session.track('choice_changed');
    expect(JSON.parse(saved!).updatedAt).toBe(now);
    session.pause();
    now += JOURNEY_TIMEOUT_MS; session.resume();
    expect(session.id).toBe(freshId);
    expect(sink.mock.lastCall?.[1]).toMatchObject({ stage: 'task', journey_id: freshId, visit_number: 1, active_ms: 0, choice_changes: 0 });
    session.resume();
    expect(createId).toHaveBeenCalledTimes(2);
  });
  it('expires even when browser storage is unavailable', () => {
    let now = 0;
    const createId = vi.fn().mockReturnValueOnce(id).mockReturnValue(freshId);
    const blocked = () => { throw Error('blocked'); };
    const session = new FlowJourneySession(vi.fn(), { getItem: blocked, setItem: blocked }, createId, () => now);
    session.view('agents'); session.pause();
    now += JOURNEY_TIMEOUT_MS;
    session.resume();
    expect(session.id).toBe(freshId);
  });
});
