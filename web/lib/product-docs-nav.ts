// Pure, dependency-free section + nav definitions for the standalone product
// docs (Relayfile, Relayhistory, Flows). This module is safe to import from client
// components — it must NOT import anything that touches `node:fs` (e.g.
// content-store), so the sidebar can use it without dragging server-only code
// into the browser bundle. Content loaders live in `./product-docs`.

import type { DocsPackage } from './docs-packages.mjs';

export interface NavItem {
  title: string;
  slug: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/**
 * A standalone documentation section that lives alongside the Agent Relay docs
 * but has its own sidebar, content tree, and routing under `/docs/<id>`.
 */
export interface ProductDocSection {
  /** Route + content-folder id, e.g. `file` → `/docs/file`, `content/docs/file`. */
  id: string;
  /** Product name shown at the top of the sidebar. */
  label: string;
  /** One-line tagline for the sidebar / metadata. */
  tagline: string;
  /** GitHub org/repo, used for the sidebar source link. */
  repo: string;
  /** npm package whose latest published version the sidebar header shows. */
  npmPackage?: DocsPackage;
  /**
   * Slugs that are built and indexed but deliberately kept out of the sidebar —
   * pages whose real audience is an agent fetching the `.md` mirror, not a
   * human browsing the nav.
   */
  unlistedSlugs?: string[];
  nav: NavGroup[];
}

export const fileSection: ProductDocSection = {
  id: 'file',
  label: 'Relayfile',
  tagline: 'The event layer for AI agents.',
  repo: 'AgentWorkforce/relayfile',
  npmPackage: 'relayfile',
  // Handed to an agent as markdown from the review-bot guide, not browsed.
  unlistedSlugs: ['review-bot-brief'],
  nav: [
    {
      title: 'Start',
      items: [
        { title: 'Introduction', slug: 'introduction' },
        { title: 'Quickstart', slug: 'quickstart' },
        { title: 'Why files', slug: 'why-files' },
      ],
    },
    {
      title: 'Guides',
      items: [{ title: 'Build a PR review bot', slug: 'review-bot' }],
    },
    {
      title: 'Concepts',
      items: [
        { title: 'Events and webhooks', slug: 'events' },
        { title: 'Mount layout', slug: 'mount-layout' },
        { title: 'Reads and writes', slug: 'reads-and-writes' },
        { title: 'Per-agent ACLs', slug: 'acls' },
        { title: 'Real-time sync', slug: 'realtime-sync' },
      ],
    },
    {
      title: 'Running Relayfile',
      items: [
        { title: 'Self-hosting', slug: 'self-hosting' },
        { title: 'Run locally', slug: 'run-locally' },
        { title: 'Local development', slug: 'local-development' },
        { title: 'Mounting a workspace', slug: 'mounting' },
      ],
    },
    {
      title: 'SDK & agents',
      items: [
        { title: 'TypeScript SDK', slug: 'sdk' },
        { title: 'Python SDK', slug: 'python-sdk' },
        { title: 'Agent frameworks', slug: 'agents' },
      ],
    },
    {
      title: 'Architecture',
      items: [
        { title: 'Integrations', slug: 'integrations' },
        { title: 'Adapters & providers', slug: 'adapters-and-providers' },
        { title: 'How Relayfile compares', slug: 'comparison' },
      ],
    },
    {
      title: 'Cloud',
      items: [{ title: 'Hosted Relayfile', slug: 'cloud' }],
    },
    {
      title: 'Reference',
      items: [
        { title: 'API reference', slug: 'api-reference' },
        { title: 'CLI reference', slug: 'cli' },
      ],
    },
  ],
};

export const relayhistorySection: ProductDocSection = {
  id: 'relayhistory',
  label: 'Relayhistory',
  tagline: 'Search, resume, and hand off every coding-agent session.',
  repo: 'AgentWorkforce/relayhistory',
  npmPackage: 'ai-hist',
  nav: [
    {
      title: 'Start',
      items: [
        { title: 'Introduction', slug: 'introduction' },
        { title: 'Quickstart', slug: 'quickstart' },
      ],
    },
    {
      title: 'Use',
      items: [
        { title: 'CLI', slug: 'cli' },
        { title: 'Sessions', slug: 'sessions' },
      ],
    },
    {
      title: 'Agents',
      items: [
        { title: 'MCP server', slug: 'mcp' },
        { title: 'Handoffs', slug: 'handoffs' },
      ],
    },
    {
      title: 'Build',
      items: [
        { title: 'TypeScript SDK', slug: 'sdk' },
        { title: 'Remote sources', slug: 'remote-sources' },
        { title: 'Export', slug: 'export' },
      ],
    },
  ],
};

export const relayflowsSection: ProductDocSection = {
  id: 'relayflows',
  label: 'Flows',
  tagline: 'Deterministic scripts over agentic primitives — every step verified, every crash resumable.',
  repo: 'AgentWorkforce/flows',
  nav: [
    {
      title: 'Start',
      items: [
        { title: 'Introduction', slug: 'introduction' },
        { title: 'Quickstart', slug: 'quickstart' },
      ],
    },
    {
      title: 'Author',
      items: [{ title: 'Build a flow', slug: 'build' }],
    },
    {
      title: 'Run',
      items: [{ title: 'CLI', slug: 'cli' }],
    },
    {
      title: 'Going further',
      items: [
        { title: 'Multi-agent flows', slug: 'multi-agent' },
        { title: 'Cloud', slug: 'cloud' },
        { title: 'Recommended flows', slug: 'recommended' },
        { title: 'Plugins', slug: 'plugins' },
        { title: 'Memory & integrations', slug: 'memory-and-integrations' },
        { title: 'Reliability', slug: 'reliability' },
      ],
    },
    {
      title: 'Cookbook',
      items: [{ title: 'Recipes', slug: 'cookbook' }],
    },
  ],
};

export const productSections: ProductDocSection[] = [fileSection, relayhistorySection, relayflowsSection];

export function getProductSection(id: string): ProductDocSection | null {
  return productSections.find((section) => section.id === id) ?? null;
}

/** Resolve a section from a pathname like `/docs/file/quickstart`. */
export function getProductSectionForPath(pathname: string): ProductDocSection | null {
  const normalized = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/docs';
  const match = normalized.match(/^\/docs\/([^/]+)/);
  if (!match) return null;
  return getProductSection(match[1]);
}

export function getProductDocSlugs(section: ProductDocSection): string[] {
  return [
    ...new Set([
      ...section.nav.flatMap((group) => group.items.map((item) => item.slug)),
      ...(section.unlistedSlugs ?? []),
    ]),
  ];
}

export const productBasePath = (section: ProductDocSection): string => `/docs/${section.id}`;
