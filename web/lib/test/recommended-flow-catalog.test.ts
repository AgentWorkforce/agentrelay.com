import { describe, expect, it } from 'vitest';
import {
  getRecommendedFlow,
  getRecommendedFlowCatalog,
} from '../recommended-flow-catalog';
import { GET as getCatalog } from '../../app/api/v1/flows/catalog/route';
import { GET as getCatalogItem } from '../../app/api/v1/flows/catalog/[flowId]/route';

describe('recommended flow catalog', () => {
  it('publishes Software Garden metadata under its canonical flow id', () => {
    const catalog = getRecommendedFlowCatalog();
    expect(catalog).toMatchObject({
      schemaVersion: 1,
      catalogVersion: 4,
      flows: [{
        id: 'software-factory',
        kind: 'flow',
        version: 4,
        name: 'Software Garden',
        summary: expect.any(String),
        description: expect.any(String),
        defaultLabel: 'Software Garden',
        supportedRepositoryHosts: ['github'],
        defaultTrigger: { provider: 'github', settings: {} },
        inputs: {
          required: ['approver'],
          defaults: { agents: ['claude'] },
          allowedAgents: ['claude'],
        },
        extensions: [{
          id: 'babysitter',
          version: '0.2.0',
          runtime: { package: '@relayflows/sdk', version: '2.0.31', release: 'v2.0.31' },
          artifact: {
            ref: 'github:AgentWorkforce/flows@8b33ebab8347514f80d9da5a81206a087f641714#extensions/babysitter',
            digest: 'bdf2187b9a242667d34bbc63e7a744753e146dc8cd6f4047047f2aed28f406ee',
            manifestSha256: '5631a06bbdc8186f4ee0ff955610ead24d001c5197b59fb1fe81fe422c44f226',
          },
          activation: {
            state: 'blocked',
            liveProof: null,
            dependencies: [
              {
                id: 'cloud-babysitter-capability-adapter',
                repository: 'AgentWorkforce/cloud',
                requiredState: 'merged-and-deployed',
                evidence: null,
              },
              {
                id: 'relay-hosted-flow-extension-execution',
                repository: 'AgentWorkforce/relay',
                requiredState: 'merged-and-deployed',
                evidence: null,
              },
              {
                id: 'relay-native-existing-session-delivery',
                repository: 'AgentWorkforce/relay',
                requiredState: 'merged-and-deployed',
                evidence: null,
              },
            ],
          },
        }],
        source: {
          kind: 'github',
          owner: 'AgentWorkforce',
          repo: 'flows',
          path: 'examples/software-factory/software-factory.flow.ts',
          release: 'v2.0.42',
          ref: '3c58ee16d10a9e2400db980f5bbafac84e437f20',
          url: 'https://github.com/AgentWorkforce/flows/blob/3c58ee16d10a9e2400db980f5bbafac84e437f20/examples/software-factory/software-factory.flow.ts',
          rawUrl: 'https://raw.githubusercontent.com/AgentWorkforce/flows/3c58ee16d10a9e2400db980f5bbafac84e437f20/examples/software-factory/software-factory.flow.ts',
          mediaType: 'text/typescript',
          sha256: '4339c0c45a4fc928092a3e32275c061000887ed95acdc2f898966c35aca91a2d',
        },
      }, {
        id: 'babysitter',
        kind: 'extension',
        baseFlowId: 'software-factory',
        name: 'Babysitter',
        defaultLabel: 'Babysitter',
        inputs: {
          required: [],
          defaults: { agents: [] },
          allowedAgents: [],
        },
        extension: {
          id: 'babysitter',
          version: '0.2.0',
          artifact: {
            ref: 'github:AgentWorkforce/flows@8b33ebab8347514f80d9da5a81206a087f641714#extensions/babysitter',
            digest: 'bdf2187b9a242667d34bbc63e7a744753e146dc8cd6f4047047f2aed28f406ee',
            manifestSha256: '5631a06bbdc8186f4ee0ff955610ead24d001c5197b59fb1fe81fe422c44f226',
          },
          activation: { state: 'blocked' },
        },
        source: {
          path: 'extensions/babysitter/babysitter.flow.ts',
          ref: '8b33ebab8347514f80d9da5a81206a087f641714',
          sha256: 'e1e8e9690334360612a6f6e749746e6a322eefea922f61342479c3bac18490b6',
        },
      }],
    });
    expect(JSON.parse(JSON.stringify(catalog))).toEqual(catalog);
    expect(catalog.flows[0]?.extensions?.[0]?.activation.state).toBe('blocked');
  });

  it('publishes Babysitter as a first-class, blocked Software Garden extension', () => {
    expect(getRecommendedFlow('software-factory')?.name).toBe('Software Garden');
    expect(getRecommendedFlow('software-garden')).toBeNull();
    const babysitter = getRecommendedFlow('babysitter');
    expect(babysitter).toMatchObject({
      kind: 'extension',
      baseFlowId: 'software-factory',
      extension: {
        activation: { state: 'blocked' },
        bundle: {
          name: 'babysitter',
          digest: 'bdf2187b9a242667d34bbc63e7a744753e146dc8cd6f4047047f2aed28f406ee',
          manifest: { permissions: { writes: ['cloud:babysitter-turn'] } },
        },
      },
    });
  });

  it('references an immutable released source instead of carrying authored source', () => {
    const flow = getRecommendedFlow('babysitter')!;
    expect(flow.source.ref).toMatch(/^[0-9a-f]{40}$/);
    expect(flow.source.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(flow.source.url).toContain(`/blob/${flow.source.ref}/${flow.source.path}`);
    expect(flow.source.rawUrl).toContain(`/${flow.source.ref}/${flow.source.path}`);
    expect(Object.keys(flow.source).sort()).toEqual([
      'kind', 'mediaType', 'owner', 'path', 'rawUrl', 'ref', 'release', 'repo', 'sha256', 'url',
    ]);
  });
});

describe('recommended flow catalog HTTP surface', () => {
  it('serves list and detail JSON with cache and cross-origin metadata', async () => {
    const list = getCatalog();
    expect(list.status).toBe(200);
    expect(list.headers.get('access-control-allow-origin')).toBe('*');
    await expect(list.json()).resolves.toMatchObject({
      schemaVersion: 1,
      catalogVersion: 4,
      flows: [{ id: 'software-factory' }, {
        id: 'babysitter',
        kind: 'extension',
        defaultLabel: 'Babysitter',
        inputs: { defaults: { agents: [] }, allowedAgents: [] },
      }],
    });

    const detail = await getCatalogItem(new Request('https://agentrelay.com/api/v1/flows/catalog/software-factory'), {
      params: Promise.resolve({ flowId: 'software-factory' }),
    });
    expect(detail.status).toBe(200);
    await expect(detail.json()).resolves.toMatchObject({
      id: 'software-factory',
      name: 'Software Garden',
      source: { ref: '3c58ee16d10a9e2400db980f5bbafac84e437f20' },
      extensions: [{ id: 'babysitter', activation: { state: 'blocked' } }],
    });

    const babysitter = await getCatalogItem(new Request('https://agentrelay.com/api/v1/flows/catalog/babysitter'), {
      params: Promise.resolve({ flowId: 'babysitter' }),
    });
    expect(babysitter.status).toBe(200);
    await expect(babysitter.json()).resolves.toMatchObject({
      id: 'babysitter',
      kind: 'extension',
      baseFlowId: 'software-factory',
      extension: {
        activation: { state: 'blocked' },
        bundle: { name: 'babysitter', files: expect.any(Array) },
      },
    });
  });

  it('does not treat display names or future concepts as catalog ids', async () => {
    for (const flowId of ['software-garden', 'unknown']) {
      const response = await getCatalogItem(new Request(`https://agentrelay.com/api/v1/flows/catalog/${flowId}`), {
        params: Promise.resolve({ flowId }),
      });
      expect(response.status, flowId).toBe(404);
      await expect(response.json()).resolves.toMatchObject({ error: { code: 'recommended_flow_not_found' } });
    }
  });
});
