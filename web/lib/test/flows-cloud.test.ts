import { afterEach, describe, expect, it } from 'vitest';
import { flowsGoogleAuthHref } from '../flows-cloud';

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
});
