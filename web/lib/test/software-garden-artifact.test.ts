import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import catalog from '../../data/recommended-flow-catalog.v1.json';
import { cloudConnectionsHref, DEFAULT_FACTORY, type FactoryDraft } from '../flow-onboarding';
import { assertRecommendedFlowSourceContract } from '../../scripts/recommended-flow-contract.mjs';
import {
  SOFTWARE_GARDEN_ARTIFACT_DIR,
  SOFTWARE_GARDEN_DRAFT,
  softwareGardenArtifactPath,
  softwareGardenArtifactUrl,
  softwareGardenSource,
} from '../software-garden-artifact';

const web = path.resolve(__dirname, '../..');
const manifestPath = path.join(web, SOFTWARE_GARDEN_ARTIFACT_DIR, 'manifest.json');
const sha256 = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const REGENERATE = 'The generator output changed. Publish it as a new version: cd web && npx -y tsx@4 scripts/publish-software-garden.mts';

type Manifest = {
  name: string;
  catalogId: string;
  version: number;
  sha256: string;
  bytes: number;
  path: string;
  url: string;
  target: 'cloud';
  draft: FactoryDraft;
  versions: Array<{ version: number; sha256: string }>;
};

const manifest = (): Manifest => JSON.parse(readFileSync(manifestPath, 'utf8'));
const artifact = (version: number) => readFileSync(path.join(web, softwareGardenArtifactPath(version)));

describe('published Software Garden artifact', () => {
  it('is byte-identical to what the generator produces today', () => {
    const current = manifest();
    expect(artifact(current.version).toString('utf8'), REGENERATE).toBe(softwareGardenSource());
  });

  it('pins the current version by sha256, size, path and url', () => {
    const current = manifest();
    const bytes = artifact(current.version);
    expect(current).toMatchObject({ name: 'Software Garden', catalogId: 'software-factory', target: 'cloud' });
    expect(current.sha256, REGENERATE).toBe(sha256(bytes));
    expect(current.bytes).toBe(bytes.byteLength);
    expect(current.path).toBe(`web/${softwareGardenArtifactPath(current.version)}`);
    expect(current.url).toBe(softwareGardenArtifactUrl(current.version));
    expect(current.draft).toEqual(SOFTWARE_GARDEN_DRAFT);
    expect(current.versions.at(-1)).toEqual({ version: current.version, sha256: current.sha256 });
  });

  it('never rewrites a published version in place', () => {
    const { versions } = manifest();
    // Versions only move forward. Output that returns to an earlier version's
    // bytes is published as a new version, so a digest may recur.
    expect(versions.map(entry => entry.version)).toEqual(versions.map((_, index) => index + 1));
    for (const entry of versions) {
      expect(existsSync(path.join(web, softwareGardenArtifactPath(entry.version))), `v${entry.version}`).toBe(true);
      expect(sha256(artifact(entry.version)), `v${entry.version} was edited after it was published`).toBe(entry.sha256);
    }
  });

  it('is exactly what /flows onboarding hands to Cloud for the same draft', () => {
    const current = artifact(manifest().version).toString('utf8');
    // A person who picks GitHub, Claude Code and Traditional with no extra
    // instructions. Their repository and label filters are applied by Cloud's
    // listener, not written into the source, so they do not change the bytes.
    const answered: FactoryDraft[] = [
      { ...DEFAULT_FACTORY, sources: ['github'], agents: ['claude'], workflow: 'traditional', step: 2 },
      { ...DEFAULT_FACTORY, sources: ['github'], sourceSettings: { github: { repository: 'acme/app', labels: 'ready' } }, agents: ['claude'], otherAgentSelected: false, workflow: 'traditional', step: 3 },
    ];
    for (const draft of answered) {
      const url = new URL(cloudConnectionsHref(draft, '00000000-0000-4000-8000-000000000001'));
      const payload = JSON.parse(decodeURIComponent(url.hash.slice(1)));
      expect(payload.name).toBe('Software Garden');
      expect(payload.source).toBe(current);
    }
  });

  it('is the variant the catalog entry deploys', () => {
    // Cloud's prebuilt wizard deploys the catalog source verbatim with the
    // entry's default agents and trigger, so the published draft must be that
    // same selection: another agent order is a different file.
    const entry = catalog.flows.find(flow => flow.id === 'software-factory')!;
    expect(SOFTWARE_GARDEN_DRAFT.agents).toEqual(entry.inputs.defaults.agents);
    expect(SOFTWARE_GARDEN_DRAFT.agents.every(agent => (entry.inputs.allowedAgents as string[]).includes(agent))).toBe(true);
    expect(SOFTWARE_GARDEN_DRAFT.sources).toEqual([entry.defaultTrigger.provider]);
    expect(SOFTWARE_GARDEN_DRAFT.sourceSettings).toEqual(entry.defaultTrigger.settings);
    expect(SOFTWARE_GARDEN_DRAFT).toMatchObject({ workflow: 'traditional', task: '', otherAgent: '' });
  });

  it('keeps the ticket-title and exact closing-reference contract the catalog requires', () => {
    const entry = catalog.flows.find(flow => flow.id === 'software-factory')!;
    expect(() => assertRecommendedFlowSourceContract(entry, softwareGardenSource())).not.toThrow();
  });

  it('is what the catalog serves as Software Garden, pinned at a published version', () => {
    const { source } = catalog.flows.find(flow => flow.id === 'software-factory')!;
    const published = manifest().versions.find(entry => `web/${softwareGardenArtifactPath(entry.version)}` === source.path);
    expect(published, `catalog source ${source.path} is not a published Software Garden version`).toBeDefined();
    expect(source).toMatchObject({
      kind: 'github',
      owner: 'AgentWorkforce',
      repo: 'agentrelay.com',
      release: `software-garden-v${published!.version}`,
      sha256: published!.sha256,
      mediaType: 'text/typescript',
    });
    expect(sha256(artifact(published!.version))).toBe(source.sha256);
  });
});
