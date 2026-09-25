import { agentSignupInstructions, isAgentSignupProduct } from '../../../../lib/agent-signup';
import { teamsCloudUrl } from '../../../../lib/teams-cloud';
import { SITE_URL } from '../../../../lib/site';

export async function GET(request: Request, { params }: { params: Promise<{ product: string }> }) {
  const { product } = await params;
  if (!isAgentSignupProduct(product)) return new Response('Not found', { status: 404 });
  const url = new URL(request.url);
  const requestHost = request.headers.get('host');
  const localHostMatch = requestHost?.match(/^(localhost|127\.0\.0\.1)(?::(\d{1,5}))?$/);
  const localPort = localHostMatch?.[2] ? Number(localHostMatch[2]) : undefined;
  const localRequestHost = localHostMatch && (localPort === undefined || localPort <= 65_535) ? requestHost : null;
  // The apex router's HTTP fallback rewrites the URL to the marketing origin.
  // Sign-in and /cloud remain on the public apex, never that upstream host.
  // Next dev can normalize request.url to localhost while the browser used
  // 127.0.0.1; keep the exact local host so OAuth and the progress page agree.
  const site = url.hostname === 'origin-web.agentrelay.com' ? SITE_URL
    : ['localhost', '127.0.0.1'].includes(url.hostname) && localRequestHost ? `${url.protocol}//${localRequestHost}` : url.origin;
  const cloud = new URL(teamsCloudUrl(''), site).href.replace(/\/$/, '');
  return new Response(agentSignupInstructions(product, site, cloud), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
