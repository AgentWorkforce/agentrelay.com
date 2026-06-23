import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Read-only access to the MDX under `content/` (docs + blog), resolved without
 * any filesystem access at runtime.
 *
 * The Cloudflare Workers runtime has no filesystem (OpenNext polyfills `node:fs`
 * with stubs that throw), so the docs/blog content must be embedded in the
 * bundle at build time. Under webpack (`next build --webpack`) we use
 * `require.context`, which inlines every matching file as a raw string (the
 * next.config rule loads `content/**\/*.mdx` as `asset/source`). Under vite/node
 * — i.e. the vitest suite — `require.context` does not exist, so we fall back to
 * reading the real files from disk. Both paths expose the same API.
 */

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.resolve(moduleDir, '../content');

/* eslint-disable @typescript-eslint/no-explicit-any */
// `require.context` is a webpack-only construct; declare it so TS accepts the
// literal call that webpack statically detects and replaces at build time.
declare const require: any;

let bundled: Map<string, string> | null = null;

try {
  const ctx = require.context('../content', true, /\.mdx$/, 'sync');
  bundled = new Map<string, string>(
    ctx.keys().map((key: string) => {
      const value = ctx(key);
      const raw = typeof value === 'string' ? value : value.default;
      return [key.replace(/^\.\//, ''), raw as string];
    })
  );
} catch {
  // No webpack context (vite/node test run) — fall back to filesystem reads.
  bundled = null;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Read a content file by its path relative to `content/`, e.g. `docs/quickstart.mdx`. */
export function readContentFile(relPath: string): string | null {
  if (bundled) {
    return bundled.get(relPath) ?? null;
  }
  const filePath = path.join(CONTENT_DIR, relPath);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
}

/** True if a content file exists at the given path relative to `content/`. */
export function contentFileExists(relPath: string): boolean {
  if (bundled) {
    return bundled.has(relPath);
  }
  return fs.existsSync(path.join(CONTENT_DIR, relPath));
}

/**
 * List the file names directly under a content subdirectory (non-recursive),
 * e.g. `listContentFiles('blog')` → `['post-a.mdx', 'post-b.mdx']`.
 */
export function listContentFiles(dir: string): string[] {
  const prefix = dir.endsWith('/') ? dir : `${dir}/`;
  if (bundled) {
    const out: string[] = [];
    for (const rel of bundled.keys()) {
      if (rel.startsWith(prefix)) {
        const rest = rel.slice(prefix.length);
        if (!rest.includes('/')) out.push(rest);
      }
    }
    return out;
  }
  const dirPath = path.join(CONTENT_DIR, dir);
  return fs.existsSync(dirPath) ? fs.readdirSync(dirPath) : [];
}
