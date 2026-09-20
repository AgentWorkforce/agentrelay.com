import catalogJson from '../data/flow-plugin-catalog.v1.json';
import { SITE_URL } from './site';

export const FLOW_PLUGIN_TRUST_TIERS = ['first-party', 'verified', 'community'] as const;
export type FlowPluginTrustTier = (typeof FLOW_PLUGIN_TRUST_TIERS)[number];

export type FlowPluginCatalogEntry = {
  name: string;
  description: string;
  source: { owner: string; repo: string; path: string };
  ref: string;
  digest: string;
  compat: { surface: string; sdk: string; base: string[] };
  tier: FlowPluginTrustTier;
  base: string[];
};

export type FlowPluginCatalog = {
  version: 1;
  plugins: FlowPluginCatalogEntry[];
};

export const FLOW_PLUGIN_TRUST_TIER_COPY: Record<
  FlowPluginTrustTier,
  { label: string; summary: string }
> = {
  'first-party': {
    label: 'First-party',
    summary: 'AgentWorkforce/* at a sha reachable from main.',
  },
  verified: {
    label: 'Verified',
    summary: 'Publisher keyid registered in Cloud.',
  },
  community: {
    label: 'Community',
    summary: 'Any other public source.',
  },
};

/** Display-only. Trust tiers never skip digest, compat, or event-routability checks. */
export const FLOW_PLUGIN_TRUST_TIER_DISCLAIMER =
  'Tiers are displayed only. They never skip digest, compat, or event-routability checks.';

export const SOFTWARE_FACTORY_FLOW_URL =
  'https://github.com/AgentWorkforce/flows/blob/main/examples/software-factory/software-factory.flow.ts';

export const BASE_FLOW_URLS: Record<string, string> = {
  'software-factory': SOFTWARE_FACTORY_FLOW_URL,
};

export const FLOW_PLUGIN_BADGE_IMAGE_PATH = '/deploy-flow_small.svg';

const catalog = catalogJson as FlowPluginCatalog;

/** Vendored copy of AgentWorkforce/flows catalog/plugins.json (D1). */
export function getFlowPluginCatalog(): FlowPluginCatalog {
  return catalog;
}

export function getFlowPlugin(name: string): FlowPluginCatalogEntry | null {
  return catalog.plugins.find((plugin) => plugin.name === name) ?? null;
}

export function flowPluginSourceUrl(plugin: FlowPluginCatalogEntry): string {
  const { owner, repo, path } = plugin.source;
  return `https://github.com/${owner}/${repo}/tree/${plugin.ref}/${path}`;
}

export function flowPluginGithubRef(plugin: FlowPluginCatalogEntry): string {
  const { owner, repo, path } = plugin.source;
  return `github:${owner}/${repo}@${plugin.ref}#${path}`;
}

export function baseFlowUrl(name: string): string | null {
  return BASE_FLOW_URLS[name] ?? null;
}

export function pluginInstallFlowUrl(plugin: FlowPluginCatalogEntry): string | null {
  for (const name of plugin.base) {
    const url = baseFlowUrl(name);
    if (url) return url;
  }
  return null;
}

export function pluginHasUnroutableTriggers(plugin: FlowPluginCatalogEntry): boolean {
  return plugin.description.includes('plugin_event_unroutable');
}

function originFrom(appOrigin: string): string {
  return appOrigin.replace(/\/+$/, '');
}

/**
 * Query string for `/cloud/flows/deploy`. `plugin` is appended so a second
 * plugin does not overwrite the first (`URLSearchParams.set` would).
 */
export function flowPluginDeploySearch(input: { flowUrl: string; plugins: string[] }): string {
  const params = new URLSearchParams();
  params.set('flow', input.flowUrl);
  for (const plugin of input.plugins) {
    params.append('plugin', plugin);
  }
  return params.toString();
}

export function flowPluginInstallPath(input: { flowUrl: string; plugins: string[] }): string {
  return `/cloud/flows/deploy?${flowPluginDeploySearch(input)}`;
}

export function flowPluginInstallHref(plugin: FlowPluginCatalogEntry): string | null {
  const flowUrl = pluginInstallFlowUrl(plugin);
  if (!flowUrl) return null;
  return flowPluginInstallPath({ flowUrl, plugins: [flowPluginSourceUrl(plugin)] });
}

/**
 * README badge for installing a plugin onto a base flow. Counterpart of
 * Cloud's `flowDeployBadgeMarkdown()`, with `plugin` repeated via append.
 */
export function flowPluginBadgeMarkdown(input: {
  appOrigin?: string;
  flowUrl: string;
  plugins: string[];
}): string {
  const origin = originFrom(input.appOrigin ?? SITE_URL);
  const query = flowPluginDeploySearch(input);
  return `[![Install plugin](${origin}${FLOW_PLUGIN_BADGE_IMAGE_PATH})](${origin}/cloud/flows/deploy?${query})`;
}
