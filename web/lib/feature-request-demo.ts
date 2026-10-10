export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 84;
export const CANVAS_WIDTH = 3994;
export const CANVAS_HEIGHT = 420;

export const workflowNodes = [
  { id: 'request', name: 'Gmail', action: 'Feature request', x: 40, y: 136, icon: 'gmail', detail: 'email' },
  { id: 'classify', name: 'Script', action: 'Classify', x: 332, y: 136, icon: 'script', detail: 'classification' },
  { id: 'competitors', name: 'Grok', action: 'Research competitor functionality', x: 640, y: 40, icon: 'grok', detail: 'research' },
  { id: 'retention', name: 'Claude', action: 'Evaluate customer retention risk', x: 640, y: 222, icon: 'claude', detail: 'retention' },
  { id: 'priority', name: 'Codex', action: 'Determine priority', x: 948, y: 136, icon: 'codex', detail: 'priority', gate: true },
  { id: 'will-approval', name: 'Will Washburn', action: 'Get approval from Will', x: 1256, y: 136, icon: 'will', detail: 'human', gate: true, photo: '/authors/will.png' },
  { id: 'frontend', name: 'Claude Code', action: 'Implement SSO settings', x: 1564, y: 40, icon: 'claude-code', detail: 'frontend' },
  { id: 'backend', name: 'Codex', action: 'Implement SAML auth', x: 1564, y: 222, icon: 'codex', detail: 'backend' },
  { id: 'frontend-review', name: 'Codex', action: 'Review UI + accessibility', x: 1872, y: 40, icon: 'codex', detail: 'review' },
  { id: 'backend-review', name: 'Claude Code', action: 'Review auth + security', x: 1872, y: 222, icon: 'claude-code', detail: 'review' },
  { id: 'tests', name: 'Script', action: 'Integration tests', x: 2180, y: 136, icon: 'script', detail: 'tests', gate: true },
  { id: 'feature', name: 'GitHub', action: 'Open reviewed pull request', x: 2488, y: 136, icon: 'github', detail: 'pull-request' },
  { id: 'khaliq-approval', name: 'Khaliq Gant', action: 'Get approval from Khaliq', x: 2796, y: 136, icon: 'khaliq', detail: 'human', gate: true, photo: '/authors/khaliq.jpeg' },
  { id: 'crm-agent', name: 'Claude', action: 'Update CRM with summary', x: 3104, y: 40, icon: 'claude', detail: 'crm-draft' },
  { id: 'email-agent', name: 'Claude', action: 'Write customer email', x: 3104, y: 222, icon: 'claude', detail: 'draft' },
  { id: 'crm-updated', name: 'HubSpot', action: 'Update customer record', x: 3412, y: 40, icon: 'hubspot', detail: 'crm' },
  { id: 'email-sent', name: 'Gmail', action: 'Send feature update', x: 3412, y: 222, icon: 'gmail', detail: 'sent' },
  { id: 'slack-sent', name: 'Slack', action: 'Notify #engineering', x: 3720, y: 136, icon: 'slack', detail: 'slack' },
] as const;
export type NodeId = typeof workflowNodes[number]['id'];
export type WorkflowNode = typeof workflowNodes[number];
const nodeById = Object.fromEntries(workflowNodes.map((node) => [node.id, node])) as Record<NodeId, WorkflowNode>;

function forward(id: string, from: NodeId, to: NodeId) {
  const a = nodeById[from];
  const b = nodeById[to];
  const x1 = a.x + NODE_WIDTH;
  const y1 = a.y + NODE_HEIGHT / 2;
  // Work stops immediately outside gates, before entering the gated node.
  const x2 = b.x - ('gate' in b ? 16 : 0);
  const y2 = b.y + NODE_HEIGHT / 2;
  const mid = (x1 + x2) / 2;
  return { id, from, to, loop: false, d: `M${x1} ${y1} C${mid} ${y1} ${mid} ${y2} ${x2} ${y2}` };
}
function loop(id: string, from: NodeId, to: NodeId, bottom = false) {
  const a = nodeById[from];
  const b = nodeById[to];
  const x1 = a.x + NODE_WIDTH / 2;
  const x2 = b.x + NODE_WIDTH / 2;
  const y1 = a.y + (bottom ? NODE_HEIGHT : 0);
  const y2 = b.y + (bottom ? NODE_HEIGHT : 0);
  const rail = bottom ? CANVAS_HEIGHT - 12 : 12;
  const bend = bottom ? -18 : 18;
  return { id, from, to, loop: true, d: `M${x1} ${y1} V${rail + bend} Q${x1} ${rail} ${x1 - 18} ${rail} H${x2 + 18} Q${x2} ${rail} ${x2} ${rail + bend} V${y2}` };
}
export const workflowEdges = [
  forward('classify', 'request', 'classify'),
  forward('research', 'classify', 'competitors'),
  forward('risk', 'classify', 'retention'),
  forward('research-evidence', 'competitors', 'priority'),
  forward('risk-evidence', 'retention', 'priority'),
  loop('deepen-research', 'priority', 'competitors'),
  loop('deepen-risk', 'priority', 'retention', true),
  forward('request-will', 'priority', 'will-approval'),
  loop('will-revision', 'will-approval', 'priority'),
  forward('build-ui', 'will-approval', 'frontend'),
  forward('build-auth', 'will-approval', 'backend'),
  forward('review-ui', 'frontend', 'frontend-review'),
  forward('review-auth', 'backend', 'backend-review'),
  loop('revise-ui', 'frontend-review', 'frontend'),
  loop('revise-auth', 'backend-review', 'backend', true),
  forward('test-ui', 'frontend-review', 'tests'),
  forward('test-auth', 'backend-review', 'tests'),
  loop('fix-test', 'tests', 'backend', true),
  forward('feature-ready', 'tests', 'feature'),
  forward('request-khaliq', 'feature', 'khaliq-approval'),
  forward('draft-crm', 'khaliq-approval', 'crm-agent'),
  forward('draft-email', 'khaliq-approval', 'email-agent'),
  forward('update-crm', 'crm-agent', 'crm-updated'),
  forward('send-email', 'email-agent', 'email-sent'),
  forward('crm-ready', 'crm-updated', 'slack-sent'),
  forward('email-ready', 'email-sent', 'slack-sent'),
];

interface Phase {
  name: string;
  duration: number;
  active: NodeId[];
  done: NodeId[];
  routes: string[];
  focus: NodeId;
  revision?: number;
  failed?: NodeId[];
  feedback?: { node: NodeId; question: string; answer?: string };
}
const through = (last: NodeId): NodeId[] => workflowNodes.slice(0, workflowNodes.findIndex((node) => node.id === last) + 1).map((node) => node.id);
const research: NodeId[] = ['competitors', 'retention'];
const implementers: NodeId[] = ['frontend', 'backend'];
const reviewers: NodeId[] = ['frontend-review', 'backend-review'];
const phases: Phase[] = [
  { name: 'intake', duration: 1800, active: ['request'], done: [], routes: [], focus: 'request' },
  { name: 'classify', duration: 2000, active: ['classify'], done: through('request'), routes: ['classify'], focus: 'classify' },
  { name: 'research', duration: 3800, active: research, done: through('classify'), routes: ['research', 'risk'], focus: 'competitors' },
  { name: 'priority-check', duration: 2200, active: ['priority'], done: through('retention'), routes: ['research-evidence', 'risk-evidence'], focus: 'priority' },
  { name: 'more-evidence', duration: 3000, active: research, done: through('classify'), routes: ['deepen-research', 'deepen-risk'], focus: 'competitors', revision: 1 },
  { name: 'priority-recheck', duration: 2200, active: ['priority'], done: through('retention'), routes: ['research-evidence', 'risk-evidence'], focus: 'priority' },
  { name: 'priority-passed', duration: 1300, active: [], done: through('priority'), routes: [], focus: 'priority' },
  { name: 'will-approval', duration: 3800, active: ['will-approval'], done: through('priority'), routes: ['request-will'], focus: 'will-approval' },
  { name: 'will-question', duration: 2600, active: ['will-approval'], done: through('priority'), routes: [], focus: 'will-approval', feedback: { node: 'will-approval', question: 'Can we ship before their renewal?' } },
  { name: 'revise-priority', duration: 3600, active: ['priority'], done: through('retention'), routes: ['will-revision'], focus: 'priority', revision: 2, feedback: { node: 'priority', question: 'Can we ship before their renewal?', answer: 'SSO first. Ship before renewal.' } },
  { name: 'priority-updated', duration: 1200, active: [], done: through('priority'), routes: [], focus: 'priority' },
  { name: 'will-reapproval', duration: 2600, active: ['will-approval'], done: through('priority'), routes: ['request-will'], focus: 'will-approval', feedback: { node: 'will-approval', question: 'Can we ship before their renewal?', answer: 'SSO first. Ship before renewal.' } },
  { name: 'will-approved', duration: 1500, active: [], done: through('will-approval'), routes: [], focus: 'will-approval' },
  { name: 'implement', duration: 2200, active: implementers, done: through('will-approval'), routes: ['build-ui', 'build-auth'], focus: 'frontend' },
  { name: 'ui-ready', duration: 1800, active: ['backend', 'frontend-review'], done: [...through('will-approval'), 'frontend'], routes: ['review-ui'], focus: 'frontend' },
  { name: 'review', duration: 2000, active: reviewers, done: through('backend'), routes: ['review-auth'], focus: 'frontend-review' },
  { name: 'auth-review-ready', duration: 1400, active: ['frontend-review'], done: [...through('backend'), 'backend-review'], routes: [], focus: 'frontend-review' },
  { name: 'changes-requested', duration: 1300, active: [], done: through('backend'), routes: [], focus: 'frontend-review', failed: reviewers },
  { name: 'revise', duration: 2100, active: implementers, done: through('will-approval'), routes: ['revise-ui', 'revise-auth'], focus: 'frontend', revision: 1 },
  { name: 'auth-revision-ready', duration: 1700, active: ['frontend', 'backend-review'], done: [...through('will-approval'), 'backend'], routes: ['review-auth'], focus: 'frontend', revision: 1 },
  { name: 'review-again', duration: 1900, active: reviewers, done: through('backend'), routes: ['review-ui'], focus: 'frontend-review', revision: 1 },
  { name: 'ui-review-ready', duration: 1200, active: ['backend-review'], done: [...through('backend'), 'frontend-review'], routes: [], focus: 'frontend-review', revision: 1 },
  { name: 'revise-again', duration: 2000, active: implementers, done: through('will-approval'), routes: ['revise-ui', 'revise-auth'], focus: 'frontend', revision: 2 },
  { name: 'ui-final-ready', duration: 1500, active: ['backend', 'frontend-review'], done: [...through('will-approval'), 'frontend'], routes: ['review-ui'], focus: 'frontend', revision: 2 },
  { name: 'final-review', duration: 1800, active: reviewers, done: through('backend'), routes: ['review-auth'], focus: 'frontend-review', revision: 2 },
  { name: 'auth-final-review-ready', duration: 1600, active: ['frontend-review'], done: [...through('backend'), 'backend-review'], routes: [], focus: 'frontend-review', revision: 2 },
  { name: 'test', duration: 2300, active: ['tests'], done: through('backend-review'), routes: ['test-ui', 'test-auth'], focus: 'tests' },
  { name: 'test-failed', duration: 1200, active: [], done: through('backend-review'), routes: [], focus: 'tests', failed: ['tests'] },
  { name: 'fix-test', duration: 3000, active: ['backend'], done: [...through('will-approval'), 'frontend', 'frontend-review'], routes: ['fix-test'], focus: 'backend', revision: 3 },
  { name: 'review-fix', duration: 2400, active: ['backend-review'], done: [...through('backend'), 'frontend-review'], routes: ['review-auth'], focus: 'backend-review', revision: 3 },
  { name: 'retest', duration: 2400, active: ['tests'], done: through('backend-review'), routes: ['test-ui', 'test-auth'], focus: 'tests' },
  { name: 'tests-passed', duration: 1300, active: [], done: through('tests'), routes: [], focus: 'tests' },
  { name: 'feature-ready', duration: 2200, active: ['feature'], done: through('tests'), routes: ['feature-ready'], focus: 'feature' },
  { name: 'khaliq-approval', duration: 3800, active: ['khaliq-approval'], done: through('feature'), routes: ['request-khaliq'], focus: 'khaliq-approval' },
  { name: 'khaliq-approved', duration: 1500, active: [], done: through('khaliq-approval'), routes: [], focus: 'khaliq-approval' },
  { name: 'notify', duration: 3200, active: ['crm-agent', 'email-agent'], done: through('khaliq-approval'), routes: ['draft-crm', 'draft-email'], focus: 'crm-agent' },
  { name: 'update-records', duration: 2200, active: ['crm-updated', 'email-sent'], done: through('email-agent'), routes: ['update-crm', 'send-email'], focus: 'crm-updated' },
  { name: 'waiting-for-email', duration: 2600, active: ['email-sent'], done: through('crm-updated'), routes: [], focus: 'email-sent' },
  { name: 'send-slack', duration: 2000, active: ['slack-sent'], done: through('email-sent'), routes: ['crm-ready', 'email-ready'], focus: 'slack-sent' },
  { name: 'complete', duration: 2400, active: [], done: through('slack-sent'), routes: [], focus: 'slack-sent' },
];
export const workflowPhases = phases.map((phase, index) => ({
  ...phase,
  priorityPassed: index >= phases.findIndex((item) => item.name === 'priority-passed') && phase.name !== 'revise-priority',
  testsPassed: index >= phases.findIndex((item) => item.name === 'tests-passed'),
  willApproved: index >= phases.findIndex((item) => item.name === 'will-approved'),
  updatesPassed: phase.done.includes('crm-updated') && phase.done.includes('email-sent'),
  khaliqApproved: index >= phases.findIndex((item) => item.name === 'khaliq-approved'),
}));
export const workflowChapters = [
  { label: 'Intake', phase: 'intake' },
  { label: 'Research', phase: 'research' },
  { label: 'Priority', phase: 'priority-check' },
  { label: 'Will', phase: 'will-approval' },
  { label: 'Build', phase: 'implement' },
  { label: 'Review', phase: 'review' },
  { label: 'Khaliq', phase: 'khaliq-approval' },
  { label: 'Notify', phase: 'notify' },
].map((chapter) => ({ ...chapter, index: phases.findIndex((phase) => phase.name === chapter.phase) }));
export const workflowDuration = phases.reduce((sum, phase) => sum + phase.duration, 0);

export function workflowCameraTarget(index: number, width: number) {
  const node = nodeById[workflowPhases[index].focus];
  const focus = node.x + NODE_WIDTH / 2;
  return Math.max(0, Math.min(CANVAS_WIDTH - width, focus - width * .48));
}

export function workflowGatePassed(id: NodeId, phase: typeof workflowPhases[number]) {
  if (id === 'priority') return phase.priorityPassed;
  if (id === 'tests') return phase.testsPassed;
  if (id === 'will-approval') return phase.willApproved;
  if (id === 'khaliq-approval') return phase.khaliqApproved;
  return false;
}
