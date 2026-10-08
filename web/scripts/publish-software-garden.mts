/**
 * Publish the generator's current Software Garden as the next immutable
 * version under public/flows/software-garden/ (agentrelay.com#174).
 *
 *   cd web && npx -y tsx@4 scripts/publish-software-garden.mts
 *
 * A published version is never rewritten: when the generator output changes,
 * this writes v<N+1>.flow.ts and moves the manifest to it. The catalog keeps
 * serving whichever version it pins until that pin is moved deliberately.
 * Output that returns to an earlier version's bytes is still a new version.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SOFTWARE_GARDEN_ARTIFACT_DIR,
  SOFTWARE_GARDEN_DRAFT,
  softwareGardenArtifactPath,
  softwareGardenArtifactUrl,
  softwareGardenSource,
} from '../lib/software-garden-artifact';

type Manifest = { version: number; sha256: string; versions: Array<{ version: number; sha256: string }> };

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(web, SOFTWARE_GARDEN_ARTIFACT_DIR, 'manifest.json');
const previous: Manifest | null = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null;
const versions = previous?.versions ?? [];
const digest = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
// Written beside the target and renamed over it, so an interrupted publish
// never leaves a truncated manifest or version file behind.
const writeAtomically = (target: string, text: string) => {
  const staged = `${target}.${process.pid}.tmp`;
  writeFileSync(staged, text);
  renameSync(staged, target);
};

// Every published file must still be what the manifest recorded before
// anything new is cut; a missing or edited version is an error, not current.
for (const entry of versions) {
  const file = path.join(web, softwareGardenArtifactPath(entry.version));
  if (!existsSync(file) || digest(readFileSync(file)) !== entry.sha256) {
    throw new Error(`${softwareGardenArtifactPath(entry.version)} is missing or no longer hashes to ${entry.sha256}; restore it from git.`);
  }
}

const source = softwareGardenSource();
const sha256 = digest(source);
const unchanged = previous?.sha256 === sha256;
const version = unchanged ? previous!.version : (previous?.version ?? 0) + 1;
const file = path.join(web, softwareGardenArtifactPath(version));
if (!unchanged) {
  // A file with no manifest entry is left by a publish interrupted before the
  // manifest was written. It is reused only when it holds exactly these bytes.
  if (existsSync(file) && digest(readFileSync(file)) !== sha256) {
    throw new Error(`${softwareGardenArtifactPath(version)} exists with other bytes and no manifest entry; remove it and publish again.`);
  }
  mkdirSync(path.dirname(file), { recursive: true });
  writeAtomically(file, source);
}
// Rewritten even when the bytes are unchanged, so a draft change the source
// does not serialize (such as filters Cloud applies) is still recorded.
writeAtomically(manifestPath, JSON.stringify({
  name: 'Software Garden',
  catalogId: 'software-factory',
  version,
  sha256,
  bytes: Buffer.byteLength(source),
  path: `web/${softwareGardenArtifactPath(version)}`,
  url: softwareGardenArtifactUrl(version),
  target: 'cloud',
  draft: SOFTWARE_GARDEN_DRAFT,
  versions: unchanged ? versions : [...versions, { version, sha256 }],
}, null, 2) + '\n');
console.log(`${unchanged ? 'Current' : 'Published'}: Software Garden v${version} (sha256:${sha256}).`);
