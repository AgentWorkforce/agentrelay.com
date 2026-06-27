import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.resolve(__dirname, '..'),
  outputFileTracingIncludes: {
    '/*': ['content/docs/**/*', 'content/blog/**/*'],
    // The Pear OG card embeds these at render time.
    '/pear/og.png': ['public/img/pear-app.png', 'public/brand-kit/pear-icon-transparent.png'],
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.md$/,
      resourceQuery: /raw/,
      type: 'asset/source',
    });

    // Load docs/blog MDX under content/ as raw strings so lib/content-store.ts
    // can embed them in the bundle via require.context — the Cloudflare Workers
    // runtime has no filesystem to read them from at request time.
    config.module.rules.push({
      test: /\.mdx$/,
      include: path.resolve(__dirname, 'content'),
      type: 'asset/source',
    });

    return config;
  },
  async rewrites() {
    return {
      afterFiles: [
        // Conventional llms.txt path under /docs resolves to the root route.
        { source: '/docs/llms.txt', destination: '/llms.txt' },
        // Append .md to any docs URL to get its markdown mirror. afterFiles
        // runs after static routes (so /docs/markdown.md is untouched) but
        // before the /docs/[slug] dynamic page.
        { source: '/docs/:slug([^/]+\\.md)', destination: '/docs/markdown/:slug' },
      ],
    };
  },
  async redirects() {
    return [
      // In-person event banner QR code → homepage, tagged so the traffic is
      // attributable to the physical banner at the current event. Temporary
      // (not permanent) so /banner can be repointed at the next event without
      // browsers having cached a permanent redirect. Current event:
      // AI Engineer World's Fair.
      //
      // The destination is an absolute URL on purpose. A relative root-path
      // destination ('/?utm_...') 500s under our OpenNext/Cloudflare runtime:
      // its URL parser treats the empty path segment of '/?...' as the whole
      // string and feeds '/?...' to path-to-regexp, which throws "Unexpected
      // MODIFIER" on the bare '?'. Using the absolute form routes through the
      // external-URL branch, which splits the path and query correctly.
      {
        source: '/banner',
        destination:
          'https://agentrelay.com/?utm_source=ai-engineer-worldfair&utm_medium=banner&utm_campaign=ai-engineer-worldfair-2026',
        permanent: false,
      },
      { source: '/quickstart', destination: '/docs/quickstart', permanent: true },
      { source: '/relayfile', destination: '/primitives#file', permanent: true },
      { source: '/relayfile/:path*', destination: '/primitives#file', permanent: true },
      { source: '/relayauth', destination: '/primitives#auth', permanent: true },
      { source: '/relayauth/:path*', destination: '/primitives#auth', permanent: true },
      { source: '/relaycast', destination: '/primitives#message', permanent: true },
      { source: '/relaycast/:path*', destination: '/primitives#message', permanent: true },
      { source: '/docs/reference-sdk', destination: '/docs/typescript-sdk', permanent: true },
      { source: '/docs/reference-sdk-py', destination: '/docs/typescript-sdk', permanent: true },
    ];
  },
};

export default nextConfig;
