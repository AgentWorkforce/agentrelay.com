export interface NavItem {
  title: string;
  slug: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/** Pages a person browses. Keep this short. */
export const docsNav: NavGroup[] = [
  {
    title: 'Start',
    items: [
      { title: 'Getting started', slug: 'getting-started' },
      { title: 'Desktop setup (optional)', slug: 'quickstart' },
      { title: 'Introduction', slug: 'introduction' },
    ],
  },
  {
    title: 'Sessions',
    items: [{ title: 'Sessions', slug: 'sessions' }],
  },
  {
    title: 'Forward deployed agents',
    items: [
      { title: 'Public address', slug: 'forward-deployed-agents' },
      { title: 'Relay Connect', slug: 'relay-connect' },
    ],
  },
  {
    title: 'Flows',
    items: [{ title: 'Flows', slug: 'flows' }],
  },
];

/**
 * Built, searchable, and mirrored as markdown, but left out of the sidebar.
 * The audience is an agent fetching the `.md`, the same idea as a product
 * section's `unlistedSlugs`.
 */
export const agentDocs: NavItem[] = [
  { title: 'For agents', slug: 'agents' },
  { title: 'Relaycast API', slug: 'relaycast-api' },
  { title: 'Agent Relay MCP', slug: 'agent-relay-mcp' },
];

const humanDocsSlugs = docsNav.flatMap((group) => group.items.map((item) => item.slug));

export const agentDocsSlugs = agentDocs.map((item) => item.slug);

/** Human pages plus agent pages. Version routing treats all of these as current. */
export const currentDocsSlugs = [...humanDocsSlugs, ...agentDocsSlugs];

export const legacyDocsNav: NavGroup[] = [
  {
    title: 'Getting Started',
    items: [
      { title: 'Introduction', slug: 'introduction' },
      { title: 'Quickstart', slug: 'quickstart' },
    ],
  },
  {
    title: 'Basics',
    items: [
      { title: 'Spawning an agent', slug: 'spawning-an-agent' },
      { title: 'Harnesses', slug: 'harnesses' },
      { title: 'Sending messages', slug: 'sending-messages' },
      { title: 'Event handlers', slug: 'event-handlers' },
      { title: 'Channels', slug: 'channels' },
      { title: 'DMs', slug: 'dms' },
      { title: 'Threads', slug: 'threads' },
      { title: 'Emoji reactions', slug: 'emoji-reactions' },
      { title: 'File sharing', slug: 'file-sharing' },
      { title: 'Authentication', slug: 'authentication' },
      { title: 'Permissions', slug: 'permissions' },
      { title: 'Scheduling', slug: 'scheduling' },
    ],
  },
  {
    title: 'Advanced',
    items: [
      { title: 'Cloud', slug: 'cloud' },
      { title: 'Workforce', slug: 'workforce' },
      { title: 'Proactive agents', slug: 'proactive-agents' },
    ],
  },
  {
    title: 'Tools',
    items: [
      { title: 'Agent Relay MCP', slug: 'agent-relay-mcp' },
      { title: 'Relay Dashboard', slug: 'relay-dashboard' },
      { title: 'Observer', slug: 'observer' },
    ],
  },
  {
    title: 'CLI',
    items: [
      { title: 'Overview', slug: 'cli-overview' },
      { title: 'Broker lifecycle', slug: 'cli-broker-lifecycle' },
      { title: 'Agent management', slug: 'cli-agent-management' },
      { title: 'Messaging', slug: 'cli-messaging' },
      { title: 'Cloud commands', slug: 'cli-cloud-commands' },
      { title: 'On the relay', slug: 'cli-on-the-relay' },
      { title: 'CLI reference', slug: 'reference-cli' },
      { title: 'Broker HTTP / WS API', slug: 'reference-broker-api' },
    ],
  },
  {
    title: 'SDKs',
    items: [
      { title: 'TypeScript SDK', slug: 'typescript-sdk' },
      { title: 'Python SDK', slug: 'python-sdk' },
      { title: 'React SDK', slug: 'react-sdk' },
      { title: 'Swift SDK', slug: 'swift-sdk' },
    ],
  },
  {
    title: 'Plugins',
    items: [{ title: 'Claude Code', slug: 'plugin-claude-code' }],
  },
  {
    title: 'Examples',
    items: [{ title: 'TypeScript Examples', slug: 'typescript-examples' }],
  },
];

const LEGACY_HIDDEN_SLUGS = [
  'communicate',
  'communicate-ai-sdk',
  'communicate-claude-sdk',
  'communicate-google-adk',
  'communicate-pi',
  'communicate-agno',
  'communicate-openai-agents',
  'communicate-swarms',
  'communicate-crewai',
  'doctor-orchestration-repros',
  'harness-runtime-config',
  'local-mode',
];

export const legacyDocsSlugs = [
  ...legacyDocsNav.flatMap((group) => group.items.map((item) => item.slug)),
  ...LEGACY_HIDDEN_SLUGS,
];

/** Sidebar slugs. The sitemap lists these and leaves agent pages out. */
export function getHumanDocSlugs(): string[] {
  return [...humanDocsSlugs];
}

/** Human and agent slugs, for static generation, search, and markdown mirrors. */
export function getAllDocSlugs(): string[] {
  return [...new Set(currentDocsSlugs)];
}

/** Flat list of all version 7.1.1 doc slugs for static generation */
export function getAllLegacyDocSlugs(): string[] {
  return [...new Set(legacyDocsSlugs)];
}
