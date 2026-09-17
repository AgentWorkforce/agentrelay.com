import { afterAll, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { FLOW_PUBLISH_CHECK_COMMAND, FLOW_REVIEW_BLOCKED_COMMAND, FLOW_TEST_COMMAND } from '../flow-workflows';

/**
 * The generated test step runs under `sh`, and its exit code is the only thing
 * the runner sees. `f.run` has no retry policy, so a non-zero exit is retried
 * until the run dies with `retries_exhausted` — that is how a repository with
 * no package.json killed production runs against AgentWorkforce/cloud-e2e-sandbox.
 * These cases run the real command against real fixtures.
 */
const roots: string[] = [];
afterAll(() => { for (const root of roots) rmSync(root, { recursive: true, force: true }); });

function fixture(files: Record<string, string>) {
  const root = mkdtempSync(path.join(tmpdir(), 'flow-test-command-'));
  roots.push(root);
  for (const [name, content] of Object.entries(files)) writeFileSync(path.join(root, name), content);
  return root;
}

function runStep(files: Record<string, string>, env: Record<string, string> = {}) {
  const result = spawnSync('/bin/sh', ['-c', FLOW_TEST_COMMAND], {
    cwd: fixture(files),
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

// A package manager that is genuinely absent: only Node and the base system on PATH.
const withoutPackageManagers = { PATH: `${path.dirname(process.execPath)}:/usr/bin:/bin` };
const testScript = (test: string) => JSON.stringify({ name: 'fixture', version: '1.0.0', scripts: { test } });

describe('FLOW_TEST_COMMAND', () => {
  it('skips instead of exiting 254 when the repository has no package.json', () => {
    // The exact production failure: every npm subcommand reports ENOENT as errno
    // -2, which npm returns as its exit status, and -2 & 0xFF is 254.
    const { code, stdout } = runStep({ 'README.md': '# sandbox\n' });
    expect(code).toBe(0);
    expect(code).not.toBe(254);
    expect(stdout).toContain('no package.json in the repository root; skipping tests.');
  });

  it('skips when package.json declares no runnable test script', () => {
    for (const files of [
      { 'package.json': JSON.stringify({ name: 'fixture', version: '1.0.0' }) },
      { 'package.json': testScript('   ') },
      { 'package.json': '{ not valid json' },
    ]) {
      const { code, stdout } = runStep(files);
      expect(code).toBe(0);
      expect(stdout).toContain('no runnable test script; skipping tests.');
    }
  });

  it('always reports what it did, so the journal never records an empty stdout_tail', () => {
    const cases: Record<string, string>[] = [{ 'README.md': '#\n' }, { 'package.json': testScript('echo ran') }];
    for (const files of cases) {
      expect(runStep(files).stdout.trim()).not.toBe('');
    }
  });

  it('still runs and still fails on a real test suite', () => {
    const passing = runStep({ 'package.json': testScript('echo suite-ran') });
    expect(passing.code).toBe(0);
    expect(passing.stdout).toContain('running tests with npm');
    expect(passing.stdout).toContain('suite-ran');

    // A genuine failure must stay a failure: skipping is only for "nothing to test".
    const failing = runStep({ 'package.json': testScript('echo broke && exit 3') });
    expect(failing.code).toBe(3);
  });

  it('fails once, loudly and legibly, when the lockfile needs a package manager that cannot be provisioned', () => {
    const { code, stderr } = runStep(
      { 'bun.lockb': '', 'package.json': testScript('echo ok') },
      withoutPackageManagers,
    );
    expect(code).toBe(1);
    expect(code).not.toBe(254);
    expect(stderr).toContain("lockfile requires bun, which is not installed and could not be provisioned.");
  });

  it('selects the package manager from the lockfile and never blind-falls back to npm', () => {
    expect(FLOW_TEST_COMMAND).toContain('pnpm install --frozen-lockfile');
    expect(FLOW_TEST_COMMAND).toContain('yarn install --immutable');
    expect(FLOW_TEST_COMMAND).toContain('yarn install --frozen-lockfile');
    expect(FLOW_TEST_COMMAND).toContain('bun install --frozen-lockfile');
    expect(FLOW_TEST_COMMAND).toContain('corepack enable --install-directory');
    // npm ci only with a lockfile present; the old `npm ci || npm install`
    // chain masked npm ci failures behind a second install.
    expect(FLOW_TEST_COMMAND).toContain('if [ -f package-lock.json ]; then npm ci; else npm install; fi');
    expect(FLOW_TEST_COMMAND).not.toContain('npm ci || npm install');
  });
});

/**
 * The step that runs when an adversarial review does not pass. The run itself
 * reports `f.done("step_failed")` again: the 2.0.15 pin lowers that reason
 * (AgentWorkforce/flows#436), where 2.0.14 failed the whole run with
 * `unsupported_completion` after every agent had finished. An exit code still
 * cannot carry what the reviewer found, so this step puts the verdict where an
 * operator acts on it — the pull request, drafted, with the findings posted.
 *
 * Like FLOW_TEST_COMMAND, its exit code is the only signal the runner has and
 * `f.run` has no retry policy, so every branch must exit 0: a missing review.md
 * or a `gh` that cannot draft this pull request must not turn a reported review
 * failure into `retries_exhausted`. These cases run the real command with a
 * real `gh` on PATH.
 */
function runReviewBlocked(files: Record<string, string>, gh: 'works' | 'fails' | 'missing') {
  const root = fixture(files);
  const bin = path.join(root, 'bin');
  mkdirSync(bin, { recursive: true });
  // Records what it was asked to do, so the assertions check the real argv.
  if (gh !== 'missing') {
    writeFileSync(path.join(bin, 'gh'), gh === 'works'
      ? '#!/bin/sh\necho "$@" >> gh-calls.txt\nexit 0\n'
      : '#!/bin/sh\necho "$@" >> gh-calls.txt\nexit 1\n', { mode: 0o755 });
  }
  const result = spawnSync('/bin/sh', ['-c', FLOW_REVIEW_BLOCKED_COMMAND], {
    cwd: root,
    encoding: 'utf8',
    // "missing" means genuinely absent: only Node and the base system on PATH.
    env: { ...process.env, PATH: gh === 'missing' ? `${path.dirname(process.execPath)}:/usr/bin:/bin` : `${bin}:${process.env.PATH}` },
  });
  const read = (name: string) => existsSync(path.join(root, name)) ? readFileSync(path.join(root, name), 'utf8') : '';
  return { code: result.status, stdout: result.stdout, stderr: result.stderr, blocked: read('review-blocked.md'), ghCalls: read('gh-calls.txt') };
}

const review = { 'review.md': '## Findings\n\nThe retry loop still drops the last error.\n' };

describe('FLOW_REVIEW_BLOCKED_COMMAND', () => {
  it('drafts the pull request and posts the unresolved review', () => {
    const { code, stdout, blocked, ghCalls } = runReviewBlocked(review, 'works');
    expect(code).toBe(0);
    // A draft cannot be merged by accident, which is the point: the run parks
    // with the same reason a clean run does, so this is what an operator sees.
    expect(ghCalls).toContain('pr ready --undo');
    expect(ghCalls).toContain('pr comment --body-file review-blocked.md');
    expect(blocked).toContain('the adversarial review did not pass');
    expect(blocked).toContain('not approved');
    expect(blocked).toContain('The retry loop still drops the last error.');
    expect(stdout).toContain('converted the pull request to a draft.');
    expect(stdout).toContain('posted the unresolved review to the pull request.');
  });

  it('still exits 0 and keeps the findings when gh cannot draft or comment', () => {
    // Older gh without `pr ready --undo`, a plan without draft pull requests, a
    // revoked token: the report must survive all of them. A non-zero exit here
    // would be retried until the run died with retries_exhausted.
    const { code, stderr, blocked } = runReviewBlocked(review, 'fails');
    expect(code).toBe(0);
    expect(blocked).toContain('The retry loop still drops the last error.');
    expect(stderr).toContain('could not convert the pull request to a draft');
    expect(stderr).toContain('could not comment on the pull request');
  });

  it('exits 0 with no gh on PATH at all', () => {
    const { code, blocked } = runReviewBlocked(review, 'missing');
    expect(code).toBe(0);
    expect(blocked).toContain('The retry loop still drops the last error.');
  });

  it('says so rather than reporting an empty review when the reviewer wrote none', () => {
    for (const files of [{}, { 'review.md': '' }] as Record<string, string>[]) {
      const { code, blocked } = runReviewBlocked(files, 'works');
      expect(code).toBe(0);
      expect(blocked).toContain('the adversarial review did not pass');
      expect(blocked).toContain('left no review.md');
    }
  });

  it('always reports what it did, and never merges', () => {
    for (const gh of ['works', 'fails', 'missing'] as const) {
      expect(runReviewBlocked(review, gh).stdout).toContain('wrote review-blocked.md.');
    }
    expect(FLOW_REVIEW_BLOCKED_COMMAND).not.toContain('pr merge');
    expect(FLOW_REVIEW_BLOCKED_COMMAND).not.toContain('pr ready;');
  });
});

/**
 * The check that decides whether there is anything to publish. Its single
 * stdout token is what the flow branches on, and getting it wrong either opens
 * a doomed pull request or throws away real work, so these cases build real git
 * history in a real repository and run the real command under `sh`.
 */
const GIT_CONFIG = ['-c', 'user.email=flow@example.com', '-c', 'user.name=Flow', '-c', 'init.defaultBranch=main', '-c', 'commit.gpgsign=false'];
const git = (cwd: string, ...args: string[]) => execFileSync('git', [...GIT_CONFIG, ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

function publishCheck(options: { repo?: boolean; commit?: boolean; summary?: string; base?: 'missing' | 'empty' } = {}) {
  const root = fixture({ 'f.txt': 'base\n' });
  let head = '';
  if (options.repo !== false) {
    git(root, 'init', '-q', '.');
    git(root, 'add', '-A');
    git(root, 'commit', '-qm', 'base');
    head = git(root, 'rev-parse', 'HEAD').trim();
  }
  if (options.summary !== undefined) writeFileSync(path.join(root, 'summary.md'), options.summary);
  if (options.commit) {
    writeFileSync(path.join(root, 'f.txt'), 'work\n');
    git(root, 'add', '-A');
    git(root, 'commit', '-qm', 'work');
  }
  const base = options.base === 'missing' ? 'deadbeef'.repeat(5) : options.base === 'empty' ? '' : head;
  const result = spawnSync('/bin/sh', ['-c', `base=${base}; ${FLOW_PUBLISH_CHECK_COMMAND}`], { cwd: root, encoding: 'utf8' });
  return { code: result.status, verdict: result.stdout.trim(), stderr: result.stderr };
}

describe('FLOW_PUBLISH_CHECK_COMMAND', () => {
  it('reports no-commits when the agents committed nothing', () => {
    // The production failure: the agent step succeeded having correctly made no
    // changes, the branch was pushed at the base commit anyway, and
    // `gh pr create --body-file summary.md` died on the missing file.
    const { code, verdict, stderr } = publishCheck();
    expect(code).toBe(0);
    expect(verdict).toBe('no-commits');
    expect(stderr).toContain('nothing to push or publish');
  });

  it('still reports no-commits when a summary exists but nothing was committed', () => {
    // A summary describing work that was never committed, or an uncommitted
    // tree: a push would carry none of it, so there is still nothing to open a
    // pull request against.
    expect(publishCheck({ summary: 'I did not make any changes.\n' }).verdict).toBe('no-commits');
  });

  it('publishes when there are commits and a non-empty summary', () => {
    const { code, verdict, stderr } = publishCheck({ commit: true, summary: '## What changed\n' });
    expect(code).toBe(0);
    expect(verdict).toBe('publish');
    expect(stderr).toContain('opening the pull request');
  });

  it('reports no-summary when there are commits but no pull-request body', () => {
    // Real work, so the branch is still worth pushing — but `gh pr create
    // --body-file summary.md` would fail, so the flow stops short of it.
    expect(publishCheck({ commit: true }).verdict).toBe('no-summary');
    expect(publishCheck({ commit: true, summary: '' }).verdict).toBe('no-summary');
  });

  it('does not guess when the base commit cannot be resolved', () => {
    // Publishing then rests on evidence that is actually present: a summary.md
    // that is really there. Without one it declines rather than push blind.
    expect(publishCheck({ commit: true, summary: 'body\n', base: 'missing' }).verdict).toBe('publish');
    expect(publishCheck({ commit: true, base: 'missing' }).verdict).toBe('no-commits');
    expect(publishCheck({ commit: true, base: 'empty' }).verdict).toBe('no-commits');
  });

  it('exits 0 with exactly one known token on every path', () => {
    // `f.run` has no retry policy, so a non-zero exit here would be retried
    // until the run died with retries_exhausted — the FLOW_TEST_COMMAND lesson.
    // And the flow compares the whole of stdout, so a second line would read as
    // an unrecognised verdict.
    for (const options of [{}, { commit: true }, { commit: true, summary: 'b\n' }, { repo: false }, { base: 'missing' as const }]) {
      const { code, verdict } = publishCheck(options);
      expect(code).toBe(0);
      expect(verdict.split('\n')).toHaveLength(1);
      expect(['publish', 'no-summary', 'no-commits']).toContain(verdict);
    }
  });
});
