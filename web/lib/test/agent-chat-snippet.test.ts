import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';

import { agentChatAgentGuide, agentChatSnippet, newConversationId } from '../agent-chat-snippet';

describe('agent chat snippet', () => {
  it('uses one identical command for every turn of the conversation', () => {
    const snippet = agentChatSnippet({ conversationId: 'abc123', baseUrl: 'https://example.test/chat/', bridgeCommand: '' });
    expect(snippet).toContain('curl -sS --data-binary @/tmp/arelay-abc123.txt https://example.test/chat/abc123');
    expect(snippet).toContain('outside the sandbox');
    expect(snippet).not.toContain('/tmp/agent-relay');
  });

  it('never puts message text into shell source', () => {
    const snippet = agentChatSnippet({ conversationId: 'abc123', baseUrl: 'https://example.test', bridgeCommand: 'relay-bridge' });
    expect(snippet).not.toContain('<<');
    expect(snippet).not.toContain('<message>');
    expect(snippet).toContain('with your file-editing tool');
  });

  it('uses only POSIX shell and one fixed command in the file fallback', () => {
    const snippet = agentChatSnippet({ conversationId: 'abc123', baseUrl: 'https://example.test', bridgeCommand: 'relay-bridge' });
    expect(snippet).not.toContain('seq ');
    expect(snippet).toMatch(/^d=\/tmp\/agent-relay\/abc123; mv "\$d\/out\/next\.tmp" "\$d\/out\/\$\(date \+%s\)-\$\$\.txt" 2>\/dev\/null; i=0; while \[ "\$i" -lt 60 \]/m);
  });

  it('points the file bridge fallback at the hosted script by default', () => {
    const snippet = agentChatSnippet({ conversationId: 'abc123', baseUrl: 'https://example.test' });
    expect(snippet).toContain('`curl -fsSL https://arelay.to/agent-relay/bridge.sh | sh -s -- https://example.test/abc123`');
  });

  it('adds the file bridge fallback only when a bridge command is configured', () => {
    const snippet = agentChatSnippet({ conversationId: 'abc123', baseUrl: 'https://example.test', bridgeCommand: 'relay-bridge' });
    expect(snippet).toContain('`relay-bridge https://example.test/abc123`');
    expect(snippet).toContain('/tmp/agent-relay/abc123/out/next.tmp');
  });

  it('points at the arelay.to conversation route by default', () => {
    expect(agentChatSnippet({ conversationId: 'abc123' })).toContain('curl -sS --data-binary @/tmp/arelay-abc123.txt https://arelay.to/agent-relay/abc123');
  });

  it('serves agents a guide around a fresh conversation', () => {
    const guide = agentChatAgentGuide({ conversationId: 'abc123' });
    expect(guide).toMatch(/^# Chat with the Agent Relay agent/);
    expect(guide).toContain("don't fetch this page again");
    expect(guide).toContain('curl -sS --data-binary @/tmp/arelay-abc123.txt https://arelay.to/agent-relay/abc123');
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
    expect(run('https://evil.example/agent-relay/abc').stderr).toContain('Expected the conversation URL');
    expect(run('https://arelay.to/agent-relay/a;rm').stderr).toContain('Invalid conversation id');
  });
});
