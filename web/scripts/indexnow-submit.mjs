#!/usr/bin/env node
// Submit changed URLs to IndexNow (Bing, Yandex, Seznam, Naver, DuckDuckGo).
//
// IndexNow is a "this changed, please recrawl" ping — NOT a sitemap replacement
// and NOT used by Google. We therefore submit only the delta for a deploy.
//
// Certainty comes from a committed snapshot of the last deploy's published URL
// set (indexnow-state.json). Each run:
//   1. current = the URL set from the freshly deployed sitemap.xml (authoritative)
//   2. added   = current − snapshot                         (new pages — certain)
//   3. changed = URLs from this deploy's git diff that already existed
//                (content edits don't change the URL set, so the snapshot diff
//                 alone can't see them)
//   4. submit added ∪ changed, then rewrite the snapshot for the workflow to
//      commit back. Anything submitted is always intersected with `current`, so
//      we never ping a 404 / unpublished / dynamic route.
//
// Usage:
//   node scripts/indexnow-submit.mjs <beforeSha> <afterSha>
//
// Env:
//   INDEXNOW_KEY   (required) the key, also hosted at /<key>.txt
//   SITE_URL       (optional) defaults to https://agentrelay.com
//   STATE_FILE     (optional) defaults to ./indexnow-state.json (cwd = web/)
//   DRY_RUN        (optional) "1"/"true" → log the payload, don't POST or write

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const SITE_URL = (process.env.SITE_URL || 'https://agentrelay.com').replace(/\/$/, '');
const HOST = new URL(SITE_URL).host;
const KEY = process.env.INDEXNOW_KEY;
const STATE_FILE = process.env.STATE_FILE || 'indexnow-state.json';
const DRY_RUN = /^(1|true)$/i.test(process.env.DRY_RUN || '');
const ENDPOINT = 'https://api.indexnow.org/indexnow';
// IndexNow caps a single submission at 10k URLs.
const MAX_URLS = 10000;

function fail(msg) {
  console.error(`indexnow: ${msg}`);
  process.exit(1);
}

if (!KEY) {
  // Expected on forks / non-production runs where the var isn't exposed. Exit 0
  // so the (continue-on-error) step stays green rather than showing a red X.
  console.log('indexnow: INDEXNOW_KEY is not set — skipping.');
  process.exit(0);
}

const [, , beforeArg, afterArg] = process.argv;
const after = afterArg || 'HEAD';
// On the first push to a branch GitHub passes an all-zero "before" SHA; fall
// back to the single-commit diff so we still catch that deploy's content edits.
const ZERO = '0000000000000000000000000000000000000000';
const before = !beforeArg || beforeArg === ZERO ? `${after}~1` : beforeArg;

function changedFiles() {
  try {
    return execFileSync('git', ['diff', '--name-only', `${before}..${after}`], {
      encoding: 'utf8',
    })
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  } catch (err) {
    // A missing range (shallow clone, rewritten history) shouldn't break the
    // run — the snapshot diff still catches new pages. Just skip "changed".
    console.warn(`indexnow: git diff ${before}..${after} failed (${err.message}); skipping changed-page detection.`);
    return [];
  }
}

// Map a repo-relative changed file to the public path(s) it affects. Paths are
// relative to the repo root (git diff emits root-relative paths from any cwd).
function pathsForFile(file) {
  // Blog + docs content mirror the route tree: content/<x>.mdx -> /<x>
  let m = file.match(/^web\/content\/(blog\/.+|docs\/.+)\.mdx$/);
  if (m) return [`/${m[1]}`];

  // Static app routes: app/<route>/page.(tsx|mdx) -> /<route>. Skip dynamic
  // segments ([slug]) — those are covered by their content files above.
  m = file.match(/^web\/app\/(.+)\/page\.(tsx|mdx)$/);
  if (m && !m[1].includes('[')) return [`/${m[1]}`];

  if (/^web\/app\/page\.tsx$/.test(file)) return ['/'];

  // The /agents catalog is data-driven (lib/agents.ts): a change there can
  // touch every agent page. Signal "all /agents URLs"; the intersection with
  // the live sitemap below narrows it to what's actually published.
  if (file === 'web/lib/agents.ts') return ['__AGENTS__'];

  return [];
}

async function fetchSitemapUrls() {
  let res;
  try {
    res = await fetch(`${SITE_URL}/sitemap.xml`, {
      headers: { 'user-agent': 'agentrelay-indexnow/1.0' },
    });
  } catch (err) {
    fail(`could not reach ${SITE_URL}/sitemap.xml: ${err.message}`);
  }
  if (!res.ok) fail(`could not fetch sitemap.xml (${res.status})`);
  const xml = await res.text();
  const urls = new Set();
  for (const match of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
    urls.add(match[1].trim());
  }
  if (urls.size === 0) fail('sitemap.xml contained no <loc> entries');
  return urls;
}

function readSnapshot() {
  if (!existsSync(STATE_FILE)) return new Set();
  try {
    const data = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
    return new Set(Array.isArray(data.urls) ? data.urls : []);
  } catch (err) {
    fail(`could not parse ${STATE_FILE}: ${err.message}`);
  }
}

function writeSnapshot(urls) {
  const data = {
    host: HOST,
    count: urls.length,
    // Sorted for stable diffs / clean review of the committed file.
    urls: [...urls].sort(),
  };
  writeFileSync(STATE_FILE, `${JSON.stringify(data, null, 2)}\n`);
}

// ── 1. authoritative current set ────────────────────────────────────────────
const current = await fetchSitemapUrls();

// ── 2. new pages: certain, from the committed snapshot ───────────────────────
const snapshot = readSnapshot();
const bootstrap = snapshot.size === 0;
const added = [...current].filter((u) => !snapshot.has(u));

// ── 3. edited existing pages: from this deploy's git diff ─────────────────────
const files = changedFiles();
const wantAllAgents = files.some((f) => pathsForFile(f).includes('__AGENTS__'));
const changedCandidates = new Set(
  files
    .flatMap(pathsForFile)
    .filter((p) => p && p !== '__AGENTS__')
    // Build URLs the same way sitemap.ts does (new URL against the origin) so
    // they match the sitemap exactly — including the homepage's trailing slash.
    .map((p) => new URL(p, SITE_URL).toString()),
);
if (wantAllAgents) {
  for (const u of current) if (u.startsWith(`${SITE_URL}/agents/`)) changedCandidates.add(u);
}
// Only existing, still-published URLs (added ones are already covered above).
const changed = [...changedCandidates].filter((u) => current.has(u) && snapshot.has(u));

// ── 4. submit the union, then persist the new snapshot ───────────────────────
const removed = [...snapshot].filter((u) => !current.has(u));
if (removed.length) console.log(`indexnow: ${removed.length} URL(s) no longer in sitemap (not auto-submitted): ${removed.join(', ')}`);

const urlList = [...new Set([...added, ...changed])];

if (bootstrap) {
  console.log(`indexnow: no prior snapshot — bootstrapping. Announcing all ${urlList.length} published URL(s) once; future deploys submit only the delta.`);
}

if (urlList.length === 0) {
  console.log('indexnow: no new or changed URLs to submit.');
  // Snapshot already matches current (no added/removed) — nothing to persist.
  if (removed.length && !DRY_RUN) writeSnapshot([...current]);
  process.exit(0);
}

console.log(`indexnow: submitting ${urlList.length} URL(s):`);
for (const u of urlList) console.log(`  ${u}`);

if (DRY_RUN) {
  console.log('indexnow: DRY_RUN set — not posting or writing snapshot.');
  process.exit(0);
}

// Split into IndexNow's per-request limit so nothing is silently dropped (and
// never recorded as submitted when it wasn't).
const batches = [];
for (let i = 0; i < urlList.length; i += MAX_URLS) batches.push(urlList.slice(i, i + MAX_URLS));

for (let i = 0; i < batches.length; i++) {
  const batch = batches[i];
  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${SITE_URL}/${KEY}.txt`, urlList: batch }),
    });
  } catch (err) {
    fail(`could not reach IndexNow endpoint: ${err.message}`);
  }
  // 200 = accepted, 202 = accepted/validation pending. Both are success.
  if (res.status !== 200 && res.status !== 202) {
    const body = await res.text().catch(() => '');
    fail(`endpoint returned ${res.status}: ${body}`);
  }
  console.log(`indexnow: batch ${i + 1}/${batches.length} ok (${res.status}, ${batch.length} URL(s)).`);
}

// Persist the authoritative current set only after every batch was accepted, so
// nothing is marked submitted unless it actually was.
writeSnapshot([...current]);
