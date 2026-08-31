'use client';

import { type FormEvent, useState } from 'react';

import s from './skip.module.css';

export function SkipWorkstreamDemo() {
  const [showTerminal, setShowTerminal] = useState(false);
  const [direction, setDirection] = useState('');
  const [sent, setSent] = useState(false);

  function sendDirection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!direction.trim()) return;
    setSent(true);
  }

  return (
    <div className={s.workstreamDemo}>
      <div className={`${s.demoTrack} ${showTerminal ? s.demoTrackTerminal : ''}`}>
        <section className={s.demoSlide} aria-hidden={showTerminal}>
          <div className={s.demoHeader}>
            <span>Example workstream</span>
            <strong>Skip</strong>
          </div>

          <div className={s.skipSummary}>
            <p>We&apos;ve got 6 workstreams in flight.</p>
            <div className={s.workstreamFocus}>
              <div>
                <span>Claude Code</span>
                <strong>Onboarding revamp</strong>
              </div>
              <small>Tests running</small>
            </div>
            <p className={s.skipSummaryNote}>The new invite flow is implemented. Claude Code is checking the workspace setup now.</p>
          </div>

          <button className={s.demoAction} type="button" onClick={() => setShowTerminal(true)} tabIndex={showTerminal ? -1 : 0}>
            View workstream
            <span aria-hidden="true">→</span>
          </button>
        </section>

        <section className={`${s.demoSlide} ${s.terminalSlide}`} aria-hidden={!showTerminal}>
          <div className={s.demoHeader}>
            <div className={s.terminalIdentity}>
              <span>Ghostty</span>
              <strong>Claude Code</strong>
            </div>
            <button type="button" onClick={() => setShowTerminal(false)} tabIndex={showTerminal ? 0 : -1}>
              Back to Skip
            </button>
          </div>

          <div className={s.terminalOutput} aria-label="Claude Code terminal output">
            <p><span>›</span> claude --resume onboarding-revamp</p>
            <p><span>›</span> Updating the onboarding flow</p>
            <p className={s.terminalComplete}><span>✓</span> Invite flow implemented</p>
            <p className={s.terminalComplete}><span>✓</span> Workspace setup tests added</p>
            <p className={s.terminalRunning}><span>›</span> Running test suite</p>
          </div>

          <form className={s.steerForm} onSubmit={sendDirection}>
            <label className={s.srOnly} htmlFor="skip-steer-direction">Steer this coding agent</label>
            <input
              id="skip-steer-direction"
              value={direction}
              onChange={(event) => {
                setDirection(event.target.value);
                setSent(false);
              }}
              placeholder="Steer this agent..."
              disabled={!showTerminal}
            />
            <button type="submit" tabIndex={showTerminal ? 0 : -1}>Send</button>
          </form>
          <p className={s.steerStatus} aria-live="polite">{sent ? 'Direction sent to Claude Code.' : 'You can intervene at any time.'}</p>
        </section>
      </div>
    </div>
  );
}
