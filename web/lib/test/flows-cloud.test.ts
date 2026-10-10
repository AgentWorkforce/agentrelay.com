import { afterEach, describe, expect, it } from 'vitest';
import { flowsGoogleAuthHref, isFlowsGoogleAuthHref, withFlowsJourney } from '../flows-cloud';

describe('flowsGoogleAuthHref', () => {
  const originalCloudUrl = process.env.NEXT_PUBLIC_CLOUD_URL;

  afterEach(() => {
    if (originalCloudUrl === undefined) delete process.env.NEXT_PUBLIC_CLOUD_URL;
    else process.env.NEXT_PUBLIC_CLOUD_URL = originalCloudUrl;
  });

  it('starts Google auth directly with the trusted Flows destination', () => {
    delete process.env.NEXT_PUBLIC_CLOUD_URL;
    expect(flowsGoogleAuthHref('hero')).toBe(
      '/cloud/api/auth/google/start?source=flows&next=%2Fflows%2Fdeploy&utm_content=hero',
    );
  });

  it('uses the configured Cloud origin without a duplicate slash', () => {
    process.env.NEXT_PUBLIC_CLOUD_URL = 'https://cloud.example.test/cloud/';
    expect(flowsGoogleAuthHref()).toBe(
      'https://cloud.example.test/cloud/api/auth/google/start?source=flows&next=%2Fflows%2Fdeploy',
    );
  });

  it('recognizes only the Flows auth handoff that returns to deploy', () => {
    expect(isFlowsGoogleAuthHref('/cloud/api/auth/google/start?source=flows&next=%2Fflows%2Fdeploy')).toBe(true);
    expect(isFlowsGoogleAuthHref('/cloud/api/auth/google/start?source=flows&next=%2Fdashboard')).toBe(false);
    expect(isFlowsGoogleAuthHref('/cloud/api/auth/google/start?source=teams&next=%2Fflows%2Fdeploy')).toBe(false);
    expect(isFlowsGoogleAuthHref('/cloud/api/auth/google/start?source=flows&next=https%3A%2F%2Fevil.test%2Fflows%2Fdeploy')).toBe(false);
  });

  it('carries the landing journey through the opaque OAuth next path', () => {
    const href = withFlowsJourney(
      '/cloud/api/auth/google/start?source=flows&next=%2Fflows%2Fdeploy&utm_content=hero',
      '537e4857-5590-42e8-8731-66441b466542',
    );
    const url = new URL(href, 'https://agentrelay.invalid');
    expect(url.searchParams.get('source')).toBe('flows');
    expect(url.searchParams.get('utm_content')).toBe('hero');
    expect(url.searchParams.get('next')).toBe('/flows/deploy?journey_id=537e4857-5590-42e8-8731-66441b466542');
    expect(withFlowsJourney(href, 'not-a-uuid')).toBe(href);
  });

  it('decorates the absolute Cloud href used by mounted anchors', () => {
    process.env.NEXT_PUBLIC_CLOUD_URL = 'https://cloud.example.test/cloud';
    const href = flowsGoogleAuthHref('hero');
    const decorated = withFlowsJourney(href, '537e4857-5590-42e8-8731-66441b466542');
    const url = new URL(decorated);
    expect(url.origin).toBe('https://cloud.example.test');
    expect(url.searchParams.get('source')).toBe('flows');
    expect(url.searchParams.get('next')).toBe('/flows/deploy?journey_id=537e4857-5590-42e8-8731-66441b466542');
  });

  it('keeps relative Cloud hrefs working when Cloud is configured as a relative path', () => {
    process.env.NEXT_PUBLIC_CLOUD_URL = '/cloud';
    const href = '/cloud/api/auth/google/start?source=flows&next=%2Fflows%2Fdeploy';
    const url = new URL(withFlowsJourney(href, '537e4857-5590-42e8-8731-66441b466542'), 'https://agentrelay.invalid');
    expect(url.searchParams.get('next')).toBe('/flows/deploy?journey_id=537e4857-5590-42e8-8731-66441b466542');
  });

  it('does not decorate non-Flows or off-origin auth targets', () => {
    process.env.NEXT_PUBLIC_CLOUD_URL = 'https://cloud.example.test/cloud';
    const id = '537e4857-5590-42e8-8731-66441b466542';
    const teams = '/cloud/api/auth/google/start?source=teams&next=%2Fflows%2Fdeploy';
    const offOrigin = 'https://other.example.test/api/auth/google/start?source=flows&next=%2Fflows%2Fdeploy';
    expect(withFlowsJourney(teams, id)).toBe(teams);
    expect(withFlowsJourney(offOrigin, id)).toBe(offOrigin);
  });
});
