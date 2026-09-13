'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

function useSequence(length: number, interval: number) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setStep(length - 1);
      return;
    }

    const timer = window.setInterval(() => setStep((current) => (current + 1) % length), interval);
    return () => window.clearInterval(timer);
  }, [interval, length]);

  return step;
}

function AgentMark({ kind }: { kind: 'codex' | 'claude' }) {
  return (
    <span className={`story-agent-mark story-agent-${kind}`}>
      <Image src={kind === 'codex' ? '/skip-assets/codex.svg' : '/skip-assets/claude.svg'} alt="" width={18} height={18} />
    </span>
  );
}

function JudgmentScene() {
  const step = useSequence(4, 2100);

  return (
    <div className="judgment-scene" aria-label="Skip batching a coding agent question with the context needed to answer it">
      <div className="judgment-skip-panel">
        <div className="story-window-head">
          <Image src="/skip-assets/skip-avatar.png" alt="" width={38} height={38} />
          <div><strong>Skip</strong><small>Webhook retries</small></div>
          <i aria-hidden="true" />
        </div>
        <div className="judgment-thread">
          <div className="story-event"><b>↗</b><span>Opened Webhook retries</span></div>
          <div className="story-bubble story-bubble-skip">The retry policy needs one product decision.</div>
          <div className={`story-bubble story-bubble-user ${step >= 1 ? 'is-visible' : ''}`}>Did we cover this in the brief?</div>
          <div className={`story-brief-card ${step >= 2 ? 'is-visible' : ''}`}>
            <small>product-brief.md</small>
            <strong>Retry webhooks so deliveries do not get missed.</strong>
            <span>Skip recommends a 24 hour cutoff.</span>
          </div>
        </div>
        <div className="story-composer">Message Skip… <span>↑</span></div>
      </div>

      <div className="judgment-agent-panel">
        <div className="story-window-head">
          <AgentMark kind="codex" />
          <div><strong>Webhook retry policy</strong><small>Codex · live session</small></div>
          <span className="needs-direction"><i /> needs direction</span>
        </div>
        <div className="judgment-agent-body">
          <div className="story-event"><b>✓</b><span>Read Webhooks/RetryPolicy.swift</span></div>
          <div className="story-event"><b>⇄</b><span>Compared existing delivery guarantees</span></div>
          <div className="agent-question">
            <AgentMark kind="codex" />
            <p>The brief does not specify whether failed webhooks should retry for 24 or 72 hours. Which policy should I implement?</p>
          </div>
          <div className="agent-options">
            <button className={step >= 3 ? 'is-selected' : ''} type="button" tabIndex={-1}>24 hours</button>
            <button type="button" tabIndex={-1}>72 hours</button>
            <button type="button" tabIndex={-1}>Ask product</button>
          </div>
          <div className={`agent-resolved ${step >= 3 ? 'is-visible' : ''}`}><span>✓</span> Direction sent. The session is moving again.</div>
        </div>
      </div>
    </div>
  );
}

function AnywhereScene() {
  const step = useSequence(2, 4200);

  return (
    <div className="anywhere-scene" aria-label="One coding session moving between Skip, a terminal, and the Codex app without losing context">
      <div className={`ghostty-app ${step === 0 ? 'is-active' : ''}`} aria-hidden="true">
        <div className="mac-titlebar ghostty-titlebar">
          <div className="traffic-lights"><i /><i /><i /></div>
          <span className="ghostty-tab-icon">›_</span>
          <strong>skip</strong>
          <small>Ghostty · Codex</small>
        </div>
        <div className="ghostty-terminal">
          <p><b>$</b> codex resume webhook-retry-policy</p>
          <p className="terminal-success">✓ Restored webhook retry policy</p>
          <div className="terminal-question">
            <small>IMPLEMENTER</small>
            <span>The brief doesn’t specify whether failed webhooks should retry for 24 or 72 hours. Which policy should I implement?</span>
          </div>
          <p className="terminal-direction">› We should use 24 hours as the retry window.</p>
          <div className="terminal-status"><i /> Working <span>· esc to interrupt</span></div>
          <div className="terminal-composer">› <span>Message Implementer…</span><i /></div>
        </div>
      </div>

      <div className={`codex-desktop ${step === 1 ? 'is-active' : ''}`} aria-hidden="true">
        <div className="codex-macbar">
          <div className="codex-sidebar-chrome"><div className="traffic-lights"><i /><i /><i /></div><span>◫</span><span>‹</span><span>›</span></div>
          <div className="codex-main-chrome"><span>▱</span><strong>Webhook retry policy</strong><span>•••</span><i /><small>Open⌄</small><small>Commit⌄</small><Image src="/skip-assets/codex.svg" alt="" width={18} height={18} /><b>Codex</b></div>
        </div>
        <div className="codex-shell">
          <aside className="codex-sidebar">
            <div className="codex-sidebar-brand"><Image src="/skip-assets/codex.svg" alt="" width={20} height={20} /><strong>Codex</strong><span>⌄</span><i>⌕</i></div>
            <nav><span>□ &nbsp; New chat</span><span>⑂ &nbsp; Pull requests</span><span>▦ &nbsp; Sites</span><span>◷ &nbsp; Scheduled</span></nav>
            <small>RECENT</small><nav><span>⌖ &nbsp; API pagination</span><span>⌖ &nbsp; Session migration</span></nav>
            <small>THREADS</small><nav><span>▱ &nbsp; skip</span><span className="selected">◌ &nbsp; Webhook retry policy</span><span>◌ &nbsp; Passwordless login</span></nav>
          </aside>
          <div className="codex-thread">
            <div className="codex-restored">✓ &nbsp; Restored session context</div>
            <small>Implementer</small>
            <div className="codex-chat-row"><AgentMark kind="codex" /><p>The brief doesn’t specify whether failed webhooks should retry for 24 or 72 hours. Which policy should I implement?</p></div>
            <div className="codex-user-reply">We should use 24 hours as the retry window.</div>
            <div className="codex-chat-row compact"><AgentMark kind="codex" /><p>Got it. I’ll update the endpoint and affected tests.</p></div>
            <div className="codex-user-reply followup">Add a regression test for the retry cutoff too.</div>
            <div className="codex-working"><i /> Updating retry policy and regression test…</div>
            <div className="codex-composer">Message Implementer… <span>↑</span></div>
          </div>
        </div>
      </div>

    </div>
  );
}

function DriftScene() {
  const step = useSequence(4, 1900);
  const checks = ['Passwordless only', 'No paid dependency', 'Links expire in 10 minutes', 'No forced logout'];

  return (
    <div className="drift-scene" aria-label="Skip checking active implementation work against project intents and constraints">
      <div className="brief-column">
        <div className="brief-column-head"><span>Project brief</span><strong>Passwordless login</strong></div>
        <div className="brief-group"><small>INTENTS</small><p>Remove the password field</p><p>Reduce reset tickets</p><p>Keep security review clean</p></div>
        <div className="brief-group"><small>CONSTRAINTS</small><p>Nobody gets logged out</p><p>No new paid dependency</p><p>Links expire in 10 minutes</p></div>
      </div>
      <div className="drift-monitor">
        <div className="drift-monitor-head">
          <Image src="/skip-assets/skip-avatar.png" alt="" width={44} height={44} />
          <div><strong>Skip is checking the work</strong><span>Brief and implementation stay in sync.</span></div>
          <i className="monitor-live">live</i>
        </div>
        <div className="drift-checks">
          {checks.map((check, index) => <div className={step >= index ? 'is-checked' : ''} key={check}><span>{step >= index ? '✓' : '·'}</span><strong>{check}</strong><small>{step >= index ? 'Aligned' : 'Checking'}</small></div>)}
        </div>
        <div className={`drift-summary ${step === checks.length - 1 ? 'is-visible' : ''}`}><b>All clear</b><span>The implementation still matches the plan.</span></div>
      </div>
    </div>
  );
}

function TeamScene() {
  const step = useSequence(7, 1900);
  const teammates = [
    {
      person: 'Mina', initials: 'MI', role: 'Platform',
      sessions: [
        { agent: 'claude' as const, title: 'API pagination', activity: 'Testing cursor boundaries', state: 'Running' },
        { agent: 'codex' as const, title: 'CI failures', activity: 'Tracing the flaky suite', state: 'Investigating' },
      ],
    },
    {
      person: 'Avery', initials: 'AV', role: 'Product',
      sessions: [
        { agent: 'codex' as const, title: 'Webhook retries', activity: 'Implementing the 24 hour cutoff', state: 'Writing' },
        { agent: 'claude' as const, title: 'Release notes', activity: 'Summarizing merged changes', state: 'Drafting' },
      ],
    },
    {
      person: 'Jules', initials: 'JU', role: 'Infrastructure',
      sessions: [
        { agent: 'claude' as const, title: 'Usage metering', activity: 'Backfilling event totals', state: 'Reviewing' },
        { agent: 'codex' as const, title: 'Search indexing', activity: 'Checking memory profile', state: 'Running' },
      ],
    },
    {
      person: 'Sam', initials: 'SA', role: 'Identity',
      sessions: [
        { agent: 'codex' as const, title: 'Passwordless login', activity: 'Verifying session expiry', state: 'Testing' },
      ],
    },
  ];

  let sessionIndex = -1;

  return (
    <div className="team-scene" aria-label="Four teammates and the Claude Code and Codex sessions each person is running">
      <div className="team-scene-head">
        <div>
          <strong>Who is running what</strong>
          <span>4 teammates · 7 live agent sessions</span>
        </div>
        <small><i /> Live</small>
      </div>

      <div className="team-agent-board">
        {teammates.map((teammate, teammateIndex) => {
          const firstSessionIndex = sessionIndex + 1;
          sessionIndex += teammate.sessions.length;
          const teammateIsActive = step >= firstSessionIndex && step <= sessionIndex;

          return (
            <article className={`team-member-lane ${teammateIsActive ? 'is-active' : ''}`} key={teammate.person}>
              <div className="team-human">
                <span className={`team-avatar team-avatar-${teammateIndex + 1}`}>{teammate.initials}</span>
                <div><strong>{teammate.person}</strong><span>{teammate.role}</span></div>
                <small>{teammate.sessions.length} {teammate.sessions.length === 1 ? 'session' : 'sessions'}</small>
              </div>
              <div className="team-agent-sessions">
                {teammate.sessions.map((session, localIndex) => {
                  const currentSessionIndex = firstSessionIndex + localIndex;
                  return (
                    <div className={`team-agent-session ${step === currentSessionIndex ? 'is-active' : ''}`} key={session.title}>
                      <AgentMark kind={session.agent} />
                      <div>
                        <strong>{session.title}</strong>
                        <span>{session.activity}</span>
                      </div>
                      <small><i />{session.state}</small>
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}

        <div className={`team-insight ${step === 2 || step === 5 ? 'is-overlap' : ''}`} aria-live="polite">
          <span>{step === 2 || step === 5 ? 'Overlap caught' : 'Shared learning'}</span>
          <div>
            <strong>{step === 2 || step === 5 ? 'Skip found a second session heading into the same code.' : 'A useful decision is ready for the next teammate.'}</strong>
            <p>{step === 2 || step === 5 ? 'The new agent gets the existing owner and context before any work is duplicated.' : 'Prompts, decisions, and tests stay attached to the work so every agent starts smarter.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OnboardingSequence() {
  return (
    <>
      <section className="onboarding-feature feature-oatmeal feature-judgment" aria-labelledby="judgment-title">
        <div className="onboarding-feature-inner">
          <div className="onboarding-copy">
            <h2 id="judgment-title">You step in when judgement is needed</h2>
            <p>Skip batches the questions your agents cannot answer, brings the context, and lets you steer the work in one move.</p>
          </div>
          <JudgmentScene />
        </div>
      </section>

      <section className="onboarding-feature feature-white feature-anywhere" aria-labelledby="anywhere-title">
        <div className="onboarding-feature-inner">
          <div className="onboarding-copy">
            <h2 id="anywhere-title">Keep using your favorite tools.</h2>
            <p>Move between Skip, your terminal, and the Codex and Claude Mac apps without losing the session, the decisions, or the plan.</p>
          </div>
          <AnywhereScene />
        </div>
      </section>

      <section className="onboarding-feature feature-blue feature-drift" aria-labelledby="drift-title">
        <div className="onboarding-feature-inner">
          <div className="onboarding-copy">
            <h2 id="drift-title">Skip reminds you what you were trying to do.</h2>
            <p>Once Skip understands the goal, it keeps what you want and what your agents are building in sync.</p>
          </div>
          <DriftScene />
        </div>
      </section>

      <section className="onboarding-feature feature-white feature-team" aria-labelledby="team-title">
        <div className="onboarding-feature-inner">
          <div className="onboarding-copy">
            <h2 id="team-title">Your whole team works from the same picture.</h2>
            <p>See what everyone’s agents are doing, know who owns each piece of work, and stop two sessions from solving the same problem. Every useful prompt and decision becomes something the team can build on.</p>
          </div>
          <TeamScene />
        </div>
      </section>

    </>
  );
}
