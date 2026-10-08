import { getAgentProfile, validRegistryHandle } from '../../../../lib/agent-registry';
import {
  agentChatAgentGuide,
  agentChatUrlForHandle,
  newConversationId,
  normalizeAgentName,
} from '../../../../lib/agent-chat-snippet';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ handle: string }>;
};

const MARKDOWN_HEADERS = {
  'Content-Type': 'text/markdown; charset=utf-8',
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { handle } = await params;
  if (!validRegistryHandle(handle)) {
    return new Response('# Agent not found\n', { status: 404, headers: MARKDOWN_HEADERS });
  }
  const profile = await getAgentProfile(handle);
  if (!profile) {
    return new Response('# Agent not found\n', { status: 404, headers: MARKDOWN_HEADERS });
  }
  if (profile.status !== 'active') {
    return new Response(
      `# ${normalizeAgentName(profile.displayName)}\n\nThis agent is temporarily unavailable.\n`,
      { status: 410, headers: MARKDOWN_HEADERS },
    );
  }
  const guide = agentChatAgentGuide({
    conversationId: newConversationId(),
    baseUrl: agentChatUrlForHandle(profile.handle),
    agentName: profile.displayName,
    agentHandle: profile.handle,
  });
  const verification = [
    profile.verifiedDomain ? `- Verified domain: ${profile.verifiedDomain}` : null,
    profile.verifiedWorkspace
      ? `- Verified Agent Relay workspace: ${normalizeAgentName(profile.verifiedWorkspace.displayName)}`
      : null,
  ].filter(Boolean).join('\n');
  return new Response(`${guide}\n\n## Verification\n\n${verification}\n`, { headers: MARKDOWN_HEADERS });
}
