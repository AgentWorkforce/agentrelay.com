import { getLlmsText } from '../../lib/docs-markdown';

// ISR rather than force-static so OpenNext serves this from the incremental
// cache on Cloudflare Workers. A force-static route handler re-executes per
// request and reads docs from the filesystem, which the Workers runtime stubs.
export const revalidate = 86400;

export function GET() {
  return new Response(getLlmsText(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
