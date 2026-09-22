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
    expect(isSignupProgress({...progress, product: 'flows', inputRequest: { id, key: 'repository', label: 'Which repository?', type: 'text', status: 'pending' }})).toBe(true);
    expect(isSignupProgress({...progress, inputRequest: { id, key: 'repository', label: 'Which repository?', type: 'select', status: 'pending' }})).toBe(false);
    expect(isSignupProgress({...progress, inputRequest: { id, key: 'repository', label: 'Which repository?', type: 'text', status: 'answered', answer: 'private/repo' }})).toBe(false);
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
    expect(guide).toContain('POST http://localhost:3100/cloud/api/v1/auth/device/start');
    if (product === 'teams') {
      expect(guide).toContain('there is no public HTTP endpoint that installs an app');
      expect(guide).toContain('Do not build it, run the development launcher to produce it');
      expect(guide).not.toContain('the local stack must be built');
      expect(guide).toContain("Do not inspect the app's");
      expect(guide).toContain("attachment as unverified and keep progress waiting at step 5");
    } else {
      expect(guide).toContain('POST http://localhost:3100/cloud/api/v1/flows/deploy');
      expect(guide).toContain('GET http://localhost:3100/api/v1/flows/catalog');
      expect(guide).toContain('POST the exact Progress API URL');
      expect(guide).toContain('authenticated GET includes inputRequest.answer');
    }
  });
});
