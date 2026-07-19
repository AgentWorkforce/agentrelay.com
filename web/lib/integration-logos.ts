/**
 * Provider logos vendored from Nango's template logos by
 * scripts/sync-integration-logos.sh — the same source pear resolves icons from.
 *
 * Nango has no logo for every provider we support (it answers 200 with its app
 * shell for unknown slugs), so this maps only the ones that resolve to a real
 * image. Anything absent renders as a text chip instead. Re-run the sync script
 * after adding a provider; it prints which ones had no logo at source.
 *
 * Generated from the contents of public/integration-logos — keep in sync by
 * re-running the script rather than hand-editing.
 */
const LOGO_FILES: Record<string, string> = {
  'airtable': 'airtable.svg',
  'asana': 'asana.svg',
  'azure-blob': 'azure-blob.svg',
  'box': 'box.svg',
  'calendly': 'calendly.svg',
  'clickup': 'clickup.svg',
  'cloudflare': 'cloudflare.svg',
  'confluence': 'confluence.svg',
  'dropbox': 'dropbox.svg',
  'fathom': 'fathom.svg',
  'github': 'github.svg',
  'gitlab': 'gitlab.svg',
  'gmail': 'gmail.svg',
  'google-calendar': 'google-calendar.svg',
  'google-drive': 'google-drive.svg',
  'google-mail': 'google-mail.svg',
  'granola': 'granola.png',
  'hubspot': 'hubspot.svg',
  'intercom': 'intercom.svg',
  'jira': 'jira.svg',
  'linear': 'linear.svg',
  'mailgun': 'mailgun.svg',
  'mixpanel': 'mixpanel.svg',
  'notion': 'notion.svg',
  'onedrive': 'onedrive.svg',
  'pipedrive': 'pipedrive.svg',
  'recall': 'recall.svg',
  'reddit': 'reddit.svg',
  'salesforce': 'salesforce.svg',
  'segment': 'segment.svg',
  'sendgrid': 'sendgrid.svg',
  'sharepoint': 'sharepoint.svg',
  'shopify': 'shopify.svg',
  'slack': 'slack.svg',
  'spotify': 'spotify.svg',
  'stripe': 'stripe.svg',
  'teams': 'teams.svg',
  'telegram': 'telegram.svg',
  'x': 'x.svg',
  'zendesk': 'zendesk.svg',
};

/** Logo URL for a provider id, or undefined when no vendored logo exists. */
export function providerLogo(id: string): string | undefined {
  const file = LOGO_FILES[id];
  return file ? `/integration-logos/${file}` : undefined;
}

export function hasProviderLogo(id: string): boolean {
  return id in LOGO_FILES;
}
