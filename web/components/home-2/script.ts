export type PaneId = 'claude' | 'codex' | 'conductor' | 'maya';

export type PaneMeta = {
  id: PaneId;
  tool: string;
  owner: string;
  where: string;
};

export const PANES: PaneMeta[] = [
  { id: 'claude', tool: 'Claude Code', owner: 'You', where: '~/acme/api' },
  { id: 'codex', tool: 'Codex', owner: 'You', where: 'acme/web' },
  { id: 'conductor', tool: 'Conductor', owner: 'You', where: '3 workspaces' },
  { id: 'maya', tool: 'Cursor', owner: 'Maya', where: 'synced session' },
];

export const PANE_NAME: Record<PaneId, string> = {
  claude: 'claude-code',
  codex: 'codex',
  conductor: 'conductor',
  maya: 'maya/cursor',
};

export type ScriptLine =
  | { id: string; t: number; pane: PaneId; kind: 'prompt'; text: string }
  | { id: string; t: number; pane: PaneId; kind: 'text'; text: string }
  | { id: string; t: number; pane: PaneId; kind: 'tool'; name: string; arg: string }
  | { id: string; t: number; pane: PaneId; kind: 'diff'; add: string; del?: string }
  | { id: string; t: number; pane: PaneId; kind: 'send'; to: PaneId; text: string }
  | { id: string; t: number; pane: PaneId; kind: 'receive'; from: PaneId; text: string }
  | { id: string; t: number; pane: PaneId; kind: 'hit'; who: string; when: string; quote: string; tag: string }
  | { id: string; t: number; pane: PaneId; kind: 'ok'; text: string };

/** One coordinated task, end to end. Times are ms from the start of the loop. */
export const SCRIPT: ScriptLine[] = [
  { id: 'x0', t: 0, pane: 'codex', kind: 'text', text: 'Ready in acme/web.' },
  { id: 'd0', t: 0, pane: 'conductor', kind: 'text', text: 'Watching 3 workspaces. Listening on agent-relay.' },
  // Ask
  { id: 'c1', t: 300, pane: 'claude', kind: 'prompt', text: 'Clients drop events after every deploy. Fix the reconnect gap.' },
  { id: 'c2', t: 1300, pane: 'claude', kind: 'tool', name: 'Read', arg: 'src/gateway/ws.ts' },
  { id: 'c3', t: 2100, pane: 'claude', kind: 'text', text: 'Server replays from lastEventId. Need to know if the web client sends it.' },
  {
    id: 'c4',
    t: 3200,
    pane: 'claude',
    kind: 'send',
    to: 'codex',
    text: 'Does ws-client.ts send lastEventId when it reconnects?',
  },
  // Answer
  {
    id: 'x1',
    t: 3900,
    pane: 'codex',
    kind: 'receive',
    from: 'claude',
    text: 'Does ws-client.ts send lastEventId when it reconnects?',
  },
  { id: 'x2', t: 5000, pane: 'codex', kind: 'tool', name: 'Search', arg: 'lastEventId · apps/web/src' },
  {
    id: 'x3',
    t: 6400,
    pane: 'codex',
    kind: 'send',
    to: 'claude',
    text: 'No. It resubscribes from "now". Patching ws-client.ts:142 to resume.',
  },
  {
    id: 'c5',
    t: 7100,
    pane: 'claude',
    kind: 'receive',
    from: 'codex',
    text: 'No. It resubscribes from "now". Patching ws-client.ts:142 to resume.',
  },
  { id: 'x4', t: 7900, pane: 'codex', kind: 'diff', del: 'socket.send({ subscribe: "live" })', add: 'socket.send({ resume: lastEventId })' },
  // Search
  { id: 'c6', t: 9800, pane: 'claude', kind: 'tool', name: 'search_shared_sessions', arg: '"reconnect backoff"' },
  {
    id: 'c7',
    t: 11200,
    pane: 'claude',
    kind: 'hit',
    who: 'Maya · Cursor',
    when: 'yesterday',
    quote: 'Cap reconnect backoff at 30s with full jitter. The gateway rate-limits reconnect storms.',
    tag: 'constraint',
  },
  { id: 'c8', t: 12700, pane: 'claude', kind: 'text', text: "Applying Maya's constraint: 30s cap, full jitter." },
  // Hand off
  {
    id: 'c9',
    t: 14800,
    pane: 'claude',
    kind: 'send',
    to: 'conductor',
    text: 'Run the reconnect e2e suite on fix/reconnect-gap.',
  },
  {
    id: 'd1',
    t: 15500,
    pane: 'conductor',
    kind: 'receive',
    from: 'claude',
    text: 'Run the reconnect e2e suite on fix/reconnect-gap.',
  },
  {
    id: 'd2',
    t: 18600,
    pane: 'conductor',
    kind: 'send',
    to: 'claude',
    text: 'e2e green: 48/48 passed in 2m 14s.',
  },
  { id: 'c10', t: 19300, pane: 'claude', kind: 'receive', from: 'conductor', text: 'e2e green: 48/48 passed in 2m 14s.' },
  // Ship
  { id: 'c11', t: 20600, pane: 'claude', kind: 'ok', text: 'Opened PR #412 · fix: resume websocket from lastEventId' },
  { id: 'c12', t: 21400, pane: 'claude', kind: 'send', to: 'codex', text: 'PR #412 includes your client patch.' },
  { id: 'x5', t: 22100, pane: 'codex', kind: 'receive', from: 'claude', text: 'PR #412 includes your client patch.' },
];

/** Conductor's workspace run for the handoff. */
export const CONDUCTOR_RUN = { start: 16000, end: 18200 };

/** When Maya's synced session lights up as a search match. */
export const MAYA_MATCH = { start: 10300, end: 13600 };

export type Step = { id: string; label: string; start: number; caption: string };

export const STEPS: Step[] = [
  { id: 'ask', label: 'Ask', start: 0, caption: 'Claude Code asks Codex a question directly. You never paste it.' },
  { id: 'answer', label: 'Answer', start: 3700, caption: 'Codex checks its repo, answers, and patches the client.' },
  {
    id: 'search',
    label: 'Search',
    start: 9500,
    caption: "Claude Code searches the team's sessions and finds Maya's decision from yesterday.",
  },
  { id: 'handoff', label: 'Hand off', start: 14500, caption: 'Claude Code hands the test run to Conductor and keeps working.' },
  { id: 'ship', label: 'Ship', start: 20200, caption: 'Green tests, PR open. Zero messages relayed by you.' },
];

export const LOOP_MS = 25500;

export function stepAt(elapsed: number) {
  let index = 0;
  STEPS.forEach((step, i) => {
    if (elapsed >= step.start) index = i;
  });
  return index;
}
