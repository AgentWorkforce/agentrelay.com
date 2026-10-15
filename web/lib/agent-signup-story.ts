import type { AgentSignupProduct } from './agent-signup';

export const signupLoading = {
  title: 'Sign up for Agent Relay.',
  detail: 'Paste the prompt into your coding agent. It does the rest.',
};
export const signupReady = signupLoading;

/** Narrative follows reported milestones; elapsed time never advances setup. */
export const signupChapters: Record<AgentSignupProduct, readonly { title: string; detail: string }[]> = {
  teams: [
    { title: 'Now paste it into your agent.', detail: 'Keep this page open beside it.' },
    { title: 'Preparing sign-in.', detail: 'Your agent is preparing sign-in. You’ll approve access on the page it opens.' },
    { title: 'Installing the desktop app.', detail: 'Your agent is downloading and installing the desktop app.' },
    { title: 'Connecting your workspace.', detail: 'Your agent is linking the app to your workspace.' },
    { title: 'Setting up session sharing.', detail: 'Your agent is choosing what to share. It will ask about any existing preferences.' },
    { title: 'Checking your connection.', detail: 'Your agent is checking the connection with a real session handoff.' },
  ],
  flows: [
    { title: 'Now paste it into your agent.', detail: 'Keep this page open beside it.' },
    { title: 'Preparing sign-in.', detail: 'Your agent is preparing sign-in. You’ll approve access on the page it opens.' },
    { title: 'Choose your workflow.', detail: 'Choose the workflow and repository your agent will connect.' },
    { title: 'Connecting your tools.', detail: 'Your agent is connecting the tools your workflow needs.' },
    { title: 'Activating your workflow.', detail: 'Your agent is activating the workflow and its triggers.' },
    { title: 'Checking your workflow.', detail: 'Your agent is verifying that the workflow is active and ready.' },
  ],
};
