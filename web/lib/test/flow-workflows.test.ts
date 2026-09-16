import { afterAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { FLOW_TEST_COMMAND } from '../flow-workflows';

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
