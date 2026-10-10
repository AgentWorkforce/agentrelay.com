import { getMcpManifest } from '../../../lib/agent-discovery';

// MCP server manifest, served at /.well-known/mcp.json via the rewrite in
// next.config.mjs.
export const revalidate = 86400;

export function GET() {
  return new Response(JSON.stringify(getMcpManifest(), null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
