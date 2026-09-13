'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

const terminals = [
  {
    name: 'API pagination',
    harness: 'claude',
    agent: 'Claude Code',
    className: 'hero-terminal-one',
    activity: [
      'Thinking about cursor boundaries...',
      'Read Sources/API/Paginator.swift',
      'Search "nextCursor" in Sources/API',
      'Edit Paginator.swift (+18 -6)',
      'Run swift test --filter Pagination',
      '12 tests passed',
      'Reviewing edge cases...',
    ],
  },
  {
    name: 'Usage metering',
    harness: 'codex',
    agent: 'Codex',
    className: 'hero-terminal-two',
    activity: [
      'Inspecting usage event schema...',
      'rg "usage_events" Sources',
      'Read Metering/UsageStore.swift',
      'Apply patch to UsageStore.swift',
      'Run backfill test suite',
      'Processing 2,418 test events...',
      'Checking aggregate totals...',
    ],
  },
  {
    name: 'Passwordless login',
    harness: 'claude',
    agent: 'Claude Code',
    className: 'hero-terminal-four',
    activity: [
      'Thinking about abuse controls...',
      'Read Auth/Passwordless.swift',
      'Search existing rate limit policy',
      'Edit Passwordless.swift (+24 -3)',
      'Run authentication tests',
      'Verifying token expiry...',
      'All checks passing',
    ],
  },
  {
    name: 'Session migration',
    harness: 'codex',
    agent: 'Codex',
    className: 'hero-terminal-three',
    activity: [
      'Exploring persistence layer...',
      'rg "SessionRecord" Sources',
      'Read Storage/SessionStore.swift',
      'Apply migration patch',
      'Run migration fixtures',
      'Comparing 184 migrated records...',
      'Preparing agent review',
    ],
  },
  {
    name: 'CI failures',
    harness: 'claude',
    agent: 'Claude Code',
    className: 'hero-terminal-six',
    activity: [
      'Inspecting failing integration run...',
      'Read Tests/CheckoutFlow.swift',
      'Compare CI environment variables',
      'Patch deterministic clock fixture',
      'Run checkout integration tests',
      '18 tests passed',
      'Preparing fix summary...',
    ],
  },
  {
    name: 'Webhook retries',
    harness: 'codex',
    agent: 'Codex',
    className: 'hero-terminal-five',
    activity: [
      'Tracing retry policy...',
      'Read Webhooks/RetryPolicy.swift',
      'Compare delivery guarantees',
      'Add exponential backoff cases',
      'Run webhook simulations',
      'Verifying failure windows...',
      'Policy tests passing',
    ],
  },
  {
    name: 'Search indexing',
    harness: 'claude',
    agent: 'Claude Code',
    className: 'hero-terminal-seven',
    activity: [
      'Following indexing pipeline...',
      'Read Search/Indexer.swift',
      'Trace document batching',
      'Tune concurrent writes',
      'Run indexing benchmark',
      'Checking 6,284 documents...',
      'Reviewing memory profile',
    ],
  },
  {
    name: 'Dependency audit',
    harness: 'codex',
    agent: 'Codex',
    className: 'hero-terminal-eight',
    activity: [
      'Reading package lockfile...',
      'Check transitive advisories',
      'Compare compatible versions',
      'Update three dependencies',
      'Run compatibility suite',
      'Scanning production bundle...',
      'No critical findings',
    ],
  },
  {
    name: 'Release notes',
    harness: 'claude',
    agent: 'Claude Code',
    className: 'hero-terminal-ten',
    activity: [
      'Collecting merged changes...',
      'Read release labels',
      'Group changes by product area',
      'Draft release summary',
      'Check referenced pull requests',
      'Verifying contributor names...',
      'Ready for review',
    ],
  },
  {
    name: 'Cache invalidation',
    harness: 'codex',
    agent: 'Codex',
    className: 'hero-terminal-nine',
    activity: [
      'Tracing stale cache reports...',
      'Read Cache/Invalidator.swift',
      'Map dependent cache keys',
      'Apply scoped purge strategy',
      'Run cache consistency tests',
      'Checking regional replicas...',
      'All replicas consistent',
    ],
  },
];

const workloadWords = ['', '', '', '', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

function LiveTerminal({ terminal, terminalIndex, reducedMotion }: {
  terminal: (typeof terminals)[number];
  terminalIndex: number;
  reducedMotion: boolean;
}) {
  const [step, setStep] = useState(terminalIndex * 2);

  useEffect(() => {
    if (reducedMotion) return;

    const cadence = [970, 1210, 1080, 1370, 1040, 1290, 1130, 1430, 1180, 1320][terminalIndex];
    const timer = window.setInterval(() => setStep((current) => current + 1), cadence);
    return () => window.clearInterval(timer);
  }, [reducedMotion, terminalIndex]);

  const activeIndex = step % terminal.activity.length;
  const visibleLines = [-2, -1, 0].map(
    (offset) => terminal.activity[(activeIndex + offset + terminal.activity.length) % terminal.activity.length],
  );

  return (
    <article className={`hero-terminal ${terminal.className}`} aria-label={`${terminal.agent} working on ${terminal.name}`}>
      <header className="hero-terminal-bar">
        <div>
          <span className={`hero-agent-logo hero-agent-logo-${terminal.harness}`}>
            <Image src={`/skip-assets/${terminal.harness}.svg`} alt="" width={20} height={20} />
          </span>
          <strong>{terminal.name}</strong>
        </div>
        <small>{terminal.agent}</small>
      </header>
      <div className="hero-terminal-body" aria-hidden="true">
        {visibleLines.map((line, lineIndex) => {
          const isActive = lineIndex === visibleLines.length - 1;
          return (
            <code className={isActive ? 'terminal-active-line' : ''} key={lineIndex}>
              <span>{isActive ? spinnerFrames[(step + terminalIndex) % spinnerFrames.length] : '✓'}</span>
              {line}
              {isActive && <i />}
            </code>
          );
        })}
      </div>
    </article>
  );
}

export function HeroWorkScene() {
  const [visibleCount, setVisibleCount] = useState(4);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotionPreference = () => setReducedMotion(motionPreference.matches);
    syncMotionPreference();

    motionPreference.addEventListener('change', syncMotionPreference);
    return () => motionPreference.removeEventListener('change', syncMotionPreference);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setVisibleCount(terminals.length);
      return;
    }

    setVisibleCount(4);
    const timers = [5, 6, 7, 8, 9, 10].map((count, index) => (
      window.setTimeout(() => setVisibleCount(count), (index + 1) * 1150)
    ));

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [reducedMotion]);

  const projectLabel = `${workloadWords[visibleCount]} agents working.`;

  return (
    <div className="hero-work-scene" aria-label={`Skip monitoring ${visibleCount} active Claude Code and Codex sessions`}>
      {terminals.slice(0, visibleCount).map((terminal, terminalIndex) => (
        <LiveTerminal
          key={terminal.name}
          terminal={terminal}
          terminalIndex={terminalIndex}
          reducedMotion={reducedMotion}
        />
      ))}
      <div className="hero-briefing">
        <Image src="/skip-assets/skip-avatar.png" alt="Skip" width={74} height={74} priority />
        <div>
          <span>Skip is coordinating</span>
          <strong className="hero-project-count" key={visibleCount}>{projectLabel}</strong>
          <small>I’ll let you know when they need you.</small>
        </div>
        <a className="hero-briefing-action" href="#how-it-works" aria-label="Continue to how Skip works">→</a>
      </div>
    </div>
  );
}
