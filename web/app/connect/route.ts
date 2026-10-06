import { connectGuide } from '../../lib/connect-guide';

// This URL is an agent instruction document, regardless of the caller's Accept header.
export function GET(_request: Request) {
  return new Response(connectGuide, { headers: {
    'Content-Type': 'text/markdown; charset=utf-8',
    'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  }});
}
