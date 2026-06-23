// Markdown endpoint for /agents, relocated from app/agents/route.ts so that
// app/agents/page.tsx can serve the HTML gallery. Serves the AgentWorkforce/relay
// README so any external LLM tooling that fetched the markdown keeps working at
// /agents.md.
//
// The README lives in a different (public) repo, so it's fetched from GitHub at
// build / revalidation rather than read from the local filesystem — which also
// suits the Cloudflare Workers runtime, where node:fs is unavailable.

export const revalidate = 86400;

const RELAY_README_URL =
  'https://raw.githubusercontent.com/AgentWorkforce/relay/main/README.md';

const FALLBACK =
  '# Agent Relay\n\nReal-time messaging between AI agents.\n\nSee https://github.com/AgentWorkforce/relay for full documentation.';

async function loadReadme(): Promise<string> {
  try {
    const response = await fetch(RELAY_README_URL);
    if (response.ok) {
      return await response.text();
    }
  } catch {
    // Network failure at build/revalidation — serve the fallback below.
  }
  return FALLBACK;
}

export async function GET() {
  return new Response(await loadReadme(), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
