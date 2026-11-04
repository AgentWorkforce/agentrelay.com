import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

type LeakCheck = {
  scan(dir: string, fingerprints: Set<string>): string[];
  windowHashes(text: string, options?: { sampleOnly?: boolean }): Set<string>;
};

// Untyped .mjs script; load it as a plain module (its CLI only runs as main).
async function loadLeakCheck(): Promise<LeakCheck> {
  const scriptPath: string = '../../scripts/selfhost-docs-leak-check.mjs';
  return import(scriptPath);
}

// A stand-in runbook passage; the real runbooks never enter this repository.
const PASSAGE = [
  'Before the upgrade, place relayhistory in write hold so no session batch lands',
  'between the snapshot and the schema migration, then confirm the hold with the',
  'status endpoint and record the snapshot name in the change ticket before you continue.',
].join('\n');

const dirs: string[] = [];
function buildDir(files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'selfhost-leak-'));
  dirs.push(dir);
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    writeFileSync(path.join(dir, name), text);
  }
  return dir;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('selfhost docs leak check', () => {
  it('finds a runbook passage embedded as an escaped string in a bundle', async () => {
    const { scan, windowHashes } = await loadLeakCheck();
    const fingerprints = windowHashes(PASSAGE, { sampleOnly: true });
    expect(fingerprints.size).toBeGreaterThan(0);
    const dir = buildDir({
      'server/chunks/123.js': `var a=${JSON.stringify(`# Upgrades\n\n${PASSAGE}\n`)};`,
      'static/chunks/app.js': 'console.log("public docs only");',
    });
    const findings = scan(dir, fingerprints);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatch(/^server\/chunks\/123\.js: contains private runbook text/);
  });

  it('flags prerendered output or assets under the gated route, but not its route code', async () => {
    const { scan } = await loadLeakCheck();
    const dir = buildDir({
      'server/app/docs/self-hosting.html': '<html></html>',
      'assets/docs/self-hosting/upgrades.rsc': 'x',
      'server/app/docs/self-hosting/[[...slug]]/page.js': 'export default function Page(){}',
      'prerender-manifest.json': JSON.stringify({ routes: { '/docs/flows': {}, '/docs/self-hosting/upgrades': {} } }),
    });
    const findings = scan(dir, new Set(['0000000000000000']));
    expect(findings.sort()).toEqual([
      'assets/docs/self-hosting/upgrades.rsc: build output under the gated /docs/self-hosting route',
      'prerender-manifest.json: /docs/self-hosting/upgrades is prerendered',
      'server/app/docs/self-hosting.html: build output under the gated /docs/self-hosting route',
    ]);
  });

  it('is clean for public output', async () => {
    const { scan, windowHashes } = await loadLeakCheck();
    const dir = buildDir({ 'server/app/docs/flows.html': '<p>Flows run agent workflows on a schedule or a webhook.</p>' });
    expect(scan(dir, windowHashes(PASSAGE, { sampleOnly: true }))).toEqual([]);
  });

  it('ships a fingerprint file made with the checker settings', () => {
    const data = JSON.parse(readFileSync(new URL('../../security/selfhost-runbook-fingerprints.json', import.meta.url), 'utf8'));
    expect(data.window).toBe(12);
    expect(data.hashes.length).toBeGreaterThan(500);
    for (const hash of data.hashes.slice(0, 50)) expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });
});
