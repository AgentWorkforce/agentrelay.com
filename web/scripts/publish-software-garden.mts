/**
 * Publish the generator's current Software Garden as the next immutable
 * version under public/flows/software-garden/ (agentrelay.com#174).
 *
 *   cd web && npx -y tsx@4 scripts/publish-software-garden.mts
 *
 * A published version is never rewritten: when the generator output changes,
 * this writes v<N+1>.flow.ts and moves the manifest to it. The catalog keeps
 * serving whichever version it pins until that pin is moved deliberately.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SOFTWARE_GARDEN_ARTIFACT_DIR,
  SOFTWARE_GARDEN_DRAFT,
  softwareGardenArtifactPath,
  softwareGardenArtifactUrl,
  softwareGardenSource,
} from '../lib/software-garden-artifact';

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(web, SOFTWARE_GARDEN_ARTIFACT_DIR, 'manifest.json');
const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null;
const versions: Array<{ version: number; sha256: string }> = previous?.versions ?? [];

const source = softwareGardenSource();
const sha256 = createHash('sha256').update(source).digest('hex');
if (previous?.sha256 === sha256) {
  console.log(`Software Garden v${previous.version} is current (sha256:${sha256}).`);
  process.exit(0);
}

const version = (previous?.version ?? 0) + 1;
const file = path.join(web, softwareGardenArtifactPath(version));
if (existsSync(file)) throw new Error(`${softwareGardenArtifactPath(version)} already exists; published versions are immutable.`);
mkdirSync(path.dirname(file), { recursive: true });
writeFileSync(file, source);
writeFileSync(manifestPath, JSON.stringify({
  name: 'Software Garden',
  catalogId: 'software-factory',
  version,
  sha256,
  bytes: Buffer.byteLength(source),
  path: `web/${softwareGardenArtifactPath(version)}`,
  url: softwareGardenArtifactUrl(version),
  target: 'cloud',
  draft: SOFTWARE_GARDEN_DRAFT,
  versions: [...versions, { version, sha256 }],
}, null, 2) + '\n');
console.log(`Published Software Garden v${version} (sha256:${sha256}).`);
