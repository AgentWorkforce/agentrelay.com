#!/usr/bin/env node
// Submit changed URLs to IndexNow (Bing, Yandex, Seznam, Naver, DuckDuckGo).
//
// IndexNow is a "this changed, please recrawl" ping — NOT a sitemap replacement
// and NOT used by Google. We therefore submit only the delta for a deploy, never
// the whole site. Candidate URLs are derived from the files changed between two
// commits, then intersected with the live sitemap.xml so we never submit a 404
// or an unpublished/dynamic route.
//
// Usage:
//   node scripts/indexnow-submit.mjs <beforeSha> <afterSha>
//
// Env:
//   INDEXNOW_KEY   (required) the key, also hosted at /<key>.txt
//   SITE_URL       (optional) defaults to https://agentrelay.com
//   DRY_RUN        (optional) if "1"/"true", log the payload but don't POST

import { execFileSync } from 'node:child_process';

const SITE_URL = (process.env.SITE_URL || 'https://agentrelay.com').replace(/\/$/, '');
const HOST = new URL(SITE_URL).host;
const KEY = process.env.INDEXNOW_KEY;
const DRY_RUN = /^(1|true)$/i.test(process.env.DRY_RUN || '');
const ENDPOINT = 'https://api.indexnow.org/indexnow';

function fail(msg) {
  console.error(`indexnow: ${msg}`);
  process.exit(1);
}

if (!KEY) fail('INDEXNOW_KEY is not set — skipping. (set it as a repo variable)');

const [, , beforeArg, afterArg] = process.argv;
const after = afterArg || 'HEAD';
// On the first push to a branch GitHub passes an all-zero "before" SHA; fall
// back to the single-commit diff so we still submit that deploy's changes.
const ZERO = '0000000000000000000000000000000000000000';
const before = !beforeArg || beforeArg === ZERO ? `${after}~1` : beforeArg;

function changedFiles() {
  try {
    const out = execFileSync('git', ['diff', '--name-only', `${before}..${after}`], {
      encoding: 'utf8',
    });
    return out.split('\n').map((l) => l.trim()).filter(Boolean);
  } catch (err) {
    fail(`git diff ${before}..${after} failed: ${err.message}`);
  }
}

// Map a repo-relative changed file to the public URL path(s) it affects.
// Paths here are relative to the repo root (the workflow runs from there).
function pathsForFile(file) {
  // Blog + docs content mirror the route tree: content/<x>.mdx -> /<x>
  let m = file.match(/^web\/content\/(blog\/.+|docs\/.+)\.mdx$/);
  if (m) return [`/${m[1]}`];

  // Static app routes: app/<route>/page.(tsx|mdx) -> /<route>. Skip dynamic
  // segments ([slug]) — those are covered by their content files above.
  m = file.match(/^web\/app\/(.+)\/page\.(tsx|mdx)$/);
  if (m && !m[1].includes('[')) return [`/${m[1]}`];

  // Root page.
  if (/^web\/app\/page\.tsx$/.test(file)) return ['/'];

  // The /agents catalog is data-driven (lib/agents.ts), so a change there can
  // touch every agent page. Signal "all /agents URLs" and let the sitemap
  // intersection narrow it to what's actually published.
  if (file === 'web/lib/agents.ts') return ['__AGENTS__'];

  return [];
}

async function fetchSitemapUrls() {
  const res = await fetch(`${SITE_URL}/sitemap.xml`, {
    headers: { 'user-agent': 'agentrelay-indexnow/1.0' },
  });
  if (!res.ok) fail(`could not fetch sitemap.xml (${res.status})`);
  const xml = await res.text();
  const urls = new Set();
  for (const match of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
    urls.add(match[1].trim());
  }
  return urls;
}

const files = changedFiles();
if (files.length === 0) {
  console.log('indexnow: no changed files in range — nothing to submit.');
  process.exit(0);
}

const wantAllAgents = files.some((f) => pathsForFile(f).includes('__AGENTS__'));
const candidatePaths = new Set(
  files.flatMap(pathsForFile).filter((p) => p && p !== '__AGENTS__'),
);

const sitemapUrls = await fetchSitemapUrls();
const submit = new Set();

for (const path of candidatePaths) {
  const url = `${SITE_URL}${path}`;
  if (sitemapUrls.has(url)) submit.add(url);
  else console.log(`indexnow: skip (not in sitemap): ${url}`);
}

if (wantAllAgents) {
  for (const url of sitemapUrls) {
    if (url.startsWith(`${SITE_URL}/agents/`)) submit.add(url);
  }
}

const urlList = [...submit];
if (urlList.length === 0) {
  console.log('indexnow: no publishable changed URLs — nothing to submit.');
  process.exit(0);
}

const payload = {
  host: HOST,
  key: KEY,
  keyLocation: `${SITE_URL}/${KEY}.txt`,
  urlList,
};

console.log(`indexnow: submitting ${urlList.length} URL(s):`);
for (const u of urlList) console.log(`  ${u}`);

if (DRY_RUN) {
  console.log('indexnow: DRY_RUN set — not posting.');
  process.exit(0);
}

const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify(payload),
});

// 200 = accepted, 202 = accepted/validation pending. Both are success.
if (res.status === 200 || res.status === 202) {
  console.log(`indexnow: ok (${res.status}).`);
} else {
  const body = await res.text().catch(() => '');
  fail(`endpoint returned ${res.status}: ${body}`);
}
