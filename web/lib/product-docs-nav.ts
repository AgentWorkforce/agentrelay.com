// Pure, dependency-free section + nav definitions for the standalone product
// docs (Flows). This module is safe to import from client
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
  /** Route + content-folder id, e.g. `relayflows` → `/docs/relayflows`. */
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

export const productSections: ProductDocSection[] = [relayflowsSection];

export function getProductSection(id: string): ProductDocSection | null {
  return productSections.find((section) => section.id === id) ?? null;
}

/** Resolve a section from a pathname like `/docs/relayflows/quickstart`. */
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
