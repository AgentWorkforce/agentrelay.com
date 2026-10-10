import { getSecurityTxt } from '../../../lib/agent-discovery';

// Served at /.well-known/security.txt via the rewrite in next.config.mjs — the
// App Router skips dot-prefixed directories, so the route lives at
// /well-known/ and the canonical path rewrites onto it.
//
// ISR rather than force-static so the Expires field rolls forward instead of
// freezing at build time.
export const revalidate = 86400;

export function GET() {
  return new Response(getSecurityTxt(new Date()), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
