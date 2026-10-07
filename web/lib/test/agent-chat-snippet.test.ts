import { describe, expect, it } from 'vitest';

import { agentChatSnippet, newConversationId } from '../agent-chat-snippet';

describe('agent chat snippet', () => {
  it('uses one fixed command prefix for the conversation', () => {
    const snippet = agentChatSnippet({ conversationId: 'abc123', baseUrl: 'https://example.test/chat/', bridgeCommand: '' });
    expect(snippet).toContain("curl -sS --data-binary @- https://example.test/chat/c/abc123 <<'EOF'");
    expect(snippet).toContain('outside the sandbox');
    expect(snippet).not.toContain('/tmp/agent-relay');
  });

  it('adds the file bridge fallback only when a bridge command is configured', () => {
    const snippet = agentChatSnippet({ conversationId: 'abc123', baseUrl: 'https://example.test', bridgeCommand: 'relay-bridge' });
    expect(snippet).toContain('`relay-bridge https://example.test/c/abc123`');
    expect(snippet).toContain('d=/tmp/agent-relay/abc123;');
  });

  it('creates unguessable conversation ids', () => {
    const id = newConversationId();
    expect(id).toMatch(/^[0-9a-f]{32}$/);
    expect(newConversationId()).not.toBe(id);
  });
});
