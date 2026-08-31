'use client';

import { useEffect, useState } from 'react';
import { Bot, Check, CircleAlert, Database, FileOutput, RotateCcw, UserRoundCheck, Webhook } from 'lucide-react';

import { AgentToolLogo, type AgentTool } from '../components/AgentToolLogos';
import s from './landing.module.css';

type AgentTimelineItem = {
  agent: string;
  kind: 'agent';
  provider: AgentTool;
  status: 'offline' | 'online';
};

type MessageTimelineItem = {
  event: 'message.delivered' | 'message.received';
  kind: 'event';
  latency: string;
};

type TimelineTemplate = AgentTimelineItem | MessageTimelineItem;
type TimelineItem = TimelineTemplate & { id: number };

const VISIBLE_TIMELINE_ITEMS = 12;
const INITIAL_TIMELINE_CURSOR = 2;
const FIRST_CATCH_UP_COMPLETE_INDEX = 7;
const FIRST_CATCH_UP_HOLD_MS = 5200;
const CATCH_UP_HOLD_MS = 3400;
const RECEIVED_STEP_DELAYS_MS = [1900, 2600, 2200, 2800];
const DELIVERED_STEP_DELAYS_MS = [1300, 1700, 1200, 1500];
const RECOVERY_COMPLETE_SEQUENCE_INDICES = [7, 13, 24, 31, 37, 41];

const TIMELINE_SEQUENCE = [
  { agent: 'Claude', kind: 'agent', provider: 'claude', status: 'online' },
  { event: 'message.delivered', kind: 'event', latency: '24ms' },
  { agent: 'Codex', kind: 'agent', provider: 'codex', status: 'offline' },
  { event: 'message.received', kind: 'event', latency: '+1.4s' },
  { event: 'message.received', kind: 'event', latency: '+1.9s' },
  { agent: 'Codex', kind: 'agent', provider: 'codex', status: 'online' },
  { event: 'message.delivered', kind: 'event', latency: '31ms' },
  { event: 'message.delivered', kind: 'event', latency: '37ms' },
  { agent: 'Claude', kind: 'agent', provider: 'claude', status: 'offline' },
  { event: 'message.received', kind: 'event', latency: '+2.2s' },
  { event: 'message.received', kind: 'event', latency: '+2.7s' },
  { agent: 'Claude', kind: 'agent', provider: 'claude', status: 'online' },
  { event: 'message.delivered', kind: 'event', latency: '28ms' },
  { event: 'message.delivered', kind: 'event', latency: '43ms' },
  { agent: 'Codex', kind: 'agent', provider: 'codex', status: 'online' },
  { event: 'message.delivered', kind: 'event', latency: '36ms' },
  { agent: 'Claude', kind: 'agent', provider: 'claude', status: 'online' },
  { event: 'message.delivered', kind: 'event', latency: '41ms' },
  { agent: 'Codex', kind: 'agent', provider: 'codex', status: 'offline' },
  { event: 'message.received', kind: 'event', latency: '+2.8s' },
  { event: 'message.received', kind: 'event', latency: '+3.2s' },
  { event: 'message.received', kind: 'event', latency: '+3.6s' },
  { agent: 'Codex', kind: 'agent', provider: 'codex', status: 'online' },
  { event: 'message.delivered', kind: 'event', latency: '33ms' },
  { event: 'message.delivered', kind: 'event', latency: '52ms' },
  { agent: 'Claude', kind: 'agent', provider: 'claude', status: 'offline' },
  { event: 'message.received', kind: 'event', latency: '+1.6s' },
  { event: 'message.received', kind: 'event', latency: '+2.1s' },
  { agent: 'Claude', kind: 'agent', provider: 'claude', status: 'online' },
  { event: 'message.delivered', kind: 'event', latency: '22ms' },
  { event: 'message.delivered', kind: 'event', latency: '39ms' },
  { event: 'message.delivered', kind: 'event', latency: '45ms' },
  { agent: 'Codex', kind: 'agent', provider: 'codex', status: 'offline' },
  { event: 'message.received', kind: 'event', latency: '+1.8s' },
  { event: 'message.received', kind: 'event', latency: '+2.4s' },
  { agent: 'Codex', kind: 'agent', provider: 'codex', status: 'online' },
  { event: 'message.delivered', kind: 'event', latency: '29ms' },
  { event: 'message.delivered', kind: 'event', latency: '34ms' },
  { agent: 'Claude', kind: 'agent', provider: 'claude', status: 'offline' },
  { event: 'message.received', kind: 'event', latency: '+3.1s' },
  { agent: 'Claude', kind: 'agent', provider: 'claude', status: 'online' },
  { event: 'message.delivered', kind: 'event', latency: '47ms' },
] satisfies TimelineTemplate[];

const DELIVERED_DELAY_CLASSES = [s.durableDeliveredOne, s.durableDeliveredTwo, s.durableDeliveredThree];

function normalizeTimelineIndex(index: number) {
  return ((index % TIMELINE_SEQUENCE.length) + TIMELINE_SEQUENCE.length) % TIMELINE_SEQUENCE.length;
}

function getTimelineItem(index: number): TimelineItem {
  const template = TIMELINE_SEQUENCE[normalizeTimelineIndex(index)];

  return { ...template, id: index };
}

function getTimelineDelay(index: number) {
  const sequenceIndex = normalizeTimelineIndex(index);
  const item = TIMELINE_SEQUENCE[sequenceIndex];

  if (index === FIRST_CATCH_UP_COMPLETE_INDEX) {
    return FIRST_CATCH_UP_HOLD_MS;
  }

  if (RECOVERY_COMPLETE_SEQUENCE_INDICES.includes(sequenceIndex)) {
    return CATCH_UP_HOLD_MS;
  }

  if (item.kind === 'agent') {
    return item.status === 'offline' ? 2300 : 1450;
  }

  if (item.event === 'message.received') {
    return RECEIVED_STEP_DELAYS_MS[sequenceIndex % RECEIVED_STEP_DELAYS_MS.length];
  }

  return DELIVERED_STEP_DELAYS_MS[sequenceIndex % DELIVERED_STEP_DELAYS_MS.length];
}

export function DurableDeliveryTimeline() {
  const [cursor, setCursor] = useState(INITIAL_TIMELINE_CURSOR);
  const items = Array.from({ length: VISIBLE_TIMELINE_ITEMS }, (_, offset) =>
    getTimelineItem(cursor - VISIBLE_TIMELINE_ITEMS + 1 + offset)
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCursor((current) => current + 1);
    }, getTimelineDelay(cursor));

    return () => window.clearTimeout(timeoutId);
  }, [cursor]);

  return (
    <div className={s.durableTimelinePreview} aria-label="Durable message delivery timeline">
      <span className={s.durableTimelineLine} />
      {items.map((item) => {
        if (item.kind === 'agent') {
          return (
            <div
              className={`${s.durableTimelineRow} ${s.durableAgentCard} ${
                item.status === 'online' ? s.durableAgentOnline : s.durableAgentOffline
              }`}
              key={item.id}
            >
              <AgentToolLogo className={s.durableAgentIcon} provider={item.provider} />
              <strong>{item.agent}</strong>
              <span className={s.durableStatus}>
                <span />
                {item.status}
              </span>
            </div>
          );
        }

        if (item.event === 'message.delivered') {
          return (
            <div
              className={`${s.durableDelivered} ${DELIVERED_DELAY_CLASSES[item.id % DELIVERED_DELAY_CLASSES.length]}`}
              key={item.id}
            >
              <span>✓</span>
              <strong>message.delivered</strong>
              <time>{item.latency}</time>
            </div>
          );
        }

        return (
          <div className={`${s.durableTimelineRow} ${s.durableEvent}`} key={item.id}>
            <span className={s.durableEventDot} />
            <code>message.received</code>
            <time>{item.latency}</time>
          </div>
        );
      })}
    </div>
  );
}

type WorkflowTraceItem = {
  detail: string;
  kind: 'checkpoint' | 'complete' | 'human' | 'model' | 'output' | 'retry' | 'trigger';
  title: string;
};

const WORKFLOW_TRACE: readonly WorkflowTraceItem[] = [
  { kind: 'trigger', title: 'repo.push received', detail: 'event · us-west' },
  { kind: 'checkpoint', title: 'Input persisted', detail: 'checkpoint_01' },
  { kind: 'model', title: 'Claude Code', detail: 'wrote release-plan.md' },
  { kind: 'human', title: 'Approval recorded', detail: 'artifact accepted' },
  { kind: 'retry', title: 'Deploy step', detail: 'attempt 2 · idempotent' },
  { kind: 'output', title: 'Output persisted', detail: 'build_418' },
  { kind: 'complete', title: 'Run completed', detail: '6 transitions · 1 retry' },
];

const WORKFLOW_STEP_DELAYS_MS = [1100, 1250, 1950, 1550, 2100, 1250, 3200] as const;

function WorkflowTraceIcon({ kind }: { kind: WorkflowTraceItem['kind'] }) {
  const iconProps = { 'aria-hidden': true, size: 15 } as const;

  switch (kind) {
    case 'trigger':
      return <Webhook {...iconProps} />;
    case 'checkpoint':
      return <Database {...iconProps} />;
    case 'model':
      return <Bot {...iconProps} />;
    case 'human':
      return <UserRoundCheck {...iconProps} />;
    case 'retry':
      return <RotateCcw {...iconProps} />;
    case 'output':
      return <FileOutput {...iconProps} />;
    case 'complete':
      return <Check {...iconProps} />;
  }
}

export function DurableWorkflowTrace() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setActiveStep(WORKFLOW_TRACE.length - 1);
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setActiveStep((current) => (current + 1) % WORKFLOW_TRACE.length);
    }, WORKFLOW_STEP_DELAYS_MS[activeStep]);

    return () => window.clearTimeout(timeoutId);
  }, [activeStep]);

  return (
    <div className={s.workflowTracePreview} aria-label="Durable workflow execution trace">
      <div className={s.workflowTraceHeader}>
        <span>run_01J7</span>
        <strong>{activeStep === WORKFLOW_TRACE.length - 1 ? 'completed' : 'running'}</strong>
      </div>
      <div className={s.workflowTraceRail} aria-hidden="true">
        <span style={{ height: `${(activeStep / (WORKFLOW_TRACE.length - 1)) * 100}%` }} />
      </div>
      <div className={s.workflowTraceRows}>
        {WORKFLOW_TRACE.map((item, index) => {
          const state = index < activeStep ? 'complete' : index === activeStep ? 'active' : 'pending';
          const kindClass = item.kind === 'retry'
            ? s.workflowTraceKindRetry
            : item.kind === 'human'
              ? s.workflowTraceKindHuman
              : '';
          return (
            <div
              className={`${s.workflowTraceRow} ${s[`workflowTraceRow_${state}`]} ${kindClass}`}
              key={item.title}
            >
              <span className={s.workflowTraceIcon}>
                <WorkflowTraceIcon kind={item.kind} />
              </span>
              <span className={s.workflowTraceCopy}>
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </span>
              <span className={s.workflowTraceStatus}>
                {state === 'complete' ? <Check aria-hidden="true" size={13} /> : null}
                {state === 'active' && item.kind === 'retry' ? <CircleAlert aria-hidden="true" size={13} /> : null}
                {state === 'active' ? (item.kind === 'retry' ? 'retrying' : 'processing') : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
