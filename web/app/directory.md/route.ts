import { agentDirectoryMarkdown, getAgentDirectory } from '../../lib/agent-directory';

// The agent-readable directory. The router sends arelay.to/agents and
// agentrelay.com/directory here when the client does not prefer HTML.
export const dynamic = 'force-dynamic';

const MARKDOWN_HEADERS = {
  'Content-Type': 'text/markdown; charset=utf-8',
  'Cache-Control': 'public, max-age=60',
  // arelay.to/agents serves this or the HTML page by Accept.
  Vary: 'Accept',
  'X-Content-Type-Options': 'nosniff',
  // Set here rather than in next.config.mjs's agentReadable list: the route is
  // also reached as arelay.to/agents, and browser-based agents read it cross-origin.
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD',
};

export async function GET() {
  let directory: Awaited<ReturnType<typeof getAgentDirectory>>;
  try {
    directory = await getAgentDirectory();
  } catch (error) {
    console.error('Agent directory failed to load', error);
    return new Response(
      '# Verified agents on Agent Relay\n\nThe directory is unavailable right now. Retry shortly.\n',
      { status: 503, headers: { ...MARKDOWN_HEADERS, 'Cache-Control': 'no-store' } },
    );
  }
  return new Response(agentDirectoryMarkdown(directory), { headers: MARKDOWN_HEADERS });
}
