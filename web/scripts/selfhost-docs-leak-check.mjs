#!/usr/bin/env node
// Proves the gated self-hosting runbooks are not in this site's build output.
//
// The runbooks live in the private relay-agent repo and reach readers only at
// request time, through Cloud, after a session and entitlement check (see
// lib/selfhost-docs.ts). This repository is public, so CI cannot hold the
// runbook text to grep for it. Instead security/selfhost-runbook-fingerprints.json
// holds truncated SHA-256 hashes of sampled 12-word windows of the runbooks:
// enough to recognise a copied passage, useless for reading one.
//
//   check [dir ...]        scan build output (default: .next and .open-next)
//                          for any fingerprinted window, prerendered gated
//                          route, or gated static asset. Exits 1 on a finding.
//   fingerprint --runbooks <relay-agent>/knowledge/private/selfhost [--ref <sha>]
//                          regenerate the fingerprint file (run by a maintainer
//                          with relay-agent access whenever the runbooks change;
//                          windows that also occur in this repo's public sources
//                          are dropped so shared commands cannot false-positive).

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FINGERPRINTS = path.join(WEB_ROOT, 'security/selfhost-runbook-fingerprints.json');
const WINDOW = 12;
const SAMPLE = 4; // keep windows whose hash ≡ 0 (mod SAMPLE)
const TEXT_EXTENSIONS = new Set(['.html', '.rsc', '.body', '.json', '.js', '.mjs', '.cjs', '.txt', '.xml', '.css', '.map', '.md', '.meta', '.segment', '.prefetch', '']);
const MAX_FILE_BYTES = 64 * 1024 * 1024;
const GATED_ROUTE = /(^|[\\/])docs[\\/]self-hosting([\\/.]|$)/;

/** Lowercase word tokens, after undoing the string escapes a bundler or RSC payload adds. */
export function tokens(text) {
  const unescaped = text
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\[nrt"'`\\/]/g, ' ');
  return unescaped.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function windowHash(words) {
  return createHash('sha256').update(words.join(' ')).digest('hex').slice(0, 16);
}

function sampled(hash) {
  return Number.parseInt(hash.slice(-4), 16) % SAMPLE === 0;
}

export function windowHashes(text, { sampleOnly = false } = {}) {
  const words = tokens(text);
  const hashes = new Set();
  for (let i = 0; i + WINDOW <= words.length; i += 1) {
    const hash = windowHash(words.slice(i, i + WINDOW));
    if (!sampleOnly || sampled(hash)) hashes.add(hash);
  }
  return hashes;
}

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Third-party code copied into the server bundle, and build caches.
      if (entry.name === 'node_modules' || full.endsWith(`${path.sep}.next${path.sep}cache`)) continue;
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

function loadFingerprints() {
  const data = JSON.parse(readFileSync(FINGERPRINTS, 'utf8'));
  if (data.window !== WINDOW || !Array.isArray(data.hashes) || data.hashes.length === 0) {
    throw new Error(`${path.relative(process.cwd(), FINGERPRINTS)} is missing or was made with different settings`);
  }
  return new Set(data.hashes);
}

/** Findings for one build directory; empty when clean. */
export function scan(dir, fingerprints) {
  const findings = [];
  for (const file of walk(dir)) {
    const rel = path.relative(dir, file);
    // A prerendered page, RSC payload or static asset under the gated route.
    // (Route source and server chunks live under server/app/docs/self-hosting/[[...slug]]/.)
    if (GATED_ROUTE.test(rel) && !/\[\[\.\.\.slug\]\]/.test(rel)) {
      findings.push(`${rel}: build output under the gated /docs/self-hosting route`);
      continue;
    }
    if (!TEXT_EXTENSIONS.has(path.extname(file))) continue;
    if (statSync(file).size > MAX_FILE_BYTES) continue;
    const words = tokens(readFileSync(file, 'utf8'));
    for (let i = 0; i + WINDOW <= words.length; i += 1) {
      const hash = windowHash(words.slice(i, i + WINDOW));
      if (sampled(hash) && fingerprints.has(hash)) {
        findings.push(`${rel}: contains private runbook text (window ${hash})`);
        break;
      }
    }
  }
  // The prerender manifest must not list a gated route.
  const manifest = path.join(dir, 'prerender-manifest.json');
  if (existsSync(manifest)) {
    const routes = Object.keys(JSON.parse(readFileSync(manifest, 'utf8')).routes ?? {});
    for (const route of routes.filter((r) => r.startsWith('/docs/self-hosting'))) {
      findings.push(`prerender-manifest.json: ${route} is prerendered`);
    }
  }
  return findings;
}

function check(dirs) {
  const fingerprints = loadFingerprints();
  const targets = (dirs.length ? dirs : ['.next', '.open-next']).map((d) => path.resolve(d)).filter((d) => existsSync(d));
  if (targets.length === 0) {
    console.error('selfhost-docs-leak-check: no build output found (.next or .open-next). Build first.');
    process.exit(2);
  }
  let findings = [];
  for (const dir of targets) {
    const found = scan(dir, fingerprints);
    console.log(`selfhost-docs-leak-check: scanned ${path.relative(process.cwd(), dir) || dir}: ${found.length} finding(s)`);
    findings = findings.concat(found.map((f) => `${path.basename(dir)}/${f}`));
  }
  if (findings.length) {
    for (const finding of findings) console.error(`  ${finding}`);
    console.error('Private self-hosting runbook content must never be in the build. See lib/selfhost-docs.ts.');
    process.exit(1);
  }
  console.log(`selfhost-docs-leak-check: clean (${fingerprints.size} fingerprints).`);
}

function publicSourceHashes() {
  const hashes = new Set();
  for (const sub of ['app', 'components', 'content', 'lib', 'public']) {
    for (const file of walk(path.join(WEB_ROOT, sub))) {
      if (!TEXT_EXTENSIONS.has(path.extname(file)) && !/\.(tsx?|mdx|svg)$/.test(file)) continue;
      for (const hash of windowHashes(readFileSync(file, 'utf8'))) hashes.add(hash);
    }
  }
  return hashes;
}

function fingerprint(args) {
  const runbooksAt = args.indexOf('--runbooks');
  const refAt = args.indexOf('--ref');
  const dir = runbooksAt >= 0 ? args[runbooksAt + 1] : undefined;
  if (!dir || !existsSync(dir)) {
    console.error('usage: selfhost-docs-leak-check.mjs fingerprint --runbooks <relay-agent>/knowledge/private/selfhost [--ref <sha>]');
    process.exit(2);
  }
  const publicHashes = publicSourceHashes();
  const hashes = new Set();
  const files = readdirSync(dir).filter((name) => name.endsWith('.md')).sort();
  for (const name of files) {
    for (const hash of windowHashes(readFileSync(path.join(dir, name), 'utf8'), { sampleOnly: true })) {
      if (!publicHashes.has(hash)) hashes.add(hash);
    }
  }
  const output = {
    description: 'Truncated SHA-256 of sampled 12-word windows of relay-agent knowledge/private/selfhost. Used only by scripts/selfhost-docs-leak-check.mjs.',
    source: 'AgentWorkforce/relay-agent knowledge/private/selfhost',
    ref: refAt >= 0 ? args[refAt + 1] : null,
    files: files.length,
    window: WINDOW,
    sample: SAMPLE,
    hashes: [...hashes].sort(),
  };
  writeFileSync(FINGERPRINTS, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`wrote ${hashes.size} fingerprints from ${files.length} runbooks to ${path.relative(process.cwd(), FINGERPRINTS)}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [command = 'check', ...rest] = process.argv.slice(2);
  if (command === 'check') check(rest);
  else if (command === 'fingerprint') fingerprint(rest);
  else {
    console.error(`unknown command: ${command}`);
    process.exit(2);
  }
}
