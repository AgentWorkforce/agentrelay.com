import { describe, expect, it } from 'vitest';

import {
  FLOW_PLUGIN_TRUST_TIERS,
  SOFTWARE_FACTORY_FLOW_URL,
  flowPluginBadgeMarkdown,
  flowPluginGithubRef,
  flowPluginInstallHref,
  flowPluginInstallPath,
  flowPluginSourceUrl,
  getFlowPlugin,
  getFlowPluginCatalog,
  pluginHasUnroutableTriggers,
} from '../flow-plugin-catalog';
import { relayflowsSection, getProductSearchIndex } from '../product-docs';

const SHA = /^[0-9a-f]{40}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

describe('flow plugin catalog', () => {
  const catalog = getFlowPluginCatalog();

  it('is version 1 with unique kebab-case plugin names', () => {
    expect(catalog.version).toBe(1);
    expect(Array.isArray(catalog.plugins)).toBe(true);
    expect(catalog.plugins.length).toBeGreaterThan(0);
    const names = catalog.plugins.map((plugin) => plugin.name);
    expect(names.every((name) => NAME.test(name))).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });

  it('records a fail-closed babysitter entry with a pinned sha and digest', () => {
    const babysitter = getFlowPlugin('babysitter');
    expect(babysitter).toMatchObject({
      source: { owner: 'AgentWorkforce', repo: 'flows', path: 'examples/babysitter' },
      tier: 'community',
      base: ['software-factory'],
    });
    expect(babysitter!.ref).toMatch(SHA);
    expect(babysitter!.digest).toMatch(HEX64);
    expect(babysitter!.description).toContain('plugin_event_unroutable');
    expect(FLOW_PLUGIN_TRUST_TIERS.includes(babysitter!.tier)).toBe(true);
    expect(pluginHasUnroutableTriggers(babysitter!)).toBe(true);
  });

  it('builds a GitHub tree URL at the pinned sha, not a branch', () => {
    const babysitter = getFlowPlugin('babysitter')!;
    expect(flowPluginSourceUrl(babysitter)).toBe(
      `https://github.com/AgentWorkforce/flows/tree/${babysitter.ref}/examples/babysitter`,
    );
    expect(flowPluginGithubRef(babysitter)).toBe(
      `github:AgentWorkforce/flows@${babysitter.ref}#examples/babysitter`,
    );
  });
});

describe('flowPluginBadgeMarkdown', () => {
  const pluginA =
    'https://github.com/AgentWorkforce/flows/tree/05c3dff138883322e80cb793b1f5a097ad510572/examples/babysitter';
  const pluginB = 'github:acme/plugins@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa#extra';

  it('points the Install plugin badge at /cloud/flows/deploy with flow and plugin', () => {
    const markdown = flowPluginBadgeMarkdown({
      appOrigin: 'https://agentrelay.com/',
      flowUrl: SOFTWARE_FACTORY_FLOW_URL,
      plugins: [pluginA],
    });
    const href = markdown.match(/\((https:\/\/agentrelay\.com\/cloud\/flows\/deploy\?[^)]+)\)/)?.[1];
    expect(markdown.startsWith('[![Install plugin](https://agentrelay.com/deploy-flow_small.svg)]')).toBe(
      true,
    );
    expect(href).toBeDefined();
    const url = new URL(href!);
    expect(url.pathname).toBe('/cloud/flows/deploy');
    expect(url.searchParams.get('flow')).toBe(SOFTWARE_FACTORY_FLOW_URL);
    expect(url.searchParams.getAll('plugin')).toEqual([pluginA]);
  });

  it('appends plugin so repeats survive', () => {
    const markdown = flowPluginBadgeMarkdown({
      appOrigin: 'https://agentrelay.com',
      flowUrl: SOFTWARE_FACTORY_FLOW_URL,
      plugins: [pluginA, pluginB],
    });
    const href = markdown.match(/\((https:\/\/agentrelay\.com\/cloud\/flows\/deploy\?[^)]+)\)/)?.[1];
    const url = new URL(href!);
    expect(url.searchParams.getAll('plugin')).toEqual([pluginA, pluginB]);
    expect(url.searchParams.get('plugin')).toBe(pluginA);

    const path = flowPluginInstallPath({
      flowUrl: SOFTWARE_FACTORY_FLOW_URL,
      plugins: [pluginA, pluginB],
    });
    expect(new URL(path, 'https://agentrelay.com').searchParams.getAll('plugin')).toEqual([
      pluginA,
      pluginB,
    ]);
  });

  it('wires the babysitter gallery card to Software Garden plus the pinned plugin tree', () => {
    const babysitter = getFlowPlugin('babysitter')!;
    const href = flowPluginInstallHref(babysitter);
    expect(href).toBeTruthy();
    const url = new URL(href!, 'https://agentrelay.com');
    expect(url.pathname).toBe('/cloud/flows/deploy');
    expect(url.searchParams.get('flow')).toBe(SOFTWARE_FACTORY_FLOW_URL);
    expect(url.searchParams.getAll('plugin')).toEqual([flowPluginSourceUrl(babysitter)]);
  });
});

describe('Flows plugin docs', () => {
  it('publishes plugins in navigation and scoped search', () => {
    const navItems = relayflowsSection.nav.flatMap((group) => group.items);

    expect(navItems).toContainEqual({ title: 'Plugins', slug: 'plugins' });

    const searchEntry = getProductSearchIndex(relayflowsSection).find(
      (entry) => entry.slug === 'plugins',
    );

    expect(searchEntry).toMatchObject({ title: 'Plugins' });
    expect(searchEntry?.headings).toEqual([
      'flows-plugin.json schema 2',
      'flows add',
      'flows plugin',
      'Trust tiers',
      'Install badge',
    ]);
    expect(searchEntry?.body).toContain('Schema 2');
    expect(searchEntry?.body).toContain('flow-extension');
  });
});
