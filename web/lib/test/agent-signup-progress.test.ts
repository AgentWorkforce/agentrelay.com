import { describe, expect, it } from 'vitest';
import { isSignupProgress, prepareSignupSession, signupSessionId, trackedSignupPrompt, withSignupAnalytics } from '../agent-signup-progress';
import { agentSignupInstructions } from '../agent-signup';
const id = '537e4857-5590-42e8-8731-66441b466542';
const progress = { id, product: 'teams', step: 0, state: 'waiting', revision: 0, updatedAt: '2026-09-21T00:00:00.000Z', expiresAt: '2026-09-21T02:00:00.000Z' };

describe('signup progress handoff', () => {
  it('matches the versioned server capability vector and binds product and expiry', async () => {
    const expiresAt = '2026-10-15T12:00:00.000Z';
    const token = 'a'.repeat(64);
    const id = await signupSessionId('teams', expiresAt, token);
    expect(id).toBe('4e394d85-cb91-490d-adea-cbba8218bc4e');
    expect(await signupSessionId('flows', expiresAt, token)).not.toBe(id);
    expect(await signupSessionId('teams', '2026-10-15T13:00:00.000Z', token)).not.toBe(id);
    expect(await signupSessionId('teams', expiresAt, 'b'.repeat(64))).not.toBe(id);
  });
  it('prepares separate local capabilities and includes idempotent activation instructions', async () => {
    const a = await prepareSignupSession('teams');
    const b = await prepareSignupSession('teams');
    expect(isSignupProgress(a)).toBe(true);
    expect(a.id).not.toBe(b.id);
    expect(a.writeToken).not.toBe(b.writeToken);
    expect(a.activated).toBe(false);
    expect(a.id).toBe(await signupSessionId('teams', a.expiresAt, a.writeToken));
    const prompt = trackedSignupPrompt('teams', 'http://localhost:3100', 'http://localhost:3100/cloud/api/v1/signup/agent/sessions', a);
    expect(prompt).toContain('Before reading or reporting progress, register');
    expect(prompt).toContain(JSON.stringify({ product: 'teams', sessionId: a.id, expiresAt: a.expiresAt }));
    expect(prompt).toContain('Registration is safe to retry and never resets progress');
    expect(prompt.match(/https?:\/\/\S+/g)?.every(url => !url.includes(a.writeToken))).toBe(true);
  });
  it('adds attribution when telemetry becomes ready before the prompt is copied', async () => {
    const session = await prepareSignupSession('teams');
    expect(session.activation?.analytics).toBeUndefined();
    const context = { distinctId: 'anon-visitor', journeyId: id };
    const activation = withSignupAnalytics(session.activation, context);
    const prompt = trackedSignupPrompt('teams', 'http://localhost:3100', 'http://localhost:3100/cloud/api/v1/signup/agent/sessions', { ...session, activation });
    expect(prompt).toContain(JSON.stringify({ product: 'teams', sessionId: session.id, expiresAt: session.expiresAt, analytics: context }));
    expect(session.id).toBe(await signupSessionId('teams', session.expiresAt, session.writeToken));
    expect(withSignupAnalytics(activation, { distinctId: 'other', journeyId: id })).toBe(activation);
  });
  it('accepts valid progress and rejects malformed or premature completion', () => {
    expect(isSignupProgress(progress)).toBe(true);
    for (const invalid of [null, {}, {...progress, step: 6}, {...progress, state: 'complete'}, {...progress, id: '../'.repeat(12)}, {...progress, updatedAt: 0}, {...progress, revision: -1}]) expect(isSignupProgress(invalid)).toBe(false);
    expect(isSignupProgress({...progress, step: 5, state: 'complete'})).toBe(true);
    expect(isSignupProgress({...progress, product: 'flows', inputRequest: { id, key: 'repository', label: 'Which repository?', type: 'text', status: 'pending', step: 0 }})).toBe(true);
    expect(isSignupProgress({...progress, product: 'flows', inputRequest: { id, key: 'repository', label: 'Which repository?', type: 'text', status: 'answered', step: 0 }})).toBe(true);
    expect(isSignupProgress({...progress, product: 'flows', inputRequest: { id, key: 'repository', label: 'Which repository?', type: 'text', status: 'answered' }})).toBe(false);
    expect(isSignupProgress({...progress, inputRequest: { id, key: 'repository', label: 'Which repository?', type: 'select', status: 'pending' }})).toBe(false);
    expect(isSignupProgress({...progress, inputRequest: { id, key: 'workflow', label: 'Which workflow?', type: 'select', options: [], status: 'pending' }})).toBe(false);
    expect(isSignupProgress({...progress, product: 'flows', inputRequest: { id, key: 'flow_kind', label: 'Prebuilt or custom?', type: 'select', options: ['prebuilt', 'custom'], status: 'pending', step: 0 }})).toBe(true);
    expect(isSignupProgress({...progress, inputRequest: { id, key: 'repository', label: 'Which repository?', type: 'text', status: 'answered', answer: 'private/repo' }})).toBe(false);
    expect(isSignupProgress({...progress, product: 'flows', inputRequest: { id, key: 'draft_saved', label: 'Preview saved.', type: 'notice', status: 'pending', actionHref: `/dashboard/workflows/listeners/${id}`, step: 0 }})).toBe(true);
    expect(isSignupProgress({...progress, inputRequest: { id, key: 'draft_saved', label: 'Preview saved.', type: 'notice', status: 'pending', actionHref: 'https://evil.test' }})).toBe(false);
  });
  it.each(['teams', 'flows'] as const)('carries the %s progress capability separately from URLs and preserves the local environment', (product) => {
    const token = 'a'.repeat(64);
    const prompt = trackedSignupPrompt(product, 'http://localhost:3100', 'http://localhost:3100/cloud/api/v1/signup/agent/sessions', { id, writeToken: token });
    expect(prompt).toContain(`http://localhost:3100/signup/agent/${product}`);
    expect(prompt).toContain(`Progress session: ${id}`);
    expect(prompt).toContain('Do NOT use computer use, browser automation');
    expect(prompt).toContain('download the prebuilt binary');
    expect(prompt).toContain('never clone, build, or compile the app');
    expect(prompt).toContain(`Progress API: http://localhost:3100/cloud/api/v1/signup/agent/sessions/${id}`);
    expect(prompt).not.toContain('/api/v1/auth/device/start');
    expect(prompt).toContain(`Progress token: ${token}`);
    if (product === 'flows') expect(prompt).toContain('do not ask me to answer in chat');
    expect(prompt.match(/https?:\/\/\S+/g)?.every(url => !url.includes(token))).toBe(true);
    const guide = agentSignupInstructions(product, 'http://localhost:3100', 'http://localhost:3100/cloud');
    expect(guide).toContain('Authorization: Bearer <Progress token>');
    expect(guide).toContain('revision returned by the latest GET/PATCH');
    expect(guide).toContain('Only report complete after the actual checks succeed');
    expect(guide).toContain('NOT a Cloud access token');
    expect(guide).toContain('Do NOT use computer use, browser automation');
    expect(guide).toContain('Verify approval by polling the API');
    expect(guide).toContain('A missing binary is a blocker, not a build task.');
    expect(guide).toContain('Cloud API base: http://localhost:3100/cloud');
    expect(guide).toContain('`POST /api/v1/auth/device/start`');
    expect(guide).not.toContain('https://agentrelay.com/cloud');
    if (product === 'teams') {
      expect(guide).toContain('# Set Up Agent Relay Desktop');
      expect(guide).toContain('Do not build it, run the development launcher to produce it');
      expect(guide).not.toContain('the local stack must be built');
      expect(guide).toContain('# Set Up Agent Relay Session Handoff');
      expect(guide).toContain('only then PATCH step: 5, state: complete');
    } else {
      expect(guide).toContain('POST /api/v1/flows/deploy');
      expect(guide).toContain('GET http://localhost:3100/api/v1/flows/catalog');
      expect(guide).toContain('POST the exact Progress API URL');
      expect(guide).toContain('authenticated GET includes inputRequest.answer');
    }
  });
});

describe('authenticated progress identity handoff', () => {
  it.each(['teams', 'flows'] as const)('requires the verified account and capability together after %s login', product => {
    const guide = agentSignupInstructions(product, 'http://localhost:3100', 'http://localhost:3100/cloud');
    const signupHeader = guide.split('\n---\n')[0];
    expect(signupHeader).toContain('Authorization: Bearer <Cloud access token from Part 1>');
    expect(signupHeader).toContain('X-Agent-Relay-Progress-Token: <Progress token>');
    expect(signupHeader).toContain('http://localhost:3100/cloud/api/v1/signup/agent/sessions/<Progress session from the prompt>');
    expect(signupHeader).toContain('Never follow redirects or forward either token to another URL');
    expect(signupHeader).toContain('for completion');
    expect(signupHeader).toContain('progress token\nalone never proves a person');
    expect(signupHeader).toContain('Keep GET requests on the original Progress-token');
    expect(signupHeader).toContain('On 409 identity_conflict, stop reporting');
    expect(signupHeader).toContain('Never fall back to anonymous updates');
    expect(signupHeader).toContain('Authorization: Bearer <Progress token>');
    expect(signupHeader).not.toContain('https://agentrelay.com/cloud');
    expect(signupHeader).not.toContain('distinct_id');
  });
});

describe('progress safety exceptions', () => {
  it.each(['teams', 'flows'] as const)('keeps %s approval links out of telemetry while allowing the human handoff', product => {
    const header = agentSignupInstructions(product, 'https://agentrelay.com', 'https://agentrelay.com/cloud').split('\n---\n')[0];
    expect(header).toContain('Approval URLs must never appear in progress JSON or progress request URLs.');
    expect(header).toContain('The only output exception is the approval link handed directly to the user');
    expect(header).toContain('when no OS URL opener is available');
  });
  it.each(['teams', 'flows'] as const)('limits %s progress reconciliation to revision conflicts', product => {
    const header = agentSignupInstructions(product, 'https://agentrelay.com', 'https://agentrelay.com/cloud').split('\n---\n')[0];
    expect(header).toContain('On HTTP 409 progress_conflict, GET current progress and reconcile');
    expect(header).toContain('This retry rule does not apply to identity_conflict');
    expect(header).not.toContain('On HTTP 409, GET current progress and reconcile');
  });
});
