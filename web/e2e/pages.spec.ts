import { expect, test } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { getAllDocSlugs, getAllLegacyDocSlugs } from '../lib/docs-nav';

const appDir = path.resolve(process.cwd(), 'app');
const contentDir = path.resolve(process.cwd(), 'content');

function filesIn(dir: string, filename: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) return filesIn(absolutePath, filename);
    return entry.name === filename ? [absolutePath] : [];
  });
}

function mdxSlugs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.mdx'))
    .map((entry) => entry.name.slice(0, -4));
}

function staticPageRoutes(): string[] {
  return filesIn(appDir, 'page.tsx')
    .map((file) => path.relative(appDir, path.dirname(file)))
    .filter((route) => !route.includes('['))
    .map((route) => (route ? `/${route}` : '/'));
}

function agentSlugs(): string[] {
  const source = readFileSync(path.resolve(process.cwd(), 'lib/agents.ts'), 'utf8');
  return [...source.matchAll(/slug: '([^']+)'/g)].map((match) => match[1]);
}

function pageRoutes(): string[] {
  const currentDocs = getAllDocSlugs();
  const legacyDocs = getAllLegacyDocSlugs();
  const productDocs = ['agents', 'file', 'loop'].flatMap((product) =>
    mdxSlugs(path.join(contentDir, `docs/${product}`)).map((slug) => `/docs/${product}/${slug}`),
  );

  const dynamicRoutes = [
    ...mdxSlugs(path.join(contentDir, 'blog')).map((slug) => `/blog/${slug}`),
    ...agentSlugs().map((slug) => `/agents/${slug}`),
    ...[...new Set([...currentDocs, ...legacyDocs])].map((slug) => `/docs/${slug}`),
    ...legacyDocs.map((slug) => `/docs/7.1.1/${slug}`),
    ...currentDocs.map((slug) => `/docs/8.0.0/${slug}`),
    ...legacyDocs.map((slug) => `/docs/pre-v8/${slug}`),
    ...productDocs,
    '/openclaw/skill/invite/rk_live_smoke_test',
  ];

  return [...new Set([...staticPageRoutes(), ...dynamicRoutes])].sort();
}

test.describe.configure({ mode: 'parallel' });

for (const route of pageRoutes()) {
  test(`${route} renders visible page content`, async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));

    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });

    expect(response, 'navigation should return an HTTP response').not.toBeNull();
    expect(response!.status(), 'page should not return an HTTP error').toBeLessThan(400);
    const body = page.locator('body');
    await expect(body).toBeVisible();
    expect((await body.innerText()).trim().length, 'page should render meaningful visible text').toBeGreaterThan(100);
    await expect(page).toHaveTitle(/\S+/);
    await expect(page.locator('body')).not.toContainText('Application error');
    expect(pageErrors, 'page should hydrate without uncaught browser errors').toEqual([]);
  });
}
