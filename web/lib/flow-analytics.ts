import { CODING_AGENTS, isCodingAgent, otherAgentIsSelected, type FactoryDraft } from './flow-onboarding';

export const FLOW_ANALYTICS_VERSION = 2;
export const FLOW_STAGES = ['intro', 'sources', 'agents', 'task', 'connections'] as const;
export type FlowStage = typeof FLOW_STAGES[number];
export type FlowTrack = (event: string, properties?: Record<string, string | number | boolean | string[] | null>) => void;
export const JOURNEY_STORAGE_KEY = 'agentrelay:flows:analytics:v2';

export function flowMetrics(draft: FactoryDraft) {
  return {
    sources: [...draft.sources], source_count: draft.sources.length,
    agents: draft.agents.filter(id => CODING_AGENTS.some(agent => agent.id === id)),
    supported_agent_count: draft.agents.filter(isCodingAgent).length,
    requested_agent_count: draft.agents.filter(id => !isCodingAgent(id)).length,
    other_agent_selected: otherAgentIsSelected(draft), workflow: draft.workflow,
    has_extra_instructions: Boolean(draft.task.trim()),
    configured_filters: draft.sources.flatMap(id => Object.entries(draft.sourceSettings[id] ?? {})
      .filter(([, value]) => value === true || (typeof value === 'string' && value.trim()))
      .map(([field]) => `${id}.${field}`)),
  };
}
export function lengthBucket(length: number): string {
  return length === 0 ? 'empty' : length <= 20 ? '1-20' : length <= 100 ? '21-100' : '101+';
}
export function journeyId(storage: Pick<Storage, 'getItem' | 'setItem'>, createId: () => string, now = Date.now()) {
  try {
    const saved = JSON.parse(storage.getItem(JOURNEY_STORAGE_KEY) ?? 'null');
    if (/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(saved?.id) && Number.isFinite(saved.updatedAt) && now >= saved.updatedAt && now - saved.updatedAt < 30 * 60_000) {
      storage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify({ id: saved.id, updatedAt: now }));
      return saved.id as string;
    }
  } catch { /* Storage is optional. */ }
  const id = createId();
  try { storage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify({ id, updatedAt: now })); } catch { /* Optional. */ }
  return id;
}

export type AnalyticsSink = (event: string, properties: Record<string, unknown>, beacon?: boolean) => void;
/** No DOM text, input values, code, URLs, or exception messages enter this tracker. */
export class FlowJourneyTracker {
  private current: { stage: FlowStage; visit: number; started: number; activeSince: number | null; activeMs: number; changes: number; left: boolean } | null = null;
  private visits = new Map<FlowStage, number>();
  private outcome = 'none';
  constructor(private sink: AnalyticsSink, readonly id: string, private now = Date.now, private metrics: () => Record<string, unknown> = () => ({})) {}
  view(stage: FlowStage) {
    if (this.current?.stage === stage && !this.current.left) return;
    this.leave('route_change');
    const visit = (this.visits.get(stage) ?? 0) + 1;
    this.visits.set(stage, visit);
    this.current = { stage, visit, started: this.now(), activeSince: this.now(), activeMs: 0, changes: 0, left: false };
    this.outcome = 'none';
    this.track('step_viewed', { is_revisit: visit > 1 });
  }
  track(event: string, properties: Record<string, unknown> = {}, beacon = false) {
    const state = this.current;
    if (!state) return;
    if (event === 'choice_changed') state.changes++;
    const now = this.now();
    try { this.sink(`flows_onboarding_${event}`, {
      ...this.metrics(), ...properties, funnel_version: FLOW_ANALYTICS_VERSION, journey_id: this.id,
      stage: state.stage, stage_index: FLOW_STAGES.indexOf(state.stage), visit_number: state.visit,
      elapsed_ms: Math.max(0, now - state.started),
      active_ms: state.activeMs + (state.activeSince === null ? 0 : Math.max(0, now - state.activeSince)),
      choice_changes: state.changes, last_outcome: this.outcome,
    }, beacon || event === 'cloud_handoff_started'); } catch { /* Analytics must never interrupt onboarding. */ }
  }
  markOutcome(outcome: 'cloud_handoff' | 'local_kit_downloaded') { this.outcome = outcome; }
  pause() {
    if (!this.current || this.current.activeSince === null || this.current.left) return;
    this.current.activeMs += Math.max(0, this.now() - this.current.activeSince);
    this.current.activeSince = null;
    this.track('step_paused', {}, true);
  }
  resume() {
    if (!this.current) return;
    if (this.current.left) { this.view(this.current.stage); return; }
    if (this.current.activeSince !== null) return;
    this.current.activeSince = this.now();
    this.track('step_resumed');
  }
  leave(reason: 'route_change' | 'pagehide' | 'unmount') {
    if (!this.current || this.current.left) return;
    this.track('step_left', { reason, exit_signal: reason !== 'route_change' }, reason === 'pagehide');
    this.current.left = true;
  }
}
