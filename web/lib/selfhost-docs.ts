// The public self-hosting guides at /docs/self-hosting.
//
// One source, two audiences. Each guide is a Markdown file in
// content/self-hosting/<slug>.md. The human page renders it as written. The
// agent runbook (/docs/self-hosting/agents/<slug>) is the same file with its
// agent blocks turned into "Agent:" callouts:
//
//   <!-- agent
//   ASK THE HUMAN ... / STOP if ...
//   -->
//
// HTML comments never render for humans, so an agent block costs the human
// page nothing. Text between <!-- human --> and <!-- /human --> is dropped from
// the agent runbook. Links to other guides are rewritten to their agent
// version. Both audiences get a raw Markdown mirror (append .md to the URL).

import matter from 'gray-matter';

import { readContentFile } from './content-store';
import { absoluteUrl } from './site';

export const SELFHOST_DOCS_BASE_PATH = '/docs/self-hosting';
export const SELFHOST_AGENTS_PATH = `${SELFHOST_DOCS_BASE_PATH}/agents`;
export const SELFHOST_FILES_BASE_URL = absoluteUrl('/self-hosting/files');

export type SelfhostAudience = 'human' | 'agent';

export type SelfhostGuideEntry = { slug: string; group: string };

/** Reading order and sidebar groups. `overview` is the section's index page. */
export const SELFHOST_GUIDES: readonly SelfhostGuideEntry[] = [
  { slug: 'overview', group: 'Start' },
  { slug: 'install-eks', group: 'Install on AWS' },
  { slug: 'existing-rds', group: 'Install on AWS' },
  { slug: 'bring-your-own-aws', group: 'Install on AWS' },
  { slug: 'iam-pod-identity', group: 'Install on AWS' },
  { slug: 'install-gke', group: 'Install on Google Cloud' },
  { slug: 'bring-your-own-gcp', group: 'Install on Google Cloud' },
  { slug: 'secrets', group: 'Configure' },
  { slug: 'okta-sso', group: 'Configure' },
  { slug: 'after-install', group: 'Configure' },
  { slug: 'desktop-app', group: 'Configure' },
  { slug: 'upgrades', group: 'Operate' },
  { slug: 'backup-and-restore', group: 'Operate' },
  { slug: 'telemetry', group: 'Operate' },
  { slug: 'durable-actors', group: 'Operate' },
  { slug: 'troubleshooting', group: 'Operate' },
  { slug: 'teardown', group: 'Operate' },
  { slug: 'support', group: 'Operate' },
  { slug: 'downloads', group: 'Reference' },
];

/** The agent track's index: rules for coding agents, then every runbook. */
export const SELFHOST_AGENT_INDEX_SLUG = 'agents';

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const AGENT_BLOCK = /<!--\s*agent\b([\s\S]*?)-->/g;
const HUMAN_BLOCK = /<!--\s*human\s*-->[\s\S]*?<!--\s*\/human\s*-->\n?/g;
const ANY_COMMENT = /<!--[\s\S]*?-->\n?/g;

export type SelfhostGuide = {
  slug: string;
  group: string;
  title: string;
  description: string;
  /** The Markdown body, without frontmatter, exactly as written. */
  source: string;
};

export function isSelfhostGuideSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && SELFHOST_GUIDES.some((guide) => guide.slug === slug);
}

function readGuideFile(slug: string): { title: string; description: string; source: string } | null {
  if (!SLUG_PATTERN.test(slug)) return null;
  const raw = readContentFile(`self-hosting/${slug}.md`);
  if (raw === null) return null;
  const { data, content } = matter(raw);
  return {
    title: typeof data.title === 'string' && data.title ? data.title : slug,
    description: typeof data.description === 'string' ? data.description : '',
    source: content.trim(),
  };
}

export function getSelfhostGuide(slug: string): SelfhostGuide | null {
  const entry = SELFHOST_GUIDES.find((guide) => guide.slug === slug);
  if (!entry) return null;
  const file = readGuideFile(slug);
  return file ? { ...entry, ...file } : null;
}

export function getSelfhostGuides(): SelfhostGuide[] {
  return SELFHOST_GUIDES.map(({ slug }) => getSelfhostGuide(slug)).filter(
    (guide): guide is SelfhostGuide => guide !== null
  );
}

export function getSelfhostAgentIndex(): { title: string; description: string; source: string } | null {
  return readGuideFile(SELFHOST_AGENT_INDEX_SLUG);
}

/** The rendered page for a guide. `overview` is the section root. */
export function selfhostGuidePath(slug?: string, audience: SelfhostAudience = 'human'): string {
  if (audience === 'agent') return slug ? `${SELFHOST_AGENTS_PATH}/${slug}` : SELFHOST_AGENTS_PATH;
  return !slug || slug === 'overview' ? SELFHOST_DOCS_BASE_PATH : `${SELFHOST_DOCS_BASE_PATH}/${slug}`;
}

/** The raw Markdown mirror of a guide (or of a track's index, without a slug). */
export function selfhostMarkdownPath(slug?: string, audience: SelfhostAudience = 'human'): string {
  if (audience === 'agent') return slug ? `${SELFHOST_AGENTS_PATH}/${slug}.md` : `${SELFHOST_AGENTS_PATH}.md`;
  return !slug || slug === 'overview' ? `${SELFHOST_DOCS_BASE_PATH}.md` : `${SELFHOST_DOCS_BASE_PATH}/${slug}.md`;
}

function blockquote(lines: string): string {
  return lines
    .trim()
    .split(/\r?\n/)
    .map((line) => (line.trim() ? `> ${line.trimEnd()}` : '>'))
    .join('\n');
}

/** Points links at other guides to their agent runbook. Anchors survive. */
function agentLinks(markdown: string): string {
  return markdown.replace(/\]\((\/docs\/self-hosting)(\/[a-z0-9-]+)?(#[^)\s]*)?\)/g, (match, _base, sub, hash = '') => {
    const slug = sub ? sub.slice(1) : 'overview';
    if (slug === SELFHOST_AGENT_INDEX_SLUG || !isSelfhostGuideSlug(slug)) return match;
    return `](${selfhostGuidePath(slug, 'agent')}${hash})`;
  });
}

/**
 * The Markdown a reader of `audience` sees. Humans get the guide without any
 * comment; agents get every agent block as an "Agent:" callout, without the
 * human-only blocks, and with links pointing at the agent runbooks.
 */
export function selfhostMarkdownFor(source: string, audience: SelfhostAudience): string {
  if (audience === 'human') {
    return source.replace(ANY_COMMENT, '').replace(/\n{3,}/g, '\n\n').trim();
  }
  const withCallouts = source
    .replace(HUMAN_BLOCK, '')
    .replace(AGENT_BLOCK, (_match, body: string) => blockquote(`**Agent:** ${body.trim()}`));
  return agentLinks(withCallouts.replace(ANY_COMMENT, '')).replace(/\n{3,}/g, '\n\n').trim();
}

function absoluteLinks(markdown: string): string {
  return markdown.replace(/\]\((\/[^)\s]*)\)/g, (_match, href: string) => `](${absoluteUrl(href)})`);
}

/** The guide list for a track, as Markdown bullets. */
function guideList(audience: SelfhostAudience, absolute: boolean): string {
  let group = '';
  const lines: string[] = [];
  for (const guide of getSelfhostGuides()) {
    if (guide.group !== group) {
      group = guide.group;
      lines.push('', `**${group}**`, '');
    }
    const href = absolute ? absoluteUrl(selfhostMarkdownPath(guide.slug, audience)) : selfhostGuidePath(guide.slug, audience);
    lines.push(`- [${guide.title}](${href})${guide.description ? `: ${guide.description}` : ''}`);
  }
  return lines.join('\n').trim();
}

/** The agent index page body: the rules, then every runbook. */
export function selfhostAgentIndexMarkdown(absolute = false): string {
  const index = getSelfhostAgentIndex();
  const rules = index ? selfhostMarkdownFor(index.source, 'agent') : '';
  return [rules, '## All runbooks', guideList('agent', absolute)].filter(Boolean).join('\n\n');
}

function header(title: string, description: string, page: string, markdown: string): string {
  return [
    `# ${title}`,
    description ? `\n${description}` : '',
    `\nRendered page: ${absoluteUrl(page)}`,
    `Markdown endpoint: ${absoluteUrl(markdown)}`,
    '\n---\n',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * The raw Markdown mirror for `/docs/self-hosting[/agents][/<slug>].md`.
 * `slug` undefined is the track's index. Returns null for an unknown guide.
 */
export function getSelfhostMarkdown(slug: string | undefined, audience: SelfhostAudience): string | null {
  if (audience === 'agent' && slug === undefined) {
    const index = getSelfhostAgentIndex();
    if (!index) return null;
    return `${header(index.title, index.description, SELFHOST_AGENTS_PATH, selfhostMarkdownPath(undefined, 'agent'))}\n${absoluteLinks(selfhostAgentIndexMarkdown(true))}\n`;
  }
  const guide = getSelfhostGuide(slug ?? 'overview');
  if (!guide) return null;
  const title = audience === 'agent' ? `${guide.title} (agent runbook)` : guide.title;
  const body = absoluteLinks(selfhostMarkdownFor(guide.source, audience));
  const index =
    audience === 'human' && guide.slug === 'overview'
      ? `\n\n## All guides\n\n${guideList('human', true)}`
      : '';
  return `${header(title, guide.description, selfhostGuidePath(guide.slug, audience), selfhostMarkdownPath(guide.slug, audience))}\n${body}${index}\n`;
}

/** Every raw Markdown path the site serves, relative to /docs/self-hosting/markdown/. */
export function getSelfhostMarkdownFiles(): string[] {
  const guides = getSelfhostGuides();
  return [
    'index.md',
    'agents.md',
    ...guides.filter((guide) => guide.slug !== 'overview').map((guide) => `${guide.slug}.md`),
    ...guides.map((guide) => `agents/${guide.slug}.md`),
  ];
}

/** Maps a path under /docs/self-hosting/markdown/ to what it serves. */
export function parseSelfhostMarkdownFile(segments: string[]): { slug?: string; audience: SelfhostAudience } | null {
  const [first, second] = segments;
  if (segments.length === 1 && first === 'index.md') return { audience: 'human' };
  if (segments.length === 1 && first === 'agents.md') return { audience: 'agent' };
  if (segments.length === 1 && first?.endsWith('.md')) {
    const slug = first.slice(0, -3);
    return slug !== 'overview' && isSelfhostGuideSlug(slug) ? { slug, audience: 'human' } : null;
  }
  if (segments.length === 2 && first === 'agents' && second?.endsWith('.md')) {
    const slug = second.slice(0, -3);
    return isSelfhostGuideSlug(slug) ? { slug, audience: 'agent' } : null;
  }
  return null;
}

export type SelfhostRoute =
  | { kind: 'guide'; slug: string; audience: SelfhostAudience }
  | { kind: 'agent-index' };

/** `[]`, `['<guide>']`, `['agents']` or `['agents', '<guide>']`; anything else is not a page. */
export function parseSelfhostSlug(slug: string[] | undefined): SelfhostRoute | null {
  if (!slug || slug.length === 0) return { kind: 'guide', slug: 'overview', audience: 'human' };
  if (slug.length === 1 && slug[0] === SELFHOST_AGENT_INDEX_SLUG) return { kind: 'agent-index' };
  if (slug.length === 1 && slug[0] !== 'overview' && isSelfhostGuideSlug(slug[0])) {
    return { kind: 'guide', slug: slug[0], audience: 'human' };
  }
  if (slug.length === 2 && slug[0] === SELFHOST_AGENT_INDEX_SLUG && isSelfhostGuideSlug(slug[1])) {
    return { kind: 'guide', slug: slug[1], audience: 'agent' };
  }
  return null;
}

/** Every page of the section, for generateStaticParams. */
export function getSelfhostStaticSlugs(): string[][] {
  return [
    [],
    ...SELFHOST_GUIDES.filter((guide) => guide.slug !== 'overview').map((guide) => [guide.slug]),
    [SELFHOST_AGENT_INDEX_SLUG],
    ...SELFHOST_GUIDES.map((guide) => [SELFHOST_AGENT_INDEX_SLUG, guide.slug]),
  ];
}

/** Human guide URLs for the sitemap. Agent runbooks are listed in llms.txt instead. */
export function getSelfhostSitemapPaths(): string[] {
  return SELFHOST_GUIDES.map((guide) => selfhostGuidePath(guide.slug));
}
