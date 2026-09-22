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
    expect(catalog).toEqual({
      schemaVersion: 1,
      catalogVersion: 2,
      flows: [{
        id: 'software-factory',
        version: 2,
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
        source: {
          kind: 'github',
          owner: 'AgentWorkforce',
          repo: 'flows',
          path: 'examples/software-factory/software-factory.flow.ts',
          release: 'v2.0.26',
          ref: '8b33ebab8347514f80d9da5a81206a087f641714',
          url: 'https://github.com/AgentWorkforce/flows/blob/8b33ebab8347514f80d9da5a81206a087f641714/examples/software-factory/software-factory.flow.ts',
          rawUrl: 'https://raw.githubusercontent.com/AgentWorkforce/flows/8b33ebab8347514f80d9da5a81206a087f641714/examples/software-factory/software-factory.flow.ts',
          mediaType: 'text/typescript',
          sha256: '49c993220b9c34fab2d4b0e51911656f62b8b657f534d988691960d45bb9d9b6',
        },
      }],
    });
    expect(JSON.parse(JSON.stringify(catalog))).toEqual(catalog);
  });

  it('keeps display branding separate from the canonical activation id', () => {
    expect(getRecommendedFlow('software-factory')?.name).toBe('Software Garden');
    expect(getRecommendedFlow('software-garden')).toBeNull();
    expect(getRecommendedFlow('babysitter')).toBeNull();
  });

  it('references an immutable released source instead of carrying authored source', () => {
    const flow = getRecommendedFlow('software-factory')!;
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
    await expect(list.json()).resolves.toMatchObject({ schemaVersion: 1, flows: [{ id: 'software-factory' }] });

    const detail = await getCatalogItem(new Request('https://agentrelay.com/api/v1/flows/catalog/software-factory'), {
      params: Promise.resolve({ flowId: 'software-factory' }),
    });
    expect(detail.status).toBe(200);
    await expect(detail.json()).resolves.toMatchObject({
      id: 'software-factory',
      name: 'Software Garden',
      source: { ref: '8b33ebab8347514f80d9da5a81206a087f641714' },
    });
  });

  it('does not treat display names or future concepts as catalog ids', async () => {
    for (const flowId of ['software-garden', 'babysitter', 'unknown']) {
      const response = await getCatalogItem(new Request(`https://agentrelay.com/api/v1/flows/catalog/${flowId}`), {
        params: Promise.resolve({ flowId }),
      });
      expect(response.status, flowId).toBe(404);
      await expect(response.json()).resolves.toMatchObject({ error: { code: 'recommended_flow_not_found' } });
    }
  });
});
