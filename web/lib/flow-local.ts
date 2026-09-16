import { resolveAgentSettings, rolesForStep } from './flow-agent-settings';
import { WORKFLOWS } from './flow-workflows';
import { strToU8, zipSync } from 'fflate';
import { factorySource, agentLabel, type FactoryDraft } from './flow-onboarding';
import { workflowAgents } from './flow-workflows';

export const LOCAL_INSTALL = 'npm install --save-dev relayflows@2.0.9 @relayflows/surface@2.0.9';
export const LOCAL_RUN = 'git switch -c relay/first-flow &&\nnpx flows check software-factory.flow.mts &&\nnpx flows run --local-agent software-factory.flow.mts --input flow-input.json';

export function localInput(draft: FactoryDraft) {
  if (draft.sources.includes('markdown')) return { approver: 'local' };
  const source = draft.sources[0];
  const settings = draft.sourceSettings[source] ?? {};
  const { labels, contains, ...fields } = settings;
  return { approver: 'local', issue: {
    source, title: contains?.trim() || 'Replace with your ticket title',
    body: 'Replace with the ticket description and acceptance criteria.',
    labels: labels?.split(',').map(label => label.trim()).filter(Boolean) ?? [],
    ...fields,
  } };
}

export function localKitFiles(draft: FactoryDraft): Record<string, string> {
  const agents = workflowAgents(draft.agents);
  const roles = WORKFLOWS.find(value => value.id === draft.workflow)?.steps.flatMap(rolesForStep) ?? [];
  const names = [...new Set(roles.length ? roles.map(role => resolveAgentSettings(draft.workflow!, role, draft.agents, draft.agentSettings).agent) : [agents.builder])].map(agentLabel).join(' and ');
  const markdownPath = draft.sourceSettings.markdown?.path?.trim() || 'tasks.md';
  const inputStep = draft.sources.includes('markdown')
    ? `Write the ticket and acceptance criteria in ${markdownPath}, relative to your repository root. The flow reads that file; it is not included in this kit so an existing file cannot be overwritten.`
    : 'Edit flow-input.json with a real ticket title and description. It is prefilled with your selected source and filters. This starts one ticket manually; it does not subscribe to external issue trackers.';
  return {
    'software-factory.flow.mts': factorySource({ ...draft, step: 3 }, 'local'),
    'flow-input.json': JSON.stringify(localInput(draft), null, 2) + '\n',
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

The flows command starts the local runtime and attaches the local worker. Coding agents use their existing local sign-in; no Agent Relay Cloud account is needed. This flow edits code, runs tests, pushes the branch, and opens a pull request.

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
