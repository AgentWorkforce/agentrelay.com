import { AgentToolLogo, type AgentTool } from '../AgentToolLogos';
import { FadeIn } from '../FadeIn';
import { DurableDeliveryTimeline, DurableWorkflowTrace } from '../../app/DurableDeliveryTimeline';
import s from '../../app/landing.module.css';
import { ContextCapabilities } from './ContextCapabilities';
import { OpenClawLogo } from './icons';

/** `openclaw` has no entry in {@link AgentTool}, so it renders a bespoke mark. */
type DeliveryProvider = AgentTool | 'openclaw';

interface DeliveryRow {
  dot: string;
  provider: DeliveryProvider;
  name: string;
  /** [delivered, pending, retry, fail] counts shown in the dashboard. */
  stats: readonly [number, number, number, number];
}

const DELIVERY_ROWS: readonly DeliveryRow[] = [
  { dot: '#28c840', provider: 'claude', name: 'Scout', stats: [58, 0, 0, 0] },
  { dot: '#9CA3AF', provider: 'codex', name: 'Designer', stats: [51, 0, 1, 0] },
  { dot: '#28c840', provider: 'openclaw', name: 'QA', stats: [46, 1, 0, 0] },
  { dot: '#28c840', provider: 'claude', name: 'Planner', stats: [42, 2, 0, 0] },
  { dot: '#28c840', provider: 'gemini', name: 'Builder', stats: [37, 0, 1, 0] },
  { dot: '#febc2e', provider: 'codex', name: 'Reviewer', stats: [29, 3, 2, 1] },
  { dot: '#9CA3AF', provider: 'copilot', name: 'Ops', stats: [18, 4, 0, 0] },
];

function DeliveryRowIcon({ provider }: { provider: DeliveryProvider }) {
  if (provider === 'openclaw') {
    return <OpenClawLogo className={s.dashIcon} />;
  }
  return (
    <AgentToolLogo
      className={s.dashIcon}
      idPrefix={provider === 'gemini' ? 'dash' : undefined}
      provider={provider}
    />
  );
}

const DEFAULT_ITEMS = [
  'Durable delivery so channel history and offline catch-up survive restarts.',
  'Receipts, retry queues, and backoff keep handoffs moving until every target agent acknowledges.',
  'Stateful coordination stays close to active channels for fast reads, writes, and thread updates.',
  'A global edge network places channels near agents while keeping ordering and membership consistent.',
];

export function DeliveryFeature({
  title = 'The hard parts of delivery, handled',
  items = DEFAULT_ITEMS,
  previewVariant = 'delivery',
  previewAccent = 'blue',
  showCapabilities = true,
}: {
  title?: string;
  items?: readonly string[];
  previewVariant?: 'delivery' | 'workflow';
  previewAccent?: 'blue' | 'orange';
  showCapabilities?: boolean;
} = {}) {
  return (
    <FadeIn direction="up" delay={120} className={`${s.featureCol} ${s.deliveryFeature}`}>
      <div className={s.featurePreview}>
        <div className={previewAccent === 'orange' ? s.previewAccent : s.previewAccentBlue} />
        <div className={s.previewDashboard}>
          {previewVariant === 'workflow' ? <DurableWorkflowTrace /> : <DurableDeliveryTimeline />}
          <div className={s.deliveryTableHead}>
            <span />
            <span>agent</span>
            <span>msg</span>
            <span>pending</span>
            <span>retry</span>
            <span>fail</span>
          </div>
          <div className={s.deliveryTableBody}>
            {DELIVERY_ROWS.map((row) => (
              <div key={row.name} className={s.dashRow}>
                <span className={s.dashDot} style={{ background: row.dot }} />
                <DeliveryRowIcon provider={row.provider} />
                <span className={s.dashAgentGroup}>
                  <span className={s.dashAgent}>{row.name}</span>
                </span>
                <span className={s.deliveryStats}>
                  {row.stats.map((stat, i) => (
                    <span key={i}>
                      <strong>{stat}</strong>
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={s.featureCopy}>
        <h3 className={s.featureTitle}>{title}</h3>
        <ul className={s.featureList}>
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>

      {showCapabilities && <ContextCapabilities />}
    </FadeIn>
  );
}

export function DurableWorkflowFeature({
  showCapabilities = true,
  title = 'Build durable workflows',
  previewAccent = 'blue',
}: { showCapabilities?: boolean; title?: string; previewAccent?: 'blue' | 'orange' }) {
  return (
    <DeliveryFeature
      title={title}
      previewVariant="workflow"
      previewAccent={previewAccent}
      showCapabilities={showCapabilities}
      items={[
        'Persist every transition so long-running work survives restarts and deploys.',
        'Retry individual steps without repeating successful work or duplicating side effects.',
        'Trace every input, output, model action, artifact, and intervention in one run history.',
        'Trigger workflows from schedules and events, then execute them close to your systems.',
      ]}
    />
  );
}
