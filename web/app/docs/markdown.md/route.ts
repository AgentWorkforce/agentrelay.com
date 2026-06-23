import { getDocsMarkdownIndex } from '../../../lib/docs-markdown';

// ISR so OpenNext serves this from the incremental cache on Cloudflare Workers
// (force-static would re-read the filesystem per request, unsupported on Workers).
export const revalidate = 86400;

export async function GET() {
  return new Response(getDocsMarkdownIndex(), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
