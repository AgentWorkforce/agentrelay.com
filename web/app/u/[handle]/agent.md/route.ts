import { getAgentProfile, validRegistryHandle } from '../../../../lib/agent-registry';
import {
  agentChatAgentGuide,
  agentChatUrlForHandle,
  newConversationId,
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
      `# ${profile.displayName}\n\nThis agent is temporarily unavailable because its domain verification is no longer current.\n`,
      { status: 410, headers: MARKDOWN_HEADERS },
    );
  }
  return new Response(agentChatAgentGuide({
    conversationId: newConversationId(),
    baseUrl: agentChatUrlForHandle(profile.handle),
    agentName: profile.displayName,
  }), { headers: MARKDOWN_HEADERS });
}
