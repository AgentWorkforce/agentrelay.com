import { describe, expect, it } from 'vitest';
import { getAllDocSlugs, getAllMarkdownDocSlugs, getHumanDocSlugs } from '../docs-nav';

import {
  currentDocsVersion,
  getDefaultDocsVersionForSlug,
  getDocsVersionForPath,
  getDocsVersionHref,
} from '../docs-versions';

describe('docs versions', () => {
  it('serves v8 at bare docs paths', () => {
    expect(currentDocsVersion).toBe('v8');
    expect(getDocsVersionForPath('/docs')).toBe('v8');
    expect(getDocsVersionForPath('/docs/sessions')).toBe('v8');
    expect(getDefaultDocsVersionForSlug('sessions')).toBe('v8');
    expect(getDocsVersionForPath('/docs/cli-messaging')).toBe('v7.1.1');
    expect(getDefaultDocsVersionForSlug('cli-messaging')).toBe('v7.1.1');
  });

  it('keeps legacy-only docs in the versioned archive', () => {
    expect(getDocsVersionForPath('/docs/7.1.1/cloud')).toBe('v7.1.1');
    expect(getDefaultDocsVersionForSlug('cloud')).toBe('v7.1.1');
    expect(getDocsVersionHref('v7.1.1', '/docs/cloud')).toBe('/docs/7.1.1/cloud');
  });

  it('maps the old v8 prefix to the current bare docs path', () => {
    expect(getDocsVersionForPath('/docs/8.0.0/sessions')).toBe('v8');
    expect(getDocsVersionHref('v8', '/docs/8.0.0/sessions')).toBe('/docs/sessions');
    expect(getDocsVersionHref('v8', '/docs/8.0.0/cli-messaging')).toBe('/docs/getting-started');
    expect(getDocsVersionHref('v7.1.1', '/docs/8.0.0/cli-messaging')).toBe('/docs/7.1.1/cli-messaging');
  });

  it('opens Getting started for current docs while keeping the archive landing page', () => {
    expect(getDocsVersionHref('v8', '/docs')).toBe('/docs/getting-started');
    expect(getDocsVersionHref('v8', '/docs/8.0.0')).toBe('/docs/getting-started');
    expect(getDocsVersionHref('v8', '/docs/quickstart')).toBe('/docs/quickstart');
    expect(getDocsVersionHref('v7.1.1', '/docs/getting-started')).toBe('/docs/7.1.1/introduction');
    expect(getDocsVersionHref('v8', '/docs/7.1.1/introduction')).toBe('/docs/getting-started');
    expect(getDocsVersionHref('v8', '/docs/introduction')).toBe('/docs/getting-started');
  });

  it('keeps Introduction as a markdown export without a human nav or search entry', () => {
    expect(getHumanDocSlugs()).not.toContain('introduction');
    expect(getAllDocSlugs()).not.toContain('introduction');
    expect(getAllMarkdownDocSlugs()).toContain('introduction');
  });
});
