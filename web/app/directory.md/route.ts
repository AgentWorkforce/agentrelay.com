import { agentDirectoryMarkdown, fetchAgentDirectory } from '../../lib/agent-directory';

// The agent-readable directory. The router sends arelay.to/agents and
// agentrelay.com/directory here when the client does not prefer HTML.
export const dynamic = 'force-dynamic';

const MARKDOWN_HEADERS = {
  'Content-Type': 'text/markdown; charset=utf-8',
  'Cache-Control': 'public, max-age=60',
  // arelay.to/agents serves this or the HTML page by Accept.
  Vary: 'Accept',
  'X-Content-Type-Options': 'nosniff',
};

export async function GET() {
  try {
    return new Response(agentDirectoryMarkdown(await fetchAgentDirectory()), { headers: MARKDOWN_HEADERS });
  } catch {
    return new Response(
      '# Verified agents on Agent Relay\n\nThe directory is unavailable right now. Retry shortly.\n',
      { status: 503, headers: { ...MARKDOWN_HEADERS, 'Cache-Control': 'no-store' } },
    );
  }
}
