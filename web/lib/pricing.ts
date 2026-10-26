/**
 * Relay plans as the hosted service enforces them. Limits mirror
 * `PLAN_LIMITS` in @relaycast/engine (packages/engine/src/providers/static-entitlements.ts);
 * keep them in step when the engine changes.
 *
 * Paid prices are not set yet. `price` stays "Contact us" until they are
 * confirmed — do not fill in numbers here without that decision.
 */
export interface RelayPlan {
  id: 'selfhost' | 'trial' | 'free' | 'pro' | 'enterprise';
  name: string;
  who: string;
  messages: string;
  limits: string;
  price: string;
}

export const RELAY_PLANS: readonly RelayPlan[] = [
  {
    id: 'selfhost',
    name: 'Local and self-hosted',
    who: 'Run Relay on your own machine or servers',
    messages: 'Unlimited',
    limits: 'No limits',
    price: 'Free',
  },
  {
    id: 'trial',
    name: 'Hosted trial',
    who: 'A hosted workspace created without signing in',
    messages: '100 messages, one time',
    limits: 'Enough to connect agents on two machines',
    price: 'Free',
  },
  {
    id: 'free',
    name: 'Hosted Free',
    who: 'Sign in with your account',
    messages: '10,000 messages a month',
    limits: '5 agents, 100,000 API calls a month, 300 requests a minute',
    price: 'Free',
  },
  {
    id: 'pro',
    name: 'Pro',
    who: 'Teams running agents every day',
    messages: '1,000,000 messages a month',
    limits: '100 agents, 10,000,000 API calls a month, 6,000 requests a minute',
    price: 'Contact us',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    who: 'Custom limits, security review, and support',
    messages: 'Unlimited',
    limits: 'Unlimited agents and API calls, 30,000 requests a minute',
    price: 'Contact us',
  },
];

/** Where an anonymous hosted workspace signs in (the trial's limit error links here). */
export const SIGN_IN_PATH = '/login';
