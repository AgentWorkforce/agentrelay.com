import { getApiCatalog } from '../../../lib/agent-discovery';

// RFC 9727 API catalog, served at /.well-known/api-catalog via the rewrite in
// next.config.mjs.
export const revalidate = 86400;

export function GET() {
  return new Response(JSON.stringify(getApiCatalog(), null, 2), {
    headers: {
      'Content-Type': 'application/linkset+json',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
