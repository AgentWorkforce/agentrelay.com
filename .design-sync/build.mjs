#!/usr/bin/env node
// The build entry point for this repo. Use this, never `package-build.mjs`
// directly.
//
// `package-build.mjs` rewrites the output directory and preserves only its own
// outputs, so it deletes `ds-bundle/integration-logos/` every run. Components
// load those marks by absolute URL, so a build followed by a capture silently
// produces blank tiles while any existing grade still reads green — the grade
// file and the artifact disagree and nothing in the pipeline notices. That
// regression happened four times before this wrapper existed.
//
// Ordering that matters: build -> copy assets -> capture -> upload, with no
// build after the copy.
//
//   node .design-sync/build.mjs --config .design-sync/config.json \
//     --node-modules ./node_modules --out ./ds-bundle

import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const outIdx = argv.indexOf('--out');
const OUT = outIdx >= 0 ? argv[outIdx + 1] : join(REPO, 'ds-bundle');

const build = spawnSync(process.execPath, [join(REPO, '.ds-sync/package-build.mjs'), ...argv], {
  stdio: 'inherit',
  cwd: REPO,
});
if (build.status !== 0) process.exit(build.status ?? 1);

const assets = spawnSync(process.execPath, [join(REPO, '.design-sync/copy-assets.mjs'), OUT], {
  stdio: 'inherit',
  cwd: REPO,
});
process.exit(assets.status ?? 1);
