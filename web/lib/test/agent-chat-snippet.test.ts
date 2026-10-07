import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';

import { agentChatSnippet, newConversationId } from '../agent-chat-snippet';

describe('agent chat snippet', () => {
  it('uses one fixed command prefix for the conversation', () => {
    const snippet = agentChatSnippet({ conversationId: 'abc123', baseUrl: 'https://example.test/chat/', bridgeCommand: '' });
    expect(snippet).toContain("curl -sS --data-binary @- https://example.test/chat/abc123 <<'EOF'");
    expect(snippet).toContain('outside the sandbox');
    expect(snippet).not.toContain('/tmp/agent-relay');
  });

  it('points the file bridge fallback at the hosted script by default', () => {
    const snippet = agentChatSnippet({ conversationId: 'abc123', baseUrl: 'https://example.test' });
    expect(snippet).toContain('`curl -fsSL https://arelay.to/agent-relay/bridge.sh | sh -s -- https://example.test/abc123`');
  });

  it('adds the file bridge fallback only when a bridge command is configured', () => {
    const snippet = agentChatSnippet({ conversationId: 'abc123', baseUrl: 'https://example.test', bridgeCommand: 'relay-bridge' });
    expect(snippet).toContain('`relay-bridge https://example.test/abc123`');
    expect(snippet).toContain('d=/tmp/agent-relay/abc123;');
  });

  it('points at the arelay.to conversation route by default', () => {
    expect(agentChatSnippet({ conversationId: 'abc123' })).toContain("curl -sS --data-binary @- https://arelay.to/agent-relay/abc123 <<'EOF'");
  });

  it('creates unguessable conversation ids', () => {
    const id = newConversationId();
    expect(id).toMatch(/^[0-9a-f]{32}$/);
    expect(newConversationId()).not.toBe(id);
  });
});

describe('hosted bridge script', () => {
  const script = new URL('../../public/agent-relay/bridge.sh', import.meta.url).pathname;
  const run = (...args: string[]) => spawnSync('sh', [script, ...args], { encoding: 'utf8' });

  it('parses as POSIX sh and prints usage', () => {
    expect(spawnSync('sh', ['-n', script]).status).toBe(0);
    expect(run('--help').status).toBe(0);
  });

  it('refuses anything but a conversation URL', () => {
    expect(run().status).toBe(1);
    expect(run('http://example.test/agent-relay/abc').status).toBe(1);
    expect(run('https://example.test/agent-relay/a;rm').stderr).toContain('Invalid conversation id');
  });
});
