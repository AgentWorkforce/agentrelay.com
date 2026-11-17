import { describe, expect, it } from 'vitest';

import {
  fragmentFor,
  isSession,
  parseFragment,
  parseStore,
  restore,
  serializeStore,
  withInbox,
  withoutInbox,
  type Session,
  type Store,
} from '../events-shim-inboxes';

// Obviously fake values: an API base like the page resolves, and tokens of the issued shape.
const API = 'https://example.test/cloud/api/v1/events-shim';
const fake = (char: string): Session => ({
  manageToken: `esk_${char.repeat(43)}`,
  mcpUrl: `${API}/t/esm_${char.repeat(43)}/mcp`,
});
const A = fake('a');
const B = fake('b');
const C = fake('c');

const hashOf = (session: Session | null, agent?: string) => {
  const params = new URLSearchParams();
  if (session) {
    params.set('k', session.manageToken);
    params.set('m', session.mcpUrl);
  }
  if (agent) params.set('a', agent);
  return `#${params.toString()}`;
};

const stored = (store: Store) => serializeStore(store);

describe('events-shim inbox validation', () => {
  it('accepts only inboxes this page’s API issues', () => {
    expect(isSession(A, API)).toBe(true);
    expect(isSession({ ...A, mcpUrl: A.mcpUrl.replace('example.test', 'evil.test') }, API)).toBe(false);
    expect(isSession({ ...A, mcpUrl: `${A.mcpUrl}?x=1` }, API)).toBe(false);
    expect(isSession({ ...A, mcpUrl: A.mcpUrl.replace('/cloud/', '/other/') }, API)).toBe(false);
    expect(isSession({ ...A, manageToken: 'esk_short' }, API)).toBe(false);
    expect(isSession({ ...A, manageToken: A.manageToken.replace('esk_', 'xsk_') }, API)).toBe(false);
    expect(isSession(null, API)).toBe(false);
  });
});

describe('page link fragment', () => {
  it('round-trips the inbox and the tab', () => {
    expect(parseFragment(`#${fragmentFor('codex', A)}`, API)).toEqual({ session: A, agentId: 'codex' });
    expect(parseFragment(`#${fragmentFor('cursor', null)}`, API)).toEqual({ session: null, agentId: 'cursor' });
  });

  it('ignores a crafted inbox and an unknown tab', () => {
    const crafted = { manageToken: A.manageToken, mcpUrl: 'https://evil.test/t/esm_x/mcp' };
    expect(parseFragment(hashOf(crafted, 'codex'), API)).toEqual({ session: null, agentId: 'codex' });
    expect(parseFragment(hashOf(A, 'not-an-agent'), API)).toEqual({ session: A, agentId: null });
    expect(parseFragment('', API)).toEqual({ session: null, agentId: null });
  });
});

describe('stored inboxes', () => {
  it('drops malformed entries and unknown tabs', () => {
    const raw = JSON.stringify({
      version: 1,
      selected: 'codex',
      inboxes: { codex: A, nope: B, cursor: { manageToken: 'esk_x', mcpUrl: 'x' }, grok: { ...C, extra: 'ignored' } },
    });
    expect(parseStore(raw, API)).toEqual({ selected: 'codex', inboxes: { codex: A, grok: C } });
    expect(parseStore('not json', API)).toEqual({ selected: 'claude-code', inboxes: {} });
    expect(parseStore(JSON.stringify({ selected: 'nope' }), API)).toEqual({ selected: 'claude-code', inboxes: {} });
  });

  it('keeps one inbox per tab, and an inbox under one tab only', () => {
    let store: Store = { selected: 'claude-code', inboxes: {} };
    store = withInbox(store, 'claude-code', A);
    store = withInbox(store, 'codex', B);
    expect(store.inboxes).toEqual({ 'claude-code': A, codex: B });
    // Same inbox placed under another tab moves there rather than being shared.
    store = withInbox(store, 'cursor', A);
    expect(store.inboxes).toEqual({ codex: B, cursor: A });
  });

  it('clears only the expired tab, and only if it still holds that inbox', () => {
    const store: Store = { selected: 'codex', inboxes: { 'claude-code': A, codex: B } };
    expect(withoutInbox(store, 'codex', B.manageToken).inboxes).toEqual({ 'claude-code': A });
    expect(withoutInbox(store, 'codex', C.manageToken)).toBe(store);
  });
});

describe('restoring the page', () => {
  it('starts on the default tab with nothing', () => {
    expect(restore({ hash: '', stored: null, legacy: null, apiBase: API })).toEqual({
      store: { selected: 'claude-code', inboxes: {} },
      legacyMigrated: false,
    });
  });

  it('migrates the legacy single inbox under the default tab', () => {
    const result = restore({ hash: '', stored: null, legacy: JSON.stringify(A), apiBase: API });
    expect(result).toEqual({ store: { selected: 'claude-code', inboxes: { 'claude-code': A } }, legacyMigrated: true });
  });

  it('migrates the legacy inbox under the tab active on restore', () => {
    const result = restore({ hash: hashOf(null, 'codex'), stored: null, legacy: JSON.stringify(A), apiBase: API });
    expect(result.store).toEqual({ selected: 'codex', inboxes: { codex: A } });
    expect(result.legacyMigrated).toBe(true);
  });

  it('opens an old link (no tab) and its legacy copy as one inbox on the default tab', () => {
    const result = restore({ hash: hashOf(A), stored: null, legacy: JSON.stringify(A), apiBase: API });
    expect(result.store).toEqual({ selected: 'claude-code', inboxes: { 'claude-code': A } });
    expect(result.legacyMigrated).toBe(true);
  });

  it('does not let a link overwrite a different legacy inbox', () => {
    const result = restore({ hash: hashOf(B, 'codex'), stored: null, legacy: JSON.stringify(A), apiBase: API });
    expect(result.store).toEqual({ selected: 'codex', inboxes: { codex: B, 'claude-code': A } });
    expect(result.legacyMigrated).toBe(true);
  });

  it('leaves the legacy inbox in place when there is nowhere free to put it', () => {
    const existing = stored({ selected: 'claude-code', inboxes: { 'claude-code': B } });
    const result = restore({ hash: '', stored: existing, legacy: JSON.stringify(A), apiBase: API });
    expect(result.store.inboxes).toEqual({ 'claude-code': B });
    expect(result.legacyMigrated).toBe(false);
  });

  it('drops unreadable legacy data', () => {
    expect(restore({ hash: '', stored: null, legacy: '{oops', apiBase: API }).legacyMigrated).toBe(true);
    expect(restore({ hash: '', stored: null, legacy: JSON.stringify({ manageToken: 'x' }), apiBase: API }).legacyMigrated).toBe(true);
  });

  it('opens a shared link on its tab, keeping the other tabs’ inboxes', () => {
    const existing = stored({ selected: 'claude-code', inboxes: { 'claude-code': A } });
    const result = restore({ hash: hashOf(B, 'codex'), stored: existing, legacy: null, apiBase: API });
    expect(result.store).toEqual({ selected: 'codex', inboxes: { 'claude-code': A, codex: B } });
  });

  it('reopens the tab last selected in this browser when the link names none', () => {
    const existing = stored({ selected: 'grok', inboxes: { grok: C } });
    expect(restore({ hash: '', stored: existing, legacy: null, apiBase: API }).store.selected).toBe('grok');
  });

  it('never accepts a crafted inbox from the link', () => {
    const crafted = { manageToken: A.manageToken, mcpUrl: 'https://evil.test/cloud/api/v1/events-shim/t/esm_x/mcp' };
    const result = restore({ hash: hashOf(crafted, 'codex'), stored: null, legacy: null, apiBase: API });
    expect(result.store).toEqual({ selected: 'codex', inboxes: {} });
  });
});
