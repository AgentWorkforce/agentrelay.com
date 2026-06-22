import { getLlmsFullText } from '../../lib/docs-markdown';

// ISR so OpenNext serves this from the incremental cache on Cloudflare Workers
// (force-static would re-read the filesystem per request, unsupported on Workers).
export const revalidate = 86400;

export function GET() {
  return new Response(getLlmsFullText(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
