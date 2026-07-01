import { postHogMiddleware } from '@posthog/next';
import { NextResponse, type NextRequest } from 'next/server';

import { POSTHOG_HOST as DEFAULT_POSTHOG_HOST } from './lib/site';

const postHog = process.env.NEXT_PUBLIC_POSTHOG_KEY
  ? postHogMiddleware({
      proxy: { host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? DEFAULT_POSTHOG_HOST },
    })
  : null;

const PUBLIC_FILE = /\.(?:png|jpe?g|gif|webp|svg|ico|txt|xml)$/i;

export function middleware(request: NextRequest) {
  if (PUBLIC_FILE.test(request.nextUrl.pathname)) return NextResponse.next();
  if (!postHog) return NextResponse.next();
  return postHog(request);
}

export const config = {
  // Keep this on the deprecated middleware convention while deploying through
  // OpenNext Cloudflare. Next 16 `proxy.ts` is Node.js-only, and OpenNext
  // Cloudflare 1.19 currently rejects Node.js middleware during `cf:build`.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
