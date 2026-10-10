import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  BUMP_BRANCH,
  CATALOG_PATH,
  MANIFEST_PATH,
  SOURCE_ROWS_PATH,
  addSourceRow,
  planCatalogBump,
  pinnedGardenVersion,
  renderCatalogEdit,
  syncPullRequest,
} from '../../scripts/propose-software-garden-catalog-bump.mjs';

const root = path.resolve(__dirname, '../../..');
const read = (relative: string) => readFileSync(path.join(root, relative));
const sha256 = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');

const V1 = {
  ref: 'e3f5442652edd7651225fd1f5435f0e65378ec4b',
  sha256: 'b89a36e2cf9054036a7fc53fba20011a42ef0275ffbaaa907b080738ab46ad27',
};
const V3_REF = 'b6125bfdba33e15b4ad68c9d431fe5630c0894d7';
const V3_PATH = 'web/public/flows/software-garden/v3.flow.ts';

/** The tree as it was before the pin moved to v3: catalogVersion 5, v1, no row 6. */
function pinnedToV1() {
  const catalog = read(CATALOG_PATH).toString('utf8');
  const current = JSON.parse(catalog).flows.find((flow: { id: string }) => flow.id === 'software-factory').source;
  const catalogText = catalog
    .replace('"catalogVersion": 6,', '"catalogVersion": 5,')
    .replace('"version": 6,', '"version": 5,')
    .replaceAll(current.ref, V1.ref)
    .replaceAll(current.path, 'web/public/flows/software-garden/v1.flow.ts')
    .replace(current.release, 'software-garden-v1')
    .replace(current.sha256, V1.sha256);
  const rows = read(SOURCE_ROWS_PATH).toString('utf8');
  const rowsText = rows.replace(/^ {6}6: '[0-9a-f:]+',\n/m, '');
  expect(catalogText).not.toBe(catalog);
  expect(rowsText).not.toBe(rows);
  return { catalogText, rowsText };
}

const realGit = {
  firstAddedCommit: (file: string) => (file === V3_PATH ? V3_REF : null),
  fileAt: (_ref: string, file: string) => read(file),
};

function plan(overrides: Partial<Parameters<typeof planCatalogBump>[0]> = {}) {
  return planCatalogBump({
    catalogText: read(CATALOG_PATH).toString('utf8'),
    manifestText: read(MANIFEST_PATH).toString('utf8'),
    rowsText: read(SOURCE_ROWS_PATH).toString('utf8'),
    ...realGit,
    ...overrides,
  });
}

describe('proposing the Software Garden catalog bump', () => {
  it('reports the pin as current when the catalog serves the latest published version', () => {
    expect(plan()).toMatchObject({ status: 'current', version: 3, catalogVersion: 6 });
  });

  it('reproduces the v3 pin exactly from a tree pinned to v1', () => {
    const result = plan(pinnedToV1());
    expect(result).toMatchObject({
      status: 'bump',
      from: 1,
      to: 3,
      catalogVersion: 6,
      ref: V3_REF,
      sha256: sha256(read(V3_PATH)),
      path: V3_PATH,
    });
    if (result.status !== 'bump') throw new Error('expected a bump');
    expect(result.files[CATALOG_PATH]).toBe(read(CATALOG_PATH).toString('utf8'));
    expect(result.files[SOURCE_ROWS_PATH]).toBe(read(SOURCE_ROWS_PATH).toString('utf8'));
  });

  it('refuses a version that has not landed on the base branch', () => {
    expect(() => plan({ ...pinnedToV1(), firstAddedCommit: () => null })).toThrow(/has not landed/);
  });

  it('refuses when the bytes at the landing commit are not the published digest', () => {
    expect(() => plan({ ...pinnedToV1(), fileAt: () => Buffer.from('edited') })).toThrow(/manifest records/);
  });

  it('refuses a manifest whose latest version is not recorded in its history', () => {
    const manifest = JSON.parse(read(MANIFEST_PATH).toString('utf8'));
    manifest.versions.pop();
    expect(() => plan({ ...pinnedToV1(), manifestText: JSON.stringify(manifest) })).toThrow(/not a published version/);
  });

  it('reads the pinned version from a release that agrees with the path', () => {
    const catalog = JSON.parse(read(CATALOG_PATH).toString('utf8'));
    expect(pinnedGardenVersion(catalog)).toBe(3);
    catalog.flows[0].source.release = 'software-garden-v2';
    expect(() => pinnedGardenVersion(catalog)).toThrow(/does not match/);
  });
});

describe('editing the catalog and the source rows', () => {
  it('edits only the pin, keeping the hand-written formatting', () => {
    const { catalogText } = pinnedToV1();
    const next = JSON.parse(catalogText);
    next.catalogVersion = 6;
    const edited = renderCatalogEdit(catalogText, next);
    const changed = edited.split('\n').filter((line: string, index: number) => line !== catalogText.split('\n')[index]);
    expect(changed).toEqual(['  "catalogVersion": 6,']);
    // Anything beyond the Software Garden pin is not this script's to change.
    next.flows[1].name = 'Renamed';
    expect(() => renderCatalogEdit(catalogText, next)).toThrow(/cannot be expressed/);
  });

  it('refuses to edit a catalog where a pinned value is ambiguous', () => {
    const { catalogText } = pinnedToV1();
    const doubled = catalogText.replace('"schemaVersion": 1,', `"schemaVersion": 1,\n  "mirror": { "sha256": "${V1.sha256}" },`);
    expect(() => planCatalogBump({
      catalogText: doubled,
      manifestText: read(MANIFEST_PATH).toString('utf8'),
      rowsText: pinnedToV1().rowsText,
      ...realGit,
    })).toThrow(/source\.sha256 must appear exactly once/);
  });

  it('adds a row once, accepts the same row again, and refuses a conflicting one', () => {
    const { rowsText } = pinnedToV1();
    const added = addSourceRow(rowsText, 6, V3_REF, sha256(read(V3_PATH)));
    expect(added).toBe(read(SOURCE_ROWS_PATH).toString('utf8'));
    expect(addSourceRow(added, 6, V3_REF, sha256(read(V3_PATH)))).toBe(added);
    expect(() => addSourceRow(added, 6, V1.ref, V1.sha256)).toThrow(/already records/);
    expect(() => addSourceRow(added, 5, V3_REF, V1.sha256)).toThrow(/already records/);
    expect(() => addSourceRow(rowsText, 9, V3_REF, V1.sha256)).toThrow(/must follow/);
  });
});

type Call = { command: string; args: string[] };

function fakeExec(responses: Record<string, string>) {
  const calls: Call[] = [];
  const exec = async (command: string, args: string[]) => {
    calls.push({ command, args });
    const key = [command, ...args].join(' ');
    const match = Object.keys(responses).find(prefix => key.startsWith(prefix));
    return match === undefined ? '' : responses[match];
  };
  return { calls, exec };
}

const bump = {
  status: 'bump' as const,
  from: 1,
  to: 3,
  catalogVersion: 6,
  ref: V3_REF,
  sha256: 'a'.repeat(64),
  path: V3_PATH,
  files: {},
};
const token = 'ghs_secret_value';
const sync = (exec: ReturnType<typeof fakeExec>['exec']) => syncPullRequest({
  plan: bump, exec, repository: 'AgentWorkforce/agentrelay.com', base: 'main', token, checks: ['npm test'],
});
const pushed = (calls: Call[]) => calls.some(call => call.command === 'git' && call.args[0] === 'push');
const gh = (calls: Call[], verb: string) => calls.filter(call => call.command === 'gh' && call.args[1] === verb);

describe('opening the bump pull request', () => {
  it('pushes the branch and opens a pull request when none is open', async () => {
    const { calls, exec } = fakeExec({ 'git rev-parse HEAD^{tree}': 'local-tree\n', 'gh pr list': '[]' });
    await expect(sync(exec)).resolves.toMatchObject({ action: 'created', pushed: true });
    expect(pushed(calls)).toBe(true);
    expect(gh(calls, 'create')).toHaveLength(1);
    expect(gh(calls, 'create')[0].args).toEqual(expect.arrayContaining(['--base', 'main', '--head', BUMP_BRANCH]));
    expect(calls.some(call => call.args.includes('merge') || call.args.includes('--auto'))).toBe(false);
  });

  it('updates the open pull request in place when the branch already carries this edit', async () => {
    const { calls, exec } = fakeExec({
      'git ls-remote': `${'b'.repeat(40)}\trefs/heads/${BUMP_BRANCH}\n`,
      'git rev-parse HEAD^{tree}': 'same-tree\n',
      'git rev-parse FETCH_HEAD^{tree}': 'same-tree\n',
      'gh pr list': '[{"number":7,"url":"https://github.com/AgentWorkforce/agentrelay.com/pull/7"}]',
    });
    await expect(sync(exec)).resolves.toMatchObject({ action: 'updated', pushed: false, number: 7 });
    expect(pushed(calls)).toBe(false);
    expect(gh(calls, 'create')).toHaveLength(0);
    expect(gh(calls, 'edit')).toHaveLength(1);
  });

  it('force-updates the branch when a newer version supersedes the open pull request', async () => {
    const { calls, exec } = fakeExec({
      'git ls-remote': `${'b'.repeat(40)}\trefs/heads/${BUMP_BRANCH}\n`,
      'git rev-parse HEAD^{tree}': 'new-tree\n',
      'git rev-parse FETCH_HEAD^{tree}': 'old-tree\n',
      'gh pr list': '[{"number":7,"url":"https://github.com/AgentWorkforce/agentrelay.com/pull/7"}]',
    });
    await expect(sync(exec)).resolves.toMatchObject({ action: 'updated', pushed: true, number: 7 });
    expect(gh(calls, 'edit')).toHaveLength(1);
  });

  it('never surfaces the token in an error', async () => {
    const exec = async (command: string, args: string[]) => {
      if (command === 'git' && args[0] === 'push') throw new Error(`failed: ${args.join(' ')}`);
      return command === 'gh' ? '[]' : '';
    };
    const error = await sync(exec).catch((caught: Error) => caught);
    expect(error).toBeInstanceOf(Error);
    expect(String((error as Error).message)).not.toContain(token);
    expect(String((error as Error).message)).toContain('***');
  });
});
