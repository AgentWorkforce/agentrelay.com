import { afterAll, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import {
  FLOW_BASE_CHECK_COMMAND, FLOW_CHANGE_CHECK_COMMAND, FLOW_CHECK_REPORT_COMMAND, FLOW_CHECK_RESOLVE_COMMAND, FLOW_CHECK_RUN_COMMAND, FLOW_CHECK_SCRIPT,
  FLOW_EXCLUDE_WORKING_FILES_COMMAND, FLOW_NEEDS_INPUT_COMMAND, FLOW_NEEDS_INPUT_FILE, FLOW_NEEDS_INPUT_HINT, FLOW_NEEDS_INPUT_LIMIT,
  FLOW_OPEN_CHANGE_COMMAND, FLOW_PUBLISH_CHECK_COMMAND, FLOW_PUSH_COMMAND, NEEDS_INPUT_SUMMARY_WINDOW,
} from '../flow-workflows';
import { factorySource, type FactoryDraft } from '../flow-onboarding';

// Run 91c1a5cd (wepost-no/wepost-saga, 2026-10-09): the implementer could not
// tell which file its Linear ticket meant, asked about it in its own output,
// and committed nothing. The flow still checked the unchanged branch, repaired
// it for 7 minutes and checked it again before publish found no commits: 17
// minutes, no pull request, and the question never reached the ticket.

const roots: string[] = [];
afterAll(() => { for (const root of roots) rmSync(root, { recursive: true, force: true }); });

const GIT_CONFIG = ['-c', 'user.email=flow@example.com', '-c', 'user.name=Flow', '-c', 'init.defaultBranch=main', '-c', 'commit.gpgsign=false'];
const git = (cwd: string, ...args: string[]) => execFileSync('git', [...GIT_CONFIG, ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const sh = (command: string, cwd: string, env: Record<string, string> = {}) => {
  const result = spawnSync('/bin/sh', ['-c', command], { cwd, encoding: 'utf8', env: { ...process.env, ...env } });
  return { code: result.status, stdout: result.stdout, token: result.stdout.trim(), stderr: result.stderr };
};

/** A repository with one commit, whose working files are excluded as the flow excludes them. */
function repository() {
  const root = mkdtempSync(path.join(tmpdir(), 'flow-needs-input-'));
  roots.push(root);
  writeFileSync(path.join(root, 'app.txt'), 'base\n');
  git(root, 'init', '-q', '.');
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'base');
  expect(sh(FLOW_EXCLUDE_WORKING_FILES_COMMAND, root).code).toBe(0);
  return { root, base: git(root, 'rev-parse', 'HEAD').trim() };
}
const write = (root: string, name: string, content: string) => {
  mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
  writeFileSync(path.join(root, name), content);
};

describe('FLOW_CHANGE_CHECK_COMMAND', () => {
  const changeCheck = (root: string, base: string) => sh(`base=${base}; ${FLOW_CHANGE_CHECK_COMMAND}`, root);

  it('says unchanged when the implementer committed nothing and left nothing, working files aside', () => {
    const { root, base } = repository();
    expect(changeCheck(root, base)).toMatchObject({ code: 0, token: 'unchanged' });
    // What an implementer that could not act leaves: its question, a summary
    // and the check script, all working files.
    write(root, FLOW_NEEDS_INPUT_FILE, 'Which file?\n');
    write(root, 'summary.md', 'Nothing changed.\n');
    write(root, FLOW_CHECK_SCRIPT, 'set -e\nnpm test\n');
    expect(changeCheck(root, base)).toMatchObject({ code: 0, token: 'unchanged' });
    // A committed working file is removed before publishing, so it is no change.
    git(root, 'add', '-f', 'summary.md');
    git(root, 'commit', '-qm', 'summary');
    expect(changeCheck(root, base)).toMatchObject({ code: 0, token: 'unchanged' });
  });

  it('says changed for a commit, and for staged or unstaged edits to tracked files, which the checks still see', () => {
    const committed = repository();
    write(committed.root, 'app.txt', 'work\n');
    git(committed.root, 'commit', '-qam', 'work');
    expect(changeCheck(committed.root, committed.base).token).toBe('changed');
    const edited = repository();
    write(edited.root, 'app.txt', 'work\n');
    expect(changeCheck(edited.root, edited.base).token).toBe('changed');
    const staged = repository();
    write(staged.root, 'src/new.ts', 'export {};\n');
    git(staged.root, 'add', 'src/new.ts');
    expect(changeCheck(staged.root, staged.base).token).toBe('changed');
    const deleted = repository();
    git(deleted.root, 'rm', '-q', 'app.txt');
    expect(changeCheck(deleted.root, deleted.base).token).toBe('changed');
    // A repository's own summary.md is not a working file to ignore.
    const own = repository();
    write(own.root, 'summary.md', 'v1\n');
    git(own.root, 'add', '-f', 'summary.md');
    git(own.root, 'commit', '-qm', 'own summary');
    const ownBase = git(own.root, 'rev-parse', 'HEAD').trim();
    write(own.root, 'summary.md', 'v2\n');
    git(own.root, 'commit', '-qam', 'edit own summary');
    expect(changeCheck(own.root, ownBase).token).toBe('changed');
  });

  it('counts a rename onto a working-file path as the deletion of its source', () => {
    // Rename detection would report only the destination, summary.md, which
    // the base lacks and is ignored: the deleted app.txt must still count.
    const { root, base } = repository();
    git(root, 'mv', 'app.txt', 'summary.md');
    git(root, 'commit', '-qm', 'rename');
    expect(changeCheck(root, base).token).toBe('changed');
    const unstaged = repository();
    git(unstaged.root, 'mv', 'app.txt', 'plan.md');
    expect(changeCheck(unstaged.root, unstaged.base).token).toBe('changed');
  });

  it('ignores a committed working file even when it is edited again afterwards', () => {
    // Publishing removes the commit that adds summary.md, so neither it nor a
    // later edit to it is a change, staged or not.
    const { root, base } = repository();
    write(root, 'summary.md', 'Nothing to do.\n');
    git(root, 'add', '-f', 'summary.md');
    git(root, 'commit', '-qm', 'summary');
    write(root, 'summary.md', 'Nothing to do, and here is why.\n');
    expect(changeCheck(root, base).token).toBe('unchanged');
    git(root, 'add', '-f', 'summary.md');
    expect(changeCheck(root, base).token).toBe('unchanged');
  });

  it('ignores .relayflow/, even when the repository commits its check script', () => {
    // The flow writes the run's checkCommand over a committed check script
    // before the implementer starts; that difference is not the implementer's.
    const { root } = repository();
    write(root, FLOW_CHECK_SCRIPT, 'set -e\nmake test\n');
    git(root, 'add', '-f', FLOW_CHECK_SCRIPT);
    git(root, 'commit', '-qm', 'check script');
    const base = git(root, 'rev-parse', 'HEAD').trim();
    write(root, FLOW_CHECK_SCRIPT, 'set -e\nnpm test\n');
    expect(changeCheck(root, base).token).toBe('unchanged');
    git(root, 'commit', '-qam', 'edit check script');
    expect(changeCheck(root, base).token).toBe('unchanged');
  });

  it('does not count untracked files, which nothing publishes, but names them', () => {
    const { root, base } = repository();
    write(root, 'notes.txt', 'scratch\n');
    write(root, 'src/new.ts', 'export {};\n');
    const result = changeCheck(root, base);
    expect(result).toMatchObject({ code: 0, token: 'unchanged' });
    expect(result.stderr).toContain('notes.txt');
    expect(result.stderr).toContain('src/new.ts');
  });

  it('says unchanged when an edit was undone, committed or not', () => {
    const { root, base } = repository();
    write(root, 'app.txt', 'work\n');
    git(root, 'commit', '-qam', 'work');
    git(root, 'revert', '--no-edit', 'HEAD');
    expect(changeCheck(root, base).token).toBe('unchanged');
    write(root, 'app.txt', 'work\n');
    write(root, 'app.txt', 'base\n');
    expect(changeCheck(root, base).token).toBe('unchanged');
  });

  it('says unknown, and never unchanged, when it cannot tell', () => {
    const { root } = repository();
    expect(changeCheck(root, '')).toMatchObject({ code: 0, token: 'unknown' });
    expect(changeCheck(root, 'deadbeef'.repeat(5))).toMatchObject({ code: 0, token: 'unknown' });
    const plain = mkdtempSync(path.join(tmpdir(), 'flow-needs-input-plain-'));
    roots.push(plain);
    expect(changeCheck(plain, 'abc123')).toMatchObject({ code: 0, token: 'unknown' });
  });
});

/** The records FLOW_NEEDS_INPUT_COMMAND prints, as Cloud would parse them. */
function records(stdout: string) {
  const lines = stdout.split('\n').filter(Boolean);
  return {
    lines,
    source: lines.filter(line => line.startsWith('relayflow needs-input-source: ')).map(line => line.slice('relayflow needs-input-source: '.length)),
    question: lines.filter(line => line.startsWith('relayflow needs-input: ')).map(line => line.slice('relayflow needs-input: '.length)),
    truncated: lines.filter(line => line.startsWith('relayflow needs-input-truncated: ')),
  };
}

describe('FLOW_NEEDS_INPUT_COMMAND', () => {
  const relay = (root: string, summary = '') => sh(`agent_summary='${summary.replace(/'/g, `'\\''`)}'; ${FLOW_NEEDS_INPUT_COMMAND}`, root);

  it('relays the implementer\'s question line by line, sanitized, in the documented records', () => {
    const { root } = repository();
    write(root, FLOW_NEEDS_INPUT_FILE, 'The ticket asks to update the \u001b[31m"gamification README"\u001b[0m.\r\n\n\tNo such file exists. Did you mean docs/native-gamification-plan.md?\u0007\n   \nrelayflow needs-input-source: forged\n');
    const result = relay(root, 'ignored when the file exists');
    expect(result.code).toBe(0);
    const parsed = records(result.stdout);
    // Every line is one of the three records: nothing in the text can add another.
    expect(parsed.lines.every(line => /^relayflow needs-input(-source|-truncated)?: /.test(line))).toBe(true);
    expect(parsed.lines[0]).toBe('relayflow needs-input-source: needs-input.md');
    expect(parsed.source).toEqual(['needs-input.md']);
    expect(parsed.question).toEqual([
      'The ticket asks to update the "gamification README".',
      'No such file exists. Did you mean docs/native-gamification-plan.md?',
      'relayflow needs-input-source: forged',
    ]);
    expect(parsed.truncated).toEqual([]);
    expect(result.stdout).not.toMatch(/[\u0000-\u0008\u000b-\u001f\u007f]/);
  });

  it('falls back to the implementer\'s own last message, and says when there is nothing', () => {
    const { root } = repository();
    const said = records(relay(root, 'I could not find the "NATIVE 3.0" section the ticket mentions.\nWhich document is it in?').stdout);
    expect(said.source).toEqual(['implementer-summary']);
    expect(said.question).toEqual(['I could not find the "NATIVE 3.0" section the ticket mentions.', 'Which document is it in?']);
    // A blank file is no question.
    write(root, FLOW_NEEDS_INPUT_FILE, ' \n\t\n');
    const nothing = relay(root);
    expect(nothing.code).toBe(0);
    expect(records(nothing.stdout)).toMatchObject({ source: ['none'], question: [], truncated: [] });
  });

  it('cuts a long question at a line, or a character, boundary and says how much it kept', () => {
    const { root } = repository();
    write(root, FLOW_NEEDS_INPUT_FILE, `${'é'.repeat(30)}\n`.repeat(200));
    const lines = records(relay(root).stdout);
    expect(lines.question).toHaveLength(60);
    expect(lines.question.every(line => line === 'é'.repeat(30))).toBe(true);
    expect(lines.truncated).toHaveLength(1);
    expect(lines.truncated[0]).toMatch(/^relayflow needs-input-truncated: \d+ of 12200 bytes$/);
    write(root, FLOW_NEEDS_INPUT_FILE, 'é'.repeat(3000));
    const one = relay(root);
    const parsed = records(one.stdout);
    expect(parsed.question).toHaveLength(1);
    expect(Buffer.byteLength(parsed.question[0]!)).toBeLessThanOrEqual(FLOW_NEEDS_INPUT_LIMIT);
    expect(parsed.question[0]).toMatch(/^é+$/);
    expect(parsed.truncated[0]).toMatch(/^relayflow needs-input-truncated: \d+ of 6001 bytes$/);
    expect(Buffer.from(one.stdout, 'utf8').toString('utf8')).not.toContain('�');
  });

  it('keeps the end of a long implementer summary, where its question is, cut on byte boundaries', () => {
    const { root } = repository();
    // One line of multibyte text: its tail, from a character boundary.
    const line = 'é'.repeat(3000) + ' Which document did you mean?';
    const one = relay(root, line);
    const parsed = records(one.stdout);
    expect(parsed.source).toEqual(['implementer-summary']);
    expect(parsed.question).toHaveLength(1);
    expect(parsed.question[0]!.endsWith('Which document did you mean?')).toBe(true);
    expect(Buffer.byteLength(parsed.question[0]!) + 1).toBeLessThanOrEqual(FLOW_NEEDS_INPUT_LIMIT);
    expect(parsed.question[0]).toMatch(/^é+ Which/);
    expect(parsed.truncated).toEqual([`relayflow needs-input-truncated: ${Buffer.byteLength(parsed.question[0]!) + 1} of ${Buffer.byteLength(line) + 1} bytes`]);
    expect(one.stdout).not.toContain('\uFFFD');
    // Many lines: the last whole lines that fit, never a partial first one.
    const lines = Array.from({ length: 300 }, (_, i) => `${i} ${'ü'.repeat(20)}`).concat('Which file is the README?');
    const many = records(relay(root, lines.join('\n')).stdout);
    expect(many.question.at(-1)).toBe('Which file is the README?');
    expect(many.question.length).toBeLessThanOrEqual(60);
    expect(many.question).toEqual(lines.slice(-many.question.length));
    expect(many.question.join('\n').length + many.question.length).toBeLessThanOrEqual(FLOW_NEEDS_INPUT_LIMIT);
    // More than 60 short lines: the last 60.
    const short = Array.from({ length: 100 }, (_, i) => `line ${i}`);
    expect(records(relay(root, short.join('\n')).stdout).question).toEqual(short.slice(-60));
  });

  it('reports the whole summary\'s size when the caller had to cut it', () => {
    const { root } = repository();
    const result = sh(`agent_summary='Which file?'; agent_summary_bytes=90000; ${FLOW_NEEDS_INPUT_COMMAND}`, root);
    expect(records(result.stdout)).toMatchObject({ question: ['Which file?'], truncated: ['relayflow needs-input-truncated: 12 of 90000 bytes'] });
    // A size that is not a number, or one for a needs-input.md, changes nothing.
    expect(records(sh(`agent_summary='Which file?'; agent_summary_bytes='1; x'; ${FLOW_NEEDS_INPUT_COMMAND}`, root).stdout).truncated).toEqual([]);
    write(root, FLOW_NEEDS_INPUT_FILE, 'Which file?\n');
    expect(records(sh(`agent_summary=''; agent_summary_bytes=90000; ${FLOW_NEEDS_INPUT_COMMAND}`, root).stdout).truncated).toEqual([]);
  });

  it('leaves nothing behind but the question itself', () => {
    const { root } = repository();
    write(root, FLOW_NEEDS_INPUT_FILE, 'Which file?\n');
    relay(root);
    expect(sh('ls .relayflow', root).stdout.trim().split('\n')).toEqual(['needs-input.md']);
  });
});

describe('FLOW_CHECK_REPORT_COMMAND setup note', () => {
  const report = (root: string, vars: string) => {
    expect(sh(`${vars}; baseline=; ${FLOW_CHECK_REPORT_COMMAND}`, root).code).toBe(0);
    return readFileSync(path.join(root, '.relayflow/check-report.md'), 'utf8');
  };
  const NOTE = 'future runs skip this setup';

  it('suggests keeping a discovered or default script that passed', () => {
    const { root } = repository();
    write(root, FLOW_CHECK_SCRIPT, 'set -e\nmake test\n');
    for (const setup of ['discovered', 'default']) {
      const text = report(root, `check=pass; check_setup=${setup}; check_digest=''`);
      expect(text, setup).toContain(NOTE);
      expect(text, setup).toContain(`\`${FLOW_CHECK_SCRIPT}\``);
      expect(text, setup).toContain("set this flow's test command in Cloud");
    }
  });

  it('suggests keeping a script the repair changed, whatever its origin', () => {
    const { root } = repository();
    write(root, FLOW_CHECK_SCRIPT, 'set -e\nmake test\n');
    const before = sh(`cksum < ${FLOW_CHECK_SCRIPT}`, root).token;
    write(root, FLOW_CHECK_SCRIPT, 'set -e\nmake build\nmake test\n');
    expect(report(root, `check=pass; check_setup=repository; check_digest='${before}'`)).toContain('(repaired during this run)');
    expect(report(root, `check=pass; check_setup=discovered; check_digest='${before}'`)).toContain('CI configuration, then repaired during this run');
    const now = sh(`cksum < ${FLOW_CHECK_SCRIPT}`, root).token;
    expect(report(root, `check=pass; check_setup=repository; check_digest='${now}'`)).not.toContain(NOTE);
  });

  it('says nothing for a script the run was given, for checks that did not pass, or when the caller says nothing', () => {
    const { root } = repository();
    write(root, FLOW_CHECK_SCRIPT, 'set -e\nmake test\n');
    expect(report(root, "check=pass; check_setup=input; check_digest=''")).not.toContain(NOTE);
    expect(report(root, "check=pass; check_setup=repository; check_digest=''")).not.toContain(NOTE);
    expect(report(root, "check=fail; check_setup=discovered; check_digest=''")).not.toContain(NOTE);
    expect(report(root, 'check=pass')).not.toContain(NOTE);
  });
});

const issue = { source: 'linear', title: 'Update the gamification README', body: 'See NATIVE 3.0.', labels: [], repository: 'wepost-no/wepost-saga', identifier: 'WEP-12', url: 'https://linear.app/wepost/issue/WEP-12' };
const draft: FactoryDraft = { version: 4, sources: ['github'], sourceSettings: {}, agents: ['claude'], otherAgent: '', task: '', workflow: 'traditional', step: 3 };

type Scenario = {
  /** What the change check prints after the implementer. */
  changed?: string;
  implementerTimedOut?: boolean;
  summary?: string;
  checks?: string[];
  /** What each FLOW_CHECK_RESOLVE_COMMAND prints, in order. */
  resolves?: string[];
  input?: Record<string, unknown>;
  workflow?: FactoryDraft['workflow'];
  edit?: (source: string) => string;
};

/** Runs the generated flow with every step mocked, recording each call. */
async function runFlow(scenario: Scenario = {}) {
  const source = (scenario.edit ?? (text => text))(factorySource({ ...draft, workflow: scenario.workflow ?? 'traditional' })).replace('import { flow } from "@relayflows/surface";', '');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
  const exports: { default?: (ctx: unknown, input: unknown) => Promise<void> } = {};
  new Function('exports', 'flow', compiled.outputText)(exports, (_name: string, _options: unknown, body: unknown) => body);
  const calls: string[] = [];
  const tasks: Record<string, string> = {};
  const errors: string[] = [];
  let finish = '';
  let checkIndex = 0;
  let resolveIndex = 0;
  const originalError = console.error;
  console.error = (message: string) => { errors.push(String(message)); };
  try {
    await exports.default!({
      agent: async (name: string, options: { task: string }) => {
        calls.push(`agent:${name}`);
        tasks[name] = options.task;
        if (name === 'implementer') return { completionReason: scenario.implementerTimedOut ? 'timeout' : 'success', summary: scenario.summary ?? '', artifacts: [] };
        return { completionReason: 'success', summary: '', artifacts: [] };
      },
      run: async (command: string) => {
        calls.push(command);
        if (command === 'date +%s') return '1759000000';
        if (command === 'git rev-parse HEAD') return 'abc123';
        if (command.endsWith(FLOW_CHANGE_CHECK_COMMAND)) return scenario.changed ?? 'changed';
        if (command.endsWith(FLOW_NEEDS_INPUT_COMMAND)) {
          // The real command, on a repository holding what the implementer wrote.
          const { root } = repository();
          write(root, FLOW_NEEDS_INPUT_FILE, 'Which file is the "gamification README"?\nDid you mean docs/native-gamification-plan.md?\n');
          return sh(command, root).stdout;
        }
        if (command.endsWith(FLOW_CHECK_RUN_COMMAND)) return scenario.checks?.[checkIndex++] ?? 'pass';
        if (command === FLOW_CHECK_RESOLVE_COMMAND) return scenario.resolves?.[resolveIndex++] ?? 'script';
        if (command.endsWith(FLOW_BASE_CHECK_COMMAND)) return 'fail';
        if (command.endsWith(FLOW_PUBLISH_CHECK_COMMAND)) return 'publish';
        if (command.includes('validate') || command.includes('missing-github-closing-reference')) return 'valid';
        if (command.startsWith('test -s .relayflow/check.sh')) return 'no';
        if (command.startsWith('test -f review.clean')) return 'yes';
        return '';
      },
      human: async () => { throw new Error('unsupported'); },
      done: (reason: string) => { finish = reason; },
    }, { issue, approver: 'owner', ...scenario.input });
  } finally { console.error = originalError; }
  return { calls, tasks, errors, finish };
}

describe('the generated Garden flow', () => {
  const ran = (calls: string[], suffix: string) => calls.some(call => call.endsWith(suffix));

  it('tells the implementer to write its question instead of guessing', async () => {
    for (const workflow of ['traditional', 'prototype', 'simple'] as const) {
      const { tasks } = await runFlow({ workflow });
      expect(tasks.implementer, workflow).toContain(FLOW_NEEDS_INPUT_HINT);
      expect(tasks.implementer, workflow).toContain(FLOW_NEEDS_INPUT_FILE);
      expect(tasks['check-repair'] ?? '', workflow).not.toContain(FLOW_NEEDS_INPUT_FILE);
    }
  });

  it('stops right after an implementer that changed nothing, relaying its question (run 91c1a5cd)', async () => {
    const { calls, errors, finish } = await runFlow({ changed: 'unchanged', checks: ['fail', 'fail', 'fail'] });
    expect(finish).toBe('needs_human');
    // Nothing was checked, repaired, compared, pushed or opened.
    const after = calls.slice(calls.indexOf('agent:implementer') + 1);
    expect(after.filter(call => call.startsWith('agent:'))).toEqual([]);
    expect(ran(calls, FLOW_CHECK_RUN_COMMAND)).toBe(false);
    expect(ran(calls, FLOW_BASE_CHECK_COMMAND)).toBe(false);
    expect(calls.some(call => call.includes(FLOW_PUSH_COMMAND))).toBe(false);
    expect(calls.some(call => call.startsWith(FLOW_OPEN_CHANGE_COMMAND))).toBe(false);
    expect(after.at(-1)).toMatch(new RegExp(`${FLOW_NEEDS_INPUT_COMMAND.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    // The stop message carries the question in its parseable records.
    const stop = errors.find(error => error.startsWith('Stopped: the implementer made no changes'))!;
    expect(stop).toContain('No checks ran, no branch was pushed and no pull request was opened.');
    expect(stop).toContain('\nrelayflow needs-input-source: needs-input.md\nrelayflow needs-input: Which file is the "gamification README"?\nrelayflow needs-input: Did you mean docs/native-gamification-plan.md?');
  });

  it('hands the end of the implementer\'s own last message to the relay, from a line start (Cursor, cubic)', async () => {
    // Multibyte text: a character limit and a byte limit are not the same, and
    // the question at the end must survive both.
    const summary = Array.from({ length: 2000 }, (_, i) => `${i} ${'é'.repeat(20)}`).join('\n') + '\nI asked about the gamification README.';
    const { calls } = await runFlow({ changed: 'unchanged', summary });
    const relayCall = calls.find(call => call.endsWith(FLOW_NEEDS_INPUT_COMMAND))!;
    const value = /^agent_summary='([^']*)'; /.exec(relayCall)![1]!;
    expect(value.length).toBeLessThanOrEqual(NEEDS_INPUT_SUMMARY_WINDOW);
    expect(summary.endsWith(value)).toBe(true);
    expect(summary[summary.length - value.length - 1]).toBe('\n');
    expect(relayCall).toContain(`; agent_summary_bytes=${Buffer.byteLength(summary)}; `);
    // The flow's own call, run for real where the implementer wrote no file.
    const { root } = repository();
    const parsed = records(sh(relayCall, root).stdout);
    expect(parsed.source).toEqual(['implementer-summary']);
    expect(parsed.question.at(-1)).toBe('I asked about the gamification README.');
    expect(parsed.question[0]).toMatch(/^\d+ é{20}$/);
    expect(parsed.truncated).toHaveLength(1);
    expect(parsed.truncated[0]).toMatch(new RegExp(`^relayflow needs-input-truncated: \\d+ of ${Buffer.byteLength(summary)} bytes$`));
    // A short message is passed whole, with no size.
    const short = await runFlow({ changed: 'unchanged', summary: 'Which file?' });
    expect(short.calls.find(call => call.endsWith(FLOW_NEEDS_INPUT_COMMAND))).toMatch(/^agent_summary='Which file\?'; agent_summary_bytes=; /);
  });

  it('carries on as before when there are changes, when it cannot tell, or when the implementer timed out', async () => {
    for (const changed of ['changed', 'unknown', '', 'garbled']) {
      const { calls, finish } = await runFlow({ changed });
      expect(ran(calls, FLOW_CHECK_RUN_COMMAND), changed).toBe(true);
      expect(calls.some(call => call.startsWith(FLOW_OPEN_CHANGE_COMMAND)), changed).toBe(true);
      expect(ran(calls, FLOW_NEEDS_INPUT_COMMAND), changed).toBe(false);
      expect(finish, changed).toBe('needs_human');
    }
    // A timed-out implementer's work is checked and published as a draft, as
    // before; whether it changed anything is not asked.
    const timedOut = await runFlow({ changed: 'unchanged', implementerTimedOut: true });
    expect(ran(timedOut.calls, FLOW_CHANGE_CHECK_COMMAND)).toBe(false);
    expect(ran(timedOut.calls, FLOW_CHECK_RUN_COMMAND)).toBe(true);
  });

  it('uses input.checkCommand when it is non-empty, instead of discovering one', async () => {
    const { calls } = await runFlow({ input: { checkCommand: '  npm run build:core && npm test  ' } });
    expect(calls).not.toContain('agent:check-discovery');
    expect(calls).toContain("mkdir -p .relayflow && printf '%s\\n' 'set -e' 'npm run build:core && npm test' > .relayflow/check.sh");
    expect(calls.find(call => call.startsWith('check=pass; '))).toContain('check_setup=input; ');
    for (const checkCommand of ['', '   ', undefined, 42]) {
      const fallback = await runFlow({ input: { checkCommand } });
      expect(fallback.calls, String(checkCommand)).toContain('agent:check-discovery');
      expect(fallback.calls.some(call => call.startsWith("mkdir -p .relayflow && printf")), String(checkCommand)).toBe(false);
      expect(fallback.calls.find(call => call.startsWith('check=pass; ')), String(checkCommand)).toContain('check_setup=discovered; ');
    }
  });

  it('lets input.checkCommand override the author\'s constant, which still applies without it', async () => {
    const edit = (text: string) => text.replace('const checkCommand = "";', 'const checkCommand = "make ci";');
    const constant = await runFlow({ edit });
    expect(constant.calls).toContain("mkdir -p .relayflow && printf '%s\\n' 'set -e' 'make ci' > .relayflow/check.sh");
    const both = await runFlow({ edit, input: { checkCommand: 'npm test' } });
    expect(both.calls).toContain("mkdir -p .relayflow && printf '%s\\n' 'set -e' 'npm test' > .relayflow/check.sh");
    expect(both.calls.some(call => call.includes("'make ci'"))).toBe(false);
    expect(factorySource(draft)).toContain('type Input = { issue: Issue; approver: string; checkCommand?: string };');
  });

  it('reports a repaired script to the check report by its digest before the repair', async () => {
    const { calls } = await runFlow({ checks: ['fail', 'pass'] });
    const digest = calls.findIndex(call => call.startsWith('cksum < .relayflow/check.sh'));
    expect(digest).toBeGreaterThan(-1);
    expect(digest).toBeLessThan(calls.indexOf('agent:check-repair'));
    expect(calls.filter(call => call.startsWith('cksum < '))).toHaveLength(1);
    const clean = await runFlow();
    expect(clean.calls.some(call => call.startsWith('cksum < '))).toBe(false);
    expect(clean.calls.find(call => call.startsWith('check=pass; '))).toContain("check_digest=''; ");
  });

  it('says a script it wrote after the change is the default, so the report suggests keeping it (CodeRabbit, cubic)', async () => {
    // Nothing to run before the change; the change added a project file, so the
    // second resolve wrote the ecosystem default.
    const added = await runFlow({ resolves: ['none', 'default'] });
    expect(added.calls.filter(call => call === FLOW_CHECK_RESOLVE_COMMAND)).toHaveLength(2);
    expect(added.calls.find(call => call.startsWith('check=pass; '))).toContain('check_setup=default; ');
    const still = await runFlow({ resolves: ['none', 'none'] });
    expect(still.calls.find(call => call.startsWith('check=skipped; ') || call.startsWith('check=none; ') || call.startsWith('check=pass; '))).toContain('check_setup=discovered; ');
  });

  it('treats missing or non-string ticket metadata as blank instead of throwing (CodeRabbit, cubic)', async () => {
    for (const metadata of [{ source: undefined }, { source: 42, identifier: 7, url: null }]) {
      const { finish, calls } = await runFlow({ input: { issue: { ...issue, ...metadata } } });
      expect(finish, JSON.stringify(metadata)).toBe('needs_human');
      expect(calls, JSON.stringify(metadata)).toContain('agent:implementer');
    }
  });

  it('prints one progress line per phase change', async () => {
    const { errors } = await runFlow({ checks: ['fail', 'pass'] });
    expect(errors.filter(error => error.startsWith('relayflow phase: '))).toEqual([
      'relayflow phase: implementing', 'relayflow phase: checking', 'relayflow phase: repairing', 'relayflow phase: checking',
      'relayflow phase: publishing', 'relayflow phase: reviewing',
    ]);
  });
});
