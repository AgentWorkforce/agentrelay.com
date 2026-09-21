import { describe, expect, it } from 'vitest';
import { isSignupProgress, trackedSignupPrompt } from '../agent-signup-progress';
import { agentSignupInstructions } from '../agent-signup';
const id = '537e4857-5590-42e8-8731-66441b466542';
const progress = { id, product: 'teams', step: 0, state: 'waiting', revision: 0, updatedAt: '2026-09-21T00:00:00.000Z', expiresAt: '2026-09-21T02:00:00.000Z' };

describe('signup progress handoff', () => {
  it('accepts valid progress and rejects malformed or premature completion', () => {
    expect(isSignupProgress(progress)).toBe(true);
    for (const invalid of [null, {}, {...progress, step: 6}, {...progress, state: 'complete'}, {...progress, id: '../'.repeat(12)}, {...progress, updatedAt: 0}, {...progress, revision: -1}]) expect(isSignupProgress(invalid)).toBe(false);
    expect(isSignupProgress({...progress, step: 5, state: 'complete'})).toBe(true);
  });
  it.each(['teams', 'flows'] as const)('carries the %s progress capability separately from URLs and preserves the local environment', (product) => {
    const token = 'a'.repeat(64);
    const prompt = trackedSignupPrompt(product, 'http://localhost:3100', 'http://localhost:3100/cloud/api/v1/signup/agent/sessions', { id, writeToken: token });
    expect(prompt).toContain(`http://localhost:3100/signup/agent/${product}`);
    expect(prompt).toContain(`Progress session: ${id}`);
    expect(prompt).toContain(`Progress token: ${token}`);
    expect(prompt.match(/https?:\/\/\S+/g)?.every(url => !url.includes(token))).toBe(true);
    const guide = agentSignupInstructions(product, 'http://localhost:3100', 'http://localhost:3100/cloud');
    expect(guide).toContain('Authorization: Bearer <Progress token>');
    expect(guide).toContain('revision returned by the latest GET/PATCH');
    expect(guide).toContain('Only report complete after the actual checks succeed');
    expect(guide).toContain('NOT a Cloud access token');
  });
});
