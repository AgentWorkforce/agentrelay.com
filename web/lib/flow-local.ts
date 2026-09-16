import { resolveAgentSettings, rolesForStep } from './flow-agent-settings';
import { WORKFLOWS } from './flow-workflows';
import { strToU8, zipSync } from 'fflate';
import { factorySource, agentLabel, type FactoryDraft } from './flow-onboarding';
import { workflowAgents } from './flow-workflows';

/**
 * The kit pinned 2.0.9, which could not run its own flow. That release linked
 * `node_modules/.bin/flows` to the prebuilt runtime binary from
 * `@relayflows/runtime-*`, and that binary cannot resolve `@relayflows/surface`
 * from an authored flow file, so `flows run` refused with `invalid_spec`. Its
 * `flows check` had no TypeScript path at all and read every flow as YAML, so
 * step 4 of START-HERE.txt died on `contains invalid YAML or JSON` before the
 * run was ever reached. 2.0.12 links `flows` to the SDK's Node CLI, checks
 * authored `.mts` flows, accepts the `{ wallclock }` budget header, and exits 3
 * on `done("needs_human")`. Do not lower this pin.
 */
export const RELAYFLOWS_VERSION = '2.0.12';
export const LOCAL_PREFLIGHT = 'relay-preflight.mjs';

export const LOCAL_INSTALL = `npm install --save-dev relayflows@${RELAYFLOWS_VERSION} @relayflows/surface@${RELAYFLOWS_VERSION}`;
export const LOCAL_RUN = `git switch -c relay/first-flow &&\nnode ${LOCAL_PREFLIGHT} &&\nnpx flows check software-factory.flow.mts &&\nnpx flows run --local-agent software-factory.flow.mts --input flow-input.json`;

export const PLACEHOLDER_TITLE = 'Replace with your ticket title';
export const PLACEHOLDER_BODY = 'Replace with the ticket description and acceptance criteria.';

export function localInput(draft: FactoryDraft) {
  if (draft.sources.includes('markdown')) return { approver: 'local' };
  const source = draft.sources[0];
  const settings = draft.sourceSettings[source] ?? {};
  const { labels, contains, ...fields } = settings;
  return { approver: 'local', issue: {
    source, title: contains?.trim() || PLACEHOLDER_TITLE,
    body: PLACEHOLDER_BODY,
    labels: labels?.split(',').map(label => label.trim()).filter(Boolean) ?? [],
    ...fields,
  } };
}

/**
 * Everything that makes a local run fail late and expensively, checked before
 * the first agent starts: a directory that is not a repository, a repository
 * with nowhere to push, a missing `gh` sign-in, uncommitted work, and a
 * `flow-input.json` still holding the placeholder ticket. Ordered cheapest
 * first; none of it costs model usage.
 *
 * The first of those is where most people land — the kit is extracted to
 * ~/Downloads and run there — so on a terminal that one guard does more than
 * complain: it offers to copy the kit into the repository the user names, and
 * prints the sequence to run from there. Everywhere else, including every
 * non-interactive shell, it fails with the same message it always did.
 */
export const LOCAL_PREFLIGHT_SCRIPT = `#!/usr/bin/env node
// Run by START-HERE.txt step 4, before "flows check" and "flows run".
import { execFileSync } from "node:child_process";
import { constants, copyFileSync, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";

const INPUT = "flow-input.json";
const PLACEHOLDER_TITLE = ${JSON.stringify(PLACEHOLDER_TITLE)};
const PLACEHOLDER_BODY = ${JSON.stringify(PLACEHOLDER_BODY)};
const INSTALL = ${JSON.stringify(LOCAL_INSTALL)};
const RUN = ${JSON.stringify(LOCAL_RUN)};

// This kit's own files differ from HEAD by design, so they are not treated as
// uncommitted work.
const KIT_FILES = new Set([
  "START-HERE.txt", "flow-input.json", ${JSON.stringify(LOCAL_PREFLIGHT)},
  "software-factory.flow.mts", "package.json", "package-lock.json",
  "node_modules/", ".relayflowd/", "summary.md",
]);

// KIT_FILES exempts names from the dirty-tree check; it is not a description of
// the kit. These are what npm and a finished run leave next to it, and the
// target repository owns files of the same name, so relocation never carries
// them. Everything else in KIT_FILES is copied, so a new kit file is portable
// the moment it is listed above.
const NOT_PORTABLE = new Set(["package.json", "package-lock.json", "summary.md"]);
const PORTABLE = [...KIT_FILES].filter(name => !name.endsWith("/") && !NOT_PORTABLE.has(name));

// Where the kit is, which is not necessarily where node was invoked from.
const KIT_DIR = import.meta.dirname;

const NOT_A_REPO = [
  "Extract the kit into your repository root and run it from there.",
  "Running git init here instead would build a repository with no origin, and",
  "the flow would fail at git push after the agents had finished their work.",
];

function fail(problem, ...advice) {
  console.error("Blocked before the flow started: " + problem);
  for (const line of advice) console.error("  " + line);
  process.exit(1);
}

// createInterface, plus the one thing readline/promises leaves out: end of
// input. Once the stream closes, question() stays pending forever, so Ctrl+D at
// any prompt below would end the run with "Detected unsettled top-level await"
// and a bare exit 13. Racing the close event reads a closed stream as null, and
// every caller treats null as the answer it is: the user left.
function prompter() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const closed = new Promise(resolve => rl.once("close", () => resolve(null)));
  return { rl, ask: query => Promise.race([rl.question(query).catch(() => null), closed]) };
}

// execFile, never a shell: a repository path containing spaces, parentheses or
// quotes must not change how any of these commands parse.
//
// Deliberately untrimmed. "git status --porcelain" encodes the status in the
// first two columns, and an unstaged change leads with a space (" M path").
// Trimming the output would strip that space off the first line only, so
// slice(3) would eat a character of that path, it would miss KIT_FILES, and a
// routine "npm install" touching the tracked package.json would block step 4
// while reporting a mangled filename.
function git(...args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

// Shared by the guard below and by the check on a relocation target: the kit's
// own files are never the user's uncommitted work, in either directory.
function dirtyPaths(...prefix) {
  return git(...prefix, "status", "--porcelain").split("\\n").filter(Boolean)
    .map(line => line.slice(3))
    .filter(path => !KIT_FILES.has(path));
}

function expandHome(text) {
  return resolve(text === "~" || text.startsWith("~/") ? join(homedir(), text.slice(1)) : text);
}

// A path dragged into a terminal arrives shell-escaped (Downloads/kit\\ \\(1\\))
// and a pasted one can arrive quoted. Both name a directory that exists, so the
// escapes are stripped only when the text as typed does not name one; a real
// backslash in a directory name still wins.
function targetPath(answer) {
  const unquoted = answer.replace(/^(["'])(.*)\\1$/s, "$2");
  const paths = [...new Set([unquoted, unquoted.replace(/\\\\(.)/g, "$1")])].map(expandHome);
  return paths.find(existsSync) ?? paths[0];
}

// Single quotes, always: the directory this exists for was literally named
// "software-factory-local (1)".
function quote(path) {
  return "'" + path.replaceAll("'", "'\\\\''") + "'";
}

// Everything the flow will need of the destination, checked before a single
// file is written: the same three conditions this script enforces here, so a
// relocated kit cannot land somewhere its own preflight would reject.
function repoProblem(target) {
  const stat = statSync(target, { throwIfNoEntry: false });
  if (!stat) return "There is no " + target;
  if (!stat.isDirectory()) return "Not a directory: " + target;
  try {
    git("-C", target, "rev-parse", "--is-inside-work-tree");
  } catch {
    return "Not a Git repository: " + target;
  }
  try {
    git("-C", target, "remote", "get-url", "origin");
  } catch {
    return "No origin remote there. The flow ends in git push and gh pr create, so add one first: git remote add origin <url>";
  }
  const unclean = dirtyPaths("-C", target);
  if (unclean.length) {
    return "Uncommitted changes there (" + unclean.slice(0, 3).join(", ") + (unclean.length > 3 ? ", ..." : "") + "). Commit or stash them first; the flow commits and pushes a branch.";
  }
  return "";
}

// Never overwrite: START-HERE promises the kit keeps existing files, and a
// flow-input.json already filled in is worth more than the placeholder shipped
// here. Anything already present is left alone and named in the report.
function copyKit(target) {
  const copied = [];
  const kept = [];
  for (const name of PORTABLE) {
    const from = join(KIT_DIR, name);
    if (!existsSync(from)) continue;
    if (existsSync(join(target, name))) {
      kept.push(name);
      continue;
    }
    copyFileSync(from, join(target, name), constants.COPYFILE_EXCL);
    copied.push(name);
  }
  return { copied, kept };
}

/**
 * The kit is sitting outside a repository, which is where most people who
 * extract it to ~/Downloads end up. On a terminal it can move itself; the last
 * thing it does either way is stop, because the rest of step 4 must not run in
 * this directory.
 */
async function relocate() {
  const { rl, ask } = prompter();
  try {
    console.log("This directory is not a Git repository, so the flow would have nowhere to push.");
    console.log("The kit can be copied into your repository now, without overwriting anything.");
    console.log("");
    for (;;) {
      const answer = await ask("Path to your repository (empty to stop): ");
      // An empty line, Ctrl+D or a closed pipe all mean the same thing here:
      // leave, with the advice this guard has always given.
      if (answer === null || !answer.trim()) {
        console.log("");
        fail("this directory is not a Git repository.", ...NOT_A_REPO);
      }
      const target = targetPath(answer.trim());
      const problem = repoProblem(target);
      if (problem) {
        console.log("  " + problem);
        console.log("");
        continue;
      }
      let moved;
      try {
        moved = copyKit(target);
      } catch (error) {
        fail("the kit could not be copied to " + target + ".",
          String(error && error.message ? error.message : error),
          "Copy " + PORTABLE.join(", ") + " there by hand, then run this again from " + target + ".");
      }
      console.log("");
      if (moved.copied.length) console.log("Copied into " + target + ": " + moved.copied.join(", "));
      if (moved.kept.length) {
        console.log("Left alone, already there: " + moved.kept.join(", "));
        console.log("The kit's copies are still in " + KIT_DIR + " if you want to compare them.");
      }
      console.log("");
      // The documented sequence installs before this script runs, so the
      // dependencies are here, not there, and node_modules is deliberately not
      // copied. npx resolves from the directory it runs in, so the install has
      // to happen again in the repository or "npx flows" finds nothing.
      console.log("Now run these from the repository. The install has to run there too:");
      console.log("");
      console.log("  cd " + quote(target));
      console.log("  " + INSTALL);
      for (const line of RUN.split("\\n")) console.log("  " + line);
      console.log("");
      console.log("Stopping here so nothing else runs in this directory.");
      process.exit(1);
    }
  } finally {
    rl.close();
  }
}

try {
  git("rev-parse", "--is-inside-work-tree");
} catch {
  // Nothing can be asked without a terminal, so a non-interactive shell gets
  // the message and the exit code it got before, with no chance of hanging.
  if (!process.stdin.isTTY) fail("this directory is not a Git repository.", ...NOT_A_REPO);
  await relocate();
}

try {
  git("remote", "get-url", "origin");
} catch {
  fail("this repository has no origin remote.",
    "The flow ends with git push --set-upstream origin HEAD and gh pr create.",
    "Add one first: git remote add origin <url>");
}

try {
  execFileSync("gh", ["auth", "status"], { stdio: "ignore" });
} catch {
  fail("GitHub CLI (gh) is missing or not signed in.",
    "Install it from https://cli.github.com, then run: gh auth login");
}

const dirty = dirtyPaths();
if (dirty.length) {
  fail("the working tree has uncommitted changes.",
    "Commit or stash them first; the flow commits and pushes this branch.",
    ...dirty.slice(0, 10));
}

if (existsSync(INPUT)) {
  const input = JSON.parse(readFileSync(INPUT, "utf8"));
  // A Markdown-sourced kit has no issue here: the ticket lives in the Markdown
  // file the flow reads, so there is no placeholder to fill in.
  const issue = input.issue;
  if (issue) {
    // body is the sentinel, not title: a "contains" filter overwrites title
    // when the kit is built, so only body is reliably the placeholder.
    const untouched = issue.body === PLACEHOLDER_BODY;
    if (untouched && !process.stdin.isTTY) {
      fail(INPUT + " still holds the placeholder ticket.",
        "Set issue.title and issue.body to the real ticket, then run again.",
        "Nothing here can be asked without a terminal, so the run stops rather",
        "than sending a coding agent after " + JSON.stringify(PLACEHOLDER_TITLE) + ".");
    }
    if (untouched) {
      const { rl, ask } = prompter();
      try {
        console.log(INPUT + " still holds the placeholder ticket. Fill it in now.");
        console.log("");
        let title = "";
        while (!title) {
          const answer = await ask("Ticket title: ");
          // Ctrl+D or a closed pipe at the prompt ends with the same advice as
          // the no-terminal path, not an unhandled rejection.
          if (answer === null) {
            fail("the ticket was not entered.",
              "Set issue.title and issue.body in " + INPUT + ", then run again.");
          }
          title = answer.trim();
          if (!title) console.log("  A title is required.");
        }
        console.log("Description and acceptance criteria. Finish with an empty line.");
        const lines = [];
        for (;;) {
          const line = await ask("> ");
          // Ctrl+D ends the description, exactly as the empty line does.
          if (line === null || !line.trim()) break;
          lines.push(line);
        }
        const body = lines.join("\\n").trim();
        if (!body) {
          fail("no description was entered.",
            "Run again and describe the work, or edit " + INPUT + " by hand.");
        }
        input.issue = { ...issue, title, body };
        writeFileSync(INPUT, JSON.stringify(input, null, 2) + "\\n");
        console.log("");
        console.log("Saved to " + INPUT + ".");
      } finally {
        rl.close();
      }
    }
  }
}

console.log("Preconditions met. Starting the flow.");
`;

export function localKitFiles(draft: FactoryDraft): Record<string, string> {
  const agents = workflowAgents(draft.agents);
  const roles = WORKFLOWS.find(value => value.id === draft.workflow)?.steps.flatMap(rolesForStep) ?? [];
  const names = [...new Set(roles.length ? roles.map(role => resolveAgentSettings(draft.workflow!, role, draft.agents, draft.agentSettings).agent) : [agents.builder])].map(agentLabel).join(' and ');
  const markdownPath = draft.sourceSettings.markdown?.path?.trim() || 'tasks.md';
  const inputStep = draft.sources.includes('markdown')
    ? `Write the ticket and acceptance criteria in ${markdownPath}, relative to your repository root. The flow reads that file; it is not included in this kit so an existing file cannot be overwritten.`
    : `Edit flow-input.json with a real ticket title and description. It is prefilled with your selected source and filters. If you skip this, ${LOCAL_PREFLIGHT} asks for them in step 4 rather than starting an agent on the placeholder. This starts one ticket manually; it does not subscribe to external issue trackers.`;
  return {
    'software-factory.flow.mts': factorySource({ ...draft, step: 3 }, 'local'),
    'flow-input.json': JSON.stringify(localInput(draft), null, 2) + '\n',
    [LOCAL_PREFLIGHT]: LOCAL_PREFLIGHT_SCRIPT,
    'START-HERE.txt': `RUN YOUR SOFTWARE FACTORY LOCALLY

Requirements
- Node.js 22.18+ (for native TypeScript), npm, and Git.
- macOS on Apple silicon or Linux x64 (bundled runtime platforms).
- ${names}, installed and signed in.
- GitHub CLI (gh), signed in, and a repository with push access to origin.
- The flow installs your repository's dependencies with its package manager (pnpm, Yarn, Bun, or npm, chosen by lockfile) and runs its test script. Without a package.json or a test script it reports that it skipped the tests and carries on. If your project uses another test command, change testCommand in software-factory.flow.mts before running.

1. Extract this kit into your repository root. Keep any existing files before replacing them. Open a terminal in that directory.

2. Install the Flows CLI and authoring dependency:
${LOCAL_INSTALL}

3. ${inputStep}

4. Start from a clean working tree and create a new branch (choose another name if relay/first-flow already exists), then check and run:
${LOCAL_RUN}

${LOCAL_PREFLIGHT} runs first and stops before any model usage if this is not a repository, has no origin remote, has no gh sign-in, or has uncommitted changes. If you did extract the kit somewhere else, it offers to copy it into your repository: give it the path, and it checks that repository first, copies without replacing any file already there, and prints the commands to run from it — including the install from step 2, which has to run there too. When flow-input.json still holds the placeholder ticket it asks for the title and description and saves them; with no terminal to ask on it stops and names the fields to edit.

The flows command then starts the local runtime and attaches the local worker. Coding agents use their existing local sign-in; no Agent Relay Cloud account is needed. This flow edits code, runs tests, pushes the branch, and opens a pull request.

Local runtime behavior
This local version uses a one-hour wall-clock budget. Model usage is billed by your coding-agent provider; this is not a dollar cap.
Every preset reports needs_human (exit code 3) after its checks and any agent reviews pass. This is the intended manual approval stop, not a failed run. Review and merge the PR in GitHub; the flow never merges automatically and does not resume automatically after approval.
${draft.workflow === 'prototype' ? 'Prototype worktrees remain available under the generated temporary directory for inspection.' : ''}

GitHub merge protection
In the repository's branch rules for the target branch, require a pull request, an approving review, and passing CI status checks. Dismiss stale approvals when new commits are pushed. Choose a human reviewer or CODEOWNER. These settings must be configured by a repository administrator; this kit does not change them.
https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches

Your source selections and filters are included in the flow. Connecting an external event source to trigger future runs is a separate setup step.
`,
  };
}

export function localKitArchive(draft: FactoryDraft): Uint8Array {
  return zipSync(Object.fromEntries(Object.entries(localKitFiles(draft)).map(([name, text]) => [name, strToU8(text)])));
}
