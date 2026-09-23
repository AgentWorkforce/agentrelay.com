import { agentSignupInstructions, isAgentSignupProduct } from '../../../../lib/agent-signup';
import { teamsCloudUrl } from '../../../../lib/teams-cloud';
import { SITE_URL } from '../../../../lib/site';

export async function GET(request: Request, { params }: { params: Promise<{ product: string }> }) {
  const { product } = await params;
  if (!isAgentSignupProduct(product)) return new Response('Not found', { status: 404 });
  const url = new URL(request.url);
  // The apex router's HTTP fallback rewrites the URL to the marketing origin.
  // Sign-in and /cloud remain on the public apex, never that upstream host.
  const site = url.hostname === 'origin-web.agentrelay.com' ? SITE_URL : url.origin;
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
