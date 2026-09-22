import { agentSignupPrompt, type AgentSignupProduct } from './agent-signup';

export type SignupProgress = {
  id: string; product: AgentSignupProduct; step: number;
  state: 'working' | 'waiting' | 'failed' | 'complete';
  revision: number; updatedAt: string; expiresAt: string;
  inputRequest?: {
    id: string; key: string; label: string; type: 'text' | 'select' | 'notice';
    options?: string[]; actionHref?: string; status: 'pending' | 'answered';
  };
};
export type SignupSession = SignupProgress & { writeToken: string };

export function isSignupProgress(value: unknown): value is SignupProgress {
  if (!value || typeof value !== 'object') return false;
  const p = value as SignupProgress;
  return typeof p.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.id) &&
    ['teams', 'flows'].includes(p.product) && Number.isInteger(p.step) && p.step >= 0 && p.step <= 5 &&
    ['working', 'waiting', 'failed', 'complete'].includes(p.state) && (p.state !== 'complete' || p.step === 5) &&
    Number.isSafeInteger(p.revision) && p.revision >= 0 && typeof p.updatedAt === 'string' && typeof p.expiresAt === 'string' && Number.isFinite(Date.parse(p.updatedAt)) && Number.isFinite(Date.parse(p.expiresAt)) &&
    (p.inputRequest === undefined || isSignupInputRequest(p.inputRequest));
}

function isSignupInputRequest(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const input = value as NonNullable<SignupProgress['inputRequest']>;
  return Object.keys(input).every(key => ['id', 'key', 'label', 'type', 'options', 'actionHref', 'status'].includes(key)) &&
    typeof input.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.id) &&
    typeof input.key === 'string' && typeof input.label === 'string' && ['text', 'select', 'notice'].includes(input.type) &&
    ['pending', 'answered'].includes(input.status) &&
    (input.type === 'notice'
      ? input.status === 'pending' && input.options === undefined && typeof input.actionHref === 'string' && /^\/dashboard\/workflows\/listeners\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.actionHref)
      : input.actionHref === undefined && (input.type === 'text' ? input.options === undefined : Array.isArray(input.options) && input.options.every(option => typeof option === 'string')));
}

export function trackedSignupPrompt(product: AgentSignupProduct, origin: string, endpoint: string, session: Pick<SignupSession, 'id' | 'writeToken'>) {
  return `${agentSignupPrompt(product, origin)}\n\nReport real progress using the guide’s protocol so I can watch the signup page.${product === 'flows' ? ' Request any missing non-secret choices through the web-input protocol in the guide; do not ask me to answer in chat.' : ''}\n\nProgress session: ${session.id}\nProgress API: ${endpoint}/${session.id}\nProgress token: ${session.writeToken}\n\nKeep this token private; it authorizes progress and web-input requests only.`;
}

export const signupSteps = {
  teams: [
    { title: 'Sign in', detail: 'Your agent opens Google. You approve access.' },
    { title: 'Install the app', detail: 'Download, verify, and install Agent Relay on your Mac.' },
    { title: 'Connect your workspace', detail: 'Link the app to your account and workspace.' },
    { title: 'Choose what to share', detail: 'Your agent asks which sessions you want to share.' },
    { title: 'Check everything works', detail: 'Verify the connection and open your workspace.' },
  ],
  flows: [
    { title: 'Sign in', detail: 'Your agent opens Google. You approve access.' },
    { title: 'Choose your flow', detail: 'Pick a workflow and the repository it should work on.' },
    { title: 'Connect your tools', detail: 'Approve the services and coding agents your flow needs.' },
    { title: 'Activate your flow', detail: 'Configure the workflow and its repository triggers.' },
    { title: 'Check everything works', detail: 'Verify activation and open your dashboard.' },
  ],
} as const;
