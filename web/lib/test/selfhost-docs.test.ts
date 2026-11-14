import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import sitemap from '../../app/sitemap';
import { getLlmsFullText, getLlmsText } from '../docs-markdown';
import {
  getSelfhostGuides,
  getSelfhostMarkdown,
  getSelfhostMarkdownFiles,
  getSelfhostStaticSlugs,
  parseSelfhostMarkdownFile,
  parseSelfhostSlug,
  SELFHOST_GUIDES,
  selfhostMarkdownFor,
} from '../selfhost-docs';
import { absoluteUrl } from '../site';

const here = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.resolve(here, '../../content/self-hosting');
const FILES_DIR = path.resolve(here, '../../public/self-hosting/files');

// Tokens that must never appear in the public guides or helper files (one
// customer's domain and install ID, our cloud account IDs, an internal test
// host). Stored as SHA-256 so this public test does not spell them out.
const FORBIDDEN_TOKEN_HASHES = new Set([
  '3105324ee8ff38102013f1a14d87c8994e1a92e1746a684c105871dfb1bf73c1',
  '5e7e09a69e30a21c1fde553f9120350df4d2c7b13c53224375a633b2f77a1e01',
  'ce37f9bb91426924dac5210c8a29b93438c064f20e9c4e0cf0698aa0781aa9ff',
  '0e34cb6c8ea09c8ef2719d466be08da1b6ade61c35f21530cc4838e049c3b803',
  'd3ac791f6b0ff525ee8d2666034209a3062c0017a4f4dbda1d042e3d3376e8d7',
]);
// Internal hostnames and links that belong nowhere public.
const FORBIDDEN_PATTERNS = [/\.rel\.[a-z0-9-]+\.agentrelay\.com/i, /gist\.github\.com/i, /\bsoc2-\d+/i];

type NextConfigShape = {
  headers: () => Promise<Array<{ source: string; headers: Array<{ key: string; value: string }> }>>;
  rewrites: () => Promise<{ afterFiles: Array<{ source: string; destination: string }> }>;
};

// next.config.mjs exports a phase function; a non-literal specifier keeps tsc
// from type-checking the plain-JS config.
async function loadNextConfig(): Promise<NextConfigShape> {
  const configPath: string = '../../next.config.mjs';
  return (await import(configPath)).default('phase-production-server');
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]
  );
}

describe('self-hosting guides content', () => {
  it('lists every guide file exactly once, with a title and description', () => {
    const files = readdirSync(CONTENT_DIR).filter((name) => name.endsWith('.md')).map((name) => name.slice(0, -3)).sort();
    expect([...SELFHOST_GUIDES.map((guide) => guide.slug), 'agents'].sort()).toEqual(files);
    for (const guide of getSelfhostGuides()) {
      expect(guide.title, guide.slug).not.toBe(guide.slug);
      expect(guide.description.length, guide.slug).toBeGreaterThan(20);
    }
  });

  it('links only to guides that exist', () => {
    const slugs = new Set(SELFHOST_GUIDES.map((guide) => guide.slug));
    for (const file of readdirSync(CONTENT_DIR)) {
      const text = readFileSync(path.join(CONTENT_DIR, file), 'utf8');
      for (const [, sub] of text.matchAll(/\]\(\/docs\/self-hosting(?:\/agents)?(?:\/([a-z0-9-]+))?(?:#[^)]*)?\)/g)) {
        if (sub) expect(slugs.has(sub), `${file} links to /docs/self-hosting/${sub}`).toBe(true);
      }
    }
  });

  it('gives every numbered install step a "Done when" check', () => {
    for (const slug of ['install-eks', 'install-gke']) {
      const source = getSelfhostGuides().find((guide) => guide.slug === slug)!.source;
      const steps = source.split(/\n(?=## \d+\. )/).filter((part) => /^## \d+\. /.test(part));
      expect(steps.length, slug).toBeGreaterThanOrEqual(15);
      for (const step of steps) {
        const heading = step.split('\n')[0];
        // Steps that only redirect to another page have nothing to check.
        if (/skip if|instead/i.test(step) && !/```/.test(step)) continue;
        expect(step, `${slug} ${heading}`).toMatch(/\*\*Done(?: when)?:?\*\*/);
      }
    }
  });

  it('names no customer, account, project or internal host in anything public', () => {
    const files = [...walk(CONTENT_DIR), ...walk(FILES_DIR)];
    expect(files.length).toBeGreaterThan(20);
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      const name = path.relative(CONTENT_DIR, file);
      for (const token of new Set(text.toLowerCase().match(/[a-z0-9]+/g) ?? [])) {
        const hash = createHash('sha256').update(token).digest('hex');
        expect(FORBIDDEN_TOKEN_HASHES.has(hash), `${name} contains a forbidden token`).toBe(false);
      }
      for (const pattern of FORBIDDEN_PATTERNS) {
        expect(pattern.test(text), `${name} matches ${pattern}`).toBe(false);
      }
    }
  });
});

describe('one source, two audiences', () => {
  const source = [
    'Intro.',
    '',
    '<!-- agent',
    'ASK THE HUMAN for approval.',
    'STOP if it fails.',
    '-->',
    '',
    '<!-- human -->',
    'Only for people.',
    '<!-- /human -->',
    '',
    'See [Upgrades](/docs/self-hosting/upgrades#eks), the [overview](/docs/self-hosting) and [rules](/docs/self-hosting/agents).',
  ].join('\n');

  it('drops agent blocks for humans', () => {
    const human = selfhostMarkdownFor(source, 'human');
    expect(human).not.toContain('ASK THE HUMAN');
    expect(human).not.toContain('<!--');
    expect(human).toContain('Only for people.');
    expect(human).toContain('(/docs/self-hosting/upgrades#eks)');
  });

  it('turns agent blocks into callouts and links to agent runbooks', () => {
    const agent = selfhostMarkdownFor(source, 'agent');
    expect(agent).toContain('> **Agent:** ASK THE HUMAN for approval.\n> STOP if it fails.');
    expect(agent).not.toContain('Only for people.');
    expect(agent).not.toContain('<!--');
    expect(agent).toContain('(/docs/self-hosting/agents/upgrades#eks)');
    expect(agent).toContain('(/docs/self-hosting/agents/overview)');
    expect(agent).toContain('(/docs/self-hosting/agents)');
  });

  it('gives every install guide agent checkpoints that never print secrets', () => {
    for (const slug of ['install-eks', 'install-gke', 'install-aks']) {
      const agent = getSelfhostMarkdown(slug, 'agent')!;
      expect(agent).toContain('> **Agent:**');
      expect(agent).toMatch(/ASK THE HUMAN/);
      expect(agent).toMatch(/Do NOT run the setup-key command/);
    }
    const rules = getSelfhostMarkdown(undefined, 'agent')!;
    expect(rules).toContain('Never print, log, paste or summarize a secret');
    expect(rules).toContain(absoluteUrl('/docs/self-hosting/agents/install-eks.md'));
  });
});

describe('self-hosting routes', () => {
  it('parses page slugs', () => {
    expect(parseSelfhostSlug(undefined)).toEqual({ kind: 'guide', slug: 'overview', audience: 'human' });
    expect(parseSelfhostSlug(['install-eks'])).toEqual({ kind: 'guide', slug: 'install-eks', audience: 'human' });
    expect(parseSelfhostSlug(['agents'])).toEqual({ kind: 'agent-index' });
    expect(parseSelfhostSlug(['agents', 'overview'])).toEqual({ kind: 'guide', slug: 'overview', audience: 'agent' });
    for (const slug of [['overview'], ['nope'], ['agents', 'nope'], ['install-eks', 'x'], ['..'], ['agents', 'agents']]) {
      expect(parseSelfhostSlug(slug), slug.join('/')).toBeNull();
    }
  });

  it('prerenders every page and every Markdown mirror', () => {
    const pages = getSelfhostStaticSlugs().map((slug) => slug.join('/'));
    expect(pages).toContain('');
    expect(pages).toContain('agents');
    expect(pages).toContain('agents/install-gke');
    expect(new Set(pages).size).toBe(pages.length);
    for (const file of getSelfhostMarkdownFiles()) {
      const parsed = parseSelfhostMarkdownFile(file.split('/'));
      expect(parsed, file).not.toBeNull();
      expect(getSelfhostMarkdown(parsed!.slug, parsed!.audience), file).toMatch(/^# /);
    }
    expect(parseSelfhostMarkdownFile(['overview.md'])).toBeNull();
    expect(parseSelfhostMarkdownFile(['agents', 'nope.md'])).toBeNull();
  });

  it('rewrites the .md URLs to the mirrors before the generic docs rule', async () => {
    const { afterFiles } = await (await loadNextConfig()).rewrites();
    const sources = afterFiles.map((rule) => rule.source);
    for (const source of [
      '/docs/self-hosting.md',
      '/docs/self-hosting/agents.md',
      '/docs/self-hosting/agents/:slug([^/]+\\.md)',
      '/docs/self-hosting/:slug([^/]+\\.md)',
    ]) {
      expect(sources.indexOf(source), source).toBeGreaterThanOrEqual(0);
      expect(sources.indexOf(source), source).toBeLessThan(sources.indexOf('/docs/:slug([^/]+\\.md)'));
    }
  });

  it('sends no private, no-store or noindex headers for the guides', async () => {
    const rules = await (await loadNextConfig()).headers();
    for (const rule of rules.filter((r) => r.source.includes('self-hosting'))) {
      for (const header of rule.headers) {
        expect(`${header.key}: ${header.value}`).not.toMatch(/no-store|noindex|private/i);
      }
    }
  });

  it('lists the human guides in the sitemap and both tracks in llms.txt', () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain(absoluteUrl('/docs/self-hosting'));
    expect(urls).toContain(absoluteUrl('/docs/self-hosting/install-eks'));
    expect(urls.filter((url) => url.includes('/docs/self-hosting/agents'))).toEqual([]);
    const llms = getLlmsText();
    expect(llms).toContain('## Self-hosting');
    expect(llms).toContain(`(${absoluteUrl('/docs/self-hosting/install-eks.md')})`);
    expect(llms).toContain(`(${absoluteUrl('/docs/self-hosting/agents.md')})`);
    expect(llms).toContain(`(${absoluteUrl('/docs/self-hosting/agents/install-gke.md')})`);
    expect(getLlmsFullText()).toContain('# Install on EKS');
  });
});

describe('downloadable helper files', () => {
  it('matches every SHA256SUMS and the downloads table', async () => {
    const scriptPath: string = '../../scripts/selfhost-files.mjs';
    const { expected } = await import(scriptPath);
    const want = expected() as { sums: Record<string, string>; downloads: string };
    for (const [dir, sums] of Object.entries(want.sums)) {
      expect(readFileSync(path.join(FILES_DIR, dir, 'SHA256SUMS'), 'utf8'), `${dir}/SHA256SUMS`).toBe(sums);
    }
    expect(readFileSync(path.join(CONTENT_DIR, 'downloads.md'), 'utf8')).toBe(want.downloads);
  });

  it('ships every file the install guides run', () => {
    const guides = Object.fromEntries(getSelfhostGuides().map((guide) => [guide.slug, guide.source]));
    for (const [dir, slug] of [['eks', 'install-eks'], ['gke', 'install-gke']]) {
      const files = readdirSync(path.join(FILES_DIR, dir));
      for (const [, script] of guides[slug].matchAll(/\bbash ([a-z0-9-]+\.sh)\b/g)) {
        expect(files, `${slug} runs ${script}`).toContain(script);
      }
      expect(files).toContain('values.yaml');
    }
  });
});
