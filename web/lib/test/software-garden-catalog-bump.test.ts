import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  BUMP_BRANCH,
  CATALOG_PATH,
  DOCS_PATH,
  MANIFEST_PATH,
  SOURCE_ROWS_PATH,
  addSourceRow,
  planCatalogBump,
  pinnedGardenVersion,
  renderCatalogEdit,
  renderDocsEdit,
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
const V3_SHA = sha256(read(V3_PATH));

type Pin = { catalogVersion: number; garden: number; ref: string; sha256: string };
// Fixed points in the catalog's history. Published versions and recorded rows
// never change, so these fixtures hold however far the live pin has moved.
const AT_5: Pin = { catalogVersion: 5, garden: 1, ...V1 };
const AT_6: Pin = { catalogVersion: 6, garden: 3, ref: V3_REF, sha256: V3_SHA };

function replaceOnce(text: string, from: RegExp | string, to: string) {
  const matches = typeof from === 'string' ? text.split(from).length - 1 : (text.match(new RegExp(from, 'g')) ?? []).length;
  expect(matches, String(from)).toBe(1);
  return text.replace(from, to);
}

/**
 * The checked-in catalog, rows, docs and manifest rewound to `pin`: the pin's
 * values, rows up to its catalogVersion, and a manifest whose latest is
 * `latest` (default: the pinned version).
 */
function stateAt(pin: Pin, latest = pin.garden) {
  const catalog = read(CATALOG_PATH).toString('utf8');
  const parsed = JSON.parse(catalog);
  const source = parsed.flows.find((flow: { id: string }) => flow.id === 'software-factory').source;
  const file = `web/public/flows/software-garden/v${pin.garden}.flow.ts`;
  let catalogText = replaceOnce(catalog, /"catalogVersion": \d+,/, `"catalogVersion": ${pin.catalogVersion},`);
  catalogText = replaceOnce(catalogText, /("id": "software-factory",\n\s*"kind": "flow",\n\s*"version": )\d+,/, `$1${pin.catalogVersion},`);
  catalogText = catalogText
    .replaceAll(source.ref, pin.ref)
    .replaceAll(source.path, file)
    .replace(`"release": "${source.release}"`, `"release": "software-garden-v${pin.garden}"`)
    .replace(`"sha256": "${source.sha256}"`, `"sha256": "${pin.sha256}"`);

  const rowsText = read(SOURCE_ROWS_PATH).toString('utf8')
    .replace(/^ {6}(\d+): '[0-9a-f:]+',\n/gm, (row, version) => (Number(version) > pin.catalogVersion ? '' : row));

  let docsText = read(DOCS_PATH).toString('utf8');
  docsText = replaceOnce(docsText, /`catalogVersion: \d+`/, `\`catalogVersion: ${pin.catalogVersion}\``);
  docsText = replaceOnce(docsText, /`software-garden-v\d+`/, `\`software-garden-v${pin.garden}\``);
  docsText = replaceOnce(docsText, /\/web\/public\/flows\/software-garden\/v\d+\.flow\.ts/, `/${file}`);

  const manifest = JSON.parse(read(MANIFEST_PATH).toString('utf8'));
  manifest.versions = manifest.versions.filter((entry: { version: number }) => entry.version <= latest);
  manifest.version = latest;
  manifest.sha256 = manifest.versions.at(-1).sha256;
  return { catalogText, rowsText, docsText, manifestText: JSON.stringify(manifest, null, 2) };
}

const landed = {
  firstAddedCommit: (file: string) => (file === V3_PATH ? V3_REF : null),
  fileAt: (_ref: string, file: string) => read(file),
};

function plan(state: ReturnType<typeof stateAt>, overrides: Partial<Parameters<typeof planCatalogBump>[0]> = {}) {
  return planCatalogBump({ ...state, ...landed, ...overrides });
}

describe('proposing the Software Garden catalog bump', () => {
  it('reports the pin as current when the catalog serves the latest published version', () => {
    expect(plan(stateAt(AT_6))).toMatchObject({ status: 'current', version: 3, catalogVersion: 6 });
  });

  it('reproduces the v3 pin (catalogVersion 6) exactly from a tree pinned to v1', () => {
    const result = plan(stateAt(AT_5, 3));
    expect(result).toMatchObject({
      status: 'bump', from: 1, to: 3, catalogVersion: 6, ref: V3_REF, sha256: V3_SHA, path: V3_PATH,
    });
    if (result.status !== 'bump') throw new Error('expected a bump');
    const expected = stateAt(AT_6);
    expect(result.files).toEqual({
      [CATALOG_PATH]: expected.catalogText,
      [SOURCE_ROWS_PATH]: expected.rowsText,
      [DOCS_PATH]: expected.docsText,
    });
  });

  it('moves on from v3 the same way when the next version is published', () => {
    const bytes = Buffer.from('// Software Garden v4\n');
    const state = stateAt(AT_6);
    const manifest = JSON.parse(state.manifestText);
    manifest.versions.push({ version: 4, sha256: sha256(bytes) });
    Object.assign(manifest, { version: 4, sha256: sha256(bytes) });
    const v4Ref = 'c'.repeat(40);
    const result = plan({ ...state, manifestText: JSON.stringify(manifest) }, {
      firstAddedCommit: (file: string) => (file.endsWith('/v4.flow.ts') ? v4Ref : null),
      fileAt: () => bytes,
    });
    if (result.status !== 'bump') throw new Error('expected a bump');
    expect(result).toMatchObject({ from: 3, to: 4, catalogVersion: 7, ref: v4Ref });
    const catalog = JSON.parse(result.files[CATALOG_PATH]);
    expect(catalog.catalogVersion).toBe(7);
    expect(catalog.flows[0]).toMatchObject({ version: 7, source: { release: 'software-garden-v4', ref: v4Ref, sha256: sha256(bytes) } });
    expect(catalog.flows[1]).toEqual(JSON.parse(state.catalogText).flows[1]);
    expect(result.files[SOURCE_ROWS_PATH]).toContain(`      7: '${v4Ref}:${sha256(bytes)}',\n    };`);
    expect(result.files[DOCS_PATH]).toContain('`catalogVersion: 7`');
    expect(result.files[DOCS_PATH]).toContain('`software-garden-v4`');
  });

  it('refuses a version that has not landed on the base branch', () => {
    expect(() => plan(stateAt(AT_5, 3), { firstAddedCommit: () => null })).toThrow(/has not landed/);
  });

  it('refuses when the bytes at the landing commit are not the published digest', () => {
    expect(() => plan(stateAt(AT_5, 3), { fileAt: () => Buffer.from('edited') })).toThrow(/manifest records/);
  });

  it('refuses a manifest whose latest version is not recorded in its history', () => {
    const state = stateAt(AT_5, 3);
    const manifest = JSON.parse(state.manifestText);
    manifest.versions.pop();
    expect(() => plan({ ...state, manifestText: JSON.stringify(manifest) })).toThrow(/not a published version/);
  });

  it('reads the pinned version from a release that agrees with the path', () => {
    const catalog = JSON.parse(stateAt(AT_6).catalogText);
    expect(pinnedGardenVersion(catalog)).toBe(3);
    catalog.flows[0].source.release = 'software-garden-v2';
    expect(() => pinnedGardenVersion(catalog)).toThrow(/does not match/);
  });
});

describe('editing the catalog, the source rows and the docs', () => {
  it('edits only the pin, keeping the hand-written formatting', () => {
    const { catalogText } = stateAt(AT_5);
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
    const state = stateAt(AT_5, 3);
    const catalogText = state.catalogText.replace('"schemaVersion": 1,', `"schemaVersion": 1,\n  "mirror": { "sha256": "${V1.sha256}" },`);
    expect(() => plan({ ...state, catalogText })).toThrow(/source\.sha256 must appear exactly once/);
  });

  it('adds a row once, accepts the same row again, and refuses a conflicting one', () => {
    const { rowsText } = stateAt(AT_5);
    const added = addSourceRow(rowsText, 6, V3_REF, V3_SHA);
    expect(added).toBe(stateAt(AT_6).rowsText);
    expect(addSourceRow(added, 6, V3_REF, V3_SHA)).toBe(added);
    expect(() => addSourceRow(added, 6, V1.ref, V1.sha256)).toThrow(/already records/);
    expect(() => addSourceRow(added, 5, V3_REF, V1.sha256)).toThrow(/already records/);
    expect(() => addSourceRow(rowsText, 9, V3_REF, V1.sha256)).toThrow(/must follow/);
  });

  it('keeps the docs naming the catalogVersion and Software Garden version the catalog serves', () => {
    // A manual pin move must update the docs too, or the next automated move
    // cannot find the values it rewrites.
    const catalog = JSON.parse(read(CATALOG_PATH).toString('utf8'));
    const version = pinnedGardenVersion(catalog);
    const docs = read(DOCS_PATH).toString('utf8');
    expect(docs).toContain(`\`catalogVersion: ${catalog.catalogVersion}\``);
    expect(docs).toContain(`\`software-garden-v${version}\``);
    expect(docs).toContain(`/web/public/flows/software-garden/v${version}.flow.ts`);
    expect(() => renderDocsEdit(docs, { catalogVersion: catalog.catalogVersion, version }, { catalogVersion: catalog.catalogVersion + 1, version: version + 1 })).not.toThrow();
    expect(() => renderDocsEdit(docs, { catalogVersion: 99, version }, { catalogVersion: 100, version })).toThrow(/catalogVersion must appear exactly once/);
  });
});

type Call = { command: string; args: string[] };

/** The git subcommand and its arguments, past any leading `-c key=value` options. */
function subcommand(args: string[]) {
  let index = 0;
  while (args[index] === '-c') index += 2;
  return args.slice(index);
}

function fakeExec(responses: Record<string, string>) {
  const calls: Call[] = [];
  const exec = async (command: string, args: string[]) => {
    calls.push({ command, args });
    const key = [command, ...(command === 'git' ? subcommand(args) : args)].join(' ');
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
  plan: bump, exec, repository: 'AgentWorkforce/agentrelay.com', token, checks: ['npm test'],
});
const leaksToken = (calls: Call[]) => calls.some(call => call.args.some(arg => arg.includes(token)));
const pushed = (calls: Call[]) => calls.some(call => call.command === 'git' && subcommand(call.args)[0] === 'push');
const gh = (calls: Call[], verb: string) => calls.filter(call => call.command === 'gh' && call.args[1] === verb);

describe('opening the bump pull request', () => {
  it('pushes the branch and opens a pull request when none is open', async () => {
    const { calls, exec } = fakeExec({ 'git rev-parse HEAD^{tree}': 'local-tree\n', 'gh pr list': '[]' });
    await expect(sync(exec)).resolves.toMatchObject({ action: 'created', pushed: true });
    expect(pushed(calls)).toBe(true);
    expect(gh(calls, 'create')).toHaveLength(1);
    expect(gh(calls, 'create')[0].args).toEqual(expect.arrayContaining(['--base', 'main', '--head', BUMP_BRANCH]));
    expect(calls.some(call => call.args.includes('merge') || call.args.includes('--auto'))).toBe(false);
    expect(leaksToken(calls)).toBe(false);
    const push = calls.find(call => call.args.includes('push'))!;
    expect(push.args).toContain('https://github.com/AgentWorkforce/agentrelay.com.git');
    expect(push.args.join(' ')).toContain('password=$GH_TOKEN');
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
      // As if git's transport diagnostics echoed the credential it was given.
      if (command === 'git' && subcommand(args)[0] === 'push') throw new Error(`fatal: unable to access https://x-access-token:${token}@github.com/`);
      return command === 'gh' ? '[]' : '';
    };
    const error = await sync(exec).catch((caught: Error) => caught);
    expect(error).toBeInstanceOf(Error);
    expect(String((error as Error).message)).not.toContain(token);
    expect(String((error as Error).message)).toContain('***');
  });
});
