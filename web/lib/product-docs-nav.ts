// Pure, dependency-free section + nav definitions for the standalone product
// docs (Relayfile, Relayloop). This module is safe to import from client
// components — it must NOT import anything that touches `node:fs` (e.g.
// content-store), so the sidebar can use it without dragging server-only code
// into the browser bundle. Content loaders live in `./product-docs`.

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
  /** Current published version, shown as a badge in the sidebar header. */
  version?: string;
  nav: NavGroup[];
}

export const fileSection: ProductDocSection = {
  id: 'file',
  label: 'Relayfile',
  tagline: 'The event layer for AI agents.',
  repo: 'AgentWorkforce/relayfile',
  version: '0.10.12',
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

export const loopSection: ProductDocSection = {
  id: 'loop',
  label: 'Relayloop',
  tagline: 'The system of record for how your team works with AI agents.',
  repo: 'AgentWorkforce/relayhistory',
  version: '0.3.6',
  nav: [
    {
      title: 'Start',
      items: [
        { title: 'Introduction', slug: 'introduction' },
        { title: 'Install', slug: 'install' },
        { title: 'Quickstart', slug: 'quickstart' },
      ],
    },
    {
      title: 'Using Relayloop',
      items: [
        { title: 'Sync', slug: 'sync' },
        { title: 'Search', slug: 'search' },
        { title: 'Sessions & resume', slug: 'sessions' },
        { title: 'Sources', slug: 'sources' },
        { title: 'Stats & burn', slug: 'stats' },
      ],
    },
    {
      title: 'Cloud',
      items: [
        { title: 'Relayloop Cloud', slug: 'cloud' },
        { title: 'Architecture', slug: 'cloud-architecture' },
        { title: 'Privacy & encryption', slug: 'privacy' },
        { title: 'Teams', slug: 'teams' },
      ],
    },
    {
      title: 'Reference',
      items: [{ title: 'CLI reference', slug: 'cli' }],
    },
  ],
};

export const productSections: ProductDocSection[] = [fileSection, loopSection];

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
  return [...new Set(section.nav.flatMap((group) => group.items.map((item) => item.slug)))];
}

export const productBasePath = (section: ProductDocSection): string => `/docs/${section.id}`;
