import { afterAll, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  FLOW_BASE_CHECK_COMMAND, FLOW_CHECK_REPORT_COMMAND, FLOW_CHECK_RESOLVE_COMMAND, FLOW_CHECK_RUN_COMMAND, FLOW_CHECK_SCRIPT,
  FLOW_DROP_WORKING_FILES_COMMAND, FLOW_EXCLUDE_WORKING_FILES_COMMAND, FLOW_OPEN_CHANGE_COMMAND, FLOW_PREPARE_CHANGE_METADATA_COMMAND, FLOW_PUBLISH_CHECK_COMMAND, FLOW_REPORT_REVIEW_FINDINGS_COMMAND, FLOW_REVIEW_BLOCKED_COMMAND, FLOW_REVIEW_FINDINGS_LIMIT,
  FLOW_VALIDATE_CHANGE_METADATA_COMMAND,
} from '../flow-workflows';

/**
 * Every generated check step runs under `sh`, and its exit code is the only
 * thing the runner sees besides stdout. `f.run` has no retry policy, so a
 * non-zero exit is retried until the run dies with `retries_exhausted` — that
 * is how a repository with no package.json killed production runs against
 * AgentWorkforce/cloud-e2e-sandbox, and how AgentWorkforce/cloud run acbe30c1
 * died at a test step that never built what cloud's tests need. These cases run
 * the real commands against real fixtures and real git repositories.
 */
const roots: string[] = [];
afterAll(() => { for (const root of roots) rmSync(root, { recursive: true, force: true }); });

function fixture(files: Record<string, string>) {
  const root = mkdtempSync(path.join(tmpdir(), 'flow-test-command-'));
  roots.push(root);
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    writeFileSync(path.join(root, name), content);
  }
  return root;
}

function sh(command: string, cwd: string, env: Record<string, string> = {}) {
  const result = spawnSync('/bin/sh', ['-c', command], { cwd, encoding: 'utf8', env: { ...process.env, ...env } });
  return { code: result.status, token: result.stdout.trim(), stdout: result.stdout, stderr: result.stderr };
}

const read = (root: string, name: string) => existsSync(path.join(root, name)) ? readFileSync(path.join(root, name), 'utf8') : '';

// A package manager that is genuinely absent: only Node and the base system on PATH.
const withoutPackageManagers = { PATH: `${path.dirname(process.execPath)}:/usr/bin:/bin` };
const testScript = (test: string) => JSON.stringify({ name: 'fixture', version: '1.0.0', scripts: { test } });

function resolveIn(files: Record<string, string>) {
  const root = fixture(files);
  const result = sh(FLOW_CHECK_RESOLVE_COMMAND, root);
  return { ...result, root, script: read(root, FLOW_CHECK_SCRIPT) };
}

describe('FLOW_CHECK_RESOLVE_COMMAND', () => {
  it('finds tests a change added to a repository that had none (cloud-e2e-sandbox#31)', () => {
    const root = fixture({ 'README.md': '# sandbox\n' });
    expect(sh(FLOW_CHECK_RESOLVE_COMMAND, root).token).toBe('none');
    // The implementer adds the first package.json with a test script.
    writeFileSync(path.join(root, 'package.json'), testScript('node --test'));
    expect(sh(FLOW_CHECK_RESOLVE_COMMAND, root).token).toBe('default');
    expect(read(root, FLOW_CHECK_SCRIPT)).toContain('test');
  });

  it('keeps a check script the author, the repository or discovery already wrote', () => {
    const { code, token, script } = resolveIn({ [FLOW_CHECK_SCRIPT]: 'npm run build:core\nnpm test\n', 'package.json': testScript('echo x') });
    expect(code).toBe(0);
    expect(token).toBe('script');
    // Untouched: this is where cloud's missing `@cloud/core` build step lives.
    expect(script).toBe('npm run build:core\nnpm test\n');
  });

  it('prefers the repository\'s own test target to an ecosystem default', () => {
    const { token, script } = resolveIn({ Makefile: 'build:\n\ttrue\ntest: build\n\techo ok\n', 'package.json': testScript('echo x') });
    expect(token).toBe('default');
    expect(script).toContain('make test');
    expect(script).not.toContain('npm');
  });

  it('writes the Node default, choosing the package manager from the lockfile', () => {
    const { token, script } = resolveIn({ 'package.json': testScript('echo x'), 'package-lock.json': '{}' });
    expect(token).toBe('default');
    expect(script.split('\n')[1]).toBe('set -e');
    expect(script).toContain('pnpm install --frozen-lockfile');
    expect(script).toContain('yarn install --immutable');
    expect(script).toContain('yarn install --frozen-lockfile');
    expect(script).toContain('bun install --frozen-lockfile');
    expect(script).toContain('corepack enable --install-directory');
    // npm ci only with a lockfile present; the old `npm ci || npm install`
    // chain masked npm ci failures behind a second install.
    expect(script).toContain('if [ -f package-lock.json ]; then npm ci; else npm install; fi');
    expect(script).not.toContain('npm ci || npm install');
  });

  it.each([
    [{ 'Cargo.toml': '[package]\nname = "x"\n' }, 'cargo test'],
    [{ 'go.mod': 'module example.com/x\n' }, 'go test ./...'],
    [{ 'pyproject.toml': '[project]\nname = "x"\n', 'uv.lock': '' }, 'uv run pytest'],
    [{ 'pyproject.toml': '[tool.poetry]\n', 'poetry.lock': '' }, 'poetry install --no-interaction && poetry run pytest'],
    [{ 'requirements.txt': 'pytest\n' }, 'python3 -m pip install -r requirements.txt && python3 -m pytest'],
    [{ Gemfile: 'source "https://rubygems.org"\n', 'spec/x_spec.rb': '' }, 'bundle install && bundle exec rspec'],
    [{ Gemfile: 'source "https://rubygems.org"\n' }, 'bundle install && bundle exec rake test'],
    [{ 'pom.xml': '<project/>\n' }, 'mvn -B test'],
    [{ 'build.gradle.kts': '' }, 'gradle test'],
    [{ 'App.csproj': '<Project/>\n' }, 'dotnet test'],
    [{ 'mix.exs': 'defmodule X.MixProject do\nend\n' }, 'mix deps.get && mix test'],
  ])('writes a default for a repository that is not JavaScript (%o)', (files, command) => {
    // The old step said "no package.json; skipping tests" to every one of these.
    const { code, token, script } = resolveIn(files);
    expect(code).toBe(0);
    expect(token).toBe('default');
    expect(script.trim().split('\n')).toEqual([expect.stringContaining('# Written by relayflow'), 'set -e', command]);
  });

  it('reports none, and writes nothing, when there is nothing to run', () => {
    for (const files of [
      { 'README.md': '# sandbox\n' } as Record<string, string>,
      { 'package.json': JSON.stringify({ name: 'fixture', version: '1.0.0' }) },
      { 'package.json': testScript('   ') },
      { 'package.json': '{ not valid json' },
    ]) {
      const { code, token, script, stderr } = resolveIn(files);
      expect(code).toBe(0);
      expect(token).toBe('none');
      expect(script).toBe('');
      expect(stderr).toContain('found no way to run this repository\'s tests');
    }
  });
});

function runChecksIn(root: string, env: Record<string, string> = {}) {
  const result = sh(FLOW_CHECK_RUN_COMMAND, root, env);
  return { ...result, log: read(root, '.relayflow/check.log') };
}

describe('FLOW_CHECK_RUN_COMMAND', () => {
  it('reports pass, fail and none with exit 0, and keeps the output in the log', () => {
    const passing = runChecksIn(fixture({ [FLOW_CHECK_SCRIPT]: 'echo suite-ran\n' }));
    expect(passing).toMatchObject({ code: 0, token: 'pass' });
    expect(passing.log).toContain('suite-ran');

    // A genuine failure stays a failure — it is just no longer the end of the run.
    const failing = runChecksIn(fixture({ [FLOW_CHECK_SCRIPT]: 'echo broke\nexit 3\n' }));
    expect(failing).toMatchObject({ code: 0, token: 'fail' });
    expect(failing.log).toContain('broke');
    // The journal still shows why: the tail and the exit status go to stderr.
    expect(failing.stderr).toContain('broke');
    expect(failing.stderr).toContain('exit 3');

    const nothing = runChecksIn(fixture({ 'README.md': '#\n' }));
    expect(nothing).toMatchObject({ code: 0, token: 'none' });
  });

  it('stops a hung check itself where neither timeout nor gtimeout is installed, as on macOS', () => {
    // Only the tools the command needs, plus perl: no timeout, no gtimeout.
    const bin = fixture({});
    const root0 = () => fixture({});
    for (const tool of ['sh', 'dirname', 'mkdir', 'tail', 'cat', 'sleep', 'perl']) {
      const found = spawnSync('/bin/sh', ['-c', `command -v ${tool}`], { encoding: 'utf8' }).stdout.trim();
      if (found) symlinkSync(found, path.join(bin, tool));
    }
    expect(sh('command -v timeout || command -v gtimeout', root0(), { PATH: bin }).stdout.trim()).toBe('');
    const root = fixture({ [FLOW_CHECK_SCRIPT]: 'sleep 30 &\necho $! > .relayflow/child.pid\nwait\n' });
    const started = Date.now();
    const result = sh(FLOW_CHECK_RUN_COMMAND, root, { PATH: bin, RELAYFLOW_CHECK_TIMEOUT: '1' });
    expect(result).toMatchObject({ code: 0, token: 'timeout' });
    expect(Date.now() - started).toBeLessThan(15_000);
    // The whole process group stops, not just the shell running the script.
    const child = Number(read(root, '.relayflow/child.pid').trim());
    expect(child).toBeGreaterThan(0);
    expect(() => process.kill(child, 0)).toThrow();
  });

  it('prints exactly one token on stdout, whatever the tests print', () => {
    const { stdout } = runChecksIn(fixture({ [FLOW_CHECK_SCRIPT]: 'echo lots\necho of\necho output\n' }));
    expect(stdout.trim().split('\n')).toEqual(['pass']);
  });

  it('does not hand Cloud\'s own Git configuration to the repository\'s tests', () => {
    // AgentWorkforce/relay run 139d1a46: sandbox-repo.test.ts failed with
    // `fatal: transport 'file' not allowed` inside the flow, and passed in a
    // clean shell of the same sandbox. Cloud's executor sets these for its own
    // clone and push, and they reached the tests.
    const cloudGit = {
      GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'protocol.allow', GIT_CONFIG_VALUE_0: 'never',
    };
    const probe = 'git config --get protocol.allow || echo protocol-unset\n';
    // Positive control: the same probe does see the setting when run directly.
    expect(sh(probe, fixture({}), cloudGit).stdout).toContain('never');
    const { token, log } = runChecksIn(fixture({ [FLOW_CHECK_SCRIPT]: probe }), cloudGit);
    expect(token).toBe('pass');
    expect(log).toContain('protocol-unset');
    expect(log).not.toContain('never');
  });

  it.skipIf(spawnSync('/bin/sh', ['-c', 'command -v timeout']).status !== 0)('stops itself and says timeout before the 15-minute lease would kill the run', () => {
    const { code, token } = runChecksIn(fixture({ [FLOW_CHECK_SCRIPT]: 'sleep 5\n' }), { RELAYFLOW_CHECK_TIMEOUT: '1' });
    expect(code).toBe(0);
    expect(token).toBe('timeout');
  });

  it('runs the resolved default end to end, and still fails a failing suite', () => {
    const run = (files: Record<string, string>, env: Record<string, string> = {}) => {
      const root = fixture(files);
      expect(sh(FLOW_CHECK_RESOLVE_COMMAND, root).token).toBe('default');
      return runChecksIn(root, env);
    };
    const passing = run({ 'package.json': testScript('echo suite-ran') });
    expect(passing.token).toBe('pass');
    expect(passing.log).toContain('running tests with npm');
    expect(passing.log).toContain('suite-ran');
    expect(run({ 'package.json': testScript('echo broke && exit 3') }).token).toBe('fail');
    // The lockfile needs a package manager that cannot be provisioned: a
    // failure, legibly explained, and never npm's ENOENT exit status 254.
    const bun = run({ 'bun.lockb': '', 'package.json': testScript('echo ok') }, withoutPackageManagers);
    expect(bun.code).toBe(0);
    expect(bun.token).toBe('fail');
    expect(bun.log).toContain('lockfile requires bun, which is not installed and could not be provisioned.');
  });
});

/**
 * The step that runs when an adversarial review does not pass. The run itself
 * reports `f.done("step_failed")` again: every pin since 2.0.15 lowers that reason
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
 * The step that says why a failed review failed. The run outcome for
 * done("step_failed") names no step and no finding (Cloud run f92bf832), so
 * until done() carries a detail (AgentWorkforce/flows#542) this step's stdout
 * is where the reason is recorded. review.md is agent-authored: the output
 * must stay bounded, and like every other step it must exit 0.
 */
describe('FLOW_REPORT_REVIEW_FINDINGS_COMMAND', () => {
  const report = (files: Record<string, string>) => sh(FLOW_REPORT_REVIEW_FINDINGS_COMMAND, fixture(files));

  it('prints the remaining findings from review.md', () => {
    const { code, stdout } = report({ 'review.md': '## Findings\n\nOne P2 remains: cleanup can report success while an allocation stays invisible.\n' });
    expect(code).toBe(0);
    expect(stdout).toContain('report-review-findings: review.clean absent; remaining findings from review.md:');
    expect(stdout).toContain('One P2 remains: cleanup can report success while an allocation stays invisible.');
    expect(stdout).not.toContain('cut at');
  });

  it('bounds a long review and says it was cut', () => {
    const review = '## Findings\n\n' + Array.from({ length: 400 }, (_, index) => `- P3 finding ${index}: ${'x'.repeat(60)}`).join('\n') + '\nTHE-LAST-LINE\n';
    const { code, stdout } = report({ 'review.md': review });
    expect(code).toBe(0);
    expect(Buffer.byteLength(stdout)).toBeLessThanOrEqual(FLOW_REVIEW_FINDINGS_LIMIT);
    expect(stdout).toContain('- P3 finding 0:');
    expect(stdout).not.toContain('THE-LAST-LINE');
    expect(stdout).toContain('the full review is in review-blocked.md.');
  });

  it('drops terminal control characters and blank lines from the agent-written text', () => {
    const { stdout } = report({ 'review.md': 'P1: \u001b[31mred\u001b[0m\n\n\n\nP2: next\n' });
    expect(stdout).not.toContain('\u001b');
    expect(stdout).toContain('P1: [31mred[0m\nP2: next');
  });

  it('falls back to a fixed sentence when review.md is missing or empty', () => {
    for (const files of [{}, { 'review.md': '' }, { 'review.md': '\n  \n' }] as Record<string, string>[]) {
      const { code, stdout } = report(files);
      expect(code).toBe(0);
      expect(stdout.trim()).toBe('relayflow report-review-findings: review.clean absent and review.md missing or empty');
    }
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

/** A real repository with one commit per entry; returns each commit's id. */
function history(commits: Record<string, string>[]) {
  const root = fixture({});
  git(root, 'init', '-q', '.');
  const ids: string[] = [];
  for (const files of commits) {
    for (const [name, content] of Object.entries(files)) {
      mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
      writeFileSync(path.join(root, name), content);
    }
    git(root, 'add', '-A');
    git(root, 'commit', '-q', '--allow-empty', '-m', `commit ${ids.length}`);
    ids.push(git(root, 'rev-parse', 'HEAD').trim());
  }
  return { root, ids };
}
const treeOf = (root: string, ref = 'HEAD') => git(root, 'ls-tree', '-r', '--name-only', ref).trim().split('\n').filter(Boolean);

describe('FLOW_BASE_CHECK_COMMAND', () => {
  // The check reads a file the change edits; the script itself stays in
  // .relayflow/, outside the history, exactly as in a real run.
  function compare(baseState: string, headState: string) {
    const { root, ids } = history([{ state: baseState }, { state: headState }]);
    mkdirSync(path.join(root, '.relayflow'), { recursive: true });
    writeFileSync(path.join(root, FLOW_CHECK_SCRIPT), 'echo "state is $(cat state)"\ngrep -q good state\n');
    return { root, base: ids[0] };
  }

  it('tells a change that broke the checks from one that found them broken', () => {
    const broke = compare('good', 'bad');
    expect(sh(FLOW_CHECK_RUN_COMMAND, broke.root).token).toBe('fail');
    const regression = sh(`base=${broke.base}; ${FLOW_BASE_CHECK_COMMAND}`, broke.root);
    expect(regression).toMatchObject({ code: 0, token: 'pass' });

    const already = compare('bad', 'bad');
    const preexisting = sh(`base=${already.base}; ${FLOW_BASE_CHECK_COMMAND}`, already.root);
    expect(preexisting).toMatchObject({ code: 0, token: 'fail' });
    // The base commit's own output, not the branch's, from its own worktree.
    expect(read(already.root, '.relayflow/base-check.log')).toContain('state is bad');
    expect(read(broke.root, '.relayflow/base-check.log')).toContain('state is good');
  });

  it('cleans up its worktree and leaves the branch alone', () => {
    const { root, base } = compare('good', 'bad');
    const head = git(root, 'rev-parse', 'HEAD').trim();
    sh(`base=${base}; ${FLOW_BASE_CHECK_COMMAND}`, root);
    expect(git(root, 'worktree', 'list').trim().split('\n')).toHaveLength(1);
    expect(git(root, 'rev-parse', 'HEAD').trim()).toBe(head);
    expect(read(root, 'state')).toBe('bad');
  });

  it('checks the base commit in the same tree, so build products the branch relied on are there too', () => {
    // A default such as `make test` builds nothing: the branch passed its
    // build step long ago, in this tree. A fresh worktree of the base would
    // fail on the missing build and hide the regression as "pre-existing".
    const { root, ids } = history([{ '.gitignore': 'built/\n', state: 'good' }, { state: 'bad' }]);
    mkdirSync(path.join(root, '.relayflow'), { recursive: true });
    mkdirSync(path.join(root, 'built'), { recursive: true });
    writeFileSync(path.join(root, 'built/ok'), 'artifact\n');
    writeFileSync(path.join(root, FLOW_CHECK_SCRIPT), 'test -f built/ok || { echo "missing build"; exit 2; }\ngrep -q good state\n');
    const head = git(root, 'rev-parse', 'HEAD').trim();
    const branch = git(root, 'symbolic-ref', '--short', 'HEAD').trim();
    expect(sh(FLOW_CHECK_RUN_COMMAND, root).token).toBe('fail');
    expect(sh(`base=${ids[0]}; ${FLOW_BASE_CHECK_COMMAND}`, root)).toMatchObject({ code: 0, token: 'pass' });
    expect(read(root, '.relayflow/base-check.log')).not.toContain('missing build');
    // Back on the branch, by name, with the change and the build product intact.
    expect(git(root, 'rev-parse', 'HEAD').trim()).toBe(head);
    expect(git(root, 'symbolic-ref', '--short', 'HEAD').trim()).toBe(branch);
    expect(read(root, 'state')).toBe('bad');
    expect(read(root, 'built/ok')).toBe('artifact\n');
  });

  it('runs the branch recipe against the base even when the repository commits the check script', () => {
    // The branch commits .relayflow/check.sh; the base has none. Checking the
    // base out in place would delete it and report `none` instead of a verdict.
    const { root, ids } = history([
      { state: 'good' },
      { state: 'bad', [FLOW_CHECK_SCRIPT]: 'echo "state is $(cat state)"\ngrep -q good state\n' },
    ]);
    const head = git(root, 'rev-parse', 'HEAD').trim();
    expect(sh(`base=${ids[0]}; ${FLOW_BASE_CHECK_COMMAND}`, root)).toMatchObject({ code: 0, token: 'pass' });
    expect(read(root, '.relayflow/base-check.log')).toContain('state is good');
    expect(git(root, 'rev-parse', 'HEAD').trim()).toBe(head);
    expect(read(root, FLOW_CHECK_SCRIPT)).toContain('grep -q good state');
    expect(git(root, 'status', '--porcelain', '--untracked-files=no').trim()).toBe('');
  });

  it('never switches a tree with uncommitted changes; it compares in a throwaway worktree instead', () => {
    const { root, base } = compare('good', 'bad');
    writeFileSync(path.join(root, 'state'), 'bad but edited\n');
    const head = git(root, 'rev-parse', 'HEAD').trim();
    expect(sh(`base=${base}; ${FLOW_BASE_CHECK_COMMAND}`, root)).toMatchObject({ code: 0, token: 'pass' });
    expect(git(root, 'rev-parse', 'HEAD').trim()).toBe(head);
    expect(read(root, 'state')).toBe('bad but edited\n');
    expect(git(root, 'worktree', 'list').trim().split('\n')).toHaveLength(1);
  });

  it('says unknown, with exit 0, when the base commit cannot be checked out', () => {
    const { root } = compare('good', 'bad');
    for (const base of ['', 'deadbeef'.repeat(5)]) {
      expect(sh(`base=${base}; ${FLOW_BASE_CHECK_COMMAND}`, root)).toMatchObject({ code: 0, token: 'unknown' });
    }
  });
});

describe('FLOW_EXCLUDE_WORKING_FILES_COMMAND', () => {
  it('keeps working files out of `git add -A` without touching the change', () => {
    const { root } = history([{ 'README.md': '#\n' }]);
    expect(sh(FLOW_EXCLUDE_WORKING_FILES_COMMAND, root).code).toBe(0);
    sh(FLOW_EXCLUDE_WORKING_FILES_COMMAND, root);
    for (const [name, content] of Object.entries({ 'summary.md': 's', 'plan.md': 'p', [FLOW_CHECK_SCRIPT]: 'true', 'docs/summary.md': 'real docs', 'src.txt': 'change' })) {
      mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
      writeFileSync(path.join(root, name), content);
    }
    git(root, 'add', '-A');
    const staged = git(root, 'diff', '--cached', '--name-only').trim().split('\n');
    expect(staged.sort()).toEqual(['docs/summary.md', 'src.txt']);
    // Written once, however many times the flow starts in this clone.
    expect(read(root, '.git/info/exclude').match(/# relayflow working files/g)).toHaveLength(1);
  });
});

describe('FLOW_DROP_WORKING_FILES_COMMAND', () => {
  const drop = (root: string, base: string, env: Record<string, string> = {}) => sh(`base=${base}; ${FLOW_DROP_WORKING_FILES_COMMAND}`, root, env);

  it('takes the working files an agent committed out of the branch, and keeps the change', () => {
    // Both production runs: Codex committed summary.md into cloud (acbe30c1)
    // and relay (139d1a46), so the pull-request body would have shipped as a
    // file at the repository root.
    const { root, ids } = history([{ 'README.md': '#\n' }, { 'summary.md': 'PR body', 'plan.md': 'plan', [FLOW_CHECK_SCRIPT]: 'true', 'src.txt': 'change' }]);
    expect(drop(root, ids[0]).code).toBe(0);
    expect(treeOf(root).sort()).toEqual(['README.md', 'src.txt']);
    // The agent's commit is kept; the removal is a new commit on top of it.
    expect(git(root, 'rev-parse', 'HEAD~1').trim()).toBe(ids[1]);
    // Still on disk, where the pull-request body is read from, and untracked.
    expect(read(root, 'summary.md')).toBe('PR body');
    expect(git(root, 'status', '--porcelain', '--', 'summary.md').trim()).toBe('?? summary.md');
  });

  it('keeps a summary.md the repository already had, and the agent\'s edit to it', () => {
    const { root, ids } = history([{ 'summary.md': 'the project summary' }, { 'summary.md': 'the project summary, updated', 'plan.md': 'plan' }]);
    drop(root, ids[0]);
    expect(treeOf(root)).toEqual(['summary.md']);
    expect(git(root, 'show', 'HEAD:summary.md')).toBe('the project summary, updated');
  });

  it('adds no commit when there is nothing to drop, or when the base is unknown', () => {
    const { root, ids } = history([{ 'README.md': '#\n' }, { 'src.txt': 'change', 'summary.md': 'body' }]);
    const clean = history([{ 'README.md': '#\n' }, { 'src.txt': 'change' }]);
    expect(drop(clean.root, clean.ids[0]).code).toBe(0);
    expect(git(clean.root, 'rev-parse', 'HEAD').trim()).toBe(clean.ids[1]);
    for (const base of ['', 'deadbeef'.repeat(5)]) {
      expect(drop(root, base).code).toBe(0);
      expect(git(root, 'rev-parse', 'HEAD').trim()).toBe(ids[1]);
    }
  });

  it('never sweeps staged but uncommitted work into its commit', () => {
    const { root, ids } = history([{ 'README.md': '#\n' }, { 'summary.md': 'body', 'src.txt': 'change' }]);
    writeFileSync(path.join(root, 'staged.txt'), 'not committed');
    git(root, 'add', 'staged.txt');
    drop(root, ids[0]);
    expect(treeOf(root)).not.toContain('staged.txt');
    expect(git(root, 'diff', '--cached', '--name-only').trim()).toBe('staged.txt');
  });

  it('commits as Relayflow only when the clone has no identity of its own', () => {
    const { root, ids } = history([{ 'README.md': '#\n' }, { 'summary.md': 'body', 'src.txt': 'change' }]);
    const home = fixture({});
    // No identity anywhere: no config file, no identity variables, and
    // user.useConfigOnly so git cannot guess one from the host name.
    const env: NodeJS.ProcessEnv = { ...process.env, HOME: home, XDG_CONFIG_HOME: home, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'user.useConfigOnly', GIT_CONFIG_VALUE_0: 'true' };
    for (const key of Object.keys(env)) if (/^(GIT_(AUTHOR|COMMITTER)_|EMAIL$)/.test(key)) delete env[key];
    const result = spawnSync('/bin/sh', ['-c', `base=${ids[0]}; ${FLOW_DROP_WORKING_FILES_COMMAND}`], { cwd: root, encoding: 'utf8', env });
    expect(result.status).toBe(0);
    expect(treeOf(root)).toEqual(['README.md', 'src.txt']);
    expect(git(root, 'log', '-1', '--format=%an <%ae>').trim()).toBe('Relayflow <noreply@agentrelay.com>');
  });
});

describe('FLOW_CHECK_REPORT_COMMAND', () => {
  function report(check: string, baseline: string, files: Record<string, string> = {}) {
    const root = fixture({ 'summary.md': '## What changed\n\nFixed the login bug.\n', [FLOW_CHECK_SCRIPT]: 'set -e\nnpm test\n', '.relayflow/check.log': 'FAIL src/login.test.ts\n', '.relayflow/base-check.log': 'FAIL src/other.test.ts\n', ...files });
    const result = sh(`check=${check}; baseline=${baseline}; ${FLOW_CHECK_REPORT_COMMAND}`, root);
    return { ...result, body: read(root, '.relayflow/pr-body.md'), report: read(root, '.relayflow/check-report.md') };
  }

  it('puts the verdict, what ran and the output under the summary', () => {
    const passed = report('pass', '');
    expect(passed.code).toBe(0);
    expect(passed.body.startsWith('## What changed')).toBe(true);
    expect(passed.body).toContain('## Checks');
    expect(passed.body).toContain('and they passed');
    expect(passed.body).toContain('npm test');
    expect(passed.body).not.toContain('FAIL src/login.test.ts');

    const preexisting = report('fail', 'fail');
    expect(preexisting.body).toContain('fail on the base commit too');
    expect(preexisting.body).toContain('FAIL src/login.test.ts');
    expect(preexisting.body).toContain('FAIL src/other.test.ts');

    const regression = report('fail', 'pass');
    expect(regression.body).toContain('breaks checks that pass on the base commit');
    expect(regression.body).not.toContain('FAIL src/other.test.ts');

    expect(report('timeout', 'unknown').body).toContain('could not be checked for comparison');
    expect(report('fail', 'revision').report).toContain('latest revision breaks checks that passed before it');
    const introduced = report('fail', 'new');
    expect(introduced.body).toContain('The checks this change adds fail');
    expect(introduced.body).not.toContain('FAIL src/other.test.ts');
    expect(report('fail', 'fail', { '.relayflow/repair-notes.md': 'cargo is not installed.\n' }).body).toContain('cargo is not installed.');
  });

  it('says plainly when nothing could be checked', () => {
    const { body } = report('none', '', { [FLOW_CHECK_SCRIPT]: '' });
    expect(body).toContain('no checks ran');
  });

  it('still writes a report with no summary.md', () => {
    const root = fixture({});
    expect(sh(`check=pass; baseline=; ${FLOW_CHECK_REPORT_COMMAND}`, root).code).toBe(0);
    expect(read(root, '.relayflow/pr-body.md').startsWith('## Checks')).toBe(true);
  });
});

describe('FLOW_OPEN_CHANGE_COMMAND', () => {
  /** A bin dir with fakes that record their argv, one per line, and exit with `code`. */
  function fakes(names: string[], code = 0) {
    const root = fixture({});
    const bin = path.join(root, 'bin');
    mkdirSync(bin);
    for (const name of names) {
      writeFileSync(path.join(bin, name), `#!/bin/sh\nprintf '%s\\n' "${name}" "$@" > "${root}/${name}.args"\nexit ${code}\n`, { mode: 0o755 });
    }
    return { root, env: { PATH: `${bin}:/usr/bin:/bin` } };
  }
  const args = ' --title "Fix login" --body-file .relayflow/pr-body.md --draft';

  it('uses the hosted helper when Cloud put it on PATH (GitHub or GitLab alike)', () => {
    const { root, env } = fakes(['relayflow-open-change', 'gh']);
    expect(sh(FLOW_OPEN_CHANGE_COMMAND + args, root, env).code).toBe(0);
    expect(read(root, 'relayflow-open-change.args').trim().split('\n'))
      .toEqual(['relayflow-open-change', '--title', 'Fix login', '--body-file', '.relayflow/pr-body.md', '--draft']);
    expect(read(root, 'gh.args')).toBe('');
  });

  it('falls back to gh pr create for a local run, with the same arguments', () => {
    const { root, env } = fakes(['gh']);
    expect(sh(FLOW_OPEN_CHANGE_COMMAND + args, root, env).code).toBe(0);
    expect(read(root, 'gh.args').trim().split('\n'))
      .toEqual(['gh', 'pr', 'create', '--title', 'Fix login', '--body-file', '.relayflow/pr-body.md', '--draft']);
  });

  it('keeps the exit status, so a failed create still fails the step', () => {
    const { root, env } = fakes(['relayflow-open-change'], 3);
    expect(sh(FLOW_OPEN_CHANGE_COMMAND + args, root, env).code).toBe(3);
  });
});

describe('change metadata contract', () => {
  const prepare = (root: string, reference: string) =>
    sh(`reference='${reference}'; ${FLOW_PREPARE_CHANGE_METADATA_COMMAND}`, root);
  const validate = (root: string, title: string, source: string, identifier: string, titleLength = Array.from(title).length) =>
    sh(`title='${title}'; title_length=${titleLength}; source='${source}'; identifier='${identifier}'; ${FLOW_VALIDATE_CHANGE_METADATA_COMMAND}`, root);

  it('adds exactly one normalized GitHub closing line and accepts the final artifacts', () => {
    const root = fixture({ '.relayflow/pr-body.md': '## Summary\n\nImplemented login recovery.\n' });
    expect(prepare(root, 'Fixes #507').token).toBe('prepared');
    expect(prepare(root, 'Fixes #507').token).toBe('prepared');
    const lines = read(root, '.relayflow/pr-body.md').split('\n');
    expect(lines.filter(line => line === 'Fixes #507')).toHaveLength(1);
    expect(validate(root, 'Fix login', 'github', '#507').token).toBe('valid');
  });

  it('refuses placeholder titles and a missing or malformed GitHub closing contract', () => {
    const missing = fixture({ '.relayflow/pr-body.md': '## Summary\n' });
    expect(validate(missing, 'Software factory change', 'github', '#507').token).toBe('placeholder-title');
    expect(validate(missing, 'Fix login', 'github', '507').token).toBe('malformed-github-identifier');
    expect(validate(missing, 'Fix login', 'github', '#507').token).toBe('missing-github-closing-reference');

    const duplicate = fixture({ '.relayflow/pr-body.md': 'Fixes #507\n\nFixes #507\n' });
    expect(validate(duplicate, 'Fix login', 'github', '#507').token).toBe('duplicate-github-closing-reference');
  });

  it('enforces the title cap in Unicode code points rather than UTF-8 bytes', () => {
    const root = fixture({ '.relayflow/pr-body.md': 'Fixes #507\n' });
    const atLimit = '修'.repeat(240);
    expect(Buffer.byteLength(atLimit, 'utf8')).toBeGreaterThan(240);
    expect(validate(root, atLimit, 'github', '#507')).toMatchObject({ code: 0, token: 'valid' });
    expect(validate(root, 'x'.repeat(241), 'github', '#507').token).toBe('title-too-long');
    expect(validate(root, 'Fix login', 'github', '#507', Number.NaN).token).toBe('malformed-title-length');
  });

  it('keeps deterministic non-GitHub references without inventing an issue number', () => {
    const linked = fixture({ '.relayflow/pr-body.md': '## Summary\n' });
    prepare(linked, 'Ticket: https://linear.app/acme/issue/ENG-42');
    expect(read(linked, '.relayflow/pr-body.md')).toContain('Ticket: https://linear.app/acme/issue/ENG-42');
    expect(validate(linked, 'Fix login', 'linear', 'ENG-42').token).toBe('valid');

    const markdown = fixture({ '.relayflow/pr-body.md': '## Summary\n' });
    prepare(markdown, '');
    expect(read(markdown, '.relayflow/pr-body.md')).toBe('## Summary\n');
    expect(validate(markdown, 'tasks.md', 'markdown', '').token).toBe('valid');
  });
});
