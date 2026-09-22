import { afterAll, describe, expect, it } from 'vitest';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { FLOW_PUSH_COMMAND, WORKFLOW_FILES_HINT } from '../flow-workflows';
import { factorySource, DEFAULT_FACTORY, type FactoryDraft } from '../flow-onboarding';

/**
 * Cloud run 065fd98f (issue-to-pr, AgentWorkforce/cloud-e2e-sandbox#40) lost
 * a finished agent step — 11m24s, $6.80, three commits — at the push:
 *
 *   ! [remote rejected] HEAD -> relayflow/issue-to-pr-065fd98f (refusing to
 *   allow a GitHub App to create or update workflow `.github/workflows/ci.yml`
 *   without `workflows` permission)
 *
 * These cases run the real push command against a real bare remote whose
 * pre-receive hook refuses the way GitHub does: any new commit that touches
 * `.github/workflows/` is refused, not only a branch tip that differs.
 */
const roots: string[] = [];
afterAll(() => { for (const root of roots) rmSync(root, { recursive: true, force: true }); });

const env = {
  ...process.env,
  GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_AUTHOR_NAME: 'Agent', GIT_AUTHOR_EMAIL: 'agent@example.com', GIT_COMMITTER_NAME: 'Agent', GIT_COMMITTER_EMAIL: 'agent@example.com',
};

const REFUSAL = 'refusing to allow a GitHub App to create or update workflow';

// GitHub checks every commit the push adds. `allow-workflows` is a token with
// the permission; `reject-all` an unrelated failure; `always-refuse` the
// workflow refusal whatever is pushed; `fail-after-refusal` refuses anything
// after one workflow refusal. The refusal carries a credentialed URL so the
// scrubbing can be checked.
const HOOK = `#!/bin/sh
if [ -f reject-all ]; then echo "error: the remote is unavailable (simulated)" >&2; exit 1; fi
if [ -f fail-after-refusal ] && [ -f refused ]; then echo "error: the remote is unavailable (simulated)" >&2; exit 1; fi
if [ -f allow-workflows ]; then exit 0; fi
if [ -f always-refuse ]; then echo "${REFUSAL} \\\`.github/workflows/ci.yml\\\` without \\\`workflows\\\` permission" >&2; exit 1; fi
zero=0000000000000000000000000000000000000000
while read old new ref; do
  [ "$new" = "$zero" ] && continue
  for c in $(git rev-list "$new" --not --all); do
    f=$(git diff-tree -r -m --root --no-commit-id --name-only "$c" -- .github/workflows | head -n 1)
    if [ -n "$f" ]; then
      touch refused
      echo "To https://x-access-token:ghs_SECRETTOKEN@github.com/acme/app.git" >&2
      echo "${REFUSAL} \\\`$f\\\` without \\\`workflows\\\` permission" >&2
      exit 1
    fi
  done
done
exit 0
`;

function git(cwd: string, ...args: string[]) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', env });
}

function write(root: string, files: Record<string, string | null>) {
  for (const [name, content] of Object.entries(files)) {
    const file = path.join(root, name);
    if (content === null) { rmSync(file, { force: true }); continue; }
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
}

function commit(root: string, message: string, files: Record<string, string | null>) {
  write(root, files);
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', message);
  return git(root, 'rev-parse', 'HEAD').trim();
}

/** A clone of a bare remote at `base`, on the run's branch. */
function setup(baseFiles: Record<string, string>, modes: string[] = []) {
  const top = mkdtempSync(path.join(tmpdir(), 'flow-push-guard-'));
  roots.push(top);
  const remote = path.join(top, 'remote.git');
  const root = path.join(top, 'work');
  git(top, 'init', '-q', '--bare', '-b', 'main', remote);
  mkdirSync(root);
  git(root, 'init', '-q', '-b', 'main');
  const base = commit(root, 'base', baseFiles);
  git(root, 'remote', 'add', 'origin', remote);
  git(root, 'push', '-q', 'origin', 'main');
  git(root, 'checkout', '-q', '-b', 'relayflow/issue-to-pr-065fd98f');
  writeFileSync(path.join(remote, 'hooks', 'pre-receive'), HOOK);
  chmodSync(path.join(remote, 'hooks', 'pre-receive'), 0o755);
  for (const mode of modes) writeFileSync(path.join(remote, mode), '');
  return { root, remote, base };
}

function push(root: string, base: string, args = ' --set-upstream origin HEAD', extra = '', pathPrefix = '') {
  const result = spawnSync('/bin/sh', ['-c', `base=${base}; ${extra}${FLOW_PUSH_COMMAND}${args}`], {
    cwd: root, encoding: 'utf8', env: { ...env, ...(pathPrefix ? { PATH: `${pathPrefix}:${process.env.PATH}` } : {}) },
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

const BRANCH = 'relayflow/issue-to-pr-065fd98f';
const remoteHead = (remote: string) => spawnSync('git', ['rev-parse', '--verify', '--quiet', `refs/heads/${BRANCH}`], { cwd: remote, encoding: 'utf8', env }).stdout.trim();
const show = (cwd: string, spec: string) => git(cwd, 'show', spec);
const tree = (cwd: string, ref: string) => git(cwd, 'ls-tree', '-r', '--name-only', ref).trim().split('\n').sort();
const read = (root: string, name: string) => existsSync(path.join(root, name)) ? readFileSync(path.join(root, name), 'utf8') : '';

const CI = 'name: ci\non:\n  pull_request:\n    paths: [src/**]\njobs: {}\n';
const CI_EDITED = 'name: ci\non:\n  pull_request:\n    paths: [src/**, docs/**]\njobs: {}\n';
const BODY = 'Consolidates the docs.\n\nFixes #40\n';

describe('FLOW_PUSH_COMMAND', () => {
  it('pushes a branch without workflow edits exactly as git push does', () => {
    const { root, remote, base } = setup({ 'README.md': '#\n' });
    const head = commit(root, 'docs', { 'docs/a.md': 'a\n' });
    const result = push(root, base);
    expect(result.code).toBe(0);
    expect(result.stdout).not.toContain('push-guard');
    expect(remoteHead(remote)).toBe(head);
    expect(git(root, 'rev-parse', '--abbrev-ref', '@{upstream}').trim()).toBe(`origin/${BRANCH}`);
  });

  it('pushes workflow edits unchanged when the token has the workflows permission', () => {
    const { root, remote, base } = setup({ 'README.md': '#\n', '.github/workflows/ci.yml': CI }, ['allow-workflows']);
    const head = commit(root, 'wire docs into CI', { '.github/workflows/ci.yml': CI_EDITED, 'docs/a.md': 'a\n' });
    const result = push(root, base);
    expect(result.code).toBe(0);
    expect(result.stdout).not.toContain('push-guard');
    expect(remoteHead(remote)).toBe(head);
  });

  it('withholds refused workflow edits, pushes the rest, and puts the patch in the pull-request body (run 065fd98f)', () => {
    const { root, remote, base } = setup({ 'README.md': '#\n', '.github/workflows/ci.yml': CI });
    commit(root, 'docs: consolidate', { 'docs/a.md': 'a\n', 'README.md': '# docs moved\n' });
    commit(root, 'ci: check docs', { '.github/workflows/ci.yml': CI_EDITED, 'scripts/check-docs.sh': 'true\n' });
    const orig = commit(root, 'docs: index', { 'docs/index.md': 'index\n' });
    write(root, { '.relayflow/pr-body.md': BODY });

    const result = push(root, base);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('relayflow push-guard: workflow edits withheld (1 files)\n');

    // Pushed, and the local branch is what was pushed.
    const pushed = remoteHead(remote);
    expect(pushed).not.toBe('');
    expect(git(root, 'rev-parse', 'HEAD').trim()).toBe(pushed);
    // The workflow file is at the merge-base state in every pushed commit.
    expect(show(remote, `${pushed}:.github/workflows/ci.yml`)).toBe(CI);
    expect(git(remote, 'rev-list', '--count', `${base}..${pushed}`, '--', '.github/workflows').trim()).toBe('0');
    // Everything else the agent did is there, commit by commit, with the
    // same messages and author.
    expect(tree(remote, pushed)).toEqual(['.github/workflows/ci.yml', 'README.md', 'docs/a.md', 'docs/index.md', 'scripts/check-docs.sh']);
    expect(git(remote, 'log', '--format=%s|%an', `${base}..${pushed}`).trim().split('\n')).toEqual(['docs: index|Agent', 'ci: check docs|Agent', 'docs: consolidate|Agent']);
    // The original commits are kept locally, and the working tree matches HEAD.
    expect(git(root, 'rev-parse', 'refs/relayflow/withheld-workflows').trim()).toBe(orig);
    expect(read(root, '.github/workflows/ci.yml')).toBe(CI);
    expect(git(root, 'status', '--porcelain', '--untracked-files=no').trim()).toBe('');

    // The patch reaches the pull-request body, and applies to the pushed branch.
    const body = read(root, '.relayflow/pr-body.md');
    expect(body.startsWith(BODY)).toBe(true);
    expect(body).toContain('## Workflow changes not applied');
    expect(body).toContain('lacks the `workflows` permission');
    expect(body).toContain('- M `.github/workflows/ci.yml`');
    expect(body).toContain('````diff\ndiff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml');
    expect(body).toContain('+    paths: [src/**, docs/**]');
    const patch = read(root, '.relayflow/workflow-changes.patch');
    expect(body).toContain(patch);
    expect(spawnSync('git', ['apply', '--check', '.relayflow/workflow-changes.patch'], { cwd: root, env }).status).toBe(0);
    // No credential from a remote URL reaches the step output.
    expect(result.stderr).toContain(REFUSAL);
    expect(result.stderr).not.toContain('ghs_SECRETTOKEN');
  });

  it('handles an added and a deleted workflow file, and drops a commit that only touched workflows', () => {
    const { root, remote, base } = setup({ 'README.md': '#\n', '.github/workflows/ci.yml': CI, '.github/workflows/old.yml': 'name: old\n' });
    commit(root, 'feature', { 'src/x.ts': 'x\n' });
    commit(root, 'ci: replace old workflow', { '.github/workflows/new.yml': 'name: new\n', '.github/workflows/old.yml': null });
    const result = push(root, base);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('relayflow push-guard: workflow edits withheld (2 files)');
    const pushed = remoteHead(remote);
    expect(tree(remote, pushed)).toEqual(['.github/workflows/ci.yml', '.github/workflows/old.yml', 'README.md', 'src/x.ts']);
    expect(git(remote, 'log', '--format=%s', `${base}..${pushed}`).trim()).toBe('feature');
    expect(existsSync(path.join(root, '.github/workflows/new.yml'))).toBe(false);
    expect(read(root, '.github/workflows/old.yml')).toBe('name: old\n');
    const patch = read(root, '.relayflow/workflow-changes.patch');
    expect(patch).toContain('new file mode');
    expect(patch).toContain('deleted file mode');
    // There was no pull-request body yet, so none is invented.
    expect(existsSync(path.join(root, '.relayflow/pr-body.md'))).toBe(false);
    expect(read(root, '.relayflow/workflow-changes.md')).toContain('- A `.github/workflows/new.yml`');
    expect(read(root, '.relayflow/workflow-changes.md')).toContain('- D `.github/workflows/old.yml`');
  });

  it('fails as before on any other push failure', () => {
    const { root, remote, base } = setup({ 'README.md': '#\n', '.github/workflows/ci.yml': CI }, ['reject-all']);
    const head = commit(root, 'ci', { '.github/workflows/ci.yml': CI_EDITED });
    const result = push(root, base);
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain('the remote is unavailable');
    expect(result.stdout).not.toContain('push-guard');
    expect(git(root, 'rev-parse', 'HEAD').trim()).toBe(head);
    expect(remoteHead(remote)).toBe('');
  });

  it('falls back to nothing when the refused branch has no workflow edits of its own', () => {
    const { root, remote, base } = setup({ 'README.md': '#\n' }, ['always-refuse']);
    const head = commit(root, 'docs', { 'docs/a.md': 'a\n' });
    const result = push(root, base);
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain('nothing to withhold');
    expect(result.stdout).not.toContain('withheld');
    expect(git(root, 'rev-parse', 'HEAD').trim()).toBe(head);
    expect(remoteHead(remote)).toBe('');
    expect(existsSync(path.join(root, '.relayflow'))).toBe(false);
  });

  it('fails with the original error, and restores HEAD, when the second push fails too', () => {
    const { root, remote, base } = setup({ 'README.md': '#\n', '.github/workflows/ci.yml': CI }, ['fail-after-refusal']);
    const head = commit(root, 'ci', { '.github/workflows/ci.yml': CI_EDITED, 'docs/a.md': 'a\n' });
    const result = push(root, base);
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain('The original error was:');
    expect(result.stderr.split(REFUSAL).length).toBeGreaterThan(2);
    expect(result.stderr).not.toContain('ghs_SECRETTOKEN');
    expect(git(root, 'rev-parse', 'HEAD').trim()).toBe(head);
    expect(read(root, '.github/workflows/ci.yml')).toBe(CI_EDITED);
    expect(remoteHead(remote)).toBe('');
  });

  it('keeps pushed commits and comments on the open pull request for a revision push', () => {
    const { root, remote, base } = setup({ 'README.md': '#\n', '.github/workflows/ci.yml': CI });
    const first = commit(root, 'feature', { 'src/x.ts': 'x\n' });
    expect(push(root, base).code).toBe(0);
    commit(root, 'review fixes', { 'src/x.ts': 'y\n', '.github/workflows/ci.yml': CI_EDITED });
    // A stand-in gh records the comment the guard posts.
    const bin = mkdtempSync(path.join(tmpdir(), 'flow-push-guard-bin-'));
    roots.push(bin);
    writeFileSync(path.join(bin, 'gh'), '#!/bin/sh\nprintf "%s " "$@" > "$(dirname "$0")/gh.args"\ncat "$4" > "$(dirname "$0")/gh.body"\n');
    chmodSync(path.join(bin, 'gh'), 0o755);
    const result = push(root, base, '', 'comment=yes; ', bin);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('workflow edits withheld (1 files)');
    const pushed = remoteHead(remote);
    // A fast-forward: the commit already on the remote was not rewritten.
    expect(git(remote, 'rev-parse', `${pushed}~1`).trim()).toBe(first);
    expect(show(remote, `${pushed}:src/x.ts`)).toBe('y\n');
    expect(show(remote, `${pushed}:.github/workflows/ci.yml`)).toBe(CI);
    expect(read(bin, 'gh.args')).toBe('pr comment --body-file .relayflow/workflow-changes.md ');
    expect(read(bin, 'gh.body')).toContain('+    paths: [src/**, docs/**]');
  });

  it('bounds the patch in the pull-request body and says where the rest is', () => {
    const { root, base } = setup({ 'README.md': '#\n', '.github/workflows/ci.yml': CI });
    commit(root, 'ci', { '.github/workflows/ci.yml': CI + '# padding\n'.repeat(4000), 'docs/a.md': 'a\n' });
    write(root, { '.relayflow/pr-body.md': BODY });
    const result = push(root, base, ' --set-upstream origin HEAD', 'RELAYFLOW_WITHHELD_PATCH_LIMIT=2000; export RELAYFLOW_WITHHELD_PATCH_LIMIT; ');
    expect(result.code).toBe(0);
    const body = read(root, '.relayflow/pr-body.md');
    expect(body).toMatch(/_Truncated to 2000 of \d+ bytes\. The full patch is \.relayflow\/workflow-changes\.patch/);
    expect(body.length).toBeLessThan(BODY.length + 3000);
    // Every fence opened is closed.
    expect(body.split('````').length).toBe(3);
  });
});

describe('generated flows', () => {
  const draft: FactoryDraft = { ...DEFAULT_FACTORY, version: 4, sources: ['github'], sourceSettings: { github: { repository: 'acme/app', labels: '' } }, agents: ['claude', 'codex'], task: 'Add a test', step: 3 } as FactoryDraft;
  it.each(['traditional', 'prototype', 'simple'] as const)('%s pushes only through the guard and tells every agent about workflow files', (workflow) => {
    for (const target of ['cloud', 'local'] as const) {
      const source = factorySource({ ...draft, workflow }, target);
      expect(source).toContain(JSON.stringify(WORKFLOW_FILES_HINT));
      expect(source).toContain(JSON.stringify(FLOW_PUSH_COMMAND));
      expect(source).not.toMatch(/f\.run\("git push/);
    }
  });
});
