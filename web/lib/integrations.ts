// Catalog of every provider Relayfile ships an adapter for.
//
// Source of truth: the `packages/*` workspaces in AgentWorkforce/relayfile-adapters
// whose package name starts with `@relayfile/`, minus the three non-adapter
// packages (core, webhook-server, relay-helpers). Adapters are discovered by
// filesystem scan there — there is no hand-maintained registry to mirror — so
// this list is checked against `packages/core/src/scope-keys/catalog.generated.ts`
// (KNOWN_SCOPE_KEY_CATALOG ∪ ADAPTERS_WITHOUT_KNOWN_SCOPE_KEYS = every adapter).
//
// Ids match the adapter slug exactly, which is also the mount path segment
// (`/slack`, `/linear`, …). Logos resolve through lib/integration-logos.ts.

export interface Provider {
  /** Adapter slug — also the relayfile mount path segment. */
  id: string;
  name: string;
  category: ProviderCategory;
}

export type ProviderCategory =
  | 'Issues and projects'
  | 'Code and CI'
  | 'Messaging'
  | 'Email and calendar'
  | 'Files and storage'
  | 'CRM and support'
  | 'Commerce and payments'
  | 'Analytics'
  | 'Data and infrastructure'
  | 'Meetings'
  | 'Social';

export const PROVIDERS: Provider[] = [
  // Issues and projects
  { id: 'linear', name: 'Linear', category: 'Issues and projects' },
  { id: 'jira', name: 'Jira', category: 'Issues and projects' },
  { id: 'asana', name: 'Asana', category: 'Issues and projects' },
  { id: 'clickup', name: 'ClickUp', category: 'Issues and projects' },
  { id: 'notion', name: 'Notion', category: 'Issues and projects' },
  { id: 'confluence', name: 'Confluence', category: 'Issues and projects' },
  { id: 'airtable', name: 'Airtable', category: 'Issues and projects' },

  // Code and CI
  { id: 'github', name: 'GitHub', category: 'Code and CI' },
  { id: 'gitlab', name: 'GitLab', category: 'Code and CI' },
  { id: 'docker-hub', name: 'Docker Hub', category: 'Code and CI' },
  { id: 'daytona', name: 'Daytona', category: 'Code and CI' },

  // Messaging
  { id: 'slack', name: 'Slack', category: 'Messaging' },
  { id: 'teams', name: 'Microsoft Teams', category: 'Messaging' },
  { id: 'telegram', name: 'Telegram', category: 'Messaging' },
  { id: 'intercom', name: 'Intercom', category: 'Messaging' },

  // Email and calendar
  { id: 'gmail', name: 'Gmail', category: 'Email and calendar' },
  { id: 'google-calendar', name: 'Google Calendar', category: 'Email and calendar' },
  { id: 'calendly', name: 'Calendly', category: 'Email and calendar' },
  { id: 'sendgrid', name: 'SendGrid', category: 'Email and calendar' },
  { id: 'mailgun', name: 'Mailgun', category: 'Email and calendar' },

  // Files and storage
  { id: 'google-drive', name: 'Google Drive', category: 'Files and storage' },
  { id: 'dropbox', name: 'Dropbox', category: 'Files and storage' },
  { id: 'box', name: 'Box', category: 'Files and storage' },
  { id: 'onedrive', name: 'OneDrive', category: 'Files and storage' },
  { id: 'sharepoint', name: 'SharePoint', category: 'Files and storage' },
  { id: 's3', name: 'Amazon S3', category: 'Files and storage' },
  { id: 'gcs', name: 'Google Cloud Storage', category: 'Files and storage' },
  { id: 'azure-blob', name: 'Azure Blob Storage', category: 'Files and storage' },

  // CRM and support
  { id: 'salesforce', name: 'Salesforce', category: 'CRM and support' },
  { id: 'hubspot', name: 'HubSpot', category: 'CRM and support' },
  { id: 'pipedrive', name: 'Pipedrive', category: 'CRM and support' },
  { id: 'zendesk', name: 'Zendesk', category: 'CRM and support' },

  // Commerce and payments
  { id: 'stripe', name: 'Stripe', category: 'Commerce and payments' },
  { id: 'shopify', name: 'Shopify', category: 'Commerce and payments' },

  // Analytics
  { id: 'segment', name: 'Segment', category: 'Analytics' },
  { id: 'mixpanel', name: 'Mixpanel', category: 'Analytics' },

  // Data and infrastructure
  { id: 'postgres', name: 'Postgres', category: 'Data and infrastructure' },
  { id: 'redis', name: 'Redis', category: 'Data and infrastructure' },
  { id: 'neon', name: 'Neon', category: 'Data and infrastructure' },
  { id: 'gcp', name: 'Google Cloud', category: 'Data and infrastructure' },
  { id: 'cloudflare', name: 'Cloudflare', category: 'Data and infrastructure' },

  // Meetings
  { id: 'granola', name: 'Granola', category: 'Meetings' },
  { id: 'fathom', name: 'Fathom', category: 'Meetings' },
  { id: 'recall', name: 'Recall', category: 'Meetings' },

  // Social
  { id: 'x', name: 'X', category: 'Social' },
  { id: 'reddit', name: 'Reddit', category: 'Social' },
];

/** Display order for the grouped grid. */
export const PROVIDER_CATEGORIES: ProviderCategory[] = [
  'Issues and projects',
  'Code and CI',
  'Messaging',
  'Email and calendar',
  'Files and storage',
  'CRM and support',
  'Commerce and payments',
  'Analytics',
  'Data and infrastructure',
  'Meetings',
  'Social',
];

export function providersByCategory(): Array<{ category: ProviderCategory; providers: Provider[] }> {
  return PROVIDER_CATEGORIES.map((category) => ({
    category,
    providers: PROVIDERS.filter((p) => p.category === category),
  })).filter((group) => group.providers.length > 0);
}

export const PROVIDER_COUNT = PROVIDERS.length;
