'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

type Workstream = {
  project: string;
  next: string;
  phase?: number;
  changedStatus?: 'In agent review' | 'Blocked' | 'Waiting on human';
  changedNext?: string;
};

const workstreams: Workstream[] = [
  { project: 'API pagination', next: 'Agent question', phase: 1, changedNext: 'Merge' },
  { project: 'Usage metering', next: 'Backfill' },
  { project: 'Passwordless login', next: 'Rate limit' },
  { project: 'Session migration', next: 'Review', phase: 2, changedStatus: 'In agent review', changedNext: 'Open PR' },
  { project: 'Dependency audit', next: 'Review', phase: 2, changedStatus: 'In agent review', changedNext: 'Open PR' },
  { project: 'Search indexing', next: 'Index documents', phase: 3, changedStatus: 'Blocked', changedNext: 'API pagination finishes' },
  { project: 'CI failures', next: 'Retry checks', phase: 3, changedStatus: 'Waiting on human', changedNext: 'Approve fix' },
  { project: 'Webhook retries', next: 'Choose policy', phase: 3, changedStatus: 'Waiting on human' },
];

const sequence = [
  { after: 1350, phase: 1 },
  { after: 3050, phase: 2 },
  { after: 4750, phase: 3 },
  { after: 6150, phase: 4 },
];

export function CoordinationScene() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) {
      setPhase(4);
      return;
    }

    let timers: number[] = [];
    let cancelled = false;

    const play = () => {
      setPhase(0);
      sequence.forEach((event) => {
        timers.push(window.setTimeout(() => {
          if (!cancelled) setPhase(event.phase);
        }, event.after));
      });
      timers.push(window.setTimeout(() => {
        if (!cancelled) play();
      }, 11500));
    };

    play();
    return () => {
      cancelled = true;
      timers.forEach(window.clearTimeout);
    };
  }, []);

  return (
    <div className="coordination-scene" aria-label="Skip watches active projects, resolves routine coordination, and groups the issues that need a human">
      <aside className="coordination-chat">
        <div className="coordination-chat-head">
          <Image src="/skip-assets/skip-avatar.png" alt="" width={38} height={38} />
          <div><strong>Skip</strong><span>Keeping watch</span></div>
          <i aria-hidden="true" />
        </div>

        <div className="coordination-chat-body">
          <ActionLine visible={phase >= 1} tone="healthy">Skip resolved agent question</ActionLine>
          <ActionLine visible={phase >= 2} tone="review">Skip directed reviewer</ActionLine>
          <ActionLine visible={phase >= 3} tone="human">Issue needs a human · filed for next check-in</ActionLine>

          <div className={`coordination-message ${phase >= 4 ? 'is-visible' : ''}`}>
            <Image src="/skip-assets/skip-avatar.png" alt="" width={34} height={34} />
            <div>
              <span>Skip</span>
              <p>Hey, 3 projects need your help. Got a second?</p>
            </div>
          </div>

          <div className={`coordination-open ${phase >= 4 ? 'is-visible' : ''}`}>
            Go to first issue <span aria-hidden="true">→</span>
          </div>
        </div>

        <div className="coordination-composer"><span>Message Skip...</span><b aria-hidden="true">↑</b></div>
      </aside>

      <div className="coordination-table">
        <div className="coordination-table-head"><span>Project</span><span>Status</span><span>Next up</span></div>
        <div className="coordination-table-body">
          {workstreams.map((workstream) => {
            const changed = workstream.phase !== undefined && phase >= workstream.phase;
            const status = changed && workstream.changedStatus ? workstream.changedStatus : 'Working';
            const next = changed && workstream.changedNext ? workstream.changedNext : workstream.next;
            const statusClass = status.toLowerCase().replaceAll(' ', '-');

            return (
              <div className={`coordination-row ${changed ? 'is-changed' : ''}`} key={workstream.project}>
                <strong>{workstream.project}</strong>
                <span className={`coordination-status coordination-status-${statusClass}`}><i aria-hidden="true" />{status}</span>
                <span>{next}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ActionLine({ children, tone, visible }: { children: React.ReactNode; tone: string; visible: boolean }) {
  return (
    <div className={`coordination-action coordination-action-${tone} ${visible ? 'is-visible' : ''}`}>
      <span aria-hidden="true">{tone === 'healthy' ? '✓' : tone === 'review' ? '↳' : '!'}</span>
      <p>{children}</p>
    </div>
  );
}
