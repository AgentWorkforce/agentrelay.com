#!/usr/bin/env node
// Copies the runtime image assets that scoped components fetch by absolute URL
// into the bundle root, so the paths resolve in previews and in built designs.
//
// `lib/integration-logos.ts` returns `/integration-logos/<file>` and the
// components render it as a plain <img src>. The design project has no
// `public/` tree, so without this the marks 404 and every IntegrationGrid /
// IntegrationLogos render shows broken images.
//
// `package-build.mjs` wipes the output dir, so this must run AFTER every build.
// agent-art is deliberately NOT copied: 15 MB of committed artwork is content,
// not design system, and those components have a gradient fallback.

import { cpSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] ?? join(REPO, 'ds-bundle');

const src = join(REPO, 'web', 'public', 'integration-logos');
if (!existsSync(src)) {
  console.error(`[ASSETS] ${src} missing — nothing to copy`);
  process.exit(1);
}
if (!existsSync(OUT)) {
  console.error(`[ASSETS] ${OUT} missing — run package-build.mjs first`);
  process.exit(1);
}

const dest = join(OUT, 'integration-logos');
cpSync(src, dest, { recursive: true });
console.error(`[ASSETS] integration-logos → ${dest} (${readdirSync(dest).length} files)`);
