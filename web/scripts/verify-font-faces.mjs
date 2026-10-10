#!/usr/bin/env node
// Post-build check: the self-hosted Inter italic face in app/globals.css must
// share its family name with the upright face next/font generates. If they
// diverge, italic text silently falls back to synthesized oblique.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const cssDir = new URL('../.next/static/', import.meta.url).pathname;

function cssFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return cssFiles(path);
    return entry.name.endsWith('.css') ? [path] : [];
  });
}

const faces = cssFiles(cssDir).flatMap((file) =>
  [...readFileSync(file, 'utf8').matchAll(/@font-face\s*{([^}]*)}/g)].map(([, body]) => ({
    family: body.match(/font-family:\s*["']?([^;"'}]+)/)?.[1].trim(),
    style: body.match(/font-style:\s*(\w+)/)?.[1] ?? 'normal',
    src: body.match(/src:\s*([^;}]+)/)?.[1] ?? '',
  })),
);

const upright = faces.find((f) => f.style === 'normal' && f.src.includes('/_next/static/media/') && f.family === 'Inter');
const italic = faces.find((f) => f.style === 'italic' && f.src.includes('/fonts/inter-italic-latin.woff2'));

if (!italic) {
  console.error('verify-font-faces: Inter italic @font-face not found in built CSS.');
  process.exit(1);
}
if (!upright) {
  const families = [...new Set(faces.map((f) => f.family))].join(', ');
  console.error(`verify-font-faces: next/font no longer emits an upright face named 'Inter' (found: ${families}).`);
  console.error("Update the italic @font-face family in app/globals.css to match.");
  process.exit(1);
}
console.log(`verify-font-faces: Inter italic shares family '${italic.family}' with next/font's upright face.`);
