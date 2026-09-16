import { afterAll, describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { DEFAULT_FACTORY, factorySource, type FactoryDraft } from '../flow-onboarding';
import { LOCAL_INSTALL, LOCAL_PREFLIGHT, LOCAL_RUN, PLACEHOLDER_BODY, PLACEHOLDER_TITLE, RELAYFLOWS_VERSION, localInput, localKitArchive, localKitFiles } from '../flow-local';
import { FLOW_TEST_COMMAND } from '../flow-workflows';

const draft: FactoryDraft = { ...DEFAULT_FACTORY, sources: ['github'], sourceSettings: { github: { repository: 'acme/app', labels: 'bug, ready' } }, agents: ['claude', 'codex'], workflow: 'traditional', step: 3 };

function compile(source: string) {
  const exports: { default?: (f: unknown, input: unknown) => Promise<void> } = {};
  const compiled = ts.transpileModule(source.replace('import { flow } from "@relayflows/surface";', ''), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
  new Function('exports', 'flow', compiled.outputText)(exports, (_name: string, _header: unknown, fn: unknown) => fn);
  return exports.default!;
}

describe('local flow starter kit', () => {
  it('creates a readable zip with a flow, input, and instructions', () => {
    const files = localKitFiles(draft);
    const unpacked = unzipSync(localKitArchive(draft));
    expect(Object.keys(unpacked).sort()).toEqual(['START-HERE.txt', 'flow-input.json', 'relay-preflight.mjs', 'software-factory.flow.mts']);
    for (const [name, content] of Object.entries(files)) expect(strFromU8(unpacked[name])).toBe(content);
    expect(files['START-HERE.txt']).toContain(LOCAL_INSTALL);
    expect(files['START-HERE.txt']).toContain(LOCAL_RUN);
    expect(LOCAL_RUN).toContain('--local-agent');
    expect(LOCAL_RUN).toContain('--input flow-input.json');
  });

  it('pins a Flows CLI new enough to run its own authored TypeScript flow', () => {
    // 2.0.9 linked `flows` to the prebuilt runtime binary, which cannot resolve
    // @relayflows/surface from a .flow.mts, and shipped a `flows check` with no
    // TypeScript path at all — so step 4 always died on "contains invalid YAML
    // or JSON" before the run started. Verified fixed in 2.0.12. 2.0.13 then
    // made a failed step diagnosable: before it, a failure reported only
    // `FAILED [protocol_error] ... step_failed` naming the run id, with no exit
    // code, no output and no pointer to the journal that held all of it.
    expect(LOCAL_INSTALL).toContain(`relayflows@${RELAYFLOWS_VERSION}`);
    expect(LOCAL_INSTALL).toContain(`@relayflows/surface@${RELAYFLOWS_VERSION}`);
    expect(RELAYFLOWS_VERSION).toBe('2.0.13');
  });

  it('runs preconditions and the spec check before the flow itself', () => {
    const steps = LOCAL_RUN.split('&&').map(step => step.trim());
    expect(steps[0]).toBe('git switch -c relay/first-flow');
    expect(steps[1]).toBe(`node ${LOCAL_PREFLIGHT}`);
    expect(steps[2]).toBe('npx flows check software-factory.flow.mts');
    expect(steps.at(-1)).toBe('npx flows run --local-agent software-factory.flow.mts --input flow-input.json');
    expect(localKitFiles(draft)['START-HERE.txt']).toContain(LOCAL_PREFLIGHT);
  });

  it('checks the placeholder with the exact sentinel the kit writes', () => {
    const script = localKitFiles(draft)[LOCAL_PREFLIGHT];
    const { issue } = localInput(draft) as { issue: { title: string; body: string } };
    // Drift between the two is the bug this guards: if the sentinel stops
    // matching what localInput prefills, an unedited ticket reaches an agent.
    expect(issue.body).toBe(PLACEHOLDER_BODY);
    expect(issue.title).toBe(PLACEHOLDER_TITLE);
    expect(script).toContain(JSON.stringify(PLACEHOLDER_BODY));
    // body, not title: a `contains` filter overwrites title at build time.
    const filtered = { ...draft, sourceSettings: { github: { repository: 'acme/app', contains: 'Please fix' } } };
    const contains = localInput(filtered) as { issue: { title: string; body: string } };
    expect(contains.issue.title).toBe('Please fix');
    expect(contains.issue.body).toBe(PLACEHOLDER_BODY);
    expect(script).toContain('const untouched = issue.body === PLACEHOLDER_BODY;');
  });

  it('prompts on a terminal and fails fast without one instead of hanging', () => {
    const script = localKitFiles(draft)[LOCAL_PREFLIGHT];
    expect(script).toContain('createInterface');
    expect(script).toContain('untouched && !process.stdin.isTTY');
    // The non-interactive refusal has to name the file and both fields.
    expect(script).toContain('Set issue.title and issue.body to the real ticket');
    expect(script).toContain('writeFileSync(INPUT, JSON.stringify(input, null, 2)');
  });

  it('fails fast on a throwaway repo, a missing origin or no gh sign-in', () => {
    const script = localKitFiles(draft)[LOCAL_PREFLIGHT];
    expect(script).toContain('git("rev-parse", "--is-inside-work-tree")');
    expect(script).toContain('git("remote", "get-url", "origin")');
    expect(script).toContain('execFileSync("gh", ["auth", "status"]');
    expect(script).toContain('const dirty = dirtyPaths();');
    // execFile, never a shell: repository paths contain spaces and parentheses.
    expect(script).toContain('execFileSync');
    expect(script).not.toMatch(/\bexecSync\(/);
    // The kit's own files are not the user's uncommitted work.
    for (const name of Object.keys(localKitFiles(draft))) expect(script).toContain(`"${name}"`);
  });

  it('reads git porcelain status without trimming off the first path', () => {
    const script = localKitFiles(draft)[LOCAL_PREFLIGHT];
    // `git status --porcelain` puts the status in columns 1-2, so an unstaged
    // change leads with a space (" M package.json"). Trimming the command
    // output strips that space from the first line only; slice(3) then eats a
    // character of that path, it no longer matches KIT_FILES, and a routine
    // `npm install` touching the tracked package.json falsely blocks the run.
    expect(script).toContain('return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });');
    expect(script).not.toMatch(/execFileSync\("git"[^\n]*\)\.trim\(\)/);
    expect(script).toContain('git(...prefix, "status", "--porcelain").split("\\n").filter(Boolean)');
    // The same helper checks a relocation target, so a repository is only ever
    // called dirty for work that is not the kit's own files.
    expect(script).toContain('dirtyPaths("-C", target)');
  });

  it('leaves a Markdown-sourced kit no placeholder ticket to prompt for', () => {
    const markdown: FactoryDraft = { ...draft, sources: ['markdown'], sourceSettings: { markdown: { path: 'docs/ticket.md' } } };
    expect(localInput(markdown)).not.toHaveProperty('issue');
    // The guard keys off input.issue, so the Markdown kit skips the prompt.
    expect(localKitFiles(markdown)[LOCAL_PREFLIGHT]).toContain('if (issue) {');
  });

  it('preserves issue filters and provides an editable one-ticket input', () => {
    expect(localInput(draft).issue).toMatchObject({ source: 'github', repository: 'acme/app', labels: ['bug', 'ready'] });
    const slack = { ...draft, sources: ['slack'] as const, sourceSettings: { slack: { channel: '#build', contains: 'Please fix', mentioned: true } } };
    expect(localInput({ ...slack, sources: [...slack.sources] }).issue).toMatchObject({ source: 'slack', title: 'Please fix', channel: '#build', mentioned: true });
  });

  it('says which filter turned a local ticket away instead of cancelling silently', async () => {
    const input = localInput(draft) as { approver: string; issue: Record<string, unknown> };
    const messages: string[] = [];
    const original = console.error;
    console.error = (message: string) => { messages.push(message); };
    const calls: string[] = [];
    let finish = '';
    try {
      await compile(localKitFiles(draft)['software-factory.flow.mts'])({
        agent: async (name: string) => { calls.push(name); },
        run: async () => '',
        done: (reason: string) => { finish = reason; },
      }, { ...input, issue: { ...input.issue, labels: ['ready'] } });
    } finally { console.error = original; }
    expect(finish).toBe('canceled');
    expect(calls).toEqual([]);
    expect(messages[0]).toContain('missing required label: bug');
    expect(messages[0]).toContain('flow-input.json');
  });

  it('keeps a co-selected source’s prefill instead of letting Markdown win in silence', () => {
    // Reported with Linear + Markdown both selected: flow-input.json came out
    // as { approver } alone, so the ticket source's prefill was discarded, its
    // filters in issueRejection were unreachable, and START-HERE never said so.
    const both: FactoryDraft = { ...draft, sources: ['markdown', 'github'], sourceSettings: { ...draft.sourceSettings, markdown: { path: 'docs/ticket.md' } } };
    expect(localInput(both).issue).toMatchObject({ source: 'github', repository: 'acme/app', labels: ['bug', 'ready'] });
    // Selection order is not a hidden setting: either order prefills the ticket.
    expect(localInput({ ...both, sources: ['github', 'markdown'] })).toEqual(localInput(both));
    // Nothing is lost either way: the flow still reads the Markdown file when
    // flow-input.json carries no issue, and step 3 says which one wins.
    expect(localKitFiles(both)['software-factory.flow.mts']).toContain('input.issue ?? {');
    const start = localKitFiles(both)['START-HERE.txt'];
    expect(start).toContain('it is the fallback here, not the default');
    expect(start).toContain('delete "issue" from flow-input.json');
    expect(start).toContain('docs/ticket.md');
    // Markdown on its own is untouched: no placeholder ticket, no prompt.
    const alone: FactoryDraft = { ...both, sources: ['markdown'] };
    expect(localInput(alone)).toEqual({ approver: 'local' });
    expect(localKitFiles(alone)['START-HERE.txt']).toContain('Write the ticket and acceptance criteria in docs/ticket.md');
    expect(localKitFiles(alone)['START-HERE.txt']).not.toContain('delete "issue" from flow-input.json');
  });

  it('does not overwrite the user’s Markdown task file', () => {
    const markdown: FactoryDraft = { ...draft, sources: ['markdown'], sourceSettings: { markdown: { path: 'docs/ticket.md' } } };
    expect(localInput(markdown)).toEqual({ approver: 'local' });
    expect(localKitFiles(markdown)).not.toHaveProperty('docs/ticket.md');
    expect(localKitFiles(markdown)['START-HERE.txt']).toContain('docs/ticket.md');
  });

  it('runs the traditional sequence and hands off for manual approval locally', async () => {
    const calls: string[] = [];
    let finish = '';
    await compile(localKitFiles(draft)['software-factory.flow.mts'])({
      agent: async (name: string) => { calls.push(name); },
      run: async (command: string) => command.startsWith('test -f') ? 'yes' : '',
      done: (reason: string) => { finish = reason; },
    }, localInput(draft));
    expect(calls).toEqual(['planner', 'plan-reviewer', 'implementer', 'adversary-1', 'adversary-2']);
    expect(finish).toBe('needs_human');
    expect(factorySource(draft)).toContain('return f.done("needs_human")');
    expect(factorySource(draft, 'local')).not.toContain('f.human(');
  });


  it('stops every preset for human review after tests and PR creation', async () => {
    for (const workflow of ['traditional', 'prototype', 'simple'] as const) {
      const commands: string[] = [];
      let finish = '';
      const selected = { ...draft, workflow };
      await compile(factorySource(selected, 'local'))({
        agent: async () => {},
        run: async (command: string) => { commands.push(command); return command.startsWith('test -f') ? 'yes' : ''; },
        done: (reason: string) => { finish = reason; },
      }, localInput(selected));
      expect(finish).toBe('needs_human');
      const testIndex = commands.indexOf(FLOW_TEST_COMMAND);
      const createIndex = commands.findIndex(command => command.startsWith('gh pr create'));
      expect(testIndex).toBeGreaterThanOrEqual(0);
      expect(createIndex).toBeGreaterThan(testIndex);
      expect(localKitFiles(selected)['START-HERE.txt']).toContain('require a pull request, an approving review, and passing CI status checks');
    }
  });

  it('does not publish a PR or signal readiness if scripted tests fail', async () => {
    for (const workflow of ['traditional', 'prototype', 'simple'] as const) {
      const commands: string[] = [];
      let finish = '';
      const selected = { ...draft, workflow };
      await expect(compile(factorySource(selected, 'local'))({
        agent: async () => {},
        run: async (command: string) => { commands.push(command); if (command === FLOW_TEST_COMMAND) throw Error('tests failed'); return ''; },
        done: (reason: string) => { finish = reason; },
      }, localInput(selected))).rejects.toThrow('tests failed');
      expect(commands.some(command => command.startsWith('git push') || command.startsWith('gh pr create'))).toBe(false);
      expect(finish).toBe('');
    }
  });

  it.each([false, true])('pushes fixer revisions only after passing tests (failure: %s)', async (fail) => {
    const calls: string[] = [];
    let checks = 0;
    const run = compile(factorySource(draft, 'local'))({
      agent: async (name: string, options: { task: string }) => {
        calls.push(name);
        if (name === 'fixer') expect(options.task).toContain('Commit fixes without pushing');
      },
      run: async (command: string) => {
        calls.push(command);
        if (command === FLOW_TEST_COMMAND && ++checks === 2 && fail) throw Error('revision failed');
        return command.startsWith('test -f') ? 'no' : '';
      },
      done: () => {},
    }, localInput(draft));
    if (fail) await expect(run).rejects.toThrow('revision failed');
    else await run;
    const fixer = calls.indexOf('fixer');
    expect(fixer).toBeGreaterThan(0);
    expect(calls[fixer + 1]).toBe(FLOW_TEST_COMMAND);
    if (fail) expect(calls).not.toContain('git push');
    else expect(calls[fixer + 2]).toBe('git push');
  });

  it('generates valid local source for every preset with an explicit runtime limit', () => {
    for (const workflow of ['traditional', 'prototype', 'simple'] as const) {
      const source = factorySource({ ...draft, workflow }, 'local');
      const file = ts.createSourceFile('local.flow.ts', source, ts.ScriptTarget.ES2022, true);
      expect((file as unknown as { parseDiagnostics: unknown[] }).parseDiagnostics).toEqual([]);
      expect(source).toContain('wallclock: "1h"');
      expect(source).not.toContain('$8/run');
      expect(source).not.toContain('pr merge');
    }
  });
});

/**
 * The kit extracted to ~/Downloads and run there is the common first mistake,
 * so these run the generated script for real: a throwaway repository per case,
 * answers typed into it, and the filesystem checked afterwards.
 */
describe('relocating a kit that was extracted outside a repository', () => {
  const roots: string[] = [];
  afterAll(() => { for (const root of roots) rmSync(root, { recursive: true, force: true }); });

  const GIT_CONFIG = ['-c', 'user.email=kit@example.com', '-c', 'user.name=Kit', '-c', 'init.defaultBranch=main', '-c', 'commit.gpgsign=false'];
  const git = (...args: string[]) => execFileSync('git', [...GIT_CONFIG, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

  function workspace() {
    const root = mkdtempSync(join(tmpdir(), 'relay-kit-'));
    roots.push(root);
    // The directory a real onboarding died in was "software-factory-local (1)":
    // spaces and parentheses, which is why nothing here goes through a shell.
    const download = join(root, 'software-factory-local (1)');
    mkdirSync(download);
    for (const [name, content] of Object.entries(localKitFiles(draft))) writeFileSync(join(download, name), content);
    writeFileSync(join(root, 'force-tty.mjs'), 'process.stdin.isTTY = true;\n');
    return { root, download };
  }

  function repo(root: string, name: string, options: { origin?: boolean; dirty?: boolean } = {}) {
    const dir = join(root, name);
    mkdirSync(dir, { recursive: true });
    git('init', '-q', dir);
    writeFileSync(join(dir, 'src.txt'), 'hello\n');
    git('-C', dir, 'add', '-A');
    git('-C', dir, 'commit', '-qm', 'first');
    if (options.origin !== false) git('-C', dir, 'remote', 'add', 'origin', 'https://example.com/acme/app.git');
    if (options.dirty) writeFileSync(join(dir, 'src.txt'), 'edited\n');
    return dir;
  }

  /**
   * Runs the generated preflight the way a person does. Forcing isTTY on a pipe
   * is the only way to reach the prompt without a pseudo-terminal; answers are
   * typed one at a time as each prompt appears, because readline drops lines
   * that arrive while no question is pending. Running out of answers closes the
   * stream, which is what Ctrl+D does.
   */
  function preflight(cwd: string, root: string, answers: string[], tty = true, env?: NodeJS.ProcessEnv) {
    const args = tty ? ['--import', pathToFileURL(join(root, 'force-tty.mjs')).href, LOCAL_PREFLIGHT] : [LOCAL_PREFLIGHT];
    const child = spawn(process.execPath, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'], ...(env ? { env } : {}) });
    const queue = [...answers];
    let out = '';
    let err = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (text: string) => {
      out += text;
      if (!text.includes('(empty to stop): ')) return;
      const answer = queue.shift();
      if (answer === undefined) child.stdin.end();
      else child.stdin.write(answer + '\n');
    });
    child.stderr.on('data', (text: string) => { err += text; });
    return new Promise<{ code: number | null; out: string; err: string }>((resolve, reject) => {
      // A hang is a failure of this feature, not a suite that never finishes.
      const timer = setTimeout(() => { child.kill('SIGKILL'); reject(Error('the preflight never exited\n' + out + err)); }, 20_000);
      child.on('error', reject);
      child.on('close', code => { clearTimeout(timer); resolve({ code, out, err }); });
    });
  }

  it('copies the kit into the repository the user names and prints the sequence for it', async () => {
    const { root, download } = workspace();
    const target = repo(root, 'checkout (1)');
    const { code, out } = await preflight(download, root, [target]);
    expect(readdirSync(target).filter(name => name !== '.git').sort()).toEqual([...Object.keys(localKitFiles(draft)), 'src.txt'].sort());
    // Step 2 installed into the download directory, so npx would resolve
    // nothing in the repository: the install has to be printed again, before
    // the chain, and node_modules is never carried across.
    expect(out).toContain("cd '" + target + "'");
    expect(out.indexOf(LOCAL_INSTALL)).toBeGreaterThan(out.indexOf("cd '"));
    expect(out.indexOf(LOCAL_INSTALL)).toBeLessThan(out.indexOf('npx flows check'));
    for (const line of LOCAL_RUN.split('\n')) expect(out).toContain(line);
    expect(existsSync(join(target, 'node_modules'))).toBe(false);
    // Exit 1, not 0: the rest of step 4's && chain must not run in a directory
    // that is still not a repository.
    expect(code).toBe(1);
  }, 30_000);

  it('writes nothing into a target the flow could not have pushed from', async () => {
    const { root, download } = workspace();
    const missing = join(root, 'nope');
    const plain = join(root, 'not a repo (yet)');
    mkdirSync(plain);
    const noOrigin = repo(root, 'no-origin', { origin: false });
    const unclean = repo(root, 'unclean', { dirty: true });
    const target = repo(root, 'good');
    const { code, out } = await preflight(download, root, [missing, plain, noOrigin, unclean, target]);
    expect(out).toContain('There is no ' + missing);
    expect(out).toContain('Not a Git repository: ' + plain);
    expect(out).toContain('No origin remote there');
    expect(out).toContain('Uncommitted changes there (src.txt)');
    for (const rejected of [plain, noOrigin, unclean]) expect(existsSync(join(rejected, LOCAL_PREFLIGHT))).toBe(false);
    expect(existsSync(missing)).toBe(false);
    // Rejection re-prompts; it does not give up on the fifth, valid answer.
    expect(existsSync(join(target, LOCAL_PREFLIGHT))).toBe(true);
    expect(code).toBe(1);
  }, 30_000);

  it('keeps a file that is already there rather than overwriting it', async () => {
    const { root, download } = workspace();
    const target = repo(root, 'checkout');
    writeFileSync(join(target, 'flow-input.json'), '{ "approver": "mine" }\n');
    const { out } = await preflight(download, root, [target]);
    // A flow-input.json already filled in is worth more than the placeholder
    // this kit ships, and START-HERE.txt promises existing files are kept.
    expect(readFileSync(join(target, 'flow-input.json'), 'utf8')).toBe('{ "approver": "mine" }\n');
    expect(out).toContain('Left alone, already there: flow-input.json');
    expect(out).toContain('START-HERE.txt');
    expect(existsSync(join(target, LOCAL_PREFLIGHT))).toBe(true);
  }, 30_000);

  it('never asks without a terminal, and never hangs waiting to', async () => {
    const { root, download } = workspace();
    const target = repo(root, 'checkout');
    const { code, out, err } = await preflight(download, root, [], false);
    // stdin is an open pipe nobody writes to: reaching the prompt would hang
    // the run, so the guard has to fail with the message it always gave.
    expect(out).not.toContain('Path to your repository');
    expect(err).toContain('Extract the kit into your repository root and run it from there.');
    expect(err).toContain('the flow would fail at git push after the agents had finished their work.');
    expect(existsSync(join(target, LOCAL_PREFLIGHT))).toBe(false);
    expect(code).toBe(1);
  }, 30_000);

  it.each([['an empty answer', ['']], ['Ctrl+D', []]] as const)('leaves cleanly on %s', async (_label, answers) => {
    const { root, download } = workspace();
    const target = repo(root, 'checkout');
    const { code, out, err } = await preflight(download, root, [...answers]);
    expect(out).toContain('Path to your repository (empty to stop): ');
    expect(err).toContain('Extract the kit into your repository root and run it from there.');
    // readline leaves question() pending forever once the stream ends, so an
    // unraced await ends the process on an unsettled top-level await, exit 13,
    // with no message at all.
    expect(err).not.toContain('unsettled top-level await');
    expect(code).toBe(1);
    expect(existsSync(join(target, LOCAL_PREFLIGHT))).toBe(false);
  }, 30_000);

  it.each([['dragged in, shell-escaped', (path: string) => path.replace(/([ ()])/g, '\\$1')], ['pasted with quotes', (path: string) => `"${path}"`]])('accepts a path %s', async (_label, type) => {
    const { root, download } = workspace();
    const target = repo(root, 'checkout (2)');
    const { code } = await preflight(download, root, [type(target)]);
    expect(existsSync(join(target, LOCAL_PREFLIGHT))).toBe(true);
    expect(code).toBe(1);
  }, 30_000);

  /** The kit extracted into the repository, as step 1 of START-HERE says. */
  function installed(root: string, name: string, options: { dependency?: boolean; ticket?: boolean } = {}) {
    const target = repo(root, name);
    for (const [file, content] of Object.entries(localKitFiles(draft))) writeFileSync(join(target, file), content);
    if (options.dependency) {
      const pkg = join(target, 'node_modules', 'relayflows');
      mkdirSync(pkg, { recursive: true });
      writeFileSync(join(pkg, 'package.json'), '{ "name": "relayflows", "version": "0.0.0", "main": "index.js" }\n');
      writeFileSync(join(pkg, 'index.js'), 'module.exports = {};\n');
    }
    if (options.ticket) {
      writeFileSync(join(target, 'flow-input.json'), JSON.stringify({ approver: 'local',
        issue: { source: 'github', title: 'Fix login', body: 'Users cannot sign in.', labels: ['bug', 'ready'], repository: 'acme/app' } }, null, 2) + '\n');
    }
    return target;
  }
  /** A gh that is signed in, so the check under test is the one that decides. */
  function signedIn(root: string) {
    const bin = join(root, 'bin');
    mkdirSync(bin, { recursive: true });
    writeFileSync(join(bin, 'gh'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
    return { ...process.env, PATH: bin + ':' + process.env.PATH };
  }

  it('stops on a skipped install instead of leaving npx to fail without advice', async () => {
    const { root } = workspace();
    const target = installed(root, 'no-install');
    const { code, out, err } = await preflight(target, root, [], true, signedIn(root));
    // What this replaces: "Preconditions met. Starting the flow." followed by
    // npm's "could not determine executable to run", which names neither the
    // missing package nor the directory the install has to happen in.
    expect(err).toContain('relayflows is not installed in this repository.');
    expect(err).toContain(LOCAL_INSTALL);
    expect(err).toContain('Run step 2 in this repository first:');
    expect(out).not.toContain('Preconditions met');
    // Before the prompt, not after: the operator typed out a whole ticket and
    // then lost the run to a missing binary.
    expect(out).not.toContain('still holds the placeholder ticket');
    expect(code).toBe(1);
  }, 30_000);

  it('passes the same check once step 2 has run in that repository', async () => {
    const { root } = workspace();
    const target = installed(root, 'installed', { dependency: true, ticket: true });
    const { code, out, err } = await preflight(target, root, [], true, signedIn(root));
    // The paired positive: a check that cannot pass is as useless as none.
    expect(err).not.toContain('relayflows is not installed');
    expect(out).toContain('Preconditions met. Starting the flow.');
    expect(code).toBe(0);
    // Resolved from the repository, not from the kit: node_modules next to the
    // script says nothing about where npx will look.
    expect(localKitFiles(draft)[LOCAL_PREFLIGHT]).toContain('createRequire(join(process.cwd(), "package.json")).resolve("relayflows")');
  }, 30_000);

  it('offers the move for the throwaway directory only, from one file list', () => {
    const script = localKitFiles(draft)[LOCAL_PREFLIGHT];
    // A repository with no origin is a different problem with a different fix.
    expect(script.match(/await relocate\(\)/g)).toHaveLength(1);
    expect(script).toContain('Add one first: git remote add origin <url>');
    expect(script).toContain('if (!process.stdin.isTTY) fail("this directory is not a Git repository.", ...NOT_A_REPO);');
    // One list. A second one would drift from the dirty-tree exemptions.
    expect(script).toContain('const PORTABLE = [...KIT_FILES].filter(name => !name.endsWith("/") && !NOT_PORTABLE.has(name));');
    expect(script).toContain('const NOT_PORTABLE = new Set(["package.json", "package-lock.json", "summary.md"]);');
    // npm writes those three next to the kit and the repository owns files of
    // the same name, so a kit file may never be called one of them.
    for (const name of Object.keys(localKitFiles(draft))) expect(['package.json', 'package-lock.json', 'summary.md', 'node_modules/']).not.toContain(name);
  });
});
