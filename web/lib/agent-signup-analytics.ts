import type { AgentSignupProduct } from './agent-signup';

export type SignupAnalyticsContext = { distinctId: string; journeyId: string };
export type SignupAnalyticsClient = {
  __loaded?: boolean;
  has_opted_out_capturing(): boolean;
  get_distinct_id(): string;
  capture(event: string, properties: Record<string, unknown>, options?: { transport: 'sendBeacon' }): unknown;
};
export type SignupBrowserEvent = 'entry_clicked' | 'page_viewed' | 'prompt_copied' | 'manual_copy_shown' | 'details_opened' | 'restarted' | 'page_left' | 'expired' | 'session_error' | 'dashboard_opened';
const key = (product: string) => `agent-relay-signup-analytics:${product}`;
const ttl = 2 * 60 * 60_000;

/** Distinct from the read-capability session ID. Never put that ID in analytics. */
export class SignupTracker {
  private departed = false;
  private cached?: { journeyId: string; startedAt: number };
  constructor(private ph: SignupAnalyticsClient | null | undefined, private product: AgentSignupProduct,
    private storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>, private uuid = () => crypto.randomUUID(), private now = Date.now) {}

  context(): SignupAnalyticsContext | undefined {
    try {
      if (!this.ph?.__loaded || this.ph.has_opted_out_capturing()) return undefined;
      const distinctId = this.ph.get_distinct_id();
      if (!/^[a-zA-Z0-9._:-]{1,200}$/.test(distinctId)) return undefined;
      if (!this.cached) {
        try {
          const saved = JSON.parse(this.storage.getItem(key(this.product)) || 'null');
          if (saved && typeof saved.journeyId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saved.journeyId) &&
            typeof saved.startedAt === 'number' && this.now() - saved.startedAt < ttl && saved.startedAt <= this.now()) this.cached = saved;
        } catch { /* Storage is optional. */ }
        this.cached ||= { journeyId: this.uuid(), startedAt: this.now() };
        try { this.storage.setItem(key(this.product), JSON.stringify(this.cached)); } catch { /* In-memory fallback. */ }
      }
      return { distinctId, journeyId: this.cached.journeyId };
    } catch { return undefined; }
  }

  /** Wait briefly for PostHog so early funnel events and the session POST share one journeyId. Telemetry never blocks setup longer than `timeoutMs`. */
  async contextWhenReady(timeoutMs = 2000): Promise<SignupAnalyticsContext | undefined> {
    const attempts = Math.max(1, Math.ceil(timeoutMs / 150));
    for (let i = 0; i <= attempts; i++) {
      const context = this.context();
      if (context) return context;
      if (i < attempts) await new Promise(resolve => setTimeout(resolve, 150));
    }
    return undefined;
  }

  track(event: SignupBrowserEvent, step = 0) {
    try {
      const context = this.context();
      if (!context) return;
      this.ph!.capture(`agent_signup_${event}`, {
        funnel: 'agent_signup', funnel_version: 1, onboarding_method: 'agent', source: 'browser',
        product: this.product, journey_id: context.journeyId,
        step: Number.isInteger(step) && step >= 0 && step <= 5 ? step : 0,
      }, event === 'page_left' || event === 'entry_clicked' || event === 'dashboard_opened' ? { transport: 'sendBeacon' } : undefined);
    } catch { /* Optional telemetry cannot interrupt setup. */ }
  }

  leave(step: number) {
    if (this.departed) return;
    this.track('page_left', step);
    this.departed = true;
  }
  resume() { this.departed = false; }

  restart(track = true) {
    if (track) this.track('restarted');
    this.departed = true;
    this.cached = undefined;
    try { this.storage.removeItem(key(this.product)); } catch { /* Optional. */ }
  }
}
