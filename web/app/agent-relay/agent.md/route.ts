import { agentChatAgentGuide, newConversationId } from '../../../lib/agent-chat-snippet';

// Served to agents (curl, web-fetch tools) at arelay.to/agent-relay by the
// router. Every request mints a private conversation, so it is never cached.
export const dynamic = 'force-dynamic';

export function GET() {
  return new Response(agentChatAgentGuide({ conversationId: newConversationId() }), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
