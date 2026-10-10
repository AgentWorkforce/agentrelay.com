import type { MetadataRoute } from 'next';

import { absoluteUrl, SITE_URL } from '../lib/site';

// Named allow rules for the crawlers and agent fetchers that read their own
// user-agent out of robots.txt. Everything here is already covered by the
// permissive `*` rule below; the explicit entries exist because several of
// these bots treat "no rule for me" more conservatively than an explicit
// Allow, and because a scanner reading robots.txt can only see the agents that
// are named.
const AI_CRAWLERS = [
  // OpenAI
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  // Anthropic
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'anthropic-ai',
  // Google
  'Google-Extended',
  'GoogleOther',
  // Perplexity
  'PerplexityBot',
  'Perplexity-User',
  // Apple
  'Applebot',
  'Applebot-Extended',
  // Meta
  'meta-externalagent',
  'Meta-ExternalFetcher',
  // Microsoft / Bing
  'bingbot',
  // Others
  'Amazonbot',
  'Bytespider',
  'CCBot',
  'cohere-ai',
  'DuckAssistBot',
  'MistralAI-User',
  'YouBot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: ['/'],
      })),
      {
        userAgent: '*',
        allow: ['/'],
        // Internal target of the /.well-known rewrite; the dot-prefixed paths
        // are the canonical ones.
        disallow: ['/well-known/'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: SITE_URL,
  };
}
