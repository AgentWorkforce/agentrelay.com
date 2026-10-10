/**
 * Move the recommended-flow catalog's Software Garden pin to the latest
 * published version, and open (never merge) the pull request that does it.
 *
 *   node web/scripts/propose-software-garden-catalog-bump.mjs            # report only
 *   node web/scripts/propose-software-garden-catalog-bump.mjs --write    # edit the files
 *   node web/scripts/propose-software-garden-catalog-bump.mjs --open-pr  # edit, check, open or update the PR
 *
 * Options: --root <dir> reads and writes the files under another tree (a
 * scratch copy); --git <dir> runs git there (default: --root); --base <ref>
 * is the branch a version must have landed on (default: origin/main).
 *
 * publish-software-garden.mts cuts v<N>.flow.ts and moves the manifest. The
 * catalog keeps serving the version it pins until the pin moves, and Cloud
 * only upgrades an activation onto a different source from an older
 * catalogVersion. So a move pins the commit where v<N> first landed on main,
 * the digest of those bytes, advances catalogVersion and the entry's version,
 * and records the new source in software-garden-artifact.test.ts.
 */
import { execFile, execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual, parseArgs, promisify } from 'node:util';

export const CATALOG_PATH = 'web/data/recommended-flow-catalog.v1.json';
export const MANIFEST_PATH = 'web/public/flows/software-garden/manifest.json';
export const SOURCE_ROWS_PATH = 'web/lib/test/software-garden-artifact.test.ts';
export const BUMP_BRANCH = 'automation/software-garden-catalog-bump';
export const DEFAULT_CHECKS = Object.freeze([
  'npm run verify:recommended-flows',
  'npm test',
  'npm --workspace web exec -- tsc --noEmit',
]);
const FLOW_ID = 'software-factory';
const OWNER = 'AgentWorkforce';
const REPO = 'agentrelay.com';
const SOURCE_KEYS = ['path', 'release', 'ref', 'url', 'rawUrl', 'sha256'];
const ROWS = /( *)const SOURCE_BY_CATALOG_VERSION: Record<number, string> = \{\n((?: *\d+: '[0-9a-f]{40}:[0-9a-f]{64}',\n)*)( *)\};/;

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export const gardenArtifactPath = version => `web/public/flows/software-garden/v${version}.flow.ts`;

function gardenEntry(catalog) {
  const entry = catalog?.flows?.find(flow => flow.id === FLOW_ID);
  if (!entry?.source) throw new Error(`${CATALOG_PATH} has no ${FLOW_ID} source`);
  return entry;
}

/** The Software Garden version the catalog serves, from a release and path that agree. */
export function pinnedGardenVersion(catalog) {
  const { source } = gardenEntry(catalog);
  const version = Number(/^software-garden-v([1-9][0-9]*)$/.exec(source.release ?? '')?.[1]);
  if (!Number.isSafeInteger(version) || source.path !== gardenArtifactPath(version)) {
    throw new Error(`${FLOW_ID} release ${source.release} does not match its path ${source.path}`);
  }
  return version;
}

function pinnedSource(version, ref, sha256) {
  const file = gardenArtifactPath(version);
  return {
    path: file,
    release: `software-garden-v${version}`,
    ref,
    url: `https://github.com/${OWNER}/${REPO}/blob/${ref}/${file}`,
    rawUrl: `https://raw.githubusercontent.com/${OWNER}/${REPO}/${ref}/${file}`,
    sha256,
  };
}

function replaceOnce(text, from, to, label) {
  const first = text.indexOf(from);
  if (first === -1 || text.indexOf(from, first + from.length) !== -1) {
    throw new Error(`${CATALOG_PATH}: ${label} must appear exactly once to be edited`);
  }
  return text.slice(0, first) + to + text.slice(first + from.length);
}

/**
 * Rewrite only the pin's values in the hand-formatted catalog, then prove the
 * text parses to exactly `next`; anything else is not this script's change.
 */
export function renderCatalogEdit(catalogText, next) {
  const before = JSON.parse(catalogText);
  let text = catalogText;
  if (before.catalogVersion !== next.catalogVersion) {
    text = replaceOnce(text, `"catalogVersion": ${before.catalogVersion},`, `"catalogVersion": ${next.catalogVersion},`, 'catalogVersion');
  }
  const was = gardenEntry(before);
  const now = gardenEntry(next);
  if (was.version !== now.version) {
    const entryStart = text.indexOf(`"id": "${FLOW_ID}",`);
    const from = `"version": ${was.version},`;
    const at = text.indexOf(from, entryStart);
    if (entryStart === -1 || at === -1) throw new Error(`${CATALOG_PATH}: ${FLOW_ID} version must be editable`);
    text = text.slice(0, at) + `"version": ${now.version},` + text.slice(at + from.length);
  }
  for (const key of SOURCE_KEYS) {
    if (was.source[key] === now.source[key]) continue;
    text = replaceOnce(text, `"${key}": ${JSON.stringify(was.source[key])}`, `"${key}": ${JSON.stringify(now.source[key])}`, `source.${key}`);
  }
  if (!isDeepStrictEqual(JSON.parse(text), next)) {
    throw new Error(`${CATALOG_PATH}: the requested change cannot be expressed as a Software Garden pin edit`);
  }
  return text;
}

/** Record which source a catalogVersion served; rows only ever append. */
export function addSourceRow(rowsText, catalogVersion, ref, sha256) {
  const match = ROWS.exec(rowsText);
  if (!match) throw new Error(`${SOURCE_ROWS_PATH}: SOURCE_BY_CATALOG_VERSION was not found`);
  const [, , body, closingIndent] = match;
  const rows = [...body.matchAll(/^( *)(\d+): '([0-9a-f]{40}:[0-9a-f]{64})',$/gm)];
  const value = `${ref}:${sha256}`;
  const existing = rows.find(row => Number(row[2]) === catalogVersion);
  if (existing) {
    if (existing[3] === value) return rowsText;
    throw new Error(`${SOURCE_ROWS_PATH} already records catalogVersion ${catalogVersion} as ${existing[3]}`);
  }
  if (rows.some(row => row[3] === value)) {
    throw new Error(`${SOURCE_ROWS_PATH} already records ${value} at an earlier catalogVersion`);
  }
  const latest = Math.max(0, ...rows.map(row => Number(row[2])));
  if (catalogVersion !== latest + 1) {
    throw new Error(`${SOURCE_ROWS_PATH}: catalogVersion ${catalogVersion} must follow ${latest}`);
  }
  const indent = rows.at(-1)?.[1] ?? `${closingIndent}  `;
  const end = match.index + match[0].length - `${closingIndent}};`.length;
  return rowsText.slice(0, end) + `${indent}${catalogVersion}: '${value}',\n` + rowsText.slice(end);
}

/**
 * Decide whether the catalog's pin trails the manifest and, if it does,
 * produce the edited files. `firstAddedCommit(path)` names the commit where a
 * path first landed on the base branch (or null); `fileAt(ref, path)` returns
 * that file's bytes at a commit.
 */
export function planCatalogBump({ catalogText, manifestText, rowsText, firstAddedCommit, fileAt }) {
  const catalog = JSON.parse(catalogText);
  const manifest = JSON.parse(manifestText);
  const pinned = pinnedGardenVersion(catalog);
  const latest = manifest.version;
  if (!Number.isSafeInteger(latest) || latest < 1) throw new Error(`${MANIFEST_PATH}: version must be a positive integer`);
  if (latest <= pinned) return { status: 'current', version: pinned, catalogVersion: catalog.catalogVersion };

  const published = manifest.versions?.find(entry => entry.version === latest);
  if (!published || published.sha256 !== manifest.sha256) {
    throw new Error(`${MANIFEST_PATH}: v${latest} is not a published version with sha256 ${manifest.sha256}`);
  }
  const file = gardenArtifactPath(latest);
  const ref = firstAddedCommit(file);
  if (!ref) throw new Error(`${file} has not landed on the base branch yet`);
  if (!/^[0-9a-f]{40}$/.test(ref)) throw new Error(`${file}: ${ref} is not a full commit SHA`);
  const sha256 = digest(fileAt(ref, file));
  if (sha256 !== published.sha256) {
    throw new Error(`${file} at ${ref} hashes to ${sha256}, but the manifest records ${published.sha256}`);
  }

  const next = structuredClone(catalog);
  next.catalogVersion = catalog.catalogVersion + 1;
  const entry = gardenEntry(next);
  entry.version += 1;
  Object.assign(entry.source, pinnedSource(latest, ref, sha256));
  return {
    status: 'bump',
    from: pinned,
    to: latest,
    catalogVersion: next.catalogVersion,
    ref,
    sha256,
    path: file,
    files: {
      [CATALOG_PATH]: renderCatalogEdit(catalogText, next),
      [SOURCE_ROWS_PATH]: addSourceRow(rowsText, next.catalogVersion, ref, sha256),
    },
  };
}

export function pullRequestTitle(plan) {
  return `chore(flows): pin Software Garden v${plan.to} in the recommended catalog (catalogVersion ${plan.catalogVersion})`;
}

export function pullRequestBody(plan, checks) {
  const source = pinnedSource(plan.to, plan.ref, plan.sha256);
  return `## Summary

Software Garden v${plan.to} is published (\`${MANIFEST_PATH}\`), but the recommended-flow catalog still pins v${plan.from}. This moves the pin, generated by \`web/scripts/propose-software-garden-catalog-bump.mjs\` from the *Propose Software Garden catalog bump* workflow.

| Field | Value |
| --- | --- |
| \`catalogVersion\` | ${plan.catalogVersion} |
| \`path\` | \`${source.path}\` |
| \`release\` | \`${source.release}\` |
| \`ref\` | \`${source.ref}\` (the commit where v${plan.to} first landed on main) |
| \`sha256\` | \`${source.sha256}\` |
| \`rawUrl\` | ${source.rawUrl} |

The entry's \`version\` advances with \`catalogVersion\`, and \`SOURCE_BY_CATALOG_VERSION\` in \`${SOURCE_ROWS_PATH}\` records the new source, because Cloud refuses to upgrade an activation onto a different source at the same catalogVersion.

## Checks run by the workflow before opening this PR

${checks.map(check => `- \`${check}\` passed`).join('\n')}

\`verify:recommended-flows\` fetched the raw URL above and matched its bytes to the \`sha256\`.

## Known limitation

This pull request is opened with the workflow's \`GITHUB_TOKEN\`, and GitHub does not start other workflows for events that token causes, so **CI does not run on it automatically**. Before review, a maintainer starts it: run the *CI* workflow on \`${BUMP_BRANCH}\` from the Actions tab (\`gh workflow run test.yml --ref ${BUMP_BRANCH}\`), or close and reopen this pull request.

The workflow only opens and updates this pull request; it never merges it. It needs the usual two reviews.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
`;
}

/**
 * Commit the edit on BUMP_BRANCH, push it only when its tree differs from
 * what the branch already carries, and create or update the one open PR.
 */
export async function syncPullRequest({ plan, exec, repository, base, token, checks, bodyFile }) {
  const redact = text => (token ? String(text).split(token).join('***') : String(text));
  const run = async (command, args) => {
    try {
      return await exec(command, args);
    } catch (error) {
      throw new Error(redact(error?.message ?? error));
    }
  };
  const remote = `https://x-access-token:${token}@github.com/${repository}.git`;
  const title = pullRequestTitle(plan);

  await run('git', ['checkout', '-B', BUMP_BRANCH]);
  await run('git', ['add', '--', CATALOG_PATH, SOURCE_ROWS_PATH]);
  await run('git', ['-c', 'user.name=github-actions[bot]', '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com',
    'commit', '-m', `${title}\n\nGenerated by web/scripts/propose-software-garden-catalog-bump.mjs.`]);

  const localTree = (await run('git', ['rev-parse', 'HEAD^{tree}'])).trim();
  const listed = (await run('git', ['ls-remote', remote, `refs/heads/${BUMP_BRANCH}`])).trim();
  let remoteTree = null;
  if (listed) {
    await run('git', ['fetch', '--no-tags', remote, `refs/heads/${BUMP_BRANCH}`]);
    remoteTree = (await run('git', ['rev-parse', 'FETCH_HEAD^{tree}'])).trim();
  }
  const pushed = remoteTree !== localTree;
  if (pushed) await run('git', ['push', '--force', remote, `HEAD:refs/heads/${BUMP_BRANCH}`]);

  const body = pullRequestBody(plan, checks);
  const file = bodyFile ?? path.join(mkdtempSync(path.join(tmpdir(), 'garden-bump-')), 'body.md');
  writeFileSync(file, body);
  try {
    const open = JSON.parse((await run('gh', ['pr', 'list', '--repo', repository, '--head', BUMP_BRANCH, '--base', base,
      '--state', 'open', '--json', 'number,url'])) || '[]');
    if (open.length > 0) {
      const [{ number, url }] = open;
      await run('gh', ['pr', 'edit', String(number), '--repo', repository, '--title', title, '--body-file', file]);
      return { action: 'updated', pushed, number, url };
    }
    const url = (await run('gh', ['pr', 'create', '--repo', repository, '--base', base, '--head', BUMP_BRANCH,
      '--title', title, '--body-file', file])).trim();
    return { action: 'created', pushed, url };
  } finally {
    if (!bodyFile) rmSync(path.dirname(file), { recursive: true, force: true });
  }
}

const execFileAsync = promisify(execFile);

// Synchronous so planCatalogBump stays a plain function; git output here is small.
function realGit(gitDir, baseRef) {
  const git = (args, encoding = 'utf8') => execFileSync('git', args, { cwd: gitDir, encoding, maxBuffer: 16 * 1024 * 1024 });
  return {
    firstAddedCommit: file => {
      const commits = git(['log', '--diff-filter=A', '--format=%H', baseRef, '--', file]).trim().split('\n').filter(Boolean);
      return commits.at(-1) ?? null;
    },
    fileAt: (ref, file) => git(['show', `${ref}:${file}`], 'buffer'),
  };
}

async function main() {
  const { values } = parseArgs({
    options: {
      write: { type: 'boolean', default: false },
      'open-pr': { type: 'boolean', default: false },
      root: { type: 'string' },
      git: { type: 'string' },
      base: { type: 'string', default: 'origin/main' },
    },
  });
  const root = path.resolve(values.root ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '../..'));
  const gitDir = path.resolve(values.git ?? root);
  const read = file => readFileSync(path.join(root, file), 'utf8');
  const plan = planCatalogBump({
    catalogText: read(CATALOG_PATH),
    manifestText: read(MANIFEST_PATH),
    rowsText: read(SOURCE_ROWS_PATH),
    ...realGit(gitDir, values.base),
  });
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `status=${plan.status}\n`);

  if (plan.status === 'current') {
    console.log(`Software Garden pin is current: v${plan.version} at catalogVersion ${plan.catalogVersion}.`);
    return;
  }
  console.log(`Software Garden v${plan.to} is published but the catalog pins v${plan.from}:`);
  console.log(`  catalogVersion ${plan.catalogVersion}, ${plan.path} at ${plan.ref}, sha256 ${plan.sha256}`);
  if (!values.write && !values['open-pr']) return;

  for (const [file, text] of Object.entries(plan.files)) writeFileSync(path.join(root, file), text);
  console.log(`Wrote ${Object.keys(plan.files).join(', ')}.`);
  if (!values['open-pr']) return;

  const token = process.env.GH_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY ?? `${OWNER}/${REPO}`;
  if (!token) throw new Error('--open-pr needs GH_TOKEN');
  // The checks never see the token.
  const { GH_TOKEN: _token, GITHUB_TOKEN: _github, ...checkEnv } = process.env;
  for (const check of DEFAULT_CHECKS) {
    console.log(`$ ${check}`);
    await new Promise((resolve, reject) => {
      const child = spawn(check, { cwd: root, env: checkEnv, shell: true, stdio: 'inherit' });
      child.on('error', reject);
      child.on('exit', code => (code === 0 ? resolve() : reject(new Error(`${check} exited ${code}`))));
    });
  }
  const exec = async (command, args) => (await execFileAsync(command, args, {
    cwd: gitDir, env: process.env, maxBuffer: 16 * 1024 * 1024,
  })).stdout;
  const result = await syncPullRequest({
    plan, exec, repository, base: values.base.replace(/^origin\//, ''), token, checks: DEFAULT_CHECKS,
  });
  console.log(`${result.action === 'created' ? 'Opened' : 'Updated'} ${result.url}${result.pushed ? '' : ' (branch already current)'}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `Software Garden v${plan.to} catalog bump: ${result.url}\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
