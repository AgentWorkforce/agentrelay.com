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

  it('is version 2 with unique kebab-case plugin names', () => {
    expect(catalog.version).toBe(2);
    expect(Array.isArray(catalog.plugins)).toBe(true);
    expect(catalog.plugins.length).toBeGreaterThan(0);
    const names = catalog.plugins.map((plugin) => plugin.name);
    expect(names.every((name) => NAME.test(name))).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });

  it('records the released Babysitter artifact without claiming handler execution', () => {
    const babysitter = getFlowPlugin('babysitter');
    expect(babysitter).toMatchObject({
      source: { owner: 'AgentWorkforce', repo: 'flows', path: 'extensions/babysitter' },
      ref: '8b33ebab8347514f80d9da5a81206a087f641714',
      digest: 'bdf2187b9a242667d34bbc63e7a744753e146dc8cd6f4047047f2aed28f406ee',
      manifestSha256: '5631a06bbdc8186f4ee0ff955610ead24d001c5197b59fb1fe81fe422c44f226',
      compat: { surface: '^2.0.26', sdk: '^2.0.26', base: ['software-factory'] },
      tier: 'first-party',
      base: ['software-factory'],
    });
    expect(babysitter!.ref).toMatch(SHA);
    expect(babysitter!.digest).toMatch(HEX64);
    expect(babysitter!.manifestSha256).toMatch(HEX64);
    expect(babysitter!.description).not.toContain('plugin_event_unroutable');
    expect(babysitter!.description).toContain('fail-closed');
    expect(babysitter!.description).toContain('no GitHub write or merge authority');
    expect(FLOW_PLUGIN_TRUST_TIERS.includes(babysitter!.tier)).toBe(true);
    expect(pluginHasUnroutableTriggers(babysitter!)).toBe(false);
  });

  it('builds a GitHub tree URL at the pinned sha, not a branch', () => {
    const babysitter = getFlowPlugin('babysitter')!;
    expect(flowPluginSourceUrl(babysitter)).toBe(
      `https://github.com/AgentWorkforce/flows/tree/${babysitter.ref}/extensions/babysitter`,
    );
    expect(flowPluginGithubRef(babysitter)).toBe(
      `github:AgentWorkforce/flows@${babysitter.ref}#extensions/babysitter`,
    );
  });
});

describe('flowPluginBadgeMarkdown', () => {
  const pluginA =
    'https://github.com/AgentWorkforce/flows/tree/8b33ebab8347514f80d9da5a81206a087f641714/extensions/babysitter';
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
    expect(SOFTWARE_FACTORY_FLOW_URL).toContain('/blob/8b33ebab8347514f80d9da5a81206a087f641714/');
    expect(SOFTWARE_FACTORY_FLOW_URL).not.toContain('/blob/main/');
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
