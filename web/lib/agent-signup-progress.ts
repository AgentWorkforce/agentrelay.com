import { agentSignupInteractionPolicy, type AgentSignupProduct } from './agent-signup';

export type SignupProgress = {
  id: string; product: AgentSignupProduct; step: number;
  state: 'working' | 'waiting' | 'failed' | 'complete';
  revision: number; updatedAt: string; expiresAt: string;
};
export type SignupSession = SignupProgress & { writeToken: string };

export function isSignupProgress(value: unknown): value is SignupProgress {
  if (!value || typeof value !== 'object') return false;
  const p = value as SignupProgress;
  return typeof p.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.id) &&
    ['teams', 'flows'].includes(p.product) && Number.isInteger(p.step) && p.step >= 0 && p.step <= 5 &&
    ['working', 'waiting', 'failed', 'complete'].includes(p.state) && (p.state !== 'complete' || p.step === 5) &&
    Number.isSafeInteger(p.revision) && p.revision >= 0 && typeof p.updatedAt === 'string' && typeof p.expiresAt === 'string' && Number.isFinite(Date.parse(p.updatedAt)) && Number.isFinite(Date.parse(p.expiresAt));
}

export function trackedSignupPrompt(product: AgentSignupProduct, origin: string, endpoint: string, session: Pick<SignupSession, 'id' | 'writeToken'>) {
  const cloud = endpoint.replace(/\/api\/v1\/signup\/agent\/sessions\/?$/, '');
  return `Set up Agent Relay ${product === 'teams' ? 'Teams' : 'Flows'} for me. Fetch ${origin}/signup/agent/${product} over HTTP and follow its full API runbook. Report your progress so I can watch the signup page.\n\n${agentSignupInteractionPolicy}\n\nCloud API base: ${cloud}\nStart sign-in: POST ${cloud}/api/v1/auth/device/start with {"client_name":"My agent — ${product === 'teams' ? 'Teams' : 'Flows'} setup","signup_source":"${product}"}. Open the returned verification_uri_complete for me to approve, then poll POST ${cloud}/api/v1/auth/device/token at its returned interval, using the guide’s request body. Verify identity with GET ${cloud}/api/v1/auth/whoami. Follow the guide for the remaining product-specific endpoints and CLI commands.\n\nProgress session: ${session.id}\nProgress API: ${endpoint}/${session.id}\nProgress token: ${session.writeToken}\n\nGET the Progress API for its revision; PATCH it with Authorization: Bearer <Progress token> and JSON {"step":1,"state":"working","revision":<current revision>}. Follow the guide’s steps and waiting/complete states. The Progress token is only for progress updates; use the device flow’s access_token for account APIs. Keep tokens private. Verify setup from API/CLI responses, without operating my screen.`;
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
