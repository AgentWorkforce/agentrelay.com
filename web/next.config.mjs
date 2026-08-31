import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Default ("loose") chunking merged unrelated route CSS into one
    // render-blocking file: the homepage was shipping the /brand, /enterprise,
    // /telemetry and /legal stylesheets — about 60% of its critical CSS —
    // before a byte of its own. 'strict' still merges them; opting out entirely
    // gives each CSS module its own chunk, loaded only where it is used, which
    // takes the homepage's render-blocking CSS from 253 KB to 82 KB raw
    // (51 KB → 20 KB gzip) at the cost of a couple more HTTP/2 requests.
    cssChunking: false,
  },
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
  async headers() {
    // Machine-readable surfaces an agent may fetch from another origin (or from
    // a browser-based agent). Without CORS these are unreadable to anything that
    // isn't a server-side crawler.
    const agentReadable = [
      '/llms.txt',
      '/llms-full.txt',
      '/llm.txt',
      '/agents.md',
      '/skill.md',
      '/feed.xml',
      '/sitemap.xml',
      '/robots.txt',
      '/docs/llms.txt',
      '/docs/markdown.md',
      '/docs/markdown/:path*',
      '/docs/agents/markdown/:path*',
      '/docs/factory/markdown/:path*',
      '/docs/file/markdown/:path*',
      '/docs/loop/markdown/:path*',
      '/docs/:slug([^/]+\\.md)',
      '/.well-known/:path*',
    ];

    return [
      {
        source: '/:path*',
        headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }],
      },
      ...agentReadable.map((source) => ({
        source,
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, HEAD' },
        ],
      })),
      {
        // The internal path the /.well-known rewrite targets; keep it out of
        // indexes so the canonical dot-prefixed URL is the only one advertised.
        source: '/well-known/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex' }],
      },
    ];
  },
  async rewrites() {
    return {
      afterFiles: [
        // Conventional llms.txt path under /docs resolves to the root route.
        { source: '/docs/llms.txt', destination: '/llms.txt' },
        // The App Router skips dot-prefixed directories, so the /.well-known
        // documents are implemented under app/well-known/ and surfaced here at
        // their canonical paths.
        { source: '/.well-known/:path*', destination: '/well-known/:path*' },
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
      // In-person event QR card → the relay GitHub repo, tagged like /banner
      // above so card scans are attributable to the current event. Temporary
      // for the same repointing reason.
      {
        source: '/qr-card',
        destination:
          'https://github.com/agentworkforce/relay?utm_source=ai-engineer-worldfair&utm_medium=qr-card&utm_campaign=ai-engineer-worldfair-2026',
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
      // The agents docs lost these two pages: 'Deploy and operate' became the
      // CLI reference, and 'Agent patterns' was dropped without a successor
      // (the build guide is the nearest thing that still covers agent shape).
      { source: '/docs/agents/deploy', destination: '/docs/agents/cli', permanent: true },
      { source: '/docs/agents/patterns', destination: '/docs/agents/build', permanent: true },
    ];
  },
};

export default nextConfig;
