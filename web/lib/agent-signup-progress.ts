import type { SignupAnalyticsContext } from './agent-signup-analytics';
import { agentSignupPrompt, type AgentSignupProduct } from './agent-signup';

export type SignupProgress = {
  id: string; product: AgentSignupProduct; step: number;
  state: 'working' | 'waiting' | 'failed' | 'complete';
  revision: number; updatedAt: string; expiresAt: string;
  inputRequest?: {
    id: string; key: string; label: string; type: 'text' | 'select' | 'notice';
    options?: string[]; actionHref?: string; status: 'pending' | 'answered'; step: number;
  };
};
export type SignupActivation = { expiresAt: string; analytics?: SignupAnalyticsContext };
export type SignupSession = SignupProgress & {
  writeToken: string; activation?: SignupActivation; activated?: boolean; launched?: boolean;
};

/** Must match Cloud's versioned capability contract; the token never goes in a URL. */
export async function signupSessionId(product: AgentSignupProduct, expiresAt: string, token: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(['agent-relay-signup-v1', product, expiresAt, token])));
  const digest = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-${((parseInt(digest[16], 16) & 3) | 8).toString(16)}${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
}

export async function prepareSignupSession(product: AgentSignupProduct, analytics?: SignupAnalyticsContext): Promise<SignupSession> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 2 * 60 * 60_000).toISOString();
  const writeToken = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
  return {
    id: await signupSessionId(product, expiresAt, writeToken), product, writeToken,
    step: 0, state: 'waiting', revision: 0, updatedAt: now.toISOString(), expiresAt,
    activation: { expiresAt, ...(analytics ? { analytics } : {}) }, activated: false, launched: false,
  };
}

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
  return Object.keys(input).every(key => ['id', 'key', 'label', 'type', 'options', 'actionHref', 'status', 'step'].includes(key)) &&
    typeof input.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.id) &&
    typeof input.key === 'string' && typeof input.label === 'string' && ['text', 'select', 'notice'].includes(input.type) &&
    ['pending', 'answered'].includes(input.status) && Number.isInteger(input.step) && input.step >= 0 && input.step <= 5 &&
    (input.type === 'notice'
      ? input.status === 'pending' && input.options === undefined && typeof input.actionHref === 'string' && /^\/dashboard\/workflows\/listeners\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.actionHref)
      : input.actionHref === undefined && (input.type === 'text' ? input.options === undefined : Array.isArray(input.options) &&
        input.options.length >= 2 && input.options.length <= 12 && input.options.every(option => typeof option === 'string' && option.trim() === option && option.length > 0 && option.length <= 100) &&
        new Set(input.options).size === input.options.length));
}

export function trackedSignupPrompt(product: AgentSignupProduct, origin: string, endpoint: string, session: Pick<SignupSession, 'id' | 'writeToken' | 'activation'>) {
  const activation = session.activation ? `\n\nBefore reading or reporting progress, register this locally prepared session by POSTing to ${endpoint} with Authorization: Bearer <Progress token> and Content-Type: application/json. Use this exact JSON body:\n${JSON.stringify({ product, sessionId: session.id, ...session.activation })}\nA 201 creates the session; 200 means it already exists. Registration is safe to retry and never resets progress. On 410, ask me to start a new signup; do not change the ID, token, or expiry. Then follow the guide’s GET/PATCH protocol.` : '';
  return `${agentSignupPrompt(product, origin)}${activation}\n\nReport real progress using the guide’s protocol so I can watch the signup page.${product === 'flows' ? ' Request any missing non-secret choices through the web-input protocol in the guide; do not ask me to answer in chat.' : ''}\n\nProgress session: ${session.id}\nProgress API: ${endpoint}/${session.id}\nProgress token: ${session.writeToken}\n\nKeep this token private; it authorizes progress and web-input requests only.`;
}

export const signupSteps = {
  teams: [
    { title: 'Sign in', detail: 'Your agent opens Google. You approve access.' },
    { title: 'Install the app', detail: 'Download, verify, and install the Agent Relay desktop app.' },
    { title: 'Connect your workspace', detail: 'Link the app to your account and workspace.' },
    { title: 'Choose what to share', detail: 'New sessions are shared by default; if you already chose a sharing mode, your agent asks before changing it.' },
    { title: 'Check everything works', detail: 'Verify the app, then one live session handoff with a teammate.' },
  ],
  flows: [
    { title: 'Sign in', detail: 'Your agent opens Google. You approve access.' },
    { title: 'Choose your flow', detail: 'Pick a workflow and the repository it should work on.' },
    { title: 'Connect your tools', detail: 'Approve the services and coding agents your flow needs.' },
    { title: 'Activate your flow', detail: 'Configure the workflow and its repository triggers.' },
    { title: 'Check everything works', detail: 'Verify activation and open your dashboard.' },
  ],
} as const;
