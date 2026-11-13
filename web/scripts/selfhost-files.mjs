#!/usr/bin/env node
// Keeps the public self-hosting helper files and their checksums in step.
//
//   node scripts/selfhost-files.mjs write   rewrite every SHA256SUMS and the
//                                           table in content/self-hosting/downloads.md
//   node scripts/selfhost-files.mjs check   exit 1 if either is stale
//
// The files live in public/self-hosting/files/<cloud>/ and are served at
// https://agentrelay.com/self-hosting/files/<cloud>/<file>. Install guides
// download a folder's SHA256SUMS and every file it lists, then run
// `shasum -a 256 -c SHA256SUMS`, so the sums must name files by basename.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILES_DIR = path.join(WEB_ROOT, 'public/self-hosting/files');
const DOWNLOADS = path.join(WEB_ROOT, 'content/self-hosting/downloads.md');
const BASE_URL = 'https://agentrelay.com/self-hosting/files';
const CLOUDS = [
  { dir: 'eks', label: 'AWS (EKS)', guide: '/docs/self-hosting/install-eks' },
  { dir: 'gke', label: 'Google Cloud (GKE)', guide: '/docs/self-hosting/install-gke' },
];
const START = '<!-- files:start -->';
const END = '<!-- files:end -->';

export function sumsFor(dir) {
  const folder = path.join(FILES_DIR, dir);
  return readdirSync(folder)
    .filter((name) => name !== 'SHA256SUMS' && !name.startsWith('.'))
    .sort()
    .map((name) => ({ name, sha256: createHash('sha256').update(readFileSync(path.join(folder, name))).digest('hex') }));
}

function sumsText(entries) {
  return entries.map(({ name, sha256 }) => `${sha256}  ${name}\n`).join('');
}

function table() {
  return CLOUDS.map(({ dir, label, guide }) => [
    `## ${label}`,
    '',
    `Used by [this guide](${guide}). Checksums: [\`SHA256SUMS\`](${BASE_URL}/${dir}/SHA256SUMS).`,
    '',
    '| File | SHA-256 |',
    '|---|---|',
    ...sumsFor(dir).map(({ name, sha256 }) => `| [\`${name}\`](${BASE_URL}/${dir}/${name}) | \`${sha256}\` |`),
  ].join('\n')).join('\n\n');
}

export function expected() {
  const downloads = readFileSync(DOWNLOADS, 'utf8');
  const start = downloads.indexOf(START);
  const end = downloads.indexOf(END);
  if (start === -1 || end < start) throw new Error(`${DOWNLOADS} is missing the ${START} / ${END} markers`);
  return {
    sums: Object.fromEntries(CLOUDS.map(({ dir }) => [dir, sumsText(sumsFor(dir))])),
    downloads: `${downloads.slice(0, start + START.length)}\n${table()}\n${downloads.slice(end)}`,
  };
}

function main(mode) {
  const want = expected();
  const stale = [];
  for (const { dir } of CLOUDS) {
    const file = path.join(FILES_DIR, dir, 'SHA256SUMS');
    let have = '';
    try { have = readFileSync(file, 'utf8'); } catch {}
    if (have !== want.sums[dir]) {
      if (mode === 'write') writeFileSync(file, want.sums[dir]);
      else stale.push(path.relative(WEB_ROOT, file));
    }
  }
  if (readFileSync(DOWNLOADS, 'utf8') !== want.downloads) {
    if (mode === 'write') writeFileSync(DOWNLOADS, want.downloads);
    else stale.push(path.relative(WEB_ROOT, DOWNLOADS));
  }
  if (stale.length) {
    console.error(`selfhost-files: stale ${stale.join(', ')}. Run: node scripts/selfhost-files.mjs write`);
    process.exit(1);
  }
  console.log(`selfhost-files: ${mode === 'write' ? 'written' : 'up to date'}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const mode = process.argv[2];
  if (mode !== 'write' && mode !== 'check') {
    console.error('usage: node scripts/selfhost-files.mjs write|check');
    process.exit(2);
  }
  main(mode);
}
